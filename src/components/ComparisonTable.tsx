import { Calendar, CalendarDays } from "lucide-react";
import type { ComparisonRow } from "@/types";
import { formatUsd, formatPct } from "@/lib/format";

interface Props {
  rows: ComparisonRow[];
  symbol: string;
  declinePct: number;
}

export default function ComparisonTable({ rows, symbol, declinePct }: Props) {
  return (
    <div className="surface p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#0066FF]" />
          <h2 className="text-white font-semibold text-lg">
            분할 투자 주기 비교 시뮬레이터
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#C5CAD3]">{symbol} 기준</span>
          <span className="px-2 py-1 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] font-semibold">
            하락 시나리오 -{declinePct}%
          </span>
        </div>
      </div>

      {/* Strategy badges */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="inset-panel rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0066FF]/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#0066FF]" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">조건 A · 월간 적립</p>
            <p className="text-[#C5CAD3] text-xs">매월 1회 · $1,000</p>
          </div>
        </div>
        <div className="inset-panel rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00E5A0]/15 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-[#22c55e]" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">조건 B · 주간 적립</p>
            <p className="text-[#C5CAD3] text-xs">매주 1회 · $250 × 4회</p>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-3 text-[#C5CAD3] font-semibold text-xs">기간</th>
              <th className="text-right py-3 px-3 text-[#0066FF] font-semibold text-xs">월간 원금</th>
              <th className="text-right py-3 px-3 text-[#0066FF] font-semibold text-xs">월간 평가액</th>
              <th className="text-right py-3 px-3 text-[#0066FF] font-semibold text-xs">월간 수익률</th>
              <th className="text-right py-3 px-3 text-[#22c55e] font-semibold text-xs">주간 원금</th>
              <th className="text-right py-3 px-3 text-[#22c55e] font-semibold text-xs">주간 평가액</th>
              <th className="text-right py-3 px-3 text-[#22c55e] font-semibold text-xs">주간 수익률</th>
              <th className="text-right py-3 px-3 text-[#f59e0b] font-semibold text-xs">평단가 차이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const weeklyBetter = row.weeklyReturnPct > row.monthlyReturnPct;
              return (
                <tr
                  key={row.period}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3.5 px-3">
                    <span className="text-white font-semibold">{row.period}</span>
                  </td>
                  <td className="py-3.5 px-3 text-right text-[#C5CAD3] tabular-nums">
                    {formatUsd(row.monthlyInvested)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-white tabular-nums font-medium">
                    {formatUsd(row.monthlyValue)}
                  </td>
                  <td
                    className="py-3.5 px-3 text-right tabular-nums font-semibold"
                    style={{ color: row.monthlyReturnPct >= 0 ? "#22c55e" : "#ef4444" }}
                  >
                    {formatPct(row.monthlyReturnPct)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-[#C5CAD3] tabular-nums">
                    {formatUsd(row.weeklyInvested)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-white tabular-nums font-medium">
                    {formatUsd(row.weeklyValue)}
                  </td>
                  <td
                    className="py-3.5 px-3 text-right tabular-nums font-semibold"
                    style={{ color: row.weeklyReturnPct >= 0 ? "#22c55e" : "#ef4444" }}
                  >
                    {formatPct(row.weeklyReturnPct)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className="px-2 py-1 rounded-md text-xs font-bold tabular-nums"
                      style={{
                        backgroundColor: weeklyBetter ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: weeklyBetter ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {row.avgCostDiff > 0 ? "+" : ""}{row.avgCostDiff.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-start gap-2 inset-panel rounded-2xl p-4">
        <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1 shrink-0" />
        <p className="text-[#C5CAD3] text-xs leading-relaxed">
          하락장에서 주간 쪼개기 투자가 평단가를 더 세밀하게 낮추는 효과
          <span className="text-white font-semibold"> (코스트 에버리징)</span>를 확인해 보세요!
          <span className="text-[#f59e0b] font-semibold"> 평단가 차이</span>는 주간 적립이
          월간 적립 대비 평균 매수 단가를 얼마나 더 낮췄는지 나타냅니다.
        </p>
      </div>
    </div>
  );
}
