import { useEffect, useState } from "react";
import { fetchFxKrw } from "@/lib/api";
import type { FxKrwRate } from "@/types";

export default function FxRatesStrip() {
  const [rates, setRates] = useState<FxKrwRate[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchFxKrw()
        .then((data) => {
          if (!cancelled) setRates(data.rates);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (rates.length === 0) return null;

  return (
    <section aria-label="오늘의 원화 환율" className="surface px-5 py-3.5">
      <div className="flex items-center justify-between gap-4 flex-nowrap overflow-x-auto whitespace-nowrap">
        <span className="text-[#C5CAD3] text-xs font-semibold shrink-0">오늘의 원/달러 등 환율</span>
        {rates.map((r) => {
          const up = r.changePct >= 0;
          return (
            <div key={r.symbol} className="flex items-baseline gap-1.5 shrink-0">
              <span className="text-[#C5CAD3] text-xs">{r.name}</span>
              <span className="text-white font-bold tabular-nums">
                {r.price.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
                <span className="text-[#C5CAD3] text-xs font-normal ml-0.5">원</span>
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: up ? "#00C853" : "#FF3B30" }}
              >
                {up ? "+" : ""}
                {r.changePct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
