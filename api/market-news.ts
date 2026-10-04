const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  thumbnail?: string;
  relatedTickers?: string[];
  sentimentScore: number;
  sentimentLabel: string;
}

const POSITIVE_WORDS = [
  "surge", "soar", "jump", "rally", "gain", "rise", "boost", "beat", "exceed",
  "record", "high", "strong", "growth", "profit", "upgrade", "buy", "bullish",
  "optimis", "optimi", "recover", "rebound", "breakthrough", "outperform",
  "raise", "climb", "soar", "boom", "thrive", "expand", "improve", "upside",
  "win", "deal", "approv", "launch", "innov", "lead", "domin",
];

const NEGATIVE_WORDS = [
  "crash", "plunge", "fall", "drop", "decline", "loss", "bearish", "sell",
  "downgrade", "weak", "fear", "panic", "recession", "cut", "miss", "disappoint",
  "warn", "concern", "risk", "threat", "lawsuit", "investigat", "fraud",
  "bankrupt", "default", "bubble", "correction", "sell-off", "selloff",
  "tumble", "slump", "dive", "sink", "erode", "shrink", "contract", "layoff",
  "fire", "resign", "scandal", "hack", "breach", "downgrade", "halt", "suspend",
];

function analyzeSentiment(text: string): { score: number; label: string } {
  const lower = text.toLowerCase();
  let score = 0;
  let posCount = 0;
  let negCount = 0;

  for (const word of POSITIVE_WORDS) {
    const matches = lower.match(new RegExp(word, "g"));
    if (matches) posCount += matches.length;
  }
  for (const word of NEGATIVE_WORDS) {
    const matches = lower.match(new RegExp(word, "g"));
    if (matches) negCount += matches.length;
  }

  const total = posCount + negCount;
  if (total === 0) {
    return { score: 0, label: "중립" };
  }

  score = (posCount - negCount) / total;
  score = Math.max(-1, Math.min(1, score));
  score = Math.round(score * 100) / 100;

  let label: string;
  if (score >= 0.2) label = "호재";
  else if (score <= -0.2) label = "악재";
  else label = "중립";

  return { score, label };
}

const MOCK_NEWS = [
  { title: "Nasdaq surges to record high as tech stocks rally on strong earnings", publisher: "Reuters", relatedTickers: ["QQQ", "AAPL", "MSFT"] },
  { title: "S&P 500 closes at all-time high, fueled by robust economic growth data", publisher: "Bloomberg", relatedTickers: ["SPY", "VOO"] },
  { title: "Fed signals potential rate cut, boosting market optimism", publisher: "CNBC", relatedTickers: ["SPY", "QQQ"] },
  { title: "Semiconductor stocks plunge on weak demand outlook and inventory concerns", publisher: "MarketWatch", relatedTickers: ["SOXX", "SMH", "NVDA"] },
  { title: "Tech giants beat earnings expectations, driving Nasdaq rally", publisher: "Yahoo Finance", relatedTickers: ["QQQ", "GOOGL", "AMZN"] },
  { title: "Inflation fears rise as CPI data disappoints, sparking sell-off", publisher: "Reuters", relatedTickers: ["SPY", "IVV"] },
  { title: "Dividend stocks outperform as investors seek safe haven amid volatility", publisher: "Bloomberg", relatedTickers: ["SCHD"] },
  { title: "US job market shows strong recovery, unemployment claims drop sharply", publisher: "CNBC", relatedTickers: ["SPY"] },
  { title: "Trade war concerns escalate, threatening global economic growth", publisher: "MarketWatch", relatedTickers: ["SPY", "QQQ"] },
  { title: "AI breakthrough boosts chip stocks as semiconductor sector rebounds", publisher: "Yahoo Finance", relatedTickers: ["SOXX", "NVDA", "AMD"] },
  { title: "Market correction deepens as recession fears grow among investors", publisher: "Reuters", relatedTickers: ["SPY", "QQQ", "DIA"] },
  { title: "Consumer spending rises, lifting retail stocks and market sentiment", publisher: "Bloomberg", relatedTickers: ["SPY"] },
];

function getMockNews(): NewsItem[] {
  const now = Math.floor(Date.now() / 1000);
  return MOCK_NEWS.map((item, i) => {
    const sentiment = analyzeSentiment(item.title);
    return {
      uuid: crypto.randomUUID(),
      title: item.title,
      publisher: item.publisher,
      link: `https://www.google.com/search?q=${encodeURIComponent(item.title)}`,
      providerPublishTime: now - i * 3600,
      type: "STORY",
      relatedTickers: item.relatedTickers,
      sentimentScore: sentiment.score,
      sentimentLabel: sentiment.label,
    };
  });
}

const QUERIES = ["%5EGSPC", "%5EIXIC", "%5EDJI"];

interface YahooNewsItem {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  type?: string;
  thumbnail?: { resolutions?: { url?: string }[] };
  relatedTickers?: string[];
}

async function fetchYahooNews(): Promise<NewsItem[]> {
  const results: NewsItem[] = [];
  const seen = new Set<string>();

  for (const q of QUERIES) {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${q}&newsCount=10&quotesCount=0&lang=en-US`;
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const rawNews: YahooNewsItem[] = data.news ?? [];
      for (const item of rawNews) {
        const uuid = item.uuid ?? crypto.randomUUID();
        if (seen.has(uuid)) continue;
        seen.add(uuid);
        const title = item.title ?? "";
        const sentiment = analyzeSentiment(title);
        results.push({
          uuid,
          title,
          publisher: item.publisher ?? "",
          link: item.link ?? "",
          providerPublishTime: item.providerPublishTime ?? Date.now() / 1000,
          type: item.type ?? "STORY",
          thumbnail: item.thumbnail?.resolutions?.[0]?.url,
          relatedTickers: item.relatedTickers ?? [],
          sentimentScore: sentiment.score,
          sentimentLabel: sentiment.label,
        });
      }
    } catch {
      // 개별 쿼리 실패는 무시하고 계속 진행
    }
  }

  if (results.length === 0) {
    console.warn("Yahoo News API returned no items, using mock data");
    return getMockNews();
  }

  // 최신순 정렬
  results.sort((a, b) => b.providerPublishTime - a.providerPublishTime);
  return results;
}

export const config = { runtime: "edge" };
export const maxDuration = 60;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const news = await fetchYahooNews();
    // 최신순 정렬 + 캐시 방지
    news.sort((a, b) => b.providerPublishTime - a.providerPublishTime);
    return new Response(
      JSON.stringify({ news, fetchedAt: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
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
