import { corsHeaders } from "../_shared/cors.ts";

interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

// 당일 장중 15분봉 (티커 검색 결과 일일 그래프용)
async function fetchIntraday(symbol: string): Promise<{ candles: Candle[]; prevClose?: number }> {
  try {
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) return { candles: [] };
    const data = await resp.json();
    const result = data.chart?.result?.[0];
    if (!result) return { candles: [] };
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];
    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o == null || h == null || l == null || c == null || isNaN(c)) continue;
      candles.push({
        t: timestamps[i],
        open: r2(o),
        high: r2(h),
        low: r2(l),
        close: r2(c),
        volume: volumes[i] ?? null,
      });
    }
    const meta = result.meta ?? {};
    const prevClose = typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number"
        ? meta.previousClose
        : undefined;
    return { candles, prevClose };
  } catch {
    return { candles: [] };
  }
}

Deno.serve(async (req) => {
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
    // 일일 등락률: range=1mo 조회 시 chartPreviousClose는 한 달 전 값이라
    // 직전 일봉 종가를 기준으로 계산
    const prevDaily = spark.length >= 2 ? spark[spark.length - 2] : null;
    const prev = (prevDaily ?? meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice) as number;
    const price = meta.regularMarketPrice as number;
    const change = price - prev;
    const intra = await fetchIntraday(symbol);

    return new Response(
      JSON.stringify({
        symbol: meta.symbol ?? symbol,
        name: meta.longName ?? meta.shortName ?? symbol,
        price,
        change: Math.round(change * 100) / 100,
        changePct: prev !== 0 ? Math.round((change / prev) * 10000) / 100 : 0,
        spark,
        candles: intra.candles,
        prevClose: intra.prevClose ?? prev,
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
});
