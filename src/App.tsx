import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, LogIn, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import InvestmentInput from "@/components/InvestmentInput";
import StatsCard from "@/components/StatsCard";
import GrowthChart from "@/components/GrowthChart";
import NewsPanel from "@/components/NewsPanel";
import DeclineSlider from "@/components/DeclineSlider";
import TabBar from "@/components/TabBar";
import type { TabId } from "@/components/TabBar";
import MarketQuotes from "@/components/MarketQuotes";
import TickerSearch from "@/components/TickerSearch";
import TopStocks from "@/components/TopStocks";
import EtfList from "@/components/EtfList";
import PortfolioPanel from "@/components/PortfolioPanel";
import AuthDialog from "@/components/AuthDialog";
import { supabase } from "@/lib/supabase";
import FxRatesStrip from "@/components/FxRatesStrip";
import IndexTicker from "@/components/IndexTicker";
import { fetchStockData, fetchMarketNews, fetchMarketQuotes, fetchTopStocks, fetchPortfolio } from "@/lib/api";
import { loadAutoTrade } from "@/lib/autoTrade";
import { buildScenario, buildLongTermForecast } from "@/lib/scenario";
import type { LongTermForecast } from "@/lib/scenario";
import type { DcaResult, NewsItem, ScenarioResult } from "@/types";

