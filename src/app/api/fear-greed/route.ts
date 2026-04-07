import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=30", {
      next: { revalidate: 3600 },
    });
    const data = await res.json();

    const entries = data.data.map(
      (d: { value: string; value_classification: string; timestamp: string }) => ({
        value: parseInt(d.value),
        classification: d.value_classification,
        date: new Date(parseInt(d.timestamp) * 1000).toISOString().split("T")[0],
      })
    );

    return NextResponse.json({
      current: entries[0],
      yesterday: entries[1],
      lastWeek: entries[7] || entries[entries.length - 1],
      lastMonth: entries[29] || entries[entries.length - 1],
      history: entries,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch Fear & Greed" }, { status: 500 });
  }
}
