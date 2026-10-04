export interface PricePoint {
  date: string;
  close: number;
}

export interface DcaResult {
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

export interface ScenarioPoint {
  date: string;
  close: number;
  isSimulated: boolean;
}

export interface ScenarioResult {
  symbol: string;
  declinePct: number;
  simulatedPrices: ScenarioPoint[];
  totalInvested: number;
  totalShares: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  maxDrawdownValue: number;
  maxDrawdownPct: number;
  bottomPrice: number;
}

export interface StockDataResponse {
  results: DcaResult[];
  monthlyAmount: number;
  range: string;
}

export interface NewsItem {
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

export interface NewsResponse {
  news: NewsItem[];
  fetchedAt: string;
}

export interface QuoteItem {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  unit: string;
  spark?: number[];
  url?: string;
}

export interface QuoteGroup {
  id: "bonds" | "oil" | "commodities" | "currencies";
  items: QuoteItem[];
}

export interface MarketQuotesResponse {
  groups: QuoteGroup[];
  fetchedAt: string;
}

export interface TopStockRow {
  rank: number;
  symbol: string;
  name: string;
  date: string;
  close: number;
  open: number | null;
  change: number;
  changePct: number;
  volume: number | null;
  marketCap: number | null;
}

export interface TopStocksResponse {
  rows: TopStockRow[];
  fetchedAt: string;
}

export interface FxKrwRate {
  name: string;
  symbol: string;
  price: number;
  changePct: number;
}

export interface FxKrwResponse {
  rates: FxKrwRate[];
  fetchedAt: string;
}

export interface TickerResponse {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  spark: number[];
  url: string;
}

export interface PortfolioBuy {
  date: string;
  openPrice: number;
  shares: number;
  cost: number;
}

export interface PortfolioResponse {
  symbol: string;
  name: string;
  sharesPerBuy: number;
  since: string;
  frequency: "weekly" | "monthly";
  weekday: number;
  monthday: number;
  ruleLabel: string;
  rows: PortfolioBuy[];
  skipped: string[];
  totalInvested: number;
  totalShares: number;
  currentPrice: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  nextBuyDate: string;
  fetchedAt: string;
}

export type DcaFrequency = "monthly" | "weekly";

export interface ComparisonRow {
  period: string;
  monthsElapsed: number;
  monthlyInvested: number;
  monthlyValue: number;
  monthlyReturnPct: number;
  weeklyInvested: number;
  weeklyValue: number;
  weeklyReturnPct: number;
  avgCostDiff: number;
}

export interface EtfInfo {
  ticker: string;
  name: string;
  category: string;
  region: string;
  issuer: string;
  leverage: string;
  expenseRatio: number;
  /** 운용규모 (단위: 십억 달러, 2026년 10월 초 기준 추정치) */
  aumB: number;
  yahooUrl: string;
}
