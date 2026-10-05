import { useEffect, useState } from "react";
import { fetchStockData } from "@/lib/api";
import { IndexChart, UP, DOWN, etDayFmt, intradayXLabels, type ChartItem } from "@/components/IndexChart";

function formatIndex(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Unit = "day" | "month" | "year";

const UNIT_OPTIONS: { id: Unit; label: string }[] = [
  { id: "day", label: "일" },
  { id: "month", label: "월" },
  { id: "year", label: "년" },
];

const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 일: 당일 장중 15분봉 캔들(finivz식, 60초마다 갱신) / 월·년: 추세선(하루 한 번 갱신)
const UNIT_QUERY: Record<Unit, { range: string; interval: string; refreshMs: number; refreshLabel: string }> = {
  day: { range: "1d", interval: "15m", refreshMs: 60_000, refreshLabel: "60초마다 자동 새로고침" },
  month: { range: "1y", interval: "1mo", refreshMs: 24 * 60 * 60 * 1000, refreshLabel: "하루에 한 번 자동 새로고침" },
  year: { range: "10y", interval: "1mo", refreshMs: 24 * 60 * 60 * 1000, refreshLabel: "하루에 한 번 자동 새로고침" },
};

const INDEX_META = [
  { name: "S&P 500", symbol: "^GSPC" },
  { name: "NASDAQ", symbol: "^IXIC" },
  { name: "DOW", symbol: "^DJI" },
] as const;

const FALLBACK_CLOSES = [68, 70, 69, 72, 71, 74, 73, 76, 78, 77, 80, 82, 81, 85, 88];

function fallbackItem(meta: { name: string; symbol: string }, value: number, change: number, changePct: number): ChartItem {
  return {
    name: meta.name,
    symbol: meta.symbol,
    value,
    change,
    changePct,
    dateLabel: "",
    mode: "line",
    candles: [],
    closes: FALLBACK_CLOSES,
    xLabels: [],
    prevClose: null,
  };
}

// 월별 포인트들을 연도별 마지막 종가로 집계 (년/연도별 보기용)
function toYearly(points: { date: string; close: number }[]): { years: string[]; values: number[] } {
  const byYear = new Map<string, number>();
  for (const p of points) {
    byYear.set(p.date.slice(0, 4), p.close);
  }
  return { years: [...byYear.keys()], values: [...byYear.values()] };
}

export default function IndexTicker() {
  const [indices, setIndices] = useState<ChartItem[]>([
    fallbackItem(INDEX_META[0], 7743.41, 39.28, 0.51),
    fallbackItem(INDEX_META[1], 27068.72, 129.34, 0.48),
    fallbackItem(INDEX_META[2], 51828.62, 478.64, 0.93),
  ]);
  const [unit, setUnit] = useState<Unit>("day");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const handleUnit = (u: Unit) => {
    if (u === unit || switching) return;
    setSwitching(true);
    setUnit(u);
  };

  useEffect(() => {
    let cancelled = false;
    const { range, interval, refreshMs } = UNIT_QUERY[unit];
    const load = () => {
      fetchStockData(1, range, "^GSPC,^IXIC,^DJI", interval)
        .then((data) => {
          if (cancelled) return;
          const mapped: ChartItem[] = INDEX_META.map((meta) => {
            const result = data.results.find((r) => r.symbol === meta.symbol);
            if (!result || result.monthlyPrices.length === 0) {
              return fallbackItem(meta, 0, 0, 0);
            }
            if (unit === "day") {
              const candles = result.candles ?? [];
              if (candles.length < 2) return fallbackItem(meta, result.latestPrice, 0, 0);
              const prev = result.prevClose ?? candles[0].open;
              const latest = result.regularPrice ?? result.latestPrice;
              const change = latest - prev;
              const changePct = prev !== 0 ? (change / prev) * 100 : 0;
              return {
                name: meta.name,
                symbol: meta.symbol,
                value: latest,
                change,
                changePct,
                dateLabel: etDayFmt.format(new Date(candles[0].t * 1000)),
                mode: "candles" as const,
                candles,
                closes: [],
                xLabels: intradayXLabels(candles),
                prevClose: prev,
              };
            }
            if (unit === "year") {
              const { years, values } = toYearly(result.monthlyPrices);
              if (values.length < 2) return fallbackItem(meta, result.latestPrice, 0, 0);
              const latest = result.latestPrice;
              const prev = values[values.length - 2];
              const change = latest - prev;
              const changePct = prev !== 0 ? (change / prev) * 100 : 0;
              return {
                name: meta.name,
                symbol: meta.symbol,
                value: latest,
                change,
                changePct,
                dateLabel: years[years.length - 1] ?? "",
                mode: "line" as const,
                candles: [],
                closes: values,
                xLabels: years.map((yr, i) => ({ i, label: yr })),
                prevClose: null,
              };
            }
            const closes = result.monthlyPrices.map((p) => p.close);
            if (closes.length < 2) return fallbackItem(meta, result.latestPrice, 0, 0);
            const latest = result.latestPrice;
            // Yahoo 월봉 끝에 당월 미완성 봉이 붙어 있으므로, 월기준 = 전월 확정종가 대비
            const lastKey = result.monthlyPrices[result.monthlyPrices.length - 1].date.slice(0, 7);
            let prevIdx = result.monthlyPrices.length - 2;
            while (prevIdx > 0 && result.monthlyPrices[prevIdx].date.slice(0, 7) === lastKey) prevIdx--;
            const prev = closes[prevIdx];
            const change = latest - prev;
            const changePct = prev !== 0 ? (change / prev) * 100 : 0;
            const lastDate = new Date(result.monthlyPrices[result.monthlyPrices.length - 1].date);
            const step = Math.max(1, Math.ceil(closes.length / 6));
            const xLabels = closes
              .map((_, i) => i)
              .filter((i) => i % step === 0)
              .map((i) => {
                const d = new Date(result.monthlyPrices[i].date);
                return { i, label: `${MON_SHORT[d.getMonth()]}'${String(d.getFullYear()).slice(2)}` };
              });
            return {
              name: meta.name,
              symbol: meta.symbol,
              value: latest,
              change,
              changePct,
              dateLabel: `${MON_SHORT[lastDate.getMonth()]} ${lastDate.getFullYear()}`,
              mode: "line" as const,
              candles: [],
              closes,
              xLabels,
              prevClose: null,
            };
          });
          setIndices(mapped);
          setUpdatedAt(new Date().toISOString());
        })
        .catch(() => {
          // 실패 시 이전 데이터 유지
        })
        .finally(() => {
          if (!cancelled) setSwitching(false);
        });
    };
    load();
    const timer = setInterval(load, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [unit]);

  return (
    <section aria-label="미국 증시 3대 지수 현황">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4 px-0.5">
        <div className="min-w-0">
          <h2 className="text-white text-[15px] font-semibold tracking-tight">미국 증시 3대 지수</h2>
          <p className="text-[#6B7385] text-[11px] mt-1">
            {switching
              ? "불러오는 중..."
              : updatedAt
                ? `마지막 업데이트: ${new Date(updatedAt).toLocaleString("ko-KR")} · ${UNIT_QUERY[unit].refreshLabel}`
                : UNIT_QUERY[unit].refreshLabel}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.06] p-0.5 shrink-0">
          {UNIT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleUnit(opt.id)}
              disabled={switching}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 ${
                unit === opt.id
                  ? "bg-[#0066FF] text-white"
                  : "text-[#C5CAD3] hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 transition-opacity ${switching ? "opacity-60" : ""}`}>
        {indices.map((idx) => {
          const up = idx.change >= 0;
          const color = up ? UP : DOWN;
          const gid = `idx-${idx.symbol.replace(/[^a-zA-Z0-9]/g, "")}-${unit}`;
          return (
            <article key={idx.symbol} className="surface p-4">
              <div className="flex items-baseline justify-between gap-x-2 gap-y-1 flex-wrap mb-1 px-1">
                <p className="text-white font-bold text-[15px] tracking-tight">{idx.name}</p>
                <p className="text-[#6B7385] text-xs">{idx.dateLabel}</p>
                <p className="text-[13px] font-bold tabular-nums" style={{ color }}>
                  {up ? "+" : ""}
                  {formatIndex(idx.change)} ({up ? "+" : ""}
                  {idx.changePct.toFixed(2)}%)
                </p>
              </div>
              <IndexChart item={idx} gid={gid} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
