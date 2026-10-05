import { corsHeaders } from "../_shared/cors.ts";

interface PricePoint {
  date: string;
  close: number;
}

interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

interface DcaResult {
  symbol: string;
  name: string;
  monthlyPrices: PricePoint[];
  totalInvested: number;
  totalShares: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  latestPrice: number;
  earliestPrice: number;
  candles?: Candle[];
  prevClose?: number;
  regularPrice?: number;
}

interface YahooHistory {
  points: PricePoint[];
  candles?: Candle[];
  prevClose?: number;
  regularPrice?: number;
}

// 장중 봉 간격 — 이 경우 OHLC 캔들까지 함께 반환 (3대 지수 finviz식 차트용)
const INTRADAY_INTERVALS = new Set(["1m", "2m", "5m", "15m", "30m", "1h", "90m"]);

const r2 = (n: number) => Math.round(n * 100) / 100;

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && !isNaN(v) ? v : undefined;
}

async function fetchYahooHistory(symbol: string, range: string, interval: string = "1mo"): Promise<YahooHistory> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!resp.ok) {
    throw new Error(`Yahoo API returned ${resp.status} for ${symbol}`);
  }
  const data = await resp.json();
  const result = data.chart?.result?.[0];
  if (!result) {
    throw new Error(`No data for ${symbol}`);
  }
  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const closes: (number | null)[] = quote.close ?? [];
  const meta = result.meta ?? {};

  if (INTRADAY_INTERVALS.has(interval)) {
    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];
    const candles: Candle[] = [];
    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o == null || h == null || l == null || c == null || isNaN(c) || isNaN(o) || isNaN(h) || isNaN(l)) continue;
      candles.push({
        t: timestamps[i],
        open: r2(o),
        high: r2(h),
        low: r2(l),
        close: r2(c),
        volume: volumes[i] ?? null,
      });
      points.push({ date: new Date(timestamps[i] * 1000).toISOString(), close: r2(c) });
    }
    return {
      points,
      candles,
      prevClose: numOrUndef(meta.chartPreviousClose ?? meta.previousClose),
      regularPrice: numOrUndef(meta.regularMarketPrice),
    };
  }

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close !== null && close !== undefined && !isNaN(close)) {
      const d = new Date(timestamps[i] * 1000);
      points.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        close: Math.round(close * 100) / 100,
      });
    }
  }
  return { points };
}

function computeDca(
  monthlyPrices: PricePoint[],
  monthlyAmount: number,
): Omit<DcaResult, "symbol" | "name" | "monthlyPrices"> {
  if (monthlyPrices.length === 0) {
    return {
      totalInvested: 0,
      totalShares: 0,
      currentValue: 0,
      totalReturn: 0,
      totalReturnPct: 0,
      latestPrice: 0,
      earliestPrice: 0,
    };
  }
  let totalShares = 0;
  let totalInvested = 0;
  for (const p of monthlyPrices) {
    const shares = monthlyAmount / p.close;
    totalShares += shares;
    totalInvested += monthlyAmount;
  }
  const latestPrice = monthlyPrices[monthlyPrices.length - 1].close;
  const currentValue = totalShares * latestPrice;
  const totalReturn = currentValue - totalInvested;
  const totalReturnPct = (totalReturn / totalInvested) * 100;
  return {
    totalInvested: Math.round(totalInvested),
    totalShares: Math.round(totalShares * 10000) / 10000,
    currentValue: Math.round(currentValue),
    totalReturn: Math.round(totalReturn),
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    latestPrice,
    earliestPrice: monthlyPrices[0].close,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const monthlyAmount = parseFloat(url.searchParams.get("monthlyAmount") || "500000");
    const range = url.searchParams.get("range") || "5y";
    const interval = url.searchParams.get("interval") || "1mo";
    const symbolsParam = url.searchParams.get("symbols") || "QQQ,SPY";

    const symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
    const names: Record<string, string> = {
      QQQ: "Invesco QQQ Trust (Nasdaq 100)",
      SPY: "SPDR S&P 500 ETF Trust",
      VOO: "Vanguard S&P 500 ETF",
      DIA: "SPDR Dow Jones Industrial Average ETF",
    };

    const results: DcaResult[] = [];
    for (const symbol of symbols) {
      const history = await fetchYahooHistory(symbol, range, interval);
      const dca = computeDca(history.points, monthlyAmount);
      const intraday = history.candles !== undefined && history.candles.length > 0;
      results.push({
        symbol,
        name: names[symbol] ?? symbol,
        monthlyPrices: history.points,
        ...dca,
        latestPrice: intraday && history.regularPrice != null ? history.regularPrice : dca.latestPrice,
        earliestPrice: intraday && history.prevClose != null ? history.prevClose : dca.earliestPrice,
        ...(intraday
          ? { candles: history.candles, prevClose: history.prevClose, regularPrice: history.regularPrice }
          : {}),
      });
    }

    return new Response(
      JSON.stringify({ results, monthlyAmount, range }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
