"use client";

import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_COINS, MODELS } from "@/lib/constants";
import { TrendingUp, TrendingDown, Activity, Lock, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type FearGreed = {
  current: { value: number; classification: string };
  yesterday: { value: number; classification: string };
  lastWeek: { value: number; classification: string };
  lastMonth: { value: number; classification: string };
};

type ForecastRow = Record<string, string>;

type Metrics = Record<
  string,
  { MAE?: number; RMSE?: number; R2?: number; [key: string]: number | undefined }
>;

const TIME_RANGES = [
  { label: "24H", interval: "60", limit: 24 },
  { label: "1W", interval: "1440", limit: 7 },
  { label: "1M", interval: "1440", limit: 30 },
  { label: "1Y", interval: "1440", limit: 365 },
  { label: "ALL", interval: "1440", limit: 720 },
];

function computeSMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    return slice.reduce((sum, c) => sum + c.close, 0) / period;
  });
}

function computeRSI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? -change : 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function computeBollinger(
  candles: Candle[],
  period = 20,
  mult = 2
): { upper: (number | null)[]; lower: (number | null)[]; middle: (number | null)[] } {
  const middle = computeSMA(candles, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  candles.forEach((_, i) => {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
      return;
    }
    const slice = candles.slice(i - period + 1, i + 1);
    const std = Math.sqrt(
      slice.reduce((sum, c) => sum + Math.pow(c.close - middle[i]!, 2), 0) / period
    );
    upper.push(middle[i]! + mult * std);
    lower.push(middle[i]! - mult * std);
  });

  return { upper, lower, middle };
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const getColor = (v: number) => {
    if (v <= 25) return "bg-danger text-white";
    if (v <= 45) return "bg-red-300 text-red-900";
    if (v <= 55) return "bg-yellow-300 text-yellow-900";
    if (v <= 75) return "bg-green-300 text-green-900";
    return "bg-success text-white";
  };
  const getLabel = (v: number) => {
    if (v <= 25) return "Extreme Fear";
    if (v <= 45) return "Fear";
    if (v <= 55) return "Neutral";
    if (v <= 75) return "Greed";
    return "Extreme Greed";
  };
  return (
    <div
      className={cn(
        "rounded-xl p-3 text-center min-w-[100px]",
        getColor(value)
      )}
    >
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold">{value}%</p>
      <p className="text-xs font-medium">{getLabel(value)}</p>
    </div>
  );
}

