export type ReasonType = "buy_target" | "event_watch" | "holding" | "exploring";

export type RelevanceInput = {
  closes: number[]; // oldest -> newest daily closes, newest is today's price
  price: number;
  prevClose: number;
  reason: ReasonType;
  targetPrice?: number | null;
  eventDate?: string | null; // YYYY-MM-DD
};

export type RelevanceResult = {
  score: number;
  /** typical daily swing for this stock, in percent */
  normalSwingPct: number;
  changePct: number;
  /** how many "normal swings" today's move is */
  zScore: number;
  reasons: string[];
  worthALook: boolean;
};

export const RELEVANCE_THRESHOLD = 45;

/** Standard deviation of daily returns over the recent history. */
export function dailyVolatilityPct(closes: number[], window = 60): number {
  const series = closes.slice(-Math.min(window + 1, closes.length));
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]!;
    if (prev > 0) returns.push((series[i]! - prev) / prev);
  }
  if (returns.length < 2) return 1;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, r) => a + (r - mean) * (r - mean), 0) / (returns.length - 1);
  return Math.max(Math.sqrt(variance) * 100, 0.2);
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatMoney(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function computeRelevance(input: RelevanceInput): RelevanceResult {
  const { closes, price, prevClose, reason, targetPrice, eventDate } = input;
  const normalSwingPct = dailyVolatilityPct(closes);
  const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
  const zScore = Math.abs(changePct) / normalSwingPct;

  const reasons: string[] = [];

  // 1. How unusual is today's move for THIS stock?
  let moveScore = Math.min(zScore / 2.5, 1) * 55;
  if (zScore >= 2) {
    reasons.push(
      `Unusual move for this stock — it moved ${Math.abs(changePct).toFixed(1)}% today, versus a normal day of about ±${normalSwingPct.toFixed(1)}%`,
    );
  } else if (zScore >= 1.4) {
    reasons.push(
      `A bigger move than usual — ${Math.abs(changePct).toFixed(1)}% today against a normal ±${normalSwingPct.toFixed(1)}%`,
    );
  }

  // 2 & 3. Does it match the reason the person is watching it?
  let reasonScore = 0;
  if (reason === "buy_target" && targetPrice && targetPrice > 0) {
    const gap = ((price - targetPrice) / targetPrice) * 100;
    if (price <= targetPrice) {
      reasonScore = 60;
      reasons.push(`It is at or below your buy price of ${formatMoney(targetPrice)}`);
    } else if (gap <= 3) {
      reasonScore = 45;
      reasons.push(
        `Within 3% of your target price of ${formatMoney(targetPrice)} — ${gap.toFixed(1)}% away`,
      );
    } else if (gap <= 8) {
      reasonScore = 22;
      reasons.push(`Getting closer to your target of ${formatMoney(targetPrice)} (${gap.toFixed(1)}% away)`);
    }
  } else if (reason === "event_watch" && eventDate) {
    const days = daysUntil(eventDate);
    if (days >= 0 && days <= 2) {
      reasonScore = 55;
      reasons.push(days === 0 ? "The date you were watching for is today" : `Event in ${days} day${days === 1 ? "" : "s"}`);
    } else if (days > 2 && days <= 7) {
      reasonScore = 32;
      reasons.push(`Event in ${days} days`);
    } else if (days < 0 && days >= -3) {
      reasonScore = 25;
      reasons.push(`The date you were watching just passed — worth checking what happened`);
    }
  } else if (reason === "holding") {
    // Holders shouldn't be nudged by everyday noise.
    moveScore = zScore >= 2 ? moveScore * 0.85 : moveScore * 0.45;
  } else if (reason === "exploring") {
    moveScore = moveScore * 0.9;
  }

  const score = Math.round(Math.min(moveScore + reasonScore, 100));
  const worthALook = score >= RELEVANCE_THRESHOLD;

  if (worthALook && reasons.length === 0) {
    reasons.push(`Moved ${Math.abs(changePct).toFixed(1)}% today`);
  }

  return { score, normalSwingPct, changePct, zScore, reasons, worthALook };
}
