# Signal Watch

Build "Signal" — a smart stock watchlist web app for Indian retail investors, styled closely after Groww's actual app (India's largest stock broker app).

CORE CONCEPT

Unlike a normal watchlist that shows every stock with equal weight, this app asks the user WHY they're watching each stock, and uses that stated reason — combined with the stock's own normal volatility and real price movement — to decide what deserves their attention when they return. The home screen should never be a flat list; it should always separate "Worth a look" (few important stocks) from "Everything else" (quiet, collapsed).

DESIGN LANGUAGE (match Groww closely — this is non-negotiable)

- Primary brand green: #00D09A (buttons, positive changes, active states)

- Secondary green (hover/darker): #00B386

- Negative/red for price drops: #EB5B3C (a warm coral-red, NOT pure red)

- Heading/text color: dark navy #2B2D42, not pure black

- Muted secondary text: #6B7280

- Borders: hairline #E5E7EB, no heavy drop shadows

- Font: Poppins (Google Font), weights 400/500/600/700

- Layout: clean table/list rows with hairline dividers (not heavy rounded cards), each stock row has: a small colored square logo/initials tile, company name + exchange, an inline mini sparkline chart, current price, and % change with an up/down arrow colored green or red

- Mobile-first, max content width ~700-900px centered on desktop

- Overall feel: clean, minimal, trustworthy fintech — like Groww's real "All Stocks" screener table and stock detail pages, NOT a generic SaaS dashboard with big rounded cards and shadows

PAGES NEEDED

1. LOGIN

Simple email + password (or magic link) login screen. Clean centered card, Groww-style branding.

2. DASHBOARD (home)

- Header: "Your Watchlist" + green "+ Add stock" button

- Section "Worth a look": stocks whose relevance score is high — shown prominently with the reason they're flagged (e.g. "Within 3% of your target price", "Unusual move for this stock", "Event in 2 days")

- Section "Everything else": quiet stocks, collapsed/lower emphasis, still visible and clickable

- Section "Previously viewed": horizontal scrollable chips of recently viewed stocks

- Each row: ticker, current price, % change (green/red arrow), inline sparkline

3. ADD STOCK

- Search input (autocomplete stock search by name or ticker, Indian NSE stocks)

- After selecting a stock, ask: "Why are you watching this?" with 4 selectable options as radio/cards:

  - "Waiting to buy at a price" → shows a target price input

  - "Watching for an upcoming event" → shows a date picker

  - "I already hold this"

  - "Just exploring"

- Save button

4. STOCK DETAIL PAGE

- Large current price + % change since last check-in

- A real price chart (line or candlestick) with selectable time ranges: 1D, 1W, 1M, 3M, 1Y — matching Groww's stock detail chart style (green line with light green fill gradient below it when trending up, red when down)

- "Normal daily swing for this stock: ±X%" (volatility, computed from price history)

- "Your reason": shows what the user selected when adding it, plus progress toward it if it's a buy target or event date

- A "Why it's flagged" plain-language explanation section

- A small news headlines section for this stock (2-3 recent headlines)

DATA / BACKEND

Use Supabase (Postgres + Auth) as the backend. Tables needed:

- watchlist_items: id, user_id, ticker, reason_type (buy_target/event_watch/holding/exploring), target_price, target_event_date, created_at

- price_snapshots: id, ticker, price, fetched_at (used to compute "change since last check-in" and populate charts)

- viewed_stocks: id, user_id, ticker, viewed_at (for "previously viewed")

Enable Row Level Security so users only see their own watchlist_items and viewed_stocks.

Fetch real Indian stock prices and historical data from Yahoo Finance (tickers use .NS suffix, e.g. RELIANCE.NS, TCS.NS, INFY.NS). Seed the watchlist with 10 real, well-known Indian stocks (Reliance, TCS, HDFC Bank, Infosys, ICICI Bank, SBI, ITC, L&T, Bharti Airtel, Tata Motors) with realistic historical price data so charts and change indicators look genuine on first load.

RELEVANCE SCORING LOGIC (this is the core differentiator, implement it as real logic, not a placeholder)

For each stock, compute a relevance score using:

1. How unusual today's price move is relative to that stock's own historical volatility (not a flat % threshold)

2. Whether it matches the user's stated reason (e.g. price is close to their buy target, or an event date is approaching)

3. Boost scores near a stated buy target or approaching event date; dampen scores for "holding" reason type on small moves (holders shouldn't be bothered by daily noise)

Stocks scoring above a threshold appear in "Worth a look"; others appear collapsed under "Everything else."

TONE

Calm and clear, not alarming. Avoid heavy red/urgent styling except for genuine price drops. Copy should be plain language, no jargon, written for a first-time investor.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4dc3e12f-ad9e-48d2-b904-e7d7946a1203).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
