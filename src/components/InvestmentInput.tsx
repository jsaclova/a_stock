import { TrendingUp, RefreshCw } from "lucide-react";

interface Props {
  monthlyAmount: number;
  range: string;
  loading: boolean;
  onAmountChange: (v: number) => void;
  onRangeChange: (r: string) => void;
  onRefresh: () => void;
}

const AMOUNT_PRESETS = [300, 500, 1000, 2000];
const RANGE_OPTIONS = [
  { value: "3y", label: "3년" },
  { value: "5y", label: "5년" },
  { value: "10y", label: "10년" },
];

export default function InvestmentInput({
  monthlyAmount,
  range,
  loading,
  onAmountChange,
  onRangeChange,
  onRefresh,
}: Props) {
  return (
    <div className="surface p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-[#0066FF]" />
        <h2 className="text-white font-semibold text-lg tracking-tight">투자 설정</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-[#C5CAD3] text-sm font-medium mb-3 block">
            월 투자 금액
          </label>
          <div className="grid grid-cols-4 gap-2.5 mb-3">
            {AMOUNT_PRESETS.map((amt) => (
              <button
                key={amt}
                onClick={() => onAmountChange(amt)}
                className={`py-2.5 px-1 rounded-xl text-sm font-semibold ${
                  monthlyAmount === amt ? "btn-primary" : "btn-secondary"
                }`}
              >
                {`$${amt.toLocaleString()}`}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => onAmountChange(Math.max(1, Number(e.target.value)))}
              step={100}
              min={10}
              className="w-full bg-white/[0.08] text-white rounded-2xl px-4 py-3.5 pr-10 text-lg font-bold outline-none border border-white/[0.14] focus:border-[#0066FF] transition-colors tabular-nums"
              placeholder="직접 입력"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C5CAD3] text-sm font-medium">
              $
            </span>
          </div>
        </div>

        <div>
          <label className="text-[#C5CAD3] text-sm font-medium mb-3 block">
            조회 기간
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onRangeChange(opt.value)}
                className={`py-3 rounded-xl text-sm font-semibold ${
                  range === opt.value ? "btn-primary" : "btn-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn-primary w-full font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "계산 중..." : "다시 계산하기"}
        </button>
      </div>
    </div>
  );
}
