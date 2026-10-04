import { ETF_LIST } from "@/lib/etfData";
import { supabase } from "@/lib/supabase";

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

// 로그인 상태면 Supabase 개인 설정을, 아니면 브라우저 로컬 설정을 사용
export async function loadAutoTrade(): Promise<AutoTradeSetting> {
  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from("auto_trade_settings")
          .select("symbol, shares, frequency, weekday, monthday")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!error && data) {
          return (
            sanitize(
              String(data.symbol ?? ""),
              Number(data.shares),
              (data as { frequency?: unknown }).frequency,
              (data as { weekday?: unknown }).weekday,
              (data as { monthday?: unknown }).monthday,
            ) ?? { ...DEFAULT_SETTING }
          );
        }
        return { ...DEFAULT_SETTING };
      }
    } catch {
      // 네트워크 오류 등은 로컬 폴백
    }
  }
  return readLocal();
}

export async function saveAutoTrade(setting: AutoTradeSetting): Promise<void> {
  const clean =
    sanitize(setting.symbol, setting.shares, setting.frequency, setting.weekday, setting.monthday) ??
    { ...DEFAULT_SETTING };
  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { error } = await supabase.from("auto_trade_settings").upsert(
          {
            user_id: session.user.id,
            symbol: clean.symbol,
            shares: clean.shares,
            frequency: clean.frequency,
            weekday: clean.weekday,
            monthday: clean.monthday,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        if (!error) return;
      }
    } catch {
      // 폴백
    }
  }
  writeLocal(clean);
}
