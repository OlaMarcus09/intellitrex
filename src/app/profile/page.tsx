"use client";

import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Link2,
  LogOut,
  Crown,
  MessageSquare,
  Lock,
  CreditCard,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type Holding = {
  asset: string;
  quantity: number;
  supported: boolean;
};

type Insight = {
  asset: string;
  quantity: number;
  forecastedChange?: number;
  signal: string;
  insight: string;
};

type PortfolioData = {
  totalAssets: number;
  supportedAssets: number;
  holdings: Holding[];
  insights: Insight[];
};

const SIGNAL_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; bg: string; label: string }> = {
  bullish: { icon: TrendingUp, color: "text-success", bg: "bg-success/10", label: "Bullish" },
  bearish: { icon: TrendingDown, color: "text-danger", bg: "bg-danger/10", label: "Bearish" },
  neutral: { icon: Minus, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Neutral" },
  hold: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted", label: "Hold" },
};

const PREMIUM_FEATURES = [
  "Unlimited AI chatbot conversations",
  "Binance portfolio integration & analysis",
  "Personalized investment insights with forecasts",
  "Advanced model selection (XGBoost, Prophet, NHITS, GRU)",
  "Priority access to new features",
  "Chat history across sessions",
];

function PremiumUpgradeCard() {
  const { upgradeToPremium, premiumPrice } = useAuth();
  const [processing, setProcessing] = useState(false);

  const handleUpgrade = () => {
    setProcessing(true);
    // In production: redirect to Stripe Checkout
    setTimeout(() => {
      upgradeToPremium();
      setProcessing(false);
    }, 1500);
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 via-card to-yellow-500/5 rounded-2xl border border-primary/20 p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
          <Crown className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Intellitrex Premium</h3>
          <p className="text-sm text-muted-foreground">Unlock the full trading experience</p>
        </div>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-foreground">$99.99</span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <ul className="space-y-3 mb-8">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-success flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={handleUpgrade}
        disabled={processing}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" /> Subscribe to Premium
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Cancel anytime. Powered by Stripe.
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const {
    user,
    isLoggedIn,
    isPremium,
    chatCount,
    chatLimit,
    signInWithGoogle,
    signOut,
    getChatSessions,
    setBinanceConnected,
    premiumPrice,
  } = useAuth();

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "portfolio" | "subscription">("overview");

  const chatSessions = getChatSessions();

  const connectBinance = async () => {
    if (!isPremium) return;
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError("Both API Key and Secret are required");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect to Binance");
        setLoading(false);
        return;
      }
      setPortfolio(data);
      setBinanceConnected(true);
    } catch {
      setError("Connection failed. Please check your credentials.");
    }
    setLoading(false);
  };

  // Not logged in — show sign-in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen py-8 px-6">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Sign in to Intellitrex
            </h1>
            <p className="text-muted-foreground text-sm mb-8">
              Access your profile, chat history, portfolio analysis, and more.
            </p>

            <button
              onClick={signInWithGoogle}
              className="w-full py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center gap-3 font-medium text-foreground"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>

            <p className="text-xs text-muted-foreground mt-6">
              Free tier includes 50 AI chatbot responses. Upgrade to Premium for unlimited access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-14 h-14 rounded-full"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{user?.name}</h1>
                  {isPremium && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full text-xs font-medium">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          {/* Usage bar for free users */}
          {!isPremium && (
            <div className="mt-4 p-4 bg-muted rounded-xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  Chat usage: {chatCount}/{chatLimit}
                </span>
                <span className="text-primary text-xs font-medium">
                  {chatLimit - chatCount} remaining
                </span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((chatCount / chatLimit) * 100, 100)}%` }}
                />
              </div>
              {chatCount >= chatLimit && (
                <p className="text-xs text-danger mt-2">
                  You&apos;ve reached your free limit. Upgrade to Premium for unlimited chats.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(
            [
              { id: "overview" as const, label: "Overview", icon: MessageSquare },
              { id: "history" as const, label: "Chat History", icon: MessageSquare },
              { id: "portfolio" as const, label: "Portfolio", icon: Wallet, premium: true },
              { id: "subscription" as const, label: "Subscription", icon: Crown },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {"premium" in tab && tab.premium && !isPremium && (
                  <Lock className="w-3 h-3 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{chatCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Chats</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{chatSessions.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Chat Sessions</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-3xl font-bold text-foreground capitalize">{user?.tier}</p>
              <p className="text-sm text-muted-foreground mt-1">Current Plan</p>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Chat History</h3>
            {chatSessions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No chat history yet. Start a conversation in the{" "}
                <a href="/consultancy" className="text-primary hover:underline">
                  Consultancy
                </a>{" "}
                page.
              </p>
            ) : (
              <div className="space-y-3">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-foreground">
                        {session.title || "Untitled conversation"}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.messages.length} messages &middot; Mode: {session.mode}
                    </p>
                    {session.messages.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Last: {session.messages[session.messages.length - 1].content.slice(0, 80)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "portfolio" && (
          <>
            {!isPremium ? (
              <div className="max-w-lg mx-auto">
                <PremiumUpgradeCard />
              </div>
            ) : !portfolio ? (
              <div className="bg-card rounded-2xl border border-border p-8 max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Connect Binance</h2>
                    <p className="text-xs text-muted-foreground">
                      Read-only API access for portfolio analysis
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Binance API Key"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      API Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter your Binance API Secret"
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-danger text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={connectBinance}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4" /> Connect & Analyze
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-xl">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Security Note</p>
                      <ul className="space-y-1">
                        <li>Use a read-only API key (no trading permissions)</li>
                        <li>Your credentials are never stored on our servers</li>
                        <li>Analysis is performed in real-time and discarded</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Portfolio Dashboard */
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <h2 className="text-lg font-semibold text-foreground">Binance Connected</h2>
                    </div>
                    <button
                      onClick={() => { setPortfolio(null); setBinanceConnected(false); }}
                      className="text-xs text-muted-foreground hover:text-danger transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{portfolio.totalAssets}</p>
                      <p className="text-xs text-muted-foreground">Total Assets</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{portfolio.supportedAssets}</p>
                      <p className="text-xs text-muted-foreground">With Forecasts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{portfolio.insights.length}</p>
                      <p className="text-xs text-muted-foreground">Insights</p>
                    </div>
                  </div>
                </div>

                {portfolio.insights.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Investment Analysis</h3>
                    <div className="space-y-4">
                      {portfolio.insights.map((insight, i) => {
                        const config = SIGNAL_CONFIG[insight.signal] || SIGNAL_CONFIG.hold;
                        const Icon = config.icon;
                        return (
                          <div key={i} className="rounded-xl border border-border p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-foreground">{insight.asset}</span>
                                <span className="text-sm text-muted-foreground">{insight.quantity} held</span>
                              </div>
                              <span className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium", config.bg, config.color)}>
                                <Icon className="w-3.5 h-3.5" />
                                {config.label}
                                {insight.forecastedChange !== undefined && ` (${insight.forecastedChange > 0 ? "+" : ""}${insight.forecastedChange.toFixed(1)}%)`}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{insight.insight}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">All Holdings</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium">Asset</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Quantity</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Forecast</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((h, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 text-foreground font-medium">{h.asset}</td>
                          <td className="text-right py-2.5 text-muted-foreground">{h.quantity.toFixed(6)}</td>
                          <td className="text-right py-2.5">
                            {h.supported ? <span className="text-success text-xs">Available</span> : <span className="text-muted-foreground text-xs">N/A</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "subscription" && (
          <div className="max-w-lg mx-auto">
            {isPremium ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">You&apos;re on Premium!</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Enjoy unlimited AI conversations, portfolio analysis, and all premium features.
                </p>
                <div className="bg-muted rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="text-foreground font-medium">Premium</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground font-medium">{premiumPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chat Limit</span>
                    <span className="text-foreground font-medium">Unlimited</span>
                  </div>
                </div>
              </div>
            ) : (
              <PremiumUpgradeCard />
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            This platform is for informational purposes only and does not constitute financial
            advice. Trading cryptocurrency involves substantial risk.
          </p>
        </div>
      </div>
    </div>
  );
}
