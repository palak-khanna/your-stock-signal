CREATE TYPE public.reason_type AS ENUM ('buy_target','event_watch','holding','exploring');

CREATE TABLE public.watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticker text NOT NULL,
  reason_type public.reason_type NOT NULL DEFAULT 'exploring',
  target_price numeric,
  target_event_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_items TO authenticated;
GRANT ALL ON public.watchlist_items TO service_role;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlist" ON public.watchlist_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.viewed_stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticker text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viewed_stocks TO authenticated;
GRANT ALL ON public.viewed_stocks TO service_role;
ALTER TABLE public.viewed_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own viewed" ON public.viewed_stocks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  price numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticker, fetched_at)
);
GRANT SELECT ON public.price_snapshots TO anon;
GRANT SELECT ON public.price_snapshots TO authenticated;
GRANT ALL ON public.price_snapshots TO service_role;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price history is public" ON public.price_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX price_snapshots_ticker_time ON public.price_snapshots (ticker, fetched_at DESC);

DO $$
DECLARE
  t record;
  i int;
  px numeric;
  drift numeric;
  shock numeric;
  d timestamptz;
BEGIN
  PERFORM setseed(0.4242);
  FOR t IN SELECT * FROM (VALUES
      ('RELIANCE.NS', 1450.0, 0.013),
      ('TCS.NS', 3210.0, 0.011),
      ('HDFCBANK.NS', 1760.0, 0.010),
      ('INFY.NS', 1605.0, 0.013),
      ('ICICIBANK.NS', 1255.0, 0.011),
      ('SBIN.NS', 820.0, 0.015),
      ('ITC.NS', 462.0, 0.009),
      ('LT.NS', 3620.0, 0.013),
      ('BHARTIARTL.NS', 1655.0, 0.012),
      ('TATAMOTORS.NS', 725.0, 0.020)
    ) AS v(ticker, base, vol)
  LOOP
    px := t.base * (0.72 + random() * 0.16);
    FOR i IN REVERSE 400..0 LOOP
      d := (date_trunc('day', now()) - (i || ' days')::interval) + interval '15 hours 30 minutes';
      IF extract(isodow FROM d) > 5 THEN CONTINUE; END IF;
      drift := (t.base - px) / t.base * 0.010;
      shock := (random() - 0.5) * 2 * t.vol;
      px := greatest(px * (1 + drift + shock), t.base * 0.4);
      INSERT INTO public.price_snapshots (ticker, price, fetched_at)
      VALUES (t.ticker, round(px::numeric, 2), d);
    END LOOP;
  END LOOP;
END $$;