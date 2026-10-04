import type { TopStockRow } from "@/types";

interface Props {
  rows: TopStockRow[];
  loading: boolean;
  fetchedAt: string | null;
  onRefresh: () => void;
}

function formatVolume(v: number | null): string {
  if (v === null) return "-";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString("en-US");
}

function formatMarketCap(v: number | null): string {
  if (v === null) return "-";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  return `$${v.toLocaleString("en-US")}`;
}

export default function TopStocks({ rows, loading, fetchedAt, onRefresh }: Props) {
  return (
    <div className="surface">
      <div className="flex items-center justify-between p-7 border-b border-white/[0.12]">
        <div>
          <h2 className="text-white font-semibold text-lg tracking-tight">상위 100개 종목 일별 주가</h2>
          <p className="text-[#C5CAD3] text-xs mt-1">
            {fetchedAt
              ? `마지막 업데이트: ${new Date(fetchedAt).toLocaleString("ko-KR")}`
              : "미국 대형주 기준, 최근 거래일 종가"}
            {rows.length > 0 && ` · 기준일: ${rows[0].date}`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary text-sm font-medium px-3 py-1.5 rounded-xl disabled:opacity-50"
        >
          {loading ? "로딩..." : "새로고침"}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="p-8 text-center text-[#C5CAD3] text-sm">종목 데이터를 불러오는 중...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#C5CAD3] text-xs border-b border-white/[0.08]">
                <th className="text-left font-medium px-5 py-3">순위</th>
                <th className="text-left font-medium px-5 py-3">종목</th>
                <th className="text-right font-medium px-5 py-3">시가총액</th>
                <th className="text-right font-medium px-5 py-3">시가</th>
                <th className="text-right font-medium px-5 py-3">종가</th>
                <th className="text-right font-medium px-5 py-3">등락</th>
                <th className="text-right font-medium px-5 py-3">등락률</th>
                <th className="text-right font-medium px-5 py-3">거래량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rows.map((r) => {
                const up = r.change >= 0;
                const color = up ? "#00C853" : "#FF3B30";
                return (
                  <tr key={r.symbol} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 text-[#6B7385] tabular-nums">{r.rank}</td>
                    <td className="px-5 py-3">
                      <a
                        href={`https://finance.yahoo.com/quote/${encodeURIComponent(r.symbol)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#FF3B30] transition-colors"
                      >
                        <span className="text-white font-semibold hover:text-[#FF3B30]">{r.symbol}</span>
                        <span className="text-[#C5CAD3] text-xs ml-2">{r.name}</span>
                      </a>
                    </td>
                    <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">
                      {formatMarketCap(r.marketCap)}
                    </td>
                    <td className="px-5 py-3 text-right text-[#C5CAD3] tabular-nums">
                      {r.open !== null
                        ? `$${r.open.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">
                      ${r.close.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums" style={{ color }}>
                      {up ? "+" : ""}
                      {r.change.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums" style={{ color }}>
                      {up ? "+" : ""}
                      {r.changePct.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3 text-right text-[#C5CAD3] tabular-nums">
                      {formatVolume(r.volume)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
