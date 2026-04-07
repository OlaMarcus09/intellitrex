import { NextRequest, NextResponse } from "next/server";

const REPO = "reallyticsai/Intellitrax_Workflow";

async function fetchCSV(path: string): Promise<string | null> {
  const token = process.env.GH_TOKEN;
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}`,
    {
      headers: token
        ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }
        : { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    }
  );
  if (res.status !== 200) return null;
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return content;
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() || "";
    });
    return row;
  });
}

export async function GET(req: NextRequest) {
  const pair = req.nextUrl.searchParams.get("pair") || "XBTUSD";
  const model = req.nextUrl.searchParams.get("model") || "ensemble";

  const forecastPath = `${pair}/forecasts/${model}_forecast.csv`;
  const predictionPath = `${pair}/predictions/${model}_predictions.csv`;
  const metricsPath = `${pair}/ml_metrics/ml_model_metrics.json`;

  try {
    const [forecastCSV, predictionCSV, metricsRaw] = await Promise.all([
      fetchCSV(forecastPath),
      fetchCSV(predictionPath),
      fetchCSV(metricsPath),
    ]);

    const forecasts = forecastCSV ? parseCSV(forecastCSV) : [];
    const predictions = predictionCSV ? parseCSV(predictionCSV) : [];
    let metrics = null;
    if (metricsRaw) {
      try {
        metrics = JSON.parse(metricsRaw);
      } catch {}
    }

    return NextResponse.json({ pair, model, forecasts, predictions, metrics });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch forecasts" }, { status: 500 });
  }
}
