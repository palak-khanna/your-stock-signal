import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tickerRe = /^[A-Z0-9&.-]{1,20}$/;

export const getMarketSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ tickers: z.array(z.string().regex(tickerRe)).max(40) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getDailyCloses } = await import("./market.server");
    const results = await Promise.all(
      data.tickers.map(async (ticker) => {
        const series = await getDailyCloses(ticker);
        return {
          ticker,
          price: series.price,
          prevClose: series.prevClose,
          closes: series.points.map((p) => p.c),
        };
      }),
    );
    return results;
  });

export const getStockSeries = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ticker: z.string().regex(tickerRe),
        range: z.enum(["1D", "1W", "1M", "3M", "1Y"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getSeries, getDailyCloses } = await import("./market.server");
    const [chart, daily] = await Promise.all([
      getSeries(data.ticker, data.range),
      getDailyCloses(data.ticker),
    ]);
    return {
      ticker: data.ticker,
      range: data.range,
      points: chart.points,
      price: daily.price || chart.price,
      prevClose: daily.prevClose || chart.prevClose,
      closes: daily.points.map((p) => p.c),
    };
  });

export const getStockHeadlines = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ ticker: z.string().regex(tickerRe) }).parse(data))
  .handler(async ({ data }) => {
    const { getHeadlines } = await import("./market.server");
    return getHeadlines(data.ticker);
  });
