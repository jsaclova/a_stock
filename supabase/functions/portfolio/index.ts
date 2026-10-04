import { corsHeaders } from "../_shared/cors.ts";

interface BuyRow {
  date: string;
  openPrice: number;
  shares: number;
  cost: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function nyParts(tsSeconds: number, timeZone: string): { date: string; weekday: number } {
  const d = new Date(tsSeconds * 1000);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  return { date, weekday };
}

function toNyDateString(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function nyWeekday(dateStr: string, timeZone: string): number {
  // dateStr: YYYY-MM-DD → 해당 날짜 뉴욕 정오 기준 요일
  const [y, m, day] = dateStr.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, day, 16, 0, 0);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
    .format(new Date(utcNoon));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

function addDaysNy(dateStr: string, days: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "SPYM").trim().toUpperCase();
    const sharesPerBuy = Math.max(1, parseFloat(url.searchParams.get("shares") || "2"));
    const since = url.searchParams.get("since") || "2026-10-01";
    const frequency = url.searchParams.get("frequency") === "monthly" ? "monthly" : "weekly";
    const weekday = Math.min(5, Math.max(1, parseInt(url.searchParams.get("weekday") || "5", 10) || 5));
    const monthday = Math.min(31, Math.max(1, parseInt(url.searchParams.get("monthday") || "1", 10) || 1));

    const period1 = Math.floor(new Date(`${since}T00:00:00Z`).getTime() / 1000);
    const period2 = Math.floor(Date.now() / 1000);

    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
    );
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "주가 데이터를 가져오지 못했습니다" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!result || !meta) {
      return new Response(JSON.stringify({ error: "종목 데이터가 없습니다" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const timeZone = meta.exchangeTimezoneName ?? "America/New_York";
    const timestamps: number[] = result.timestamp ?? [];
    const opens: (number | null)[] = result.indicators?.quote?.[0]?.open ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    // 거래일별 시가 매핑 (뉴욕 기준 일자)
    const dailyOpen = new Map<string, number>();
    let lastClose: number | null = null;
    for (let i = 0; i < timestamps.length; i++) {
      const { date } = nyParts(timestamps[i], timeZone);
      const o = opens[i];
      if (o !== null && o !== undefined && !isNaN(o) && !dailyOpen.has(date)) {
        dailyOpen.set(date, o);
      }
      const c = closes[i];
      if (c !== null && c !== undefined && !isNaN(c)) lastClose = c;
    }

    const todayNy = toNyDateString(new Date(), timeZone);
    const WEEKDAY_KO = ["", "월", "화", "수", "목", "금"];
    const ruleLabel = frequency === "weekly" ? `매주 ${WEEKDAY_KO[weekday]}요일` : `매월 ${monthday}일`;

    // 매수 대상일 목록 (since ~ 오늘)
    const targets: string[] = [];
    if (frequency === "weekly") {
      let cursor = since;
      while (nyWeekday(cursor, timeZone) !== weekday) {
        cursor = addDaysNy(cursor, 1);
      }
      while (cursor <= todayNy) {
        targets.push(cursor);
        cursor = addDaysNy(cursor, 7);
      }
    } else {
      const [sy, sm] = since.split("-").map(Number);
      const [ty, tm] = todayNy.split("-").map(Number);
      let y = sy;
      let m = sm;
      while (y < ty || (y === ty && m <= tm)) {
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const day = Math.min(monthday, lastDay);
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (dateStr >= since && dateStr <= todayNy) targets.push(dateStr);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }

    const rows: BuyRow[] = [];
    const skipped: string[] = [];
    for (const dateStr of targets) {
      const open = dailyOpen.get(dateStr);
      if (open !== undefined) {
        rows.push({
          date: dateStr,
          openPrice: round2(open),
          shares: sharesPerBuy,
          cost: round2(open * sharesPerBuy),
        });
      } else {
        skipped.push(dateStr); // 휴장일 등 데이터 없음
      }
    }

    const totalShares = round2(rows.length * sharesPerBuy);
    const totalInvested = round2(rows.reduce((sum, r) => sum + r.cost, 0));
    const currentPrice = round2(
      (meta.regularMarketPrice as number | null) ?? lastClose ?? 0,
    );
    const currentValue = round2(totalShares * currentPrice);
    const totalReturn = round2(currentValue - totalInvested);
    const totalReturnPct = totalInvested !== 0
      ? round2((totalReturn / totalInvested) * 100)
      : 0;

    // 다음 매수일 (오늘 이후 가장 가까운 매수일)
    let nextBuyDate: string;
    if (frequency === "weekly") {
      const todayWd = nyWeekday(todayNy, timeZone);
      const delta = todayWd === weekday ? 7 : (weekday - todayWd + 7) % 7;
      nextBuyDate = addDaysNy(todayNy, delta);
    } else {
      const [ty, tm, td] = todayNy.split("-").map(Number);
      const lastThis = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
      const thisTarget = Math.min(monthday, lastThis);
      if (td < thisTarget) {
        nextBuyDate = `${ty}-${String(tm).padStart(2, "0")}-${String(thisTarget).padStart(2, "0")}`;
      } else {
        const ny = tm === 12 ? ty + 1 : ty;
        const nm = tm === 12 ? 1 : tm + 1;
        const lastNext = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
        const nextTarget = Math.min(monthday, lastNext);
        nextBuyDate = `${ny}-${String(nm).padStart(2, "0")}-${String(nextTarget).padStart(2, "0")}`;
      }
    }

    return new Response(
      JSON.stringify({
        symbol: meta.symbol ?? symbol,
        name: meta.longName ?? meta.shortName ?? symbol,
        sharesPerBuy,
        since,
        frequency,
        weekday,
        monthday,
        ruleLabel,
        rows,
        skipped,
        totalInvested,
        totalShares,
        currentPrice,
        currentValue,
        totalReturn,
        totalReturnPct,
        nextBuyDate,
        fetchedAt: new Date().toISOString(),
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
