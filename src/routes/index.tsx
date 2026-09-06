import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMarketSnapshot } from "@/lib/market.functions";
import { computeRelevance, type ReasonType } from "@/lib/relevance";
import { SEED_TICKERS, getStock, shortTicker } from "@/lib/stocks";
import { StockRow, LogoTile } from "@/components/StockRow";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  head: () => ({
    meta: [
      { title: "Your watchlist — Signal" },
      {
        name: "description",
        content:
          "Signal sorts your Indian stock watchlist by what actually needs a look today, based on why you're watching each stock.",
      },
      { property: "og:title", content: "Your watchlist — Signal" },
      { property: "og:description", content: "A calmer watchlist for Indian stocks." },
    ],
  }),
  component: Dashboard,
});

type WatchItem = {
  ticker: string;
  reason_type: ReasonType;
  target_price: number | null;
  target_event_date: string | null;
};

async function loadWatchlist(userId: string): Promise<WatchItem[]> {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("ticker, reason_type, target_price, target_event_date")
    .order("created_at", { ascending: true });
  if (error) throw error;

  if (data && data.length > 0) {
    return data.map((d) => ({
      ticker: d.ticker,
      reason_type: d.reason_type as ReasonType,
      target_price: d.target_price === null ? null : Number(d.target_price),
      target_event_date: d.target_event_date,
    }));
  }

  // First visit: start people off with ten well-known Indian stocks.
  const snapshot = await getMarketSnapshot({ data: { tickers: SEED_TICKERS } });
  const priceOf = (t: string) => snapshot.find((s) => s.ticker === t)?.price ?? 0;
  const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const plan: Record<string, Partial<WatchItem> & { reason_type: ReasonType }> = {
    "RELIANCE.NS": { reason_type: "buy_target", target_price: +(priceOf("RELIANCE.NS") * 0.985).toFixed(2) },
    "TCS.NS": { reason_type: "holding" },
    "HDFCBANK.NS": { reason_type: "event_watch", target_event_date: inDays(2) },
    "INFY.NS": { reason_type: "exploring" },
    "ICICIBANK.NS": { reason_type: "buy_target", target_price: +(priceOf("ICICIBANK.NS") * 0.9).toFixed(2) },
    "SBIN.NS": { reason_type: "exploring" },
    "ITC.NS": { reason_type: "holding" },
    "LT.NS": { reason_type: "event_watch", target_event_date: inDays(14) },
    "BHARTIARTL.NS": { reason_type: "exploring" },
    "TATAMOTORS.NS": { reason_type: "buy_target", target_price: +(priceOf("TATAMOTORS.NS") * 1.01).toFixed(2) },
  };

  const rows = SEED_TICKERS.map((ticker) => ({
    user_id: userId,
    ticker,
    reason_type: plan[ticker]!.reason_type,
    target_price: plan[ticker]!.target_price ?? null,
    target_event_date: plan[ticker]!.target_event_date ?? null,
  }));

  await supabase.from("watchlist_items").insert(rows);
  return rows.map((r) => ({
    ticker: r.ticker,
    reason_type: r.reason_type,
    target_price: r.target_price,
    target_event_date: r.target_event_date,
  }));
}

