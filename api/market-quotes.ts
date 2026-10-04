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

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const BONDS = [
  { name: "미국 국채 2년물", field: "BC_2YEAR", symbol: "UST2Y" },
  { name: "미국 국채 10년물", field: "BC_10YEAR", symbol: "UST10Y" },
  { name: "미국 국채 20년물", field: "BC_20YEAR", symbol: "UST20Y" },
  { name: "미국 국채 30년물", field: "BC_30YEAR", symbol: "UST30Y" },
];

// Yahoo 폴백 (Treasury 피드 실패 시): 20년물은 대체 심볼 없음
const BOND_YAHOO_FALLBACK: Record<string, string> = {
  "미국 국채 2년물": "2YY=F",
  "미국 국채 10년물": "^TNX",
  "미국 국채 30년물": "^TYX",
};

const TREASURY_URL =
  "https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics";

interface YieldBar {
  date: string;
  values: Record<string, number>;
}

async function fetchTreasuryYear(year: number): Promise<YieldBar[]> {
  try {
    const resp = await fetchWithTimeout(
      `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) return [];
    const xml = await resp.text();
    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
    const fields = ["BC_2YEAR", "BC_10YEAR", "BC_20YEAR", "BC_30YEAR"];
    const out: YieldBar[] = [];
    for (const entry of entries) {
      const dateM = entry.match(/<d:NEW_DATE[^>]*>([^<]*)<\/d:NEW_DATE>/);
      if (!dateM) continue;
      const date = dateM[1].slice(0, 10);
      const values: Record<string, number> = {};
      for (const f of fields) {
        const m = entry.match(new RegExp(`<d:${f}[^>]*>([^<]*)</d:${f}>`));
        const v = m ? Number(m[1]) : NaN;
        if (!isNaN(v)) values[f] = v;
      }
      out.push({ date, values });
    }
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
    return out;
  } catch {
    return [];
  }
}

async function fetchTreasuryBonds(): Promise<Quote[]> {
  const year = new Date().getFullYear();
  const [cur, prev] = await Promise.all([
    fetchTreasuryYear(year),
    fetchTreasuryYear(year - 1),
  ]);
  const byDate = new Map<string, Record<string, number>>();
  for (const bar of [...prev, ...cur]) byDate.set(bar.date, bar.values);
  const dates = [...byDate.keys()].sort();

  const quotes: Quote[] = [];
  for (const b of BONDS) {
    const series: number[] = [];
    for (const d of dates) {
      const v = byDate.get(d)?.[b.field];
      if (v !== undefined) series.push(v);
    }
    if (series.length >= 2) {
      const price = series[series.length - 1];
      const prevPrice = series[series.length - 2];
      const change = price - prevPrice;
      const spark = series
        .slice(-260)
        .filter((_, i, arr) => i % 5 === 0 || i === arr.length - 1);
      quotes.push({
        name: b.name,
        symbol: b.symbol,
        price: round2(price),
        change: round2(change),
        changePct: prevPrice !== 0 ? round2((change / prevPrice) * 100) : 0,
        unit: "%",
        spark,
        url: TREASURY_URL,
      });
      continue;
    }
    // 폴백: Yahoo 심볼 (20년물은 없음)
    const fallback = BOND_YAHOO_FALLBACK[b.name];
    if (fallback) {
      const q = await fetchYahooQuote(b.name, fallback, "%");
      if (q) quotes.push({ ...q, symbol: b.symbol, url: TREASURY_URL });
    }
  }
  return quotes;
}

async function fetchYahooQuote(name: string, symbol: string, unit: string): Promise<Quote | null> {
  try {
    const encoded = encodeURIComponent(symbol);
    const resp = await fetchWithTimeout(
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
      fetchTreasuryBonds(),
      Promise.all(OIL.map((o) => fetchYahooQuote(o.name, o.symbol, "USD/bbl"))),
      Promise.all(COMMODITIES.map((c) => fetchYahooQuote(c.name, c.symbol, "USD"))),
      Promise.all(CURRENCIES.map((c) => fetchYahooQuote(c.name, c.symbol, ""))),
    ]);

    const groups: Group[] = [
      { id: "bonds", items: bonds },
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
