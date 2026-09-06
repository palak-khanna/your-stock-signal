import { Link } from "@tanstack/react-router";
import { getStock, initials, shortTicker, formatINR } from "@/lib/stocks";
import { Sparkline } from "@/components/Sparkline";

export function LogoTile({ ticker, size = 36 }: { ticker: string; size?: number }) {
  const stock = getStock(ticker);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tracking-wide"
      style={{
        width: size,
        height: size,
        backgroundColor: stock.tile,
        color: "#FFFFFF",
      }}
      aria-hidden
    >
      {initials(stock.name)}
    </span>
  );
}

export function ChangeText({ changePct, className = "" }: { changePct: number; className?: string }) {
  const up = changePct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums ${className}`}
      style={{ color: up ? "var(--color-positive)" : "var(--color-negative)" }}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {up ? "+" : ""}
      {changePct.toFixed(2)}%
    </span>
  );
}

type Props = {
  ticker: string;
  price: number;
  changePct: number;
  closes: number[];
  note?: string;
  dim?: boolean;
};

export function StockRow({ ticker, price, changePct, closes, note, dim }: Props) {
  const stock = getStock(ticker);
  const up = changePct >= 0;

  return (
    <Link
      to="/stock/$ticker"
      params={{ ticker: shortTicker(ticker) }}
      className="row-divider flex items-center gap-3 px-1 py-3.5 transition-colors hover:bg-muted/70"
    >
      <LogoTile ticker={ticker} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14px] font-medium ${dim ? "text-foreground/80" : "text-foreground"}`}>
          {stock.name}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {shortTicker(ticker)} · {stock.exchange}
          {note ? <span className="text-muted-foreground"> · {note}</span> : null}
        </p>
      </div>
      <div className="hidden sm:block">
        <Sparkline values={closes} positive={up} />
      </div>
      <div className="w-[104px] text-right">
        <p className="text-[14px] font-semibold tabular-nums">{formatINR(price)}</p>
        <ChangeText changePct={changePct} className="text-[12px] font-medium" />
      </div>
    </Link>
  );
}
