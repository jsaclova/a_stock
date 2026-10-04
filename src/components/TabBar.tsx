import { LayoutDashboard, CandlestickChart, TrendingUp, TrendingDown, Layers, Briefcase } from "lucide-react";

export type TabId = "dashboard" | "portfolio" | "market" | "topstocks" | "decline" | "etf";

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS = [
  { id: "dashboard" as const, label: "적립식 시뮬레이션", icon: LayoutDashboard },
  { id: "portfolio" as const, label: "포트폴리오", icon: Briefcase },
  { id: "market" as const, label: "시장 정보", icon: CandlestickChart },
  { id: "etf" as const, label: "지수ETF", icon: Layers },
  { id: "topstocks" as const, label: "상위 100종목", icon: TrendingUp },
  { id: "decline" as const, label: "가상하락 시나리오", icon: TrendingDown },
];

export default function TabBar({ active, onChange }: Props) {
  return (
    <div className="flex gap-1.5 rounded-[20px] p-1.5 border border-white/[0.14] bg-white/[0.04]">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold ${
              isActive ? "btn-primary" : "btn-secondary"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
