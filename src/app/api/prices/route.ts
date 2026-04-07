import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const pair = req.nextUrl.searchParams.get("pair") || "XXBTZUSD";
  const interval = req.nextUrl.searchParams.get("interval") || "1440"; // daily

  try {
    const res = await fetch(
      `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();

    if (data.error && data.error.length > 0) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    const resultKey = Object.keys(data.result).find((k) => k !== "last");
    if (!resultKey) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    const candles = data.result[resultKey].map(
      (c: [number, string, string, string, string, string, string, number]) => ({
        time: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[6]),
      })
    );

    return NextResponse.json({ pair: resultKey, candles });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
