import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getStockSeries, getStockHeadlines } from "@/lib/market.functions";
import { computeRelevance, daysUntil, type ReasonType } from "@/lib/relevance";
import { formatINR, getStock, shortTicker } from "@/lib/stocks";
import { ChangeText, LogoTile } from "@/components/StockRow";
import { AppHeader } from "@/components/AppHeader";

const RANGES = ["1D", "1W", "1M", "3M", "1Y"] as const;
type RangeKey = (typeof RANGES)[number];

export const Route = createFileRoute("/stock/$ticker")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  head: ({ params }) => {
    const stock = getStock(params.ticker + ".NS");
    return {
      meta: [
        { title: `${stock.name} (${params.ticker}) — Signal` },
        {
          name: "description",
          content: `${stock.name} price, normal daily swing, your reason for watching it and why Signal flagged it.`,
        },
        { property: "og:title", content: `${stock.name} — Signal` },
        {
          property: "og:description",
          content: `Live ${stock.name} price on NSE, with a plain-language read on today's move.`,
        },
      ],
    };
  },
  component: StockDetail,
});

const REASON_LABEL: Record<ReasonType, string> = {
  buy_target: "Waiting to buy at a price",
  event_watch: "Watching for an upcoming event",
  holding: "You already hold this",
  exploring: "Just exploring",
};

