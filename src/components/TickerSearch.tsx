import { useState } from "react";
import { Search, X } from "lucide-react";
import { fetchTicker } from "@/lib/api";
import { IndexChart, etDayFmt, intradayXLabels, type ChartItem } from "@/components/IndexChart";
import type { TickerResponse } from "@/types";

export default function TickerSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<TickerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicker(q);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const chart: ChartItem | null = (() => {
    if (!result) return null;
    const candles = result.candles ?? [];
    if (candles.length >= 2) {
      const prev = result.prevClose ?? candles[0].open;
      return {
        name: result.symbol,
        symbol: result.symbol,
        value: result.price,
        change: result.change,
        changePct: result.changePct,
        dateLabel: etDayFmt.format(new Date(candles[0].t * 1000)),
        mode: "candles",
        candles,
        closes: [],
        xLabels: intradayXLabels(candles, 5),
        prevClose: prev,
      };
    }
    if (result.spark.length >= 2) {
      return {
        name: result.symbol,
        symbol: result.symbol,
        value: result.price,
        change: result.change,
        changePct: result.changePct,
        dateLabel: "",
        mode: "line",
        candles: [],
        closes: result.spark,
        xLabels: [],
        prevClose: null,
      };
    }
    return null;
  })();

  return (
    <div className="flex-1 min-w-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex items-center gap-2 flex-nowrap w-full"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="티커 검색 (예: AAPL)"
          className="min-w-0 flex-1 sm:flex-none sm:w-56 bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-[#6B7385] focus:outline-none focus:border-[#0066FF]"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#0066FF] text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-[#0052cc] disabled:opacity-50 transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? "조회 중..." : "조회"}
        </button>
      </form>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {result && (
        <div className="mt-3 surface p-3 pr-4 relative">
          <button
            onClick={() => setResult(null)}
            title="닫기"
            aria-label="조회 결과 닫기"
            className="absolute top-2 right-2 p-1 rounded-lg text-[#6B7385] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
          <div>
            <p className="text-white font-bold text-sm">
              {result.symbol} <span className="text-[#C5CAD3] font-normal text-xs ml-1">{result.name}</span>
            </p>
            <p className="text-white text-lg font-bold tabular-nums">
              ${result.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span
                className="text-xs font-semibold ml-2"
                style={{ color: result.changePct >= 0 ? "#00C853" : "#FF3B30" }}
              >
                {result.changePct >= 0 ? "+" : ""}
                {result.changePct.toFixed(2)}%
                <span className="text-[#6B7385] font-normal"> · 전일 대비</span>
              </span>
            </p>
          </div>
          {chart && (
            <div className="mt-2">
              <IndexChart item={chart} gid={`ticker-${result.symbol}`} compact />
            </div>
          )}
          </a>
        </div>
      )}
    </div>
  );
}
