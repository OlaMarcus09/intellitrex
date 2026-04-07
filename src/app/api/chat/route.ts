import { NextRequest, NextResponse } from "next/server";

const MODE_PROMPTS: Record<string, string> = {
  "risk-averse": `You are the Intellitrex Bot in Risk-Averse Mode. You focus on low-risk, long-term cryptocurrency investment strategies. Emphasize established cryptocurrencies with stable performance. Provide conservative trading analytics. Always remind users this is not financial advice.`,
  "active-trader": `You are the Intellitrex Bot in Active Trader Mode. You help frequent traders with real-time market insights, technical analysis, and short-term trading strategies. Discuss indicators like RSI, Bollinger Bands, Moving Averages. Always remind users this is not financial advice.`,
  learning: `You are the Intellitrex Bot in Learning Mode. You explain cryptocurrency concepts, trading terminology, and market mechanics in simple terms. Be educational and patient. Use analogies. Always remind users this is not financial advice and suggest paper trading before real trading.`,
};

export async function POST(req: NextRequest) {
  try {
    const { message, mode, history } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        response:
          "AI advisor is not configured yet. Please set the OPENAI_API_KEY environment variable to enable the chatbot.",
      });
    }

    const systemPrompt =
      MODE_PROMPTS[mode] || MODE_PROMPTS["active-trader"];

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10),
      { role: "user", content: message },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "I apologize, I could not generate a response. Please try again.";

    return NextResponse.json({ response: reply });
  } catch (error) {
    return NextResponse.json(
      { error: "Chat service unavailable" },
      { status: 500 }
    );
  }
}