function StockDetail() {
  const { ticker: short } = Route.useParams();
  const { userId } = Route.useRouteContext();
  const fullTicker = short.toUpperCase() + ".NS";
  const stock = getStock(fullTicker);
  const [range, setRange] = useState<RangeKey>("1M");

  useEffect(() => {
    supabase
      .from("viewed_stocks")
      .upsert({ user_id: userId, ticker: fullTicker, viewed_at: new Date().toISOString() }, { onConflict: "user_id,ticker" })
      .then(() => undefined);
  }, [userId, fullTicker]);

  const series = useQuery({
    queryKey: ["series", fullTicker, range],
    staleTime: 60_000,
    queryFn: () => getStockSeries({ data: { ticker: fullTicker, range } }),
  });

  const news = useQuery({
    queryKey: ["news", fullTicker],
    staleTime: 10 * 60_000,
    queryFn: () => getStockHeadlines({ data: { ticker: fullTicker } }),
  });

  const watch = useQuery({
    queryKey: ["watch-item", userId, fullTicker],
    queryFn: async () => {
      const { data } = await supabase
        .from("watchlist_items")
        .select("reason_type, target_price, target_event_date")
        .eq("ticker", fullTicker)
        .maybeSingle();
      return data;
    },
  });

  const relevance =
    series.data && series.data.price
      ? computeRelevance({
          closes: series.data.closes,
          price: series.data.price,
          prevClose: series.data.prevClose,
          reason: (watch.data?.reason_type as ReasonType) ?? "exploring",
          targetPrice: watch.data?.target_price === undefined ? null : Number(watch.data?.target_price),
          eventDate: watch.data?.target_event_date ?? null,
        })
      : null;

  const up = (relevance?.changePct ?? 0) >= 0;
  const lineColor = up ? "var(--color-positive)" : "var(--color-negative)";
  const chartData = (series.data?.points ?? []).map((p) => ({
    t: p.t,
    c: p.c,
  }));

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <main className="page-shell pt-5">
        <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← Back to watchlist
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <LogoTile ticker={fullTicker} size={40} />
          <div>
            <h1 className="text-[18px] font-semibold leading-tight">{stock.name}</h1>
            <p className="text-[12px] text-muted-foreground">
              {shortTicker(fullTicker)} · {stock.exchange}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[28px] font-semibold tabular-nums leading-none">
            {series.data?.price ? formatINR(series.data.price) : "—"}
          </p>
          <p className="mt-1.5 text-[13px]">
            {relevance ? (
              <>
                <ChangeText changePct={relevance.changePct} className="font-medium" />{" "}
                <span className="text-muted-foreground">since your last check-in</span>
              </>
            ) : (
              <span className="text-muted-foreground">Loading price…</span>
            )}
          </p>
        </div>

        <div className="mt-4 h-[220px] w-full">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                    fontFamily: "Poppins, sans-serif",
                  }}
                  labelFormatter={(v) => new Date(Number(v)).toLocaleString("en-IN")}
                  formatter={(v) => [formatINR(Number(v)), "Price"]}
                />
                <Area
                  type="monotone"
                  dataKey="c"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#fill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full animate-pulse rounded-md bg-muted" />
          )}
        </div>

        <div className="row-divider flex gap-1 pb-3">
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="h-8 rounded-md px-3 text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: active ? "var(--color-accent)" : "transparent",
                  color: active ? "var(--color-primary-dark)" : "var(--color-muted-foreground)",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {relevance ? (
          <p className="row-divider py-4 text-[13px]">
            <span className="text-muted-foreground">Normal daily swing for this stock: </span>
            <span className="font-medium">±{relevance.normalSwingPct.toFixed(1)}%</span>
            <span className="text-muted-foreground">
              {" "}
              — today's move is {relevance.zScore.toFixed(1)}× that.
            </span>
          </p>
        ) : null}

        <section className="row-divider py-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your reason
          </h2>
          {watch.data ? (
            <>
              <p className="mt-2 text-[14px] font-medium">
                {REASON_LABEL[watch.data.reason_type as ReasonType]}
              </p>
              {watch.data.reason_type === "buy_target" && watch.data.target_price && series.data?.price ? (
                <BuyTargetProgress
                  price={series.data.price}
                  target={Number(watch.data.target_price)}
                />
              ) : null}
              {watch.data.reason_type === "event_watch" && watch.data.target_event_date ? (
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {(() => {
                    const d = daysUntil(watch.data!.target_event_date!);
                    const when = new Date(watch.data!.target_event_date! + "T00:00:00").toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    );
                    if (d > 0) return `${when} — ${d} day${d === 1 ? "" : "s"} to go.`;
                    if (d === 0) return `${when} — that's today.`;
                    return `${when} — that date has passed.`;
                  })()}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              This stock isn't on your watchlist yet.{" "}
              <Link to="/add" className="font-medium" style={{ color: "var(--color-primary-dark)" }}>
                Add it
              </Link>{" "}
              to say why you're watching it.
            </p>
          )}
        </section>

        <section className="row-divider py-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why it's flagged
          </h2>
          {relevance && relevance.reasons.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {relevance.reasons.map((r) => (
                <li key={r} className="text-[13px] leading-relaxed">
                  • {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              Nothing unusual here. Today's move is well within what this stock normally does, and nothing
              you asked to be told about has happened.
            </p>
          )}
        </section>

        <section className="py-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            In the news
          </h2>
          {news.data && news.data.length > 0 ? (
            <div className="mt-1">
              {news.data.map((n) => (
                <a
                  key={n.link}
                  href={n.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="row-divider block py-3 transition-colors hover:bg-muted/60"
                >
                  <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {n.publisher}
                    {n.publishedAt ? ` · ${new Date(n.publishedAt).toLocaleDateString("en-IN")}` : ""}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {news.isLoading ? "Looking for headlines…" : "No recent headlines for this stock right now."}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function BuyTargetProgress({ price, target }: { price: number; target: number }) {
  const gapPct = ((price - target) / target) * 100;
  const reached = price <= target;
  const progress = Math.max(0, Math.min(100, 100 - Math.abs(gapPct) * 5));
  return (
    <div className="mt-2">
      <p className="text-[13px] text-muted-foreground">
        Your buy price is {formatINR(target)}.{" "}
        {reached ? (
          <span style={{ color: "var(--color-primary-dark)" }}>It's there now.</span>
        ) : (
          <>It's {Math.abs(gapPct).toFixed(1)}% above that right now.</>
        )}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${reached ? 100 : progress}%`,
            backgroundColor: "var(--color-primary)",
          }}
        />
      </div>
    </div>
  );
}