function Dashboard() {
  const { userId } = Route.useRouteContext();
  const [showQuiet, setShowQuiet] = useState(false);

  const watchlist = useQuery({
    queryKey: ["watchlist", userId],
    queryFn: () => loadWatchlist(userId),
  });

  const tickers = useMemo(() => (watchlist.data ?? []).map((w) => w.ticker), [watchlist.data]);

  const market = useQuery({
    queryKey: ["market", tickers],
    enabled: tickers.length > 0,
    staleTime: 60_000,
    queryFn: () => getMarketSnapshot({ data: { tickers } }),
  });

  const viewed = useQuery({
    queryKey: ["viewed", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("viewed_stocks")
        .select("ticker, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const scored = useMemo(() => {
    if (!watchlist.data || !market.data) return [];
    return watchlist.data
      .map((item) => {
        const m = market.data.find((x) => x.ticker === item.ticker);
        if (!m || !m.price) {
          return {
            item,
            market: { ticker: item.ticker, price: 0, prevClose: 0, closes: [] },
            relevance: { score: 0, worthALook: false, changePct: 0, reasons: ["Price data loading — check back shortly"] },
          };
        }
        const relevance = computeRelevance({
          closes: m.closes,
          price: m.price,
          prevClose: m.prevClose,
          reason: item.reason_type,
          targetPrice: item.target_price,
          eventDate: item.target_event_date,
        });
        return { item, market: m, relevance };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.relevance.score - a.relevance.score);
  }, [watchlist.data, market.data]);

  const worth = scored.filter((s) => s.relevance.worthALook);
  const quiet = scored.filter((s) => !s.relevance.worthALook);
  const loading = watchlist.isLoading || (market.isLoading && tickers.length > 0);

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="page-shell pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight">Your Watchlist</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {loading ? "Checking prices…" : `${worth.length} of ${scored.length} stocks need a look today`}
            </p>
          </div>
          <Link
            to="/add"
            className="inline-flex h-10 shrink-0 items-center rounded-md px-4 text-[13px] font-semibold transition-colors"
            style={{ backgroundColor: "var(--color-primary)", color: "#0B3B2E" }}
          >
            + Add stock
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <section className="mt-7">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Worth a look
              </h2>
              {worth.length === 0 ? (
                <p className="row-divider py-5 text-[13px] text-muted-foreground">
                  Nothing unusual today. Your watchlist is behaving normally.
                </p>
              ) : (
                <div className="mt-1">
                  {worth.map(({ item, market: m, relevance }) => (
                    <div key={item.ticker} className="row-divider py-1">
                      <div className="[&>a]:border-b-0">
                        <StockRow
                          ticker={item.ticker}
                          price={m.price}
                          changePct={relevance.changePct}
                          closes={m.closes}
                        />
                      </div>
                      <p
                        className="-mt-1 mb-2 ml-[48px] pr-2 text-[12px] leading-snug"
                        style={{ color: "var(--color-primary-dark)" }}
                      >
                        {relevance.reasons[0]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <button
                onClick={() => setShowQuiet((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-left"
              >
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Everything else ({quiet.length})
                </h2>
                <span className="text-[12px] text-muted-foreground">{showQuiet ? "Hide" : "Show"}</span>
              </button>
              {showQuiet ? (
                <div className="mt-1">
                  {quiet.map(({ item, market: m, relevance }) => (
                    <StockRow
                      key={item.ticker}
                      ticker={item.ticker}
                      price={m.price}
                      changePct={relevance.changePct}
                      closes={m.closes}
                      dim
                      note="quiet"
                    />
                  ))}
                </div>
              ) : (
                <div className="row-divider flex flex-wrap gap-2 py-3">
                  {quiet.map(({ item, relevance }) => (
                    <Link
                      key={item.ticker}
                      to="/stock/$ticker"
                      params={{ ticker: shortTicker(item.ticker) }}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted"
                    >
                      {shortTicker(item.ticker)}
                      <span
                        style={{
                          color:
                            relevance.changePct >= 0 ? "var(--color-positive)" : "var(--color-negative)",
                        }}
                      >
                        {relevance.changePct >= 0 ? "+" : ""}
                        {relevance.changePct.toFixed(2)}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {viewed.data && viewed.data.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Previously viewed
                </h2>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                  {viewed.data.map((v) => (
                    <Link
                      key={v.ticker}
                      to="/stock/$ticker"
                      params={{ ticker: shortTicker(v.ticker) }}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted"
                    >
                      <LogoTile ticker={v.ticker} size={20} />
                      {getStock(v.ticker).name.split(" ")[0]}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
