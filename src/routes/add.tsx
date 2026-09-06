import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STOCK_UNIVERSE, getStock, shortTicker } from "@/lib/stocks";
import { LogoTile } from "@/components/StockRow";
import { AppHeader } from "@/components/AppHeader";
import type { ReasonType } from "@/lib/relevance";

export const Route = createFileRoute("/add")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  head: () => ({
    meta: [
      { title: "Add a stock — Signal" },
      {
        name: "description",
        content: "Add an Indian stock to your Signal watchlist and say why you're watching it.",
      },
      { property: "og:title", content: "Add a stock — Signal" },
      { property: "og:description", content: "Tell Signal why you're watching a stock." },
    ],
  }),
  component: AddStock,
});

const REASONS: { value: ReasonType; label: string; hint: string }[] = [
  { value: "buy_target", label: "Waiting to buy at a price", hint: "We'll nudge you as it gets close" },
  { value: "event_watch", label: "Watching for an upcoming event", hint: "Results, dividend, anything dated" },
  { value: "holding", label: "I already hold this", hint: "We'll stay quiet on ordinary days" },
  { value: "exploring", label: "Just exploring", hint: "Only unusual moves will show up" },
];

function AddStock() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState<ReasonType>("buy_target");
  const [targetPrice, setTargetPrice] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STOCK_UNIVERSE.slice(0, 8);
    return STOCK_UNIVERSE.filter(
      (s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const save = async () => {
    if (!selected) return;
    if (reason === "buy_target") {
      const n = Number(targetPrice);
      if (!targetPrice || !isFinite(n) || n <= 0) {
        toast.error("Enter the price you'd like to buy at.");
        return;
      }
    }
    if (reason === "event_watch" && !eventDate) {
      toast.error("Pick the date you're watching for.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("watchlist_items").insert({
      user_id: userId,
      ticker: selected,
      reason_type: reason,
      target_price: reason === "buy_target" ? Number(targetPrice) : null,
      target_event_date: reason === "event_watch" ? eventDate : null,
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "That stock is already on your watchlist." : "Could not save. Try again.",
      );
      return;
    }

    const { getMarketSnapshot } = await import("@/lib/market.functions");
    const snap = await getMarketSnapshot({ data: { tickers: [selected] } });
    const price = snap[0]?.price;
    if (price) {
      await supabase.from("price_snapshots").insert({ ticker: selected, price });
    }
    
    await queryClient.invalidateQueries({ queryKey: ["watchlist", userId] });
    toast.success(`${getStock(selected).name} added to your watchlist`);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="page-shell pt-6">
        <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← Back to watchlist
        </Link>
        <h1 className="mt-3 text-[20px] font-semibold tracking-tight">Add a stock</h1>

        <div className="mt-5">
          <label htmlFor="search" className="text-[12px] font-medium text-muted-foreground">
            Search by company name or symbol
          </label>
          <input
            id="search"
            value={selected ? getStock(selected).name : query}
            maxLength={60}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
            placeholder="Reliance, TCS, INFY…"
            className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none transition-colors focus:border-primary"
          />
        </div>

        {!selected ? (
          <div className="mt-2">
            {matches.map((s) => (
              <button
                key={s.ticker}
                onClick={() => setSelected(s.ticker)}
                className="row-divider flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-muted"
              >
                <LogoTile ticker={s.ticker} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{s.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {shortTicker(s.ticker)} · {s.exchange}
                  </span>
                </span>
              </button>
            ))}
            {matches.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">No matches. Try another name.</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-7">
              <h2 className="text-[15px] font-semibold">Why are you watching this?</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                This is what decides when we bring it back to your attention.
              </p>
              <div className="mt-3 grid gap-2">
                {REASONS.map((r) => {
                  const active = reason === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      className="flex items-start gap-3 rounded-md border p-3 text-left transition-colors"
                      style={{
                        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                        backgroundColor: active ? "var(--color-accent)" : "transparent",
                      }}
                    >
                      <span
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                        style={{ borderColor: active ? "var(--color-primary-dark)" : "var(--color-border)" }}
                      >
                        {active ? (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: "var(--color-primary-dark)" }}
                          />
                        ) : null}
                      </span>
                      <span>
                        <span className="block text-[14px] font-medium">{r.label}</span>
                        <span className="block text-[12px] text-muted-foreground">{r.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {reason === "buy_target" ? (
              <div className="mt-5">
                <label htmlFor="target" className="text-[12px] font-medium text-muted-foreground">
                  Your buy price (₹)
                </label>
                <input
                  id="target"
                  type="number"
                  min="0"
                  step="0.05"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 1250"
                  className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
                />
              </div>
            ) : null}

            {reason === "event_watch" ? (
              <div className="mt-5">
                <label htmlFor="date" className="text-[12px] font-medium text-muted-foreground">
                  Date you're watching for
                </label>
                <input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
                />
              </div>
            ) : null}

            <button
              onClick={save}
              disabled={saving}
              className="mt-7 h-11 w-full rounded-md text-[14px] font-semibold transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", color: "#0B3B2E" }}
            >
              Save to watchlist
            </button>
          </>
        )}
      </main>
    </div>
  );
}
