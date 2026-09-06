export type Stock = {
  ticker: string;
  name: string;
  exchange: string;
  tile: string; // background colour for the logo tile
};

export const STOCK_UNIVERSE: Stock[] = [
  { ticker: "RELIANCE.NS", name: "Reliance Industries", exchange: "NSE", tile: "#0B4F9E" },
  { ticker: "TCS.NS", name: "Tata Consultancy Services", exchange: "NSE", tile: "#1B3A6B" },
  { ticker: "HDFCBANK.NS", name: "HDFC Bank", exchange: "NSE", tile: "#00478F" },
  { ticker: "INFY.NS", name: "Infosys", exchange: "NSE", tile: "#0F7BC4" },
  { ticker: "ICICIBANK.NS", name: "ICICI Bank", exchange: "NSE", tile: "#AE2C24" },
  { ticker: "SBIN.NS", name: "State Bank of India", exchange: "NSE", tile: "#20419A" },
  { ticker: "ITC.NS", name: "ITC", exchange: "NSE", tile: "#0E7A5F" },
  { ticker: "LT.NS", name: "Larsen & Toubro", exchange: "NSE", tile: "#1A6C34" },
  { ticker: "BHARTIARTL.NS", name: "Bharti Airtel", exchange: "NSE", tile: "#C1272D" },
  { ticker: "TATAMOTORS.NS", name: "Tata Motors", exchange: "NSE", tile: "#2C3E7B" },
  { ticker: "HINDUNILVR.NS", name: "Hindustan Unilever", exchange: "NSE", tile: "#00539F" },
  { ticker: "AXISBANK.NS", name: "Axis Bank", exchange: "NSE", tile: "#8A1538" },
  { ticker: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", exchange: "NSE", tile: "#B22222" },
  { ticker: "WIPRO.NS", name: "Wipro", exchange: "NSE", tile: "#4B2E83" },
  { ticker: "MARUTI.NS", name: "Maruti Suzuki", exchange: "NSE", tile: "#0D4B8C" },
  { ticker: "SUNPHARMA.NS", name: "Sun Pharmaceutical", exchange: "NSE", tile: "#F2A900" },
  { ticker: "TITAN.NS", name: "Titan Company", exchange: "NSE", tile: "#5B2C6F" },
  { ticker: "ASIANPAINT.NS", name: "Asian Paints", exchange: "NSE", tile: "#C0392B" },
  { ticker: "BAJFINANCE.NS", name: "Bajaj Finance", exchange: "NSE", tile: "#0E4C92" },
  { ticker: "ADANIENT.NS", name: "Adani Enterprises", exchange: "NSE", tile: "#1F3864" },
  { ticker: "ONGC.NS", name: "Oil & Natural Gas Corp", exchange: "NSE", tile: "#A03E00" },
  { ticker: "NTPC.NS", name: "NTPC", exchange: "NSE", tile: "#00614A" },
  { ticker: "POWERGRID.NS", name: "Power Grid Corp", exchange: "NSE", tile: "#2E5A88" },
  { ticker: "COALINDIA.NS", name: "Coal India", exchange: "NSE", tile: "#37474F" },
  { ticker: "TATASTEEL.NS", name: "Tata Steel", exchange: "NSE", tile: "#4A5568" },
  { ticker: "JSWSTEEL.NS", name: "JSW Steel", exchange: "NSE", tile: "#1D3557" },
  { ticker: "HCLTECH.NS", name: "HCL Technologies", exchange: "NSE", tile: "#0B6E4F" },
  { ticker: "TECHM.NS", name: "Tech Mahindra", exchange: "NSE", tile: "#B03A2E" },
  { ticker: "ZOMATO.NS", name: "Eternal (Zomato)", exchange: "NSE", tile: "#D32F2F" },
  { ticker: "DMART.NS", name: "Avenue Supermarts", exchange: "NSE", tile: "#00695C" },
];

export const SEED_TICKERS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "ICICIBANK.NS",
  "SBIN.NS",
  "ITC.NS",
  "LT.NS",
  "BHARTIARTL.NS",
  "TATAMOTORS.NS",
];

export function getStock(ticker: string): Stock {
  return (
    STOCK_UNIVERSE.find((s) => s.ticker === ticker) ?? {
      ticker,
      name: ticker.replace(".NS", ""),
      exchange: "NSE",
      tile: "#2B2D42",
    }
  );
}

export function shortTicker(ticker: string) {
  return ticker.replace(".NS", "");
}

export function initials(name: string) {
  const words = name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function formatINR(value: number, decimals = 2) {
  return (
    "₹" +
    value.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}
