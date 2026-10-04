import { corsHeaders } from "./_shared/cors.ts";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    let symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
    if (!symbol) {
      return new Response(JSON.stringify({ error: "symbol 파라미터가 필요합니다" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 심볼이 아닌 종목명으로 입력된 경우 검색 API로 티커 해결 시도
    let resolved = symbol;
    const chartCheck = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved)}?range=1d&interval=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!chartCheck.ok) {
      try {
        const sresp = await fetch(
          `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
          },
        );
        const sdata = await sresp.json();
        const match = sdata.quotes?.find(
          (q: { quoteType?: string; symbol?: string }) =>
            q.quoteType !== undefined &&
            ["EQUITY", "ETF", "INDEX", "CRYPTOCURRENCY"].includes(q.quoteType),
        );
        if (match?.symbol) resolved = match.symbol as string;
      } catch {
        // 심볼 해결 실패 시 원래 입력 유지
      }
    }
    symbol = resolved;

    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "종목을 찾을 수 없습니다" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!result || !meta || meta.regularMarketPrice == null) {
      return new Response(JSON.stringify({ error: "종목 데이터가 없습니다" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const spark = closes.filter((c): c is number => c !== null && c !== undefined && !isNaN(c));
    const prev = (meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice) as number;
    const price = meta.regularMarketPrice as number;
    const change = price - prev;

    return new Response(
      JSON.stringify({
        symbol: meta.symbol ?? symbol,
        name: meta.longName ?? meta.shortName ?? symbol,
        price,
        change: Math.round(change * 100) / 100,
        changePct: prev !== 0 ? Math.round((change / prev) * 10000) / 100 : 0,
        spark,
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(meta.symbol ?? symbol)}`,
      }),
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
