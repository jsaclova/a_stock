import { ETF_LIST } from "@/lib/etfData";

export interface AutoTradeSetting {
  symbol: string;
  shares: number;
  frequency: "weekly" | "monthly";
  weekday: number; // 1=월 … 5=금 (주간용)
  monthday: number; // 1-31 (월간용)
}

export const DEFAULT_SETTING: AutoTradeSetting = {
  symbol: "SPYM",
  shares: 2,
  frequency: "weekly",
  weekday: 5,
  monthday: 1,
};

export function ruleLabelOf(s: AutoTradeSetting): string {
  const WEEKDAY_KO = ["", "월", "화", "수", "목", "금"];
  return s.frequency === "weekly"
    ? `매주 ${WEEKDAY_KO[s.weekday] ?? "금"}요일`
    : `매월 ${s.monthday}일`;
}

const LOCAL_KEY = "auto-trade-setting-v1";

function sanitize(
  symbol: string,
  shares: number,
  frequency: unknown,
  weekday: unknown,
  monthday: unknown,
): AutoTradeSetting | null {
  const clean = symbol.toUpperCase();
  const qty = Math.max(1, Math.floor(Number(shares) || 0));
  const freq = frequency === "monthly" ? "monthly" : "weekly";
  const wd = Math.min(5, Math.max(1, Math.floor(Number(weekday) || 5)));
  const md = Math.min(31, Math.max(1, Math.floor(Number(monthday) || 1)));
  if (!ETF_LIST.some((e) => e.ticker === clean) || qty <= 0) return null;
  return { symbol: clean, shares: qty, frequency: freq, weekday: wd, monthday: md };
}

function readLocal(): AutoTradeSetting {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { ...DEFAULT_SETTING };
    const parsed = JSON.parse(raw) as Partial<AutoTradeSetting>;
    // 구버전 저장값(symbol/shares만)도 기본 주기로 보정
    return (
      sanitize(
        String(parsed.symbol ?? ""),
        Number(parsed.shares),
        parsed.frequency,
        parsed.weekday,
        parsed.monthday,
      ) ?? { ...DEFAULT_SETTING }
    );
  } catch {
    return { ...DEFAULT_SETTING };
  }
}

function writeLocal(setting: AutoTradeSetting): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(setting));
  } catch {
    // 무시
  }
}

// 자동매매 설정은 브라우저 로컬에만 저장 (DB/로그인 없음)
export async function loadAutoTrade(): Promise<AutoTradeSetting> {
  return readLocal();
}

export async function saveAutoTrade(setting: AutoTradeSetting): Promise<void> {
  const clean =
    sanitize(setting.symbol, setting.shares, setting.frequency, setting.weekday, setting.monthday) ??
    { ...DEFAULT_SETTING };
  writeLocal(clean);
}