export default function App() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [range, setRange] = useState("5y");
  const [declinePct, setDeclinePct] = useState(30);
  const [results, setResults] = useState<DcaResult[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<import("@/types").QuoteGroup[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quotesFetchedAt, setQuotesFetchedAt] = useState<string | null>(null);
  const [topStocks, setTopStocks] = useState<import("@/types").TopStockRow[]>([]);
  const [topStocksLoading, setTopStocksLoading] = useState(true);
  const [topStocksError, setTopStocksError] = useState<string | null>(null);
  const [topStocksFetchedAt, setTopStocksFetchedAt] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<import("@/types").PortfolioResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [portfolioFetchedAt, setPortfolioFetchedAt] = useState<string | null>(null);

  const loadStockData = useCallback(async () => {
    setStockLoading(true);
    setStockError(null);
    try {
      const data = await fetchStockData(monthlyAmount, range);
      setResults(data.results);
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "데이터 로드 실패");
    } finally {
      setStockLoading(false);
    }
  }, [monthlyAmount, range]);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const data = await fetchMarketNews();
      setNews(data.news);
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : "뉴스 로드 실패");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  const loadPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const setting = await loadAutoTrade();
      const data = await fetchPortfolio(
        setting.symbol,
        setting.shares,
        setting.frequency,
        setting.weekday,
        setting.monthday,
      );
      setPortfolio(data);
      setPortfolioFetchedAt(data.fetchedAt);
    } catch (err) {
      setPortfolioError(err instanceof Error ? err.message : "포트폴리오 로드 실패");
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
    const timer = setInterval(loadPortfolio, 60_000);
    return () => clearInterval(timer);
  }, [loadPortfolio]);

  // 포트폴리오 탭 진입 시 지수ETF에서 바꾼 설정을 즉시 반영
  useEffect(() => {
    if (tab === "portfolio") loadPortfolio();
  }, [tab, loadPortfolio]);

  const loadTopStocks = useCallback(async () => {
    setTopStocksLoading(true);
    setTopStocksError(null);
    try {
      const data = await fetchTopStocks();
      setTopStocks(data.rows);
      setTopStocksFetchedAt(data.fetchedAt);
    } catch (err) {
      setTopStocksError(err instanceof Error ? err.message : "종목 데이터 로드 실패");
    } finally {
      setTopStocksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopStocks();
    const timer = setInterval(loadTopStocks, 60_000);
    return () => clearInterval(timer);
  }, [loadTopStocks]);

  const loadQuotes = useCallback(async () => {
    setQuotesLoading(true);
    setQuotesError(null);
    try {
      const data = await fetchMarketQuotes();
      setQuotes(data.groups);
      setQuotesFetchedAt(data.fetchedAt);
    } catch (err) {
      setQuotesError(err instanceof Error ? err.message : "시세 로드 실패");
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
    const timer = setInterval(loadQuotes, 60_000);
    return () => clearInterval(timer);
  }, [loadQuotes]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase?.auth.signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const scenarios: ScenarioResult[] = useMemo(
    () => results.map((r) => buildScenario(r, declinePct)),
    [results, declinePct],
  );

  const forecasts = useMemo(
    () =>
      results
        .map((r) => buildLongTermForecast(r, declinePct))
        .filter((f): f is LongTermForecast => f !== null),
    [results, declinePct],
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white">
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <header className="sticky top-0 z-10 border-b border-white/[0.12] bg-[#0B0F17]/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[#C5CAD3] text-xs font-medium tracking-[0.14em] uppercase mb-2">
              US Index
            </p>
            <h1 className="text-white font-bold text-[1.75rem] sm:text-4xl lg:text-[2.65rem] leading-[1.15] tracking-tight">
              미국지수 적립식 투자
            </h1>
            <p className="text-[#C5CAD3] text-sm mt-2">QQQ · SPY 분할 매수 시뮬레이터</p>
          </div>
          <div className="shrink-0 pb-1 flex items-end gap-2">
            <TickerSearch />
            {supabase &&
              (user ? (
                <>
                  <span className="hidden md:inline text-xs text-[#C5CAD3] pb-2 max-w-40 truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="로그아웃"
                    className="btn-secondary p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">로그아웃</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="flex items-center gap-1.5 bg-[#0066FF] text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-[#0052cc] transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  로그인
                </button>
              ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <div className="mb-8">
          <IndexTicker />
        </div>

        <div className="mb-7">
          <FxRatesStrip />
        </div>

        <div className="mb-7">
          <TabBar active={tab} onChange={setTab} />
        </div>

        {tab === "topstocks" ? (
          <div>
            {topStocksError ? (
              <div className="surface p-8 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">종목 데이터를 불러오지 못했습니다</p>
                  <p className="text-xs text-[#C5CAD3] mt-0.5">{topStocksError}</p>
                </div>
              </div>
            ) : (
              <TopStocks
                rows={topStocks}
                loading={topStocksLoading}
                fetchedAt={topStocksFetchedAt}
                onRefresh={loadTopStocks}
              />
            )}
          </div>
        ) : tab === "portfolio" ? (
          <div>
            {portfolioError ? (
              <div className="surface p-8 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">포트폴리오를 불러오지 못했습니다</p>
                  <p className="text-xs text-[#C5CAD3] mt-0.5">{portfolioError}</p>
                </div>
              </div>
            ) : (
              <PortfolioPanel
                data={portfolio}
                loading={portfolioLoading}
                fetchedAt={portfolioFetchedAt}
                onRefresh={loadPortfolio}
              />
            )}
          </div>
        ) : tab === "dashboard" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <InvestmentInput
                monthlyAmount={monthlyAmount}
                range={range}
                loading={stockLoading}
                onAmountChange={setMonthlyAmount}
                onRangeChange={setRange}
                onRefresh={loadStockData}
              />

              {stockError ? (
                <div className="surface p-8 flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">데이터를 불러오지 못했습니다</p>
                    <p className="text-xs text-[#C5CAD3] mt-0.5">{stockError}</p>
                    <p className="text-xs text-[#C5CAD3] mt-1">
                      야후 파이낸스 API가 일시적으로 차단되었을 수 있습니다. 잠시 후 다시 시도해 주세요.
                    </p>
                  </div>
                </div>
              ) : stockLoading ? (
                <div className="surface p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-white/[0.08] rounded w-1/3" />
                    <div className="h-64 bg-white/[0.08] rounded-2xl" />
                  </div>
                </div>
              ) : (
                results.length > 0 && (
                  <>
                    {results.map((r) => {
                      return (
                        <div key={r.symbol} className="space-y-4">
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-white font-bold text-lg tracking-tight">{r.symbol}</span>
                            <span className="text-[#C5CAD3] text-sm">{r.name}</span>
                          </div>
                          <StatsCard result={r} />
                        </div>
                      );
                    })}
                    <GrowthChart
                      results={results}
                    />
                  </>
                )
              )}
            </div>

            <div className="lg:col-span-4">
              {newsError ? (
                <div className="surface p-8 flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">뉴스를 불러오지 못했습니다</p>
                    <p className="text-xs text-[#C5CAD3] mt-0.5">{newsError}</p>
                  </div>
                </div>
              ) : (
                <NewsPanel news={news} loading={newsLoading} onRefresh={loadNews} />
              )}
            </div>
          </div>
        ) : tab === "decline" ? (
          <div className="space-y-6">
            <DeclineSlider declinePct={declinePct} onChange={setDeclinePct} />

            {stockError ? (
              <div className="surface p-8 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">데이터를 불러오지 못했습니다</p>
                  <p className="text-xs text-[#C5CAD3] mt-0.5">{stockError}</p>
                </div>
              </div>
            ) : stockLoading ? (
              <div className="surface p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-white/[0.08] rounded w-1/3" />
                  <div className="h-48 bg-white/[0.08] rounded-2xl" />
                </div>
              </div>
            ) : (
              scenarios.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {scenarios.map((s) => (
                    <div key={s.symbol} className="surface p-6 space-y-4">
                      <div className="flex items-baseline justify-between">
                        <p className="text-white font-bold text-lg">{s.symbol}</p>
                        <p className="text-[#C5CAD3] text-xs">-{s.declinePct}%</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-[#C5CAD3] text-xs mb-1">바닥 주가</p>
                          <p className="text-white font-bold tabular-nums">${s.bottomPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-[#C5CAD3] text-xs mb-1">최대 낙폭</p>
                          <p className="text-[#FF3B30] font-bold tabular-nums">${s.maxDrawdownValue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[#C5CAD3] text-xs mb-1">낙폭 비율</p>
                          <p className="text-[#FF3B30] font-bold tabular-nums">-{s.maxDrawdownPct.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            <GrowthChart results={results} scenarios={scenarios} declinePct={declinePct} />

            {forecasts.length > 0 && (
              <div className="surface p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-white font-semibold text-lg tracking-tight">
                    계속 적립 시 5년·10년 후 예측
                  </h2>
                  <p className="text-[#C5CAD3] text-xs mt-1.5 leading-relaxed">
                    가상 하락(-{declinePct}%)과 12개월 반등을 거친 뒤에도 매월 $
                    {forecasts[0].monthlyAmount.toLocaleString()}씩 계속 적립한다고 가정한
                    시뮬레이션입니다. 반등 이후 연 {forecasts[0].assumedAnnualReturnPct}% 성장 가정.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {forecasts.map((f) => (
                    <div key={f.symbol} className="inset-panel rounded-2xl p-5">
                      <p className="text-white font-bold mb-4">{f.symbol}</p>
                      {[
                        { label: "5년 후", point: f.year5 },
                        { label: "10년 후", point: f.year10 },
                      ].map(({ label, point }) => {
                        const profit = point.totalReturn >= 0;
                        return (
                          <div key={label} className="mb-4 last:mb-0">
                            <p className="text-[#C5CAD3] text-xs font-semibold mb-2">{label}</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div>
                                <p className="text-[#C5CAD3] text-xs mb-1">총 투자금</p>
                                <p className="text-white font-bold tabular-nums text-sm">
                                  ${point.totalInvested.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#C5CAD3] text-xs mb-1">예상 평가액</p>
                                <p className="text-white font-bold tabular-nums text-sm">
                                  ${point.currentValue.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-[#C5CAD3] text-xs mb-1">예상 수익률</p>
                                <p
                                  className="font-bold tabular-nums text-sm"
                                  style={{ color: profit ? "#00C853" : "#FF3B30" }}
                                >
                                  {profit ? "+" : ""}
                                  {point.totalReturnPct.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === "market" ? (
          <div>
            {quotesError ? (
              <div className="surface p-8 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">시세를 불러오지 못했습니다</p>
                  <p className="text-xs text-[#C5CAD3] mt-0.5">{quotesError}</p>
                </div>
              </div>
            ) : (
              <MarketQuotes
                groups={quotes}
                loading={quotesLoading}
                fetchedAt={quotesFetchedAt}
                onRefresh={loadQuotes}
              />
            )}
          </div>
        ) : (
          <div>
            <EtfList />
          </div>
        )}

        <footer className="mt-12 pt-8 border-t border-white/[0.12] text-center text-[#C5CAD3] text-xs leading-relaxed">
          <p>데이터 출처: Yahoo Finance · 감성 분석은 키워드 기반 AI 분석으로 참고용입니다</p>
          <p className="mt-1.5">투자에는 항상 위험이 따르며, 모든 투자의 책임은 투자자 본인에게 있습니다.</p>
        </footer>
      </main>
    </div>
  );
}
