const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TOP100: { symbol: string; name: string }[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AVGO", name: "Broadcom" },
  { symbol: "LLY", name: "Eli Lilly" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "MA", name: "Mastercard" },
  { symbol: "COST", name: "Costco" },
  { symbol: "UNH", name: "UnitedHealth" },
  { symbol: "HD", name: "Home Depot" },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "ABBV", name: "AbbVie" },
  { symbol: "CVX", name: "Chevron" },
  { symbol: "MRK", name: "Merck" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "PEP", name: "PepsiCo" },
  { symbol: "BAC", name: "Bank of America" },
  { symbol: "CRM", name: "Salesforce" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "TMO", name: "Thermo Fisher" },
  { symbol: "MCD", name: "McDonald's" },
  { symbol: "CSCO", name: "Cisco" },
  // 31~100위
  { symbol: "AMD", name: "AMD" },
  { symbol: "ORCL", name: "Oracle" },
  { symbol: "TXN", name: "Texas Instruments" },
  { symbol: "INTC", name: "Intel" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "GS", name: "Goldman Sachs" },
  { symbol: "MS", name: "Morgan Stanley" },
  { symbol: "CAT", name: "Caterpillar" },
  { symbol: "BLK", name: "BlackRock" },
  { symbol: "SPGI", name: "S&P Global" },
  { symbol: "TJX", name: "TJX Companies" },
  { symbol: "AXP", name: "American Express" },
  { symbol: "ISRG", name: "Intuitive Surgical" },
  { symbol: "C", name: "Citigroup" },
  { symbol: "WFC", name: "Wells Fargo" },
  { symbol: "RTX", name: "RTX" },
  { symbol: "HON", name: "Honeywell" },
  { symbol: "UBER", name: "Uber" },
  { symbol: "SBUX", name: "Starbucks" },
  { symbol: "AMGN", name: "Amgen" },
  { symbol: "QCOM", name: "Qualcomm" },
  { symbol: "LOW", name: "Lowe's" },
  { symbol: "NEE", name: "NextEra Energy" },
  { symbol: "BKNG", name: "Booking" },
  { symbol: "GE", name: "GE Aerospace" },
  { symbol: "PLTR", name: "Palantir" },
  { symbol: "NOW", name: "ServiceNow" },
  { symbol: "ADBE", name: "Adobe" },
  { symbol: "IBM", name: "IBM" },
  { symbol: "INTU", name: "Intuit" },
  { symbol: "DHR", name: "Danaher" },
  { symbol: "LIN", name: "Linde" },
  { symbol: "MDT", name: "Medtronic" },
  { symbol: "SYK", name: "Stryker" },
  { symbol: "PGR", name: "Progressive" },
  { symbol: "ADP", name: "ADP" },
  { symbol: "CMCSA", name: "Comcast" },
  { symbol: "VZ", name: "Verizon" },
  { symbol: "T", name: "AT&T" },
  { symbol: "ABT", name: "Abbott" },
  { symbol: "UPS", name: "UPS" },
  { symbol: "NKE", name: "Nike" },
  { symbol: "SHOP", name: "Shopify" },
  { symbol: "MMM", name: "3M" },
  { symbol: "ETN", name: "Eaton" },
  { symbol: "PH", name: "Parker Hannifin" },
  { symbol: "ICE", name: "Intercontinental Exchange" },
  { symbol: "MSCI", name: "MSCI" },
  { symbol: "MMC", name: "Marsh & McLennan" },
  { symbol: "LULU", name: "lululemon" },
  { symbol: "GM", name: "General Motors" },
  { symbol: "F", name: "Ford" },
  { symbol: "BA", name: "Boeing" },
  { symbol: "KKR", name: "KKR" },
  { symbol: "EMR", name: "Emerson" },
  { symbol: "AON", name: "Aon" },
  { symbol: "WELL", name: "Welltower" },
  { symbol: "AMT", name: "American Tower" },
  { symbol: "DUK", name: "Duke Energy" },
  { symbol: "SO", name: "Southern Company" },
  { symbol: "BMY", name: "Bristol-Myers Squibb" },
  { symbol: "GILD", name: "Gilead" },
  { symbol: "CVS", name: "CVS Health" },
  { symbol: "CB", name: "Chubb" },
  { symbol: "MO", name: "Altria" },
  { symbol: "CL", name: "Colgate-Palmolive" },
  { symbol: "DE", name: "Deere" },
  { symbol: "FDX", name: "FedEx" },
  { symbol: "PANW", name: "Palo Alto Networks" },
  { symbol: "CRWD", name: "CrowdStrike" },
  { symbol: "LMT", name: "Lockheed Martin" },
];

interface Row {
  rank: number;
  symbol: string;
  name: string;
  date: string;
  close: number;
  open: number | null;
  change: number;
  changePct: number;
  volume: number | null;
  marketCap: number | null;
}

async function fetchMarketCap(symbol: string): Promise<number | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 90 * 24 * 60 * 60;
    const resp = await fetch(
      `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${symbol}?type=trailingMarketCap&period1=${from}&period2=${now}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const series = data.timeseries?.result?.[0]?.trailingMarketCap;
    if (!Array.isArray(series) || series.length === 0) return null;
    const raw = series[series.length - 1]?.reportedValue?.raw;
    return typeof raw === "number" ? raw : null;
  } catch {
    return null;
  }
}

async function fetchDaily(symbol: string, name: string, rank: number): Promise<Row | null> {
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    const closes: (number | null)[] = quote?.close ?? [];
    const volumes: (number | null)[] = quote?.volume ?? [];
    const opens: (number | null)[] = quote?.open ?? [];
    const points: { ts: number; close: number; open: number | null; volume: number | null }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c !== null && c !== undefined && !isNaN(c)) {
        points.push({ ts: timestamps[i], close: c, open: opens[i] ?? null, volume: volumes[i] ?? null });
      }
    }
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2] : last;
    const change = last.close - prev.close;
    const d = new Date(last.ts * 1000);
    return {
      rank,
      symbol,
      name,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      close: Math.round(last.close * 100) / 100,
      open: last.open !== null ? Math.round(last.open * 100) / 100 : null,
      change: Math.round(change * 100) / 100,
      changePct: prev.close !== 0 ? Math.round((change / prev.close) * 10000) / 100 : 0,
      volume: last.volume,
      marketCap: null,
    };
  } catch {
    return null;
  }
}

export const config = { runtime: "edge" };
export const maxDuration = 60;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const rows = (
      await Promise.all(TOP100.map((s, i) => fetchDaily(s.symbol, s.name, i + 1)))
    ).filter((r): r is Row => r !== null);

    // 시가총액 조회 후 시총 내림차순으로 정렬, 순위 재부여
    const withCaps = await Promise.all(
      rows.map(async (r) => ({ ...r, marketCap: await fetchMarketCap(r.symbol) })),
    );
    withCaps.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
    withCaps.forEach((r, i) => {
      r.rank = i + 1;
    });

    return new Response(
      JSON.stringify({ rows: withCaps, fetchedAt: new Date().toISOString() }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
