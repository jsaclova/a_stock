import { useEffect, useState } from "react";
import { fetchStockData } from "@/lib/api";

const FALLBACK_INDICES = [
  {
    name: "S&P 500",
    en: "S&P 500",
    symbol: "^GSPC",
    value: 7743.41,
    change: 39.28,
    changePct: 0.51,
    spark: [68, 70, 69, 72, 71, 74, 73, 76, 78, 77, 80, 82, 81, 85, 88],
  },
  {
    name: "나스닥",
    en: "NASDAQ",
    symbol: "^IXIC",
    value: 27068.72,
    change: 129.34,
    changePct: 0.48,
    spark: [72, 71, 74, 73, 75, 78, 76, 80, 79, 83, 82, 86, 85, 88, 90],
  },
  {
    name: "다우 존스",
    en: "Dow 30",
    symbol: "^DJI",
    value: 51828.62,
    change: 478.64,
    changePct: 0.93,
    spark: [64, 66, 65, 69, 68, 72, 74, 73, 77, 80, 79, 84, 86, 89, 93],
  },
] as const;

const INDEX_META = [
  { name: "S&P 500", en: "S&P 500", symbol: "^GSPC" },
  { name: "나스닥", en: "NASDAQ", symbol: "^IXIC" },
  { name: "다우 존스", en: "Dow 30", symbol: "^DJI" },
] as const;

type IndexItem = {
  name: string;
  en: string;
  symbol: string;
  value: number;
  change: number;
  changePct: number;
  spark: readonly number[];
};

function Sparkline({ points, color, id }: { points: readonly number[]; color: string; id: string }) {
  const w = 132;
  const h = 56;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const d = `M ${coords.join(" L ")}`;
  const area = `${d} L ${w},${h} L 0,${h} Z`;
  const gid = `spark-${id.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatIndex(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Unit = "day" | "month" | "year";

const UNIT_OPTIONS: { id: Unit; label: string }[] = [
  { id: "day", label: "일" },
  { id: "month", label: "월" },
  { id: "year", label: "년" },
];

// 일: 최근 1개월 일별 / 월: 최근 1년 월별 / 년: 최근 10년 연도별
const UNIT_QUERY: Record<Unit, { range: string; interval: string; periodLabel: string }> = {
  day: { range: "1mo", interval: "1d", periodLabel: "1개월" },
  month: { range: "1y", interval: "1mo", periodLabel: "1년" },
  year: { range: "10y", interval: "1mo", periodLabel: "10년" },
};

// 월별 포인트들을 연도별 마지막 종가로 집계 (년/연도별 보기용)
function toYearly(points: { date: string; close: number }[]): number[] {
  const byYear = new Map<string, number>();
  for (const p of points) {
    byYear.set(p.date.slice(0, 4), p.close);
  }
  return [...byYear.values()];
}

export default function IndexTicker() {
  const [indices, setIndices] = useState<readonly IndexItem[]>(FALLBACK_INDICES);
  const [unit, setUnit] = useState<Unit>("month");

  useEffect(() => {
    let cancelled = false;
    const { range, interval } = UNIT_QUERY[unit];
    fetchStockData(1, range, "^GSPC,^IXIC,^DJI", interval)
      .then((data) => {
        if (cancelled) return;
        const mapped: IndexItem[] = INDEX_META.map((meta) => {
          const result = data.results.find((r) => r.symbol === meta.symbol);
          if (!result || result.monthlyPrices.length === 0) {
            return FALLBACK_INDICES.find((f) => f.symbol === meta.symbol)!;
          }
          const spark =
            unit === "year"
              ? toYearly(result.monthlyPrices)
              : result.monthlyPrices.map((p) => p.close);
          const latest = result.latestPrice;
          const earliest = unit === "year" ? spark[0] : result.earliestPrice;
          const change = latest - earliest;
          const changePct = earliest !== 0 ? (change / earliest) * 100 : 0;
          return {
            name: meta.name,
            en: meta.en,
            symbol: meta.symbol,
            value: latest,
            change,
            changePct,
            spark,
          };
        });
        setIndices(mapped);
      })
      .catch(() => {
        // 실패 시 기본(mock) 데이터 유지
      });
    return () => {
      cancelled = true;
    };
  }, [unit]);

  return (
    <section aria-label="미국 증시 3대 지수 현황">
      <div className="flex items-baseline justify-between mb-4 px-0.5">
        <h2 className="text-white text-[15px] font-semibold tracking-tight">미국 증시 3대 지수</h2>
        <div className="flex items-center gap-1 rounded-lg bg-white/[0.06] p-0.5">
          {UNIT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setUnit(opt.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {indices.map((idx) => {
          const up = idx.change >= 0;
          const color = up ? "#00C853" : "#FF3B30";
          return (
            <article
              key={idx.symbol}
              className="surface p-5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-white font-semibold text-[15px] tracking-tight">{idx.name}</p>
                  {idx.en !== idx.name && (
                    <span className="text-[#6B7385] text-[11px] font-medium">{idx.en}</span>
                  )}
                  <span className="text-[#6B7385] text-[11px] font-medium tabular-nums">{idx.symbol}</span>
                </div>
                <p className="text-white text-[1.55rem] font-bold tracking-tight tabular-nums leading-none">
                  {formatIndex(idx.value)}
                </p>
                <p
                  className="mt-2.5 flex items-center gap-1 text-[13px] font-semibold tabular-nums"
                  style={{ color }}
                >
                  <span aria-hidden>{up ? "▲" : "▼"}</span>
                  <span>
                    {up ? "+" : ""}
                    {formatIndex(idx.change)} ({up ? "+" : ""}
                    {idx.changePct.toFixed(2)}% · {UNIT_QUERY[unit].periodLabel})
                  </span>
                </p>
              </div>
              <Sparkline points={idx.spark} color={color} id={idx.symbol} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
