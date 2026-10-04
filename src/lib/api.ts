import type { StockDataResponse, NewsResponse, MarketQuotesResponse, TopStocksResponse, FxKrwResponse, TickerResponse, PortfolioResponse } from "@/types";

// 시장 데이터 함수 base: Cloud URL(supabase.co)이면 같은 origin 사용.
// Cloud에는 Edge Functions가 없으므로, 데이터는 항상
// 로컬 스택·CasaOS 프록시·Vercel /api 중 같은 origin에서 가져온다.
const RAW_BASE = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_URL = RAW_BASE.includes("supabase.co") ? "" : RAW_BASE;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export async function fetchStockData(
  monthlyAmount: number,
  range: string,
  symbols: string = "QQQ,SPY",
  interval: string = "1mo",
): Promise<StockDataResponse> {
  const url = `${SUPABASE_URL}/functions/v1/stock-data?monthlyAmount=${monthlyAmount}&range=${range}&symbols=${symbols}&interval=${interval}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `데이터를 불러오지 못했습니다 (${resp.status})`);
  }
  return resp.json();
}

export async function fetchTopStocks(): Promise<TopStocksResponse> {
  const url = `${SUPABASE_URL}/functions/v1/top-stocks?t=${Date.now()}`;
  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `종목 데이터를 불러오지 못했습니다 (${resp.status})`);
  }
  return resp.json();
}

export async function fetchFxKrw(): Promise<FxKrwResponse> {
  const url = `${SUPABASE_URL}/functions/v1/fx-krw?t=${Date.now()}`;
  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `환율을 불러오지 못했습니다 (${resp.status})`);
  }
  return resp.json();
}

export async function fetchPortfolio(
  symbol = "SPYM",
  shares = 2,
  frequency: "weekly" | "monthly" = "weekly",
  weekday = 5,
  monthday = 1,
): Promise<PortfolioResponse> {
  const url = `${SUPABASE_URL}/functions/v1/portfolio?symbol=${encodeURIComponent(symbol)}&shares=${shares}&frequency=${frequency}&weekday=${weekday}&monthday=${monthday}&t=${Date.now()}`;
  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `포트폴리오를 불러오지 못했습니다 (${resp.status})`);
  }
  return resp.json();
}

export async function fetchTicker(symbol: string): Promise<TickerResponse> {
  const url = `${SUPABASE_URL}/functions/v1/ticker?symbol=${encodeURIComponent(symbol)}&t=${Date.now()}`;
  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `종목을 찾을 수 없습니다 (${resp.status})`);
  }
  return resp.json();
}

export async function fetchMarketQuotes(): Promise<MarketQuotesResponse> {
  const url = `${SUPABASE_URL}/functions/v1/market-quotes?t=${Date.now()}`;
  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `시세를 불러오지 못했습니다 (${resp.status})`);
  }
  return resp.json();
}

export async function fetchMarketNews(): Promise<NewsResponse> {
  // 캐시 방지: 새로고침할 때마다 최신 뉴스를 다시 가져오도록 타임스탬프 추가
  const url = `${SUPABASE_URL}/functions/v1/market-news?t=${Date.now()}`;
  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `뉴스를 불러오지 못했습니다 (${resp.status})`);
  }
  const data: NewsResponse = await resp.json();
  const todayNews = filterTodayNews(data.news);
  const translatedNews = await translateNewsTitles(todayNews);
  return { ...data, news: translatedNews };
}

// 뉴스 제목을 영어 → 한국어로 번역. 개별 실패 시 원문 유지.
async function translateNewsTitles(
  news: NewsResponse["news"],
): Promise<NewsResponse["news"]> {
  return Promise.all(
    news.map(async (item) => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(item.title)}`;
        const resp = await fetch(url);
        if (!resp.ok) return item;
        const result = await resp.json();
        const translated: string = (result?.[0] ?? [])
          .map((part: [string]) => part[0])
          .join("");
        return translated ? { ...item, title: translated } : item;
      } catch {
        return item;
      }
    }),
  );
}

// 오늘 뉴스를 우선으로, 부족하면 72시간 이내 뉴스로 채움 (최대 15개)
function filterTodayNews(news: NewsResponse["news"]): NewsResponse["news"] {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sorted = [...news].sort(
    (a, b) => b.providerPublishTime - a.providerPublishTime,
  );
  const todayNews = sorted.filter(
    (item) => item.providerPublishTime * 1000 >= startOfToday.getTime(),
  );
  if (todayNews.length >= 5) return todayNews.slice(0, 15);

  const seen = new Set(todayNews.map((item) => item.uuid));
  const recent = sorted.filter(
    (item) =>
      !seen.has(item.uuid) &&
      item.providerPublishTime * 1000 >= now - 72 * 60 * 60 * 1000,
  );
  return [...todayNews, ...recent].slice(0, 15);
}
