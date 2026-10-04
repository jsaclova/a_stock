import type { EtfInfo } from "@/types";

export const ETF_LIST: EtfInfo[] = [
  // SPY 계열 — S&P 500 추종 (일반)
  { ticker: "SPY", name: "SPDR S&P 500 ETF Trust", category: "S&P 500", region: "미국", issuer: "State Street", leverage: "1배", expenseRatio: 0.0945, aumB: 817, yahooUrl: "https://finance.yahoo.com/quote/SPY" },
  { ticker: "IVV", name: "iShares Core S&P 500 ETF", category: "S&P 500", region: "미국", issuer: "BlackRock", leverage: "1배", expenseRatio: 0.03, aumB: 888, yahooUrl: "https://finance.yahoo.com/quote/IVV" },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", category: "S&P 500", region: "미국", issuer: "Vanguard", leverage: "1배", expenseRatio: 0.03, aumB: 1041, yahooUrl: "https://finance.yahoo.com/quote/VOO" },
  { ticker: "SPYM", name: "State Street SPDR Portfolio S&P 500 ETF (구 SPLG)", category: "S&P 500", region: "미국", issuer: "State Street", leverage: "1배", expenseRatio: 0.02, aumB: 60, yahooUrl: "https://finance.yahoo.com/quote/SPYM" },
  // SPY 계열 — 레버리지·인버스
  { ticker: "SSO", name: "ProShares Ultra S&P 500 (2배 레버리지)", category: "S&P 500", region: "미국", issuer: "ProShares", leverage: "2배", expenseRatio: 0.87, aumB: 8.6, yahooUrl: "https://finance.yahoo.com/quote/SSO" },
  { ticker: "UPRO", name: "ProShares UltraPro S&P 500 (3배 레버리지)", category: "S&P 500", region: "미국", issuer: "ProShares", leverage: "3배", expenseRatio: 0.89, aumB: 5.4, yahooUrl: "https://finance.yahoo.com/quote/UPRO" },
  { ticker: "SPXL", name: "Direxion Daily S&P 500 Bull 3X Shares (3배 레버리지)", category: "S&P 500", region: "미국", issuer: "Direxion", leverage: "3배", expenseRatio: 0.84, aumB: 6.7, yahooUrl: "https://finance.yahoo.com/quote/SPXL" },
  { ticker: "SDS", name: "ProShares UltraShort S&P 500 (-2배 인버스)", category: "S&P 500", region: "미국", issuer: "ProShares", leverage: "-2배", expenseRatio: 0.91, aumB: 0.37, yahooUrl: "https://finance.yahoo.com/quote/SDS" },
  { ticker: "SPXS", name: "Direxion Daily S&P 500 Bear 3X Shares (-3배 인버스)", category: "S&P 500", region: "미국", issuer: "Direxion", leverage: "-3배", expenseRatio: 1.04, aumB: 0.34, yahooUrl: "https://finance.yahoo.com/quote/SPXS" },
  // QQQ 계열 — 나스닥 100 추종 (일반)
  { ticker: "QQQ", name: "Invesco QQQ Trust (Nasdaq 100)", category: "나스닥 100", region: "미국", issuer: "Invesco", leverage: "1배", expenseRatio: 0.2, aumB: 489, yahooUrl: "https://finance.yahoo.com/quote/QQQ" },
  { ticker: "QQQM", name: "Invesco Nasdaq 100 ETF", category: "나스닥 100", region: "미국", issuer: "Invesco", leverage: "1배", expenseRatio: 0.15, aumB: 110, yahooUrl: "https://finance.yahoo.com/quote/QQQM" },
  { ticker: "IQQ", name: "iShares Nasdaq 100 ETF", category: "나스닥 100", region: "미국", issuer: "BlackRock", leverage: "1배", expenseRatio: 0.1, aumB: 0.68, yahooUrl: "https://finance.yahoo.com/quote/IQQ" },
  { ticker: "QNDX", name: "State Street SPDR Portfolio Nasdaq 100 ETF", category: "나스닥 100", region: "미국", issuer: "State Street", leverage: "1배", expenseRatio: 0.1, aumB: 0.26, yahooUrl: "https://finance.yahoo.com/quote/QNDX" },
  // QQQ 계열 — 레버리지·인버스
  { ticker: "QLD", name: "ProShares Ultra QQQ (2배 레버리지)", category: "나스닥 100", region: "미국", issuer: "ProShares", leverage: "2배", expenseRatio: 0.95, aumB: 9.9, yahooUrl: "https://finance.yahoo.com/quote/QLD" },
  { ticker: "TQQQ", name: "ProShares UltraPro QQQ (3배 레버리지)", category: "나스닥 100", region: "미국", issuer: "ProShares", leverage: "3배", expenseRatio: 0.82, aumB: 39, yahooUrl: "https://finance.yahoo.com/quote/TQQQ" },
  { ticker: "SQQQ", name: "ProShares UltraPro Short QQQ (3배 인버스)", category: "나스닥 100", region: "미국", issuer: "ProShares", leverage: "-3배", expenseRatio: 0.95, aumB: 2.1, yahooUrl: "https://finance.yahoo.com/quote/SQQQ" },
];

export const ETF_CATEGORIES = ["S&P 500", "나스닥 100"];

export const CATEGORY_COLORS: Record<string, string> = {
  "S&P 500": "#3d8bff",
  "나스닥 100": "#22c55e",
};
