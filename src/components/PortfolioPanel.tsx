import { Wallet, Briefcase, TrendingUp, TrendingDown, CalendarClock } from "lucide-react";
import type { PortfolioResponse } from "@/types";

interface Props {
  data: PortfolioResponse | null;
  loading: boolean;
  fetchedAt: string | null;
  onRefresh: () => void;
}

export default function PortfolioPanel({ data, loading, fetchedAt, onRefresh }: Props) {
  const downloadCsv = () => {
    if (!data) return;
    const rows = [...data.rows].reverse();
    const lines = [
      ["매수일", "종목", "매수가", "수량", "매수금액", "현재가", "평가금액", "수익률(%)"].join(","),
      ...rows.map((r) => {
        const value = Math.round(r.shares * data.currentPrice * 100) / 100;
        const returnPct = r.cost !== 0 ? Math.round(((value - r.cost) / r.cost) * 10000) / 100 : 0;
        return [r.date, data.symbol, r.openPrice, r.shares, r.cost, data.currentPrice, value, returnPct].join(",");
      }),
      "",
      ["총 투자금", "현재 평가액", "손익", "수익률(%)", "다음 매수일"].join(","),
      [
        data.totalInvested,
        data.currentValue,
        data.totalReturn,
        data.totalReturnPct,
        data.nextBuyDate,
      ].join(","),
      "",
      ["자동매매 규칙", `${data.ruleLabel} ${data.symbol} ${data.sharesPerBuy}주`].join(","),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.href = url;
    a.download = `portfolio-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="surface p-6 sm:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#0066FF]" />
            <h2 className="text-white font-semibold text-lg tracking-tight">
              현재 수익률 현황
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCsv}
              disabled={!data}
              className="btn-secondary text-sm font-medium px-3 py-1.5 rounded-xl disabled:opacity-50"
            >
              CSV 다운로드
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="btn-secondary text-sm font-medium px-3 py-1.5 rounded-xl disabled:opacity-50"
            >
              {loading ? "로딩..." : "새로고침"}
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="py-8 text-center text-[#C5CAD3] text-sm">
            포트폴리오를 계산하는 중...
          </div>
        ) : data ? (
          <>
            <p className="text-[#C5CAD3] text-xs mb-6 leading-relaxed">
              2026년 10월부터 {data.ruleLabel} 시가에 {data.symbol} {data.sharesPerBuy}주씩 매수한 결과입니다.
              휴장일은 제외됩니다. 다음 매수일: {data.nextBuyDate}
              {fetchedAt && ` · 마지막 업데이트: ${new Date(fetchedAt).toLocaleString("ko-KR")}`}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="inset-panel rounded-2xl p-4 sm:p-5 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Wallet className="w-4 h-4 text-[#8a8f9b]" />
                  <span className="text-[#C5CAD3] text-xs font-medium">총 투자금</span>
                </div>
                <p className="text-white text-lg sm:text-xl font-bold tabular-nums break-words">
                  ${data.totalInvested.toLocaleString("en-US")}
                </p>
                <p className="text-[#C5CAD3] text-xs mt-1">
                  {data.rows.length}회 매수 · {data.totalShares}주 보유
                </p>
              </div>
              <div className="inset-panel rounded-2xl p-4 sm:p-5 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-4 h-4 text-[#0066FF]" />
                  <span className="text-[#C5CAD3] text-xs font-medium">현재 평가액</span>
                </div>
                <p
                  className="text-lg sm:text-xl font-bold tabular-nums break-words"
                  style={{ color: data.totalReturn >= 0 ? "#00C853" : "#FF3B30" }}
                >
                  ${data.currentValue.toLocaleString("en-US")}
                </p>
                <p className="text-[#C5CAD3] text-xs mt-1">
                  현재가 ${data.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="inset-panel rounded-2xl p-4 sm:p-5 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  {data.totalReturn >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-[#00C853]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#FF3B30]" />
                  )}
                  <span className="text-[#C5CAD3] text-xs font-medium">손익</span>
                </div>
                <p
                  className="text-lg sm:text-xl font-bold tabular-nums break-words"
                  style={{ color: data.totalReturn >= 0 ? "#00C853" : "#FF3B30" }}
                >
                  {data.totalReturn >= 0 ? "+" : ""}$
                  {data.totalReturn.toLocaleString("en-US")}
                </p>
                <p
                  className="text-xs mt-1 font-semibold tabular-nums"
                  style={{ color: data.totalReturn >= 0 ? "#00C853" : "#FF3B30" }}
                >
                  {data.totalReturnPct >= 0 ? "+" : ""}
                  {data.totalReturnPct.toFixed(2)}%
                </p>
              </div>
              <div className="inset-panel rounded-2xl p-4 sm:p-5 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarClock className="w-4 h-4 text-[#f59e0b]" />
                  <span className="text-[#C5CAD3] text-xs font-medium">다음 매수일</span>
                </div>
                <p className="text-white text-lg sm:text-xl font-bold tabular-nums break-words">{data.nextBuyDate}</p>
                <p className="text-[#C5CAD3] text-xs mt-1">금요일 시가 {data.sharesPerBuy}주 매수 예정</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="text-[#C5CAD3] text-xs border-b border-white/[0.08]">
                    <th className="text-left font-medium px-5 py-3">매수일</th>
                    <th className="text-left font-medium px-5 py-3">종목</th>
                    <th className="text-right font-medium px-5 py-3">매수가</th>
                    <th className="text-right font-medium px-5 py-3">수량</th>
                    <th className="text-right font-medium px-5 py-3">매수금액</th>
                    <th className="text-right font-medium px-5 py-3">현재가</th>
                    <th className="text-right font-medium px-5 py-3">평가금액</th>
                    <th className="text-right font-medium px-5 py-3">수익률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {[...data.rows].reverse().map((r) => {
                    const value = Math.round(r.shares * data.currentPrice * 100) / 100;
                    const retPct = r.cost !== 0 ? ((value - r.cost) / r.cost) * 100 : 0;
                    const profit = retPct >= 0;
                    return (
                    <tr key={r.date} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3 text-[#C5CAD3] tabular-nums">{r.date}</td>
                      <td className="px-5 py-3 text-white font-semibold">{data.symbol}</td>
                      <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">
                        ${r.openPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-right text-[#C5CAD3] tabular-nums">{r.shares}주</td>
                      <td className="px-5 py-3 text-right text-white tabular-nums">
                        ${r.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className="px-5 py-3 text-right font-semibold tabular-nums"
                        style={{ color: profit ? "#00C853" : "#FF3B30" }}
                      >
                        ${data.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className="px-5 py-3 text-right tabular-nums"
                        style={{ color: profit ? "#00C853" : "#FF3B30" }}
                      >
                        ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className="px-5 py-3 text-right font-semibold tabular-nums"
                        style={{ color: profit ? "#00C853" : "#FF3B30" }}
                      >
                        {profit ? "+" : ""}
                        {retPct.toFixed(2)}%
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.skipped.length > 0 && (
              <p className="text-[#6B7385] text-xs mt-4">
                휴장 제외일: {data.skipped.join(", ")}
              </p>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-[#C5CAD3] text-sm">
            데이터를 불러오지 못했습니다. 새로고침을 눌러주세요.
          </div>
        )}
      </div>
    </div>
  );
}
