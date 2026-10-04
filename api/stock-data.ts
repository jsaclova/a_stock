import { corsHeaders } from "./_shared/cors.ts";

interface PricePoint {
  date: string;
  close: number;
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
}

async function fetchYahooHistory(symbol: string, range: string, interval: string = "1mo"): Promise<PricePoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
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
  const indicators = result.indicators?.quote?.[0];
  const closes: (number | null)[] = indicators?.close ?? [];
  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close !== null && close !== undefined && !isNaN(close)) {
      const d = new Date(timestamps[i] * 1000);
      points.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        close: Math.round(close * 100) / 100,
      });
    }
  }
  return points;
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

export const config = { runtime: "edge" };
export const maxDuration = 60;

export default async function handler(req: Request): Promise<Response> {
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
      const monthlyPrices = await fetchYahooHistory(symbol, range, interval);
      const dca = computeDca(monthlyPrices, monthlyAmount);
      results.push({
        symbol,
        name: names[symbol] ?? symbol,
        monthlyPrices,
        ...dca,
      });
    }

    return new Response(
      JSON.stringify({ results, monthlyAmount, range }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
}
