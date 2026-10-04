import { Wallet, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";
import type { DcaResult, ScenarioResult } from "@/types";
import { formatUsd, formatPct, formatNumber } from "@/lib/format";

interface Props {
  result: DcaResult;
  scenario?: ScenarioResult;
}

export default function StatsCard({ result, scenario }: Props) {
  const data = scenario ?? result;
  const isProfit = data.totalReturn >= 0;
  const accentColor = isProfit ? "#22c55e" : "#ef4444";

  const cards = [
    {
      label: "총 투자 원금",
      value: formatUsd(data.totalInvested),
      icon: Wallet,
      color: "#8a8f9b",
    },
    {
      label: scenario ? "시나리오 평가액" : "현재 평가 금액",
      value: formatUsd(data.currentValue),
      icon: BarChart3,
      color: "#0066FF",
    },
    {
      label: scenario ? "시나리오 수익(손실)" : "누적 수익(손실)",
      value: `${isProfit ? "+" : ""}${formatUsd(data.totalReturn)}`,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: accentColor,
    },
    {
      label: "수익률",
      value: formatPct(data.totalReturnPct),
      icon: isProfit ? TrendingUp : TrendingDown,
      color: accentColor,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="surface p-6"
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Icon className="w-4 h-4" style={{ color: card.color }} />
                <span className="text-[#C5CAD3] text-xs font-medium">
                  {card.label}
                </span>
              </div>
              <p
                className="text-xl font-bold tracking-tight tabular-nums"
                style={{ color: card.color === "#8a8f9b" ? "#fff" : card.color }}
              >
                {card.value}
              </p>
              <p className="text-[#C5CAD3] text-xs mt-1.5">
                {result.symbol} · {formatNumber(data.totalShares)}주 보유
              </p>
            </div>
          );
        })}
      </div>

      {scenario && (
        <div className="grid grid-cols-2 gap-4">
          <div className="surface p-6 border-[#f59e0b]/20">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-[#C5CAD3] text-xs font-medium">
                최대 낙폭 (MDD)
              </span>
            </div>
            <p className="text-xl font-bold text-[#f59e0b] tabular-nums">
              {scenario.maxDrawdownPct.toFixed(1)}%
            </p>
            <p className="text-[#C5CAD3] text-xs mt-1.5">
              {formatUsd(scenario.maxDrawdownValue)}
            </p>
          </div>
          <div className="surface p-6">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingDown className="w-4 h-4 text-[#ef4444]" />
              <span className="text-[#C5CAD3] text-xs font-medium">
                바닥가 대비 현재가
              </span>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">
              ${scenario.bottomPrice.toFixed(2)}
            </p>
            <p className="text-[#C5CAD3] text-xs mt-1.5">
              하락폭 -{scenario.declinePct}% 적용
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
