import { TrendingDown } from "lucide-react";

interface Props {
  declinePct: number;
  onChange: (v: number) => void;
}

export default function DeclineSlider({ declinePct, onChange }: Props) {
  return (
    <div className="surface p-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="w-5 h-5 text-[#f59e0b]" />
        <h2 className="text-white font-semibold text-lg tracking-tight">가상 하락 시나리오</h2>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-[#C5CAD3] text-sm font-medium">
            설정된 최대 하락폭
          </span>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: "#f59e0b" }}
          >
            -{declinePct}%
          </span>
        </div>

        <div className="relative pt-1 pb-1">
          <input
            type="range"
            min={10}
            max={50}
            step={1}
            value={declinePct}
            onChange={(e) => onChange(Number(e.target.value))}
            className="scenario-slider w-full"
            style={{ ["--slider-fill" as string]: `${((declinePct - 10) / 40) * 100}%` }}
          />
          <div className="flex justify-between mt-2 text-xs text-[#C5CAD3] font-medium tabular-nums">
            <span>-10%</span>
            <span>-20%</span>
            <span>-30%</span>
            <span>-40%</span>
            <span>-50%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 inset-panel rounded-2xl p-4">
          <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          <p className="text-[#C5CAD3] text-xs leading-relaxed">
            최근 12개월 주가를 <span className="text-[#f59e0b] font-semibold">-{declinePct}%</span>까지
            하락시킨 뒤, 이후 12개월간 반등하는 시나리오를 시뮬레이션합니다.
            슬라이더를 움직이면 그래프와 수익률이 즉시 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
