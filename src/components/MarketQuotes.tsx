import { Landmark, Droplet, Gem, Coins } from "lucide-react";
import type { QuoteGroup } from "@/types";

interface Props {
  groups: QuoteGroup[];
  loading: boolean;
  fetchedAt: string | null;
  onRefresh: () => void;
}

const GROUP_LABELS: Record<QuoteGroup["id"], { title: string; icon: typeof Landmark }> = {
  bonds: { title: "미국 국채 금리", icon: Landmark },
  oil: { title: "석유 가격", icon: Droplet },
  commodities: { title: "주요 원자재", icon: Gem },
  currencies: { title: "주요 통화", icon: Coins },
};

function formatPrice(item: QuoteGroup["items"][number]): string {
  if (item.unit === "") {
    return item.price.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  if (item.unit === "%") return `${item.price.toFixed(2)}%`;
  return item.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const d = `M ${coords.join(" L ")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketQuotes({ groups, loading, fetchedAt, onRefresh }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[#C5CAD3] text-xs">
          {fetchedAt
            ? `마지막 업데이트: ${new Date(fetchedAt).toLocaleString("ko-KR")}`
            : "60초마다 자동 새로고침됩니다"}
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary text-sm font-medium px-3 py-1.5 rounded-xl disabled:opacity-50"
        >
          {loading ? "로딩..." : "새로고침"}
        </button>
      </div>

      {loading && groups.length === 0 ? (
        <div className="surface p-8 text-center text-[#C5CAD3] text-sm">시세를 불러오는 중...</div>
      ) : (
        groups.map((group) => {
          const meta = GROUP_LABELS[group.id];
          const Icon = meta.icon;
          return (
            <div key={group.id} className="surface">
              <div className="flex items-center gap-2 p-5 border-b border-white/[0.12]">
                <Icon className="w-5 h-5 text-[#0066FF]" />
                <h2 className="text-white font-semibold tracking-tight">{meta.title}</h2>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {group.items.map((item) => {
                  const up = item.change >= 0;
                  const color = up ? "#00C853" : "#FF3B30";
                  return (
                    <div key={item.symbol} className="flex items-center justify-between px-4 sm:px-5 py-3.5 gap-2 sm:gap-3">
                      <a
                        href={item.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-[15px] font-bold shrink-0 w-24 sm:w-32 truncate hover:text-[#3388FF] transition-colors"
                      >
                        {item.name}
                      </a>
                      <div className="flex-1 min-w-0" />
                      <span className="flex items-baseline gap-1">
                        <span className="text-white font-semibold tabular-nums text-right">
                          {formatPrice(item)}
                        </span>
                        <span
                          className="text-xs font-semibold tabular-nums w-16 text-right"
                          style={{ color }}
                        >
                          {up ? "+" : ""}
                          {item.changePct.toFixed(2)}%
                        </span>
                      </span>
                      {item.spark && item.spark.length >= 2 ? (
                        <span className="w-[120px] hidden min-[480px]:flex justify-end shrink-0 ml-2 sm:ml-6">
                          <Sparkline
                            points={item.spark}
                            color={item.change >= 0 ? "#00C853" : "#FF3B30"}
                          />
                        </span>
                      ) : (
                        <span className="w-[120px] shrink-0 hidden min-[480px]:block" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
