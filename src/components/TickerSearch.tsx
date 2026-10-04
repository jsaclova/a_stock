import { useState } from "react";
import { Search } from "lucide-react";
import { fetchTicker } from "@/lib/api";
import type { TickerResponse } from "@/types";

function miniSpark(points: number[], color: string) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / span) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={`M ${coords.join(" L ")}`} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="티커 검색 (예: AAPL)"
          className="w-full sm:w-56 bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-[#6B7385] focus:outline-none focus:border-[#0066FF]"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 bg-[#0066FF] text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-[#0052cc] disabled:opacity-50 transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? "조회 중..." : "조회"}
        </button>
      </form>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {result && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-4 surface p-3 pr-4"
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
              </span>
            </p>
          </div>
          {miniSpark(result.spark, result.changePct >= 0 ? "#00C853" : "#FF3B30")}
        </a>
      )}
    </div>
  );
}
