const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

async function fetchRate(symbol: string): Promise<{ price: number; prev: number } | null> {
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
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
    return {
      price: meta.regularMarketPrice as number,
      prev: (meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice) as number,
    };
  } catch {
    return null;
  }
}

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const [usdKrw, eurUsd, gbpUsd, jpyUsd, cnyUsd] = await Promise.all([
      fetchRate("KRW=X"),
      fetchRate("EURUSD=X"),
      fetchRate("GBPUSD=X"),
      fetchRate("JPY=X"),
      fetchRate("CNY=X"),
    ]);

    const rates: { name: string; symbol: string; price: number; changePct: number }[] = [];
    const push = (name: string, r: { price: number; prev: number } | null, factor = 1) => {
      if (!r) return;
      const price = r.price * factor;
      const prev = r.prev * factor;
      const changePct = prev !== 0 ? ((price - prev) / prev) * 100 : 0;
      rates.push({ name, symbol: name, price: round2(price), changePct: round2(changePct) });
    };

    if (usdKrw) push("미국 달러", usdKrw);
    if (eurUsd && usdKrw) push("유로", { price: usdKrw.price * eurUsd.price, prev: usdKrw.prev * eurUsd.prev });
    if (gbpUsd && usdKrw) push("영국 파운드", { price: usdKrw.price * gbpUsd.price, prev: usdKrw.prev * gbpUsd.prev });
    if (jpyUsd && usdKrw) push("일본 엔", { price: (usdKrw.price / jpyUsd.price) * 100, prev: (usdKrw.prev / jpyUsd.prev) * 100 });
    if (cnyUsd && usdKrw) push("위안", { price: usdKrw.price / cnyUsd.price, prev: usdKrw.prev / cnyUsd.prev });

    return new Response(JSON.stringify({ rates, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
