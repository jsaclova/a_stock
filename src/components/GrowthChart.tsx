import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import type { DcaResult, ScenarioResult } from "@/types";
import { formatUsd, formatDate } from "@/lib/format";

interface Props {
  results: DcaResult[];
  scenarios?: ScenarioResult[];
  declinePct?: number;
}

const SYMBOL_COLORS: Record<string, string> = {
  QQQ: "#0066FF",
  SPY: "#22c55e",
  VOO: "#a855f7",
  DIA: "#f59e0b",
};

interface ChartRow {
  date: string;
  [key: string]: string | number;
}

export default function GrowthChart({ results, scenarios, declinePct }: Props) {
  if (results.length === 0) return null;

  const isScenario = scenarios && scenarios.length > 0 && declinePct !== undefined;
  const activeData = isScenario ? scenarios! : results;

  const dateSet = new Set<string>();
  if (isScenario) {
    scenarios!.forEach((s) =>
      s.simulatedPrices.forEach((p) => dateSet.add(p.date)),
    );
  } else {
    results.forEach((r) => r.monthlyPrices.forEach((p) => dateSet.add(p.date)));
  }
  const dates = Array.from(dateSet).sort();

  const chartData: ChartRow[] = dates.map((date) => {
    const row: ChartRow = { date };
    if (isScenario) {
      scenarios!.forEach((s) => {
        const point = s.simulatedPrices.find((p) => p.date === date);
        if (point) {
          const idx = s.simulatedPrices.findIndex((p) => p.date === date);
          const monthlyInvest = s.totalInvested / s.simulatedPrices.length;
          const investedSoFar = (idx + 1) * monthlyInvest;
          row[`${s.symbol}_invested`] = Math.round(investedSoFar);
          // Compute cumulative value at this point
          let shares = 0;
          for (let i = 0; i <= idx; i++) {
            shares += monthlyInvest / s.simulatedPrices[i].close;
          }
          row[`${s.symbol}_value`] = Math.round(shares * point.close);
        }
      });
    } else {
      results.forEach((r) => {
        const point = r.monthlyPrices.find((p) => p.date === date);
        if (point) {
          const idx = r.monthlyPrices.findIndex((p) => p.date === date);
          const invested = (idx + 1) * r.totalInvested / r.monthlyPrices.length;
          const value = point.close * (r.totalShares / r.monthlyPrices.length) * (idx + 1);
          row[`${r.symbol}_invested`] = Math.round(invested);
          row[`${r.symbol}_value`] = Math.round(value);
        }
      });
    }
    return row;
  });

  // Find the transition point (real → simulated) for the reference line
  let transitionDate: string | null = null;
  if (isScenario && scenarios!.length > 0) {
    const firstScenario = scenarios![0];
    const firstSimIdx = firstScenario.simulatedPrices.findIndex((p) => p.isSimulated);
    if (firstSimIdx > 0) {
      transitionDate = firstScenario.simulatedPrices[firstSimIdx].date;
    }
  }

  return (
    <div className="surface p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-white font-semibold text-lg tracking-tight">
          {isScenario ? "가상 하락 시나리오 시뮬레이션" : "자산 성장 추이"}
        </h2>
        <div className="flex items-center gap-4 text-xs">
          {activeData.map((item) => {
            const symbol = isScenario
              ? (item as ScenarioResult).symbol
              : (item as DcaResult).symbol;
            return (
              <div key={symbol} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SYMBOL_COLORS[symbol] || "#0066FF" }}
                />
                <span className="text-[#C5CAD3] font-medium">{symbol}</span>
              </div>
            );
          })}
          {isScenario && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-[#f59e0b]" />
              <span className="text-[#f59e0b] font-medium">하락 구간</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {activeData.map((item) => {
              const symbol = isScenario
                ? (item as ScenarioResult).symbol
                : (item as DcaResult).symbol;
              return (
                <linearGradient
                  key={symbol}
                  id={`gradient-${symbol}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={SYMBOL_COLORS[symbol] || "#0066FF"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={SYMBOL_COLORS[symbol] || "#0066FF"}
                    stopOpacity={0}
                  />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d323d" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#8a8f9b", fontSize: 11 }}
            axisLine={{ stroke: "#2d323d" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8a8f9b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E2530",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "16px",
              fontSize: "13px",
            }}
            labelStyle={{ color: "#C5CAD3", marginBottom: "4px" }}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value, name) => {
              const [symbol, type] = String(name).split("_");
              const label = type === "invested" ? "원금" : "평가액";
              return [formatUsd(Number(value)), `${symbol} ${label}`];
            }}
          />
          <Legend
            formatter={(value: string) => {
              const [symbol, type] = value.split("_");
              const label = type === "invested" ? "원금" : "평가액";
              return `${symbol} ${label}`;
            }}
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          />
          {transitionDate && (
            <ReferenceLine
              x={transitionDate}
              stroke="#f59e0b"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: "시나리오 시작",
                position: "top",
                fill: "#f59e0b",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
          {activeData.map((item) => {
            const symbol = isScenario
              ? (item as ScenarioResult).symbol
              : (item as DcaResult).symbol;
            return (
              <Area
                key={`${symbol}_invested`}
                type="monotone"
                dataKey={`${symbol}_invested`}
                stroke={SYMBOL_COLORS[symbol] || "#0066FF"}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
              />
            );
          })}
          {activeData.map((item) => {
            const symbol = isScenario
              ? (item as ScenarioResult).symbol
              : (item as DcaResult).symbol;
            return (
              <Area
                key={`${symbol}_value`}
                type="monotone"
                dataKey={`${symbol}_value`}
                stroke={SYMBOL_COLORS[symbol] || "#0066FF"}
                strokeWidth={2.5}
                fill={`url(#gradient-${symbol})`}
                dot={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