export default function CurrencyPage() {
  const { isPremium } = useAuth();
  const [selectedCoin, setSelectedCoin] = useState(SUPPORTED_COINS[0] as typeof SUPPORTED_COINS[number]);
  const [timeRange, setTimeRange] = useState(TIME_RANGES[1]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selectedModel, setSelectedModel] = useState("xgboost");
  const [showSMA, setShowSMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/prices?pair=${selectedCoin.krakenPair}&interval=${timeRange.interval}`
      );
      const data = await res.json();
      if (data.candles) {
        const sliced = data.candles.slice(-timeRange.limit);
        setCandles(sliced);
      }
    } catch (e) {
      console.error("Failed to fetch prices", e);
    }
    setLoading(false);
  }, [selectedCoin, timeRange]);

  const fetchForecasts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/forecasts?pair=${selectedCoin.pair}&model=${selectedModel}`
      );
      const data = await res.json();
      setForecasts(data.forecasts || []);
      setMetrics(data.metrics || null);
    } catch (e) {
      console.error("Failed to fetch forecasts", e);
    }
  }, [selectedCoin, selectedModel]);

  const fetchFearGreedData = useCallback(async () => {
    try {
      const res = await fetch("/api/fear-greed");
      const data = await res.json();
      setFearGreed(data);
    } catch (e) {
      console.error("Failed to fetch fear & greed", e);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchForecasts();
  }, [fetchPrices, fetchForecasts]);

  useEffect(() => {
    fetchFearGreedData();
  }, [fetchFearGreedData]);

  const latestCandle = candles[candles.length - 1];
  const firstCandle = candles[0];
  const priceChange =
    latestCandle && firstCandle
      ? ((latestCandle.close - firstCandle.close) / firstCandle.close) * 100
      : 0;
  const highOfDay = candles.length
    ? Math.max(...candles.map((c) => c.high))
    : 0;
  const lowOfDay = candles.length
    ? Math.min(...candles.map((c) => c.low))
    : 0;

  const sma20 = showSMA ? computeSMA(candles, 20) : [];
  const rsi = showRSI ? computeRSI(candles) : [];
  const bollinger = showBollinger ? computeBollinger(candles) : null;

  // Chart dimensions
  const chartW = 600;
  const chartH = 300;
  const minPrice = candles.length ? Math.min(...candles.map((c) => c.low)) * 0.995 : 0;
  const maxPrice = candles.length ? Math.max(...candles.map((c) => c.high)) * 1.005 : 1;
  const priceRange = maxPrice - minPrice || 1;

  const toX = (i: number, total: number) => (i / Math.max(total - 1, 1)) * chartW;
  const toY = (price: number) =>
    chartH - ((price - minPrice) / priceRange) * chartH;

  const priceLine =
    candles.length > 1
      ? candles
          .map((c, i) => `${toX(i, candles.length)},${toY(c.close)}`)
          .join(" ")
      : "";

  const smaLine =
    sma20.length > 0
      ? sma20
          .map((v, i) => (v !== null ? `${toX(i, candles.length)},${toY(v)}` : ""))
          .filter(Boolean)
          .join(" ")
      : "";

  // Forecast line (appended after price data)
  const forecastLine = forecasts
    .map((f, i) => {
      const price = parseFloat(f.Close || f.Predicted_Close || f.Forecast || "0");
      if (!price) return "";
      return `${toX(candles.length + i, candles.length + forecasts.length)},${toY(price)}`;
    })
    .filter(Boolean)
    .join(" ");

  const lastRSI = rsi.length > 0 ? rsi[rsi.length - 1] : null;

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Currency</h1>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Chart area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Coin selector + time range */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <label className="text-sm text-muted-foreground">Select Currency</label>
                  <select
                    value={selectedCoin.id}
                    onChange={(e) => {
                      const coin = SUPPORTED_COINS.find((c) => c.id === e.target.value);
                      if (coin) setSelectedCoin(coin);
                    }}
                    className="ml-3 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
                  >
                    {SUPPORTED_COINS.map((coin) => (
                      <option key={coin.id} value={coin.id}>
                        {coin.name} ({coin.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  {TIME_RANGES.map((tr) => (
                    <button
                      key={tr.label}
                      onClick={() => setTimeRange(tr)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                        timeRange.label === tr.label
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price badges */}
              {latestCandle && (
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      priceChange >= 0
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    )}
                  >
                    {priceChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 inline mr-1" />
                    )}
                    {priceChange.toFixed(1)}%
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {formatPrice(latestCandle.close)}
                  </span>
                </div>
              )}

              {/* SVG Chart */}
              <div className="relative w-full aspect-[2/1] bg-muted/30 rounded-xl overflow-hidden">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-muted-foreground animate-pulse" />
                  </div>
                ) : (
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((frac) => (
                      <line
                        key={frac}
                        x1={0}
                        y1={chartH * frac}
                        x2={chartW}
                        y2={chartH * frac}
                        stroke="currentColor"
                        strokeOpacity={0.06}
                      />
                    ))}

                    {/* Bollinger bands */}
                    {bollinger && (
                      <>
                        <polyline
                          points={bollinger.upper
                            .map((v, i) =>
                              v !== null ? `${toX(i, candles.length)},${toY(v)}` : ""
                            )
                            .filter(Boolean)
                            .join(" ")}
                          fill="none"
                          stroke="#a78bfa"
                          strokeWidth="1"
                          strokeOpacity="0.5"
                        />
                        <polyline
                          points={bollinger.lower
                            .map((v, i) =>
                              v !== null ? `${toX(i, candles.length)},${toY(v)}` : ""
                            )
                            .filter(Boolean)
                            .join(" ")}
                          fill="none"
                          stroke="#a78bfa"
                          strokeWidth="1"
                          strokeOpacity="0.5"
                        />
                      </>
                    )}

                    {/* Price line */}
                    {priceLine && (
                      <polyline
                        points={priceLine}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                      />
                    )}

                    {/* SMA 20 */}
                    {smaLine && (
                      <polyline
                        points={smaLine}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Forecast overlay */}
                    {forecastLine && (
                      <polyline
                        points={forecastLine}
                        fill="none"
                        stroke="#5b7cfa"
                        strokeWidth="2"
                        strokeDasharray="6 3"
                      />
                    )}
                  </svg>
                )}
              </div>

              {/* Indicator toggles */}
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  { label: "SMA 20", active: showSMA, toggle: () => setShowSMA(!showSMA), color: "bg-yellow-500" },
                  { label: "RSI", active: showRSI, toggle: () => setShowRSI(!showRSI), color: "bg-blue-500" },
                  {
                    label: "Bollinger",
                    active: showBollinger,
                    toggle: () => setShowBollinger(!showBollinger),
                    color: "bg-purple-500",
                  },
                ].map((ind) => (
                  <button
                    key={ind.label}
                    onClick={ind.toggle}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      ind.active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", ind.color)} />
                    {ind.label}
                  </button>
                ))}

                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "ensemble" && !isPremium) return;
                    setSelectedModel(val);
                  }}
                  className="ml-auto px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs"
                >
                  {MODELS.map((m) => {
                    const val = m.toLowerCase();
                    const locked = val === "ensemble" && !isPremium;
                    return (
                      <option key={m} value={val} disabled={locked}>
                        {locked ? `\uD83D\uDD12 ${m} (Premium)` : `Forecast: ${m}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Bollinger Bands display */}
            {showBollinger && bollinger && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4">Bollinger Bands</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Upper Bound",
                      value: bollinger.upper.filter((v): v is number => v !== null).pop(),
                    },
                    {
                      label: "Lower Bound",
                      value: bollinger.lower.filter((v): v is number => v !== null).pop(),
                    },
                    {
                      label: "20 Period SMA",
                      value: bollinger.middle.filter((v): v is number => v !== null).pop(),
                    },
                  ].map((b) => (
                    <div key={b.label}>
                      <p className="text-xs text-muted-foreground">{b.label}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {b.value ? formatPrice(b.value) : "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RSI display */}
            {showRSI && lastRSI !== null && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-2">RSI (14)</h3>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-foreground">
                    {lastRSI?.toFixed(1)}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      lastRSI && lastRSI > 70
                        ? "bg-danger/10 text-danger"
                        : lastRSI && lastRSI < 30
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {lastRSI && lastRSI > 70
                      ? "Overbought"
                      : lastRSI && lastRSI < 30
                      ? "Oversold"
                      : "Neutral"}
                  </span>
                </div>
              </div>
            )}

            {/* Model Metrics */}
            {metrics && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4">Model Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Model</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">MAE</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">RMSE</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">R&sup2;</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(metrics).map(([model, m]) => (
                        <tr key={model} className="border-b border-border/50">
                          <td className="py-2 text-foreground font-medium">{model}</td>
                          <td className="text-right py-2 text-muted-foreground">
                            {m.MAE?.toFixed(2) || "N/A"}
                          </td>
                          <td className="text-right py-2 text-muted-foreground">
                            {m.RMSE?.toFixed(2) || "N/A"}
                          </td>
                          <td className="text-right py-2 text-muted-foreground">
                            {m.R2?.toFixed(4) || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price stats */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-4">Price</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-success/10 p-4 text-center">
                  <p className="text-xl font-bold text-success">
                    {latestCandle ? formatPrice(latestCandle.close) : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Current Price</p>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-4 text-center",
                    priceChange >= 0 ? "bg-success/10" : "bg-danger/10"
                  )}
                >
                  <p
                    className={cn(
                      "text-xl font-bold",
                      priceChange >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {priceChange.toFixed(2)}%{" "}
                    {priceChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 inline" />
                    ) : (
                      <TrendingDown className="w-4 h-4 inline" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Change</p>
                </div>
                <div className="rounded-xl border border-border p-4 text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {formatPrice(highOfDay)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Highest</p>
                </div>
                <div className="rounded-xl border border-border p-4 text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {formatPrice(lowOfDay)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Lowest</p>
                </div>
              </div>
            </div>

            {/* 7-Day Forecast */}
            {forecasts.length > 0 && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4">
                  7-Day Forecast ({selectedModel})
                </h3>
                <div className="space-y-2">
                  {forecasts.map((f, i) => {
                    const price = parseFloat(
                      f.Close || f.Predicted_Close || f.Forecast || "0"
                    );
                    return (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0"
                      >
                        <span className="text-xs text-muted-foreground">
                          Day {i + 1}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {price ? formatPrice(price) : "N/A"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fear & Greed */}
            {fearGreed && (
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4">Fear and Greed Index</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FearGreedGauge value={fearGreed.current.value} label="Now" />
                  <FearGreedGauge value={fearGreed.yesterday.value} label="Yesterday" />
                  <FearGreedGauge value={fearGreed.lastWeek.value} label="Last Week" />
                  <FearGreedGauge value={fearGreed.lastMonth.value} label="Last Month" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
