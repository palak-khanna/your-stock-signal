import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Point = { t: number; c: number };

export type Series = {
  ticker: string;
  points: Point[];
  price: number;
  prevClose: number;
  source: "live" | "history";
};

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
};

function serverSupabase() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function yahooChart(ticker: string, rangeKey: string): Promise<Series | null> {
  const cfg = RANGE_MAP[rangeKey] ?? RANGE_MAP["3M"]!;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?range=${cfg.range}&interval=${cfg.interval}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const stamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const points: Point[] = [];
    for (let i = 0; i < stamps.length; i++) {
      const c = closes[i];
      if (typeof c === "number" && isFinite(c)) points.push({ t: stamps[i]! * 1000, c: +c.toFixed(2) });
    }
    if (points.length < 2) return null;
    const meta = result.meta ?? {};
    const price = typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : points[points.length - 1]!.c;
    const prevClose =
      typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
          ? meta.previousClose
          : points[0]!.c;
    return { ticker, points, price: +price.toFixed(2), prevClose: +prevClose.toFixed(2), source: "live" };
  } catch {
    return null;
  }
}

const DAY_LIMITS: Record<string, number> = { "1D": 2, "1W": 6, "1M": 23, "3M": 66, "1Y": 260 };

async function historySeries(ticker: string, rangeKey: string): Promise<Series> {
  const limit = DAY_LIMITS[rangeKey] ?? 66;
  const supabase = serverSupabase();
  const { data } = await supabase
    .from("price_snapshots")
    .select("price, fetched_at")
    .eq("ticker", ticker)
    .order("fetched_at", { ascending: false })
    .limit(Math.max(limit, 2));

  const rows = (data ?? []).slice().reverse();
  const points: Point[] = rows.map((r) => ({
    t: new Date(r.fetched_at).getTime(),
    c: Number(r.price),
  }));
  const price = points.length ? points[points.length - 1]!.c : 0;
  const prevClose = points.length > 1 ? points[points.length - 2]!.c : price;
  return { ticker, points, price, prevClose, source: "history" };
}

export async function getSeries(ticker: string, rangeKey: string): Promise<Series> {
  const live = await yahooChart(ticker, rangeKey);
  if (live) return live;
  return historySeries(ticker, rangeKey);
}

/** Daily closes over ~6 months, used for volatility maths and sparklines. */
export async function getDailyCloses(ticker: string): Promise<Series> {
  const live = await yahooChart(ticker, "3M");
  if (live && live.points.length >= 20) return live;
  return historySeries(ticker, "3M");
}

export type Headline = { title: string; publisher: string; link: string; publishedAt: number | null };

export async function getHeadlines(ticker: string): Promise<Headline[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    ticker,
  )}&newsCount=4&quotesCount=0`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const news: any[] = json?.news ?? [];
    return news.slice(0, 3).map((n) => ({
      title: String(n.title ?? ""),
      publisher: String(n.publisher ?? "News"),
      link: String(n.link ?? "#"),
      publishedAt: typeof n.providerPublishTime === "number" ? n.providerPublishTime * 1000 : null,
    }));
  } catch {
    return [];
  }
}
