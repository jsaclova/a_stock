const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Quote {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  unit: string;
  spark: number[];
  url: string;
}

interface Group {
  id: string;
  items: Quote[];
}

const BONDS = [
  { name: "미국 국채 2년물", series: "DGS2" },
  { name: "미국 국채 10년물", series: "DGS10" },
  { name: "미국 국채 20년물", series: "DGS20" },
  { name: "미국 국채 30년물", series: "DGS30" },
];

const OIL = [
  { name: "WTI 원유", symbol: "CL=F" },
  { name: "브렌트유", symbol: "BZ=F" },
];

const COMMODITIES = [
  { name: "금", symbol: "GC=F" },
  { name: "은", symbol: "SI=F" },
  { name: "구리", symbol: "HG=F" },
  { name: "천연가스", symbol: "NG=F" },
  { name: "밀", symbol: "ZW=F" },
];

const CURRENCIES = [
  { name: "EUR/USD", symbol: "EURUSD=X" },
  { name: "GBP/USD", symbol: "GBPUSD=X" },
  { name: "USD/JPY", symbol: "JPY=X" },
  { name: "USD/KRW", symbol: "KRW=X" },
  { name: "USD/CNY", symbol: "CNY=X" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

async function fetchFredQuote(name: string, seriesId: string): Promise<Quote | null> {
  try {
    const resp = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`);
    if (!resp.ok) return null;
    const text = await resp.text();
    const rows = text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => line.split(","))
      .filter((r) => r.length === 2 && r[1] !== ".");
    if (rows.length < 2) return null;
    const price = Number(rows[rows.length - 1][1]);
    const prev = Number(rows[rows.length - 2][1]);
    const change = price - prev;
    const yearly = rows.slice(-253);
    const spark = yearly
      .filter((_, i) => i % 7 === 0 || i === yearly.length - 1)
      .map((r) => Number(r[1]))
      .filter((n) => !isNaN(n));
    return {
      name,
      symbol: seriesId,
      price: round2(price),
      change: round2(change),
      changePct: prev !== 0 ? round2((change / prev) * 100) : 0,
      unit: "%",
      spark,
      url: `https://fred.stlouisfed.org/series/${seriesId}`,
    };
  } catch {
    return null;
  }
}

async function fetchYahooQuote(name: string, symbol: string, unit: string): Promise<Quote | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1y&interval=1wk`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice == null) return null;
    const price = meta.regularMarketPrice as number;
    const prev = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number;
    const change = price - prev;

    const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
    const closes: (number | null)[] = quote?.close ?? [];
    const spark = closes.filter((c): c is number => c !== null && c !== undefined && !isNaN(c));

    return {
      name,
      symbol,
      price: round2(price),
      change: round2(change),
      changePct: prev !== 0 ? round2((change / prev) * 100) : 0,
      unit,
      spark,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
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
    const [bonds, oil, commodities, currencies] = await Promise.all([
      Promise.all(BONDS.map((b) => fetchFredQuote(b.name, b.series))),
      Promise.all(OIL.map((o) => fetchYahooQuote(o.name, o.symbol, "USD/bbl"))),
      Promise.all(COMMODITIES.map((c) => fetchYahooQuote(c.name, c.symbol, "USD"))),
      Promise.all(CURRENCIES.map((c) => fetchYahooQuote(c.name, c.symbol, ""))),
    ]);

    const groups: Group[] = [
      { id: "bonds", items: bonds.filter((q): q is Quote => q !== null) },
      { id: "oil", items: oil.filter((q): q is Quote => q !== null) },
      { id: "commodities", items: commodities.filter((q): q is Quote => q !== null) },
      { id: "currencies", items: currencies.filter((q): q is Quote => q !== null) },
    ];

    return new Response(
      JSON.stringify({ groups, fetchedAt: new Date().toISOString() }),
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
