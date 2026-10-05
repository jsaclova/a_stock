import { useEffect, useState } from "react";
import { ExternalLink, Globe, Repeat } from "lucide-react";
import { ETF_LIST, CATEGORY_COLORS } from "@/lib/etfData";
import { fetchTicker } from "@/lib/api";
import { DEFAULT_SETTING, loadAutoTrade, saveAutoTrade, ruleLabelOf } from "@/lib/autoTrade";
import type { AutoTradeSetting } from "@/lib/autoTrade";
import type { EtfInfo } from "@/types";

type Prices = Record<string, { price: number; changePct: number }>;

function formatAum(aumB: number): string {
  if (aumB >= 1) return `$${aumB.toLocaleString("en-US")}B`;
  return `$${Math.round(aumB * 1000)}M`;
}

// 카테고리별 최저 보수 티커 → 저비용 배지
const CHEAPEST = new Set(
  ["S&P 500", "나스닥 100"].map((cat) => {
    const inCat = ETF_LIST.filter((e) => e.category === cat && e.leverage === "1배");
    return inCat.length > 0
      ? inCat.reduce((a, b) => (a.expenseRatio <= b.expenseRatio ? a : b)).ticker
      : "";
  }),
);

function leverageBadge(leverage: string) {
  if (leverage === "1배") {
    return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#22c55e]/15 text-[#22c55e]">일반</span>;
  }
  const isInverse = leverage.startsWith("-");
  const color = isInverse ? "#FF3B30" : "#f59e0b";
  return (
    <span
      className="px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {leverage}
    </span>
  );
}

function EtfTable({ list, prices, selected }: { list: EtfInfo[]; prices: Prices; selected: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-3 text-[#C5CAD3] font-semibold text-xs">구분</th>
            <th className="text-left py-3 px-3 text-[#C5CAD3] font-semibold text-xs">티커</th>
            <th className="text-left py-3 px-3 text-[#C5CAD3] font-semibold text-xs">ETF 이름</th>
            <th className="text-left py-3 px-3 text-[#C5CAD3] font-semibold text-xs hidden sm:table-cell">운용사</th>
            <th className="text-right py-3 px-3 text-[#C5CAD3] font-semibold text-xs hidden lg:table-cell">운용규모</th>
            <th className="text-right py-3 px-3 text-[#C5CAD3] font-semibold text-xs hidden md:table-cell">보수</th>
            <th className="text-right py-3 px-3 text-[#C5CAD3] font-semibold text-xs">가격</th>
            <th className="text-right py-3 px-3 text-[#C5CAD3] font-semibold text-xs">링크</th>
          </tr>
        </thead>
        <tbody>
          {list.map((etf) => {
            const color = CATEGORY_COLORS[etf.category] || "#3d8bff";
            const quote = prices[etf.ticker];
            const up = (quote?.changePct ?? 0) >= 0;
            const isSelected = selected === etf.ticker;
            return (
              <tr
                key={etf.ticker}
                className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-[#0066FF]/[0.06]" : ""}`}
              >
                <td className="py-3 px-3">{leverageBadge(etf.leverage)}</td>
                <td className="py-3 px-3">
                  <a
                    href={etf.yahooUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-bold hover:text-[#3d8bff] transition-colors"
                  >
                    {etf.ticker}
                  </a>
                  {CHEAPEST.has(etf.ticker) && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0066FF]/20 text-[#5a9eff]">
                      저비용
                    </span>
                  )}
                  {isSelected && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#22c55e]/20 text-[#22c55e]">
                      자동매매
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-[#C5CAD3] text-xs">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: color }}
                  />
                  {etf.name}
                </td>
                <td className="py-3 px-3 text-[#C5CAD3] text-xs hidden sm:table-cell">{etf.issuer}</td>
                <td className="py-3 px-3 text-right text-white font-semibold tabular-nums hidden lg:table-cell">
                  {formatAum(etf.aumB)}
                </td>
                <td className="py-3 px-3 text-right text-[#C5CAD3] text-xs tabular-nums hidden md:table-cell">
                  {etf.expenseRatio}%
                </td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {quote ? (
                    <>
                      <span className="text-white font-semibold">
                        ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      <span
                        className="text-xs font-semibold ml-2"
                        style={{ color: up ? "#00C853" : "#FF3B30" }}
                      >
                        {up ? "+" : ""}
                        {quote.changePct.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[#6B7385] text-xs">-</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right">
                  <a
                    href={etf.yahooUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#3d8bff] hover:text-[#5a9eff] transition-colors text-xs font-medium"
                  >
                    Yahoo
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SECTIONS: { title: string; desc: string; iconColor: string; list: EtfInfo[] }[] = [
  {
    title: "일반 ETF · S&P 500 추종",
    desc: "SPY와 같은 지수를 1배로 추종합니다. 장기 적립식 투자에 적합하며, 저비용 표시가 가장 보수가 저렴한 상품입니다.",
    iconColor: "#3d8bff",
    list: ETF_LIST.filter((e) => e.leverage === "1배" && e.category === "S&P 500"),
  },
  {
    title: "일반 ETF · 나스닥 100 추종",
    desc: "QQQ와 같은 지수를 1배로 추종합니다. IQQ·QNDX는 2026년 신규 상장된 저가·저보수 상품입니다.",
    iconColor: "#22c55e",
    list: ETF_LIST.filter((e) => e.leverage === "1배" && e.category === "나스닥 100"),
  },
  {
    title: "레버리지 · S&P 500",
    desc: "일일 수익률의 2배·3배(또는 반대 방향)를 추종합니다. 단기 변동성이 크고 장기 보유 시 괴리가 발생할 수 있으니 유의하세요.",
    iconColor: "#f59e0b",
    list: ETF_LIST.filter((e) => e.leverage !== "1배" && e.category === "S&P 500"),
  },
  {
    title: "레버리지 · 인버스 · 나스닥 100",
    desc: "일일 수익률의 2배·3배(또는 반대 방향)를 추종합니다. 단기 트레이딩용으로, 장기 적립식에는 부적합합니다.",
    iconColor: "#FF3B30",
    list: ETF_LIST.filter((e) => e.leverage !== "1배" && e.category === "나스닥 100"),
  },
];

export default function EtfList() {
  const [prices, setPrices] = useState<Prices>({});
  const [symbol, setSymbol] = useState(DEFAULT_SETTING.symbol);
  const [shares, setShares] = useState(DEFAULT_SETTING.shares);
  const [frequency, setFrequency] = useState<"weekly" | "monthly">(DEFAULT_SETTING.frequency);
  const [weekday, setWeekday] = useState(DEFAULT_SETTING.weekday);
  const [monthday, setMonthday] = useState(DEFAULT_SETTING.monthday);
  const [applied, setApplied] = useState<AutoTradeSetting>({ ...DEFAULT_SETTING });

  useEffect(() => {
    loadAutoTrade().then((s) => {
      setSymbol(s.symbol);
      setShares(s.shares);
      setFrequency(s.frequency);
      setWeekday(s.weekday);
      setMonthday(s.monthday);
      setApplied(s);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      ETF_LIST.map((etf) =>
        fetchTicker(etf.ticker)
          .then((data) => ({ ticker: etf.ticker, price: data.price, changePct: data.changePct }))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Prices = {};
      for (const r of results) {
        if (r) map[r.ticker] = { price: r.price, changePct: r.changePct };
      }
      setPrices(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApply = async () => {
    const next: AutoTradeSetting = {
      symbol,
      shares: Math.max(1, Math.floor(shares || 1)),
      frequency,
      weekday,
      monthday,
    };
    await saveAutoTrade(next);
    setApplied(next);
  };

  const isChanged =
    symbol !== applied.symbol ||
    shares !== applied.shares ||
    frequency !== applied.frequency ||
    weekday !== applied.weekday ||
    monthday !== applied.monthday;
  const selectedPrice = prices[symbol]?.price;

  return (
    <div className="space-y-6">
      <div className="surface p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <Repeat className="w-5 h-5 text-[#22c55e]" />
          <h2 className="text-white font-semibold text-lg">지수 주간 자동매매 선택</h2>
        </div>
        <p className="text-[#C5CAD3] text-xs mb-5 leading-relaxed">
          자동 매수할 ETF·주기·수량을 선택한 뒤 변경을 누르세요. 포트폴리오 탭에 반영됩니다.
          현재 적용 중: <span className="text-white font-bold">{ruleLabelOf(applied)} · {applied.symbol} {applied.shares}주</span>
        </p>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[#C5CAD3] text-xs font-medium mb-2 block">매수 주기</label>
            <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.04]">
              {(["weekly", "monthly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    frequency === f ? "btn-primary" : "text-[#C5CAD3]"
                  }`}
                >
                  {f === "weekly" ? "주간" : "월간"}
                </button>
              ))}
            </div>
          </div>
          {frequency === "weekly" ? (
            <div>
              <label className="text-[#C5CAD3] text-xs font-medium mb-2 block">매수 요일</label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
                className="bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-[#0066FF] [&>option]:bg-[#1E2530]"
              >
                {["월", "화", "수", "목", "금"].map((d, i) => (
                  <option key={i + 1} value={i + 1}>
                    {d}요일
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[#C5CAD3] text-xs font-medium mb-2 block">매수 일자</label>
              <div className="flex items-center gap-2">
                <span className="text-[#C5CAD3] text-sm">매월</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  value={monthday}
                  onChange={(e) =>
                    setMonthday(Math.min(31, Math.max(1, Math.floor(Number(e.target.value) || 1))))
                  }
                  className="w-20 bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold text-right tabular-nums focus:outline-none focus:border-[#0066FF]"
                />
                <span className="text-[#C5CAD3] text-sm">일</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-[#C5CAD3] text-xs font-medium mb-2 block">ETF 선택</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-[#0066FF] [&>optgroup]:bg-[#1E2530] [&>option]:bg-[#1E2530]"
            >
              <optgroup label="S&P 500">
                {ETF_LIST.filter((e) => e.category === "S&P 500").map((e) => (
                  <option key={e.ticker} value={e.ticker}>
                    {e.ticker} · {e.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="나스닥 100">
                {ETF_LIST.filter((e) => e.category === "나스닥 100").map((e) => (
                  <option key={e.ticker} value={e.ticker}>
                    {e.ticker} · {e.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="text-[#C5CAD3] text-xs font-medium mb-2 block">주당 매수 수량</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={shares}
                onChange={(e) => setShares(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="w-24 bg-white/[0.06] border border-white/[0.14] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold text-right tabular-nums focus:outline-none focus:border-[#0066FF]"
              />
              <span className="text-[#C5CAD3] text-sm">주</span>
            </div>
          </div>
          <button
            onClick={handleApply}
            disabled={!isChanged}
            className="btn-primary text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40"
          >
            변경
          </button>
          <p className="text-sm pb-2.5">
            <span className="text-[#C5CAD3]">{ruleLabelOf({ symbol, shares, frequency, weekday, monthday })} 시가 · </span>
            <span className="text-white font-bold">{symbol} {shares}주 매수</span>
            {selectedPrice !== undefined && (
              <span className="text-[#C5CAD3] text-xs ml-2">
                (현재가 ${selectedPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })})
              </span>
            )}
          </p>
        </div>
      </div>

      {SECTIONS.map((sec) => (
        <div key={sec.title} className="surface p-5 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5" style={{ color: sec.iconColor }} />
            <h2 className="text-white font-semibold text-lg">{sec.title}</h2>
          </div>
          <p className="text-[#C5CAD3] text-xs mb-4">{sec.desc}</p>
          <EtfTable list={sec.list} prices={prices} selected={applied.symbol} />
        </div>
      ))}

      <div className="flex items-start gap-2 inset-panel rounded-2xl p-4">
        <div className="w-2 h-2 rounded-full bg-[#3d8bff] mt-1 shrink-0" />
        <p className="text-[#C5CAD3] text-xs leading-relaxed">
          각 ETF의 티커를 누르면 야후 파이낸스 상세 페이지로 이동합니다. 가격·등락률은 실시간 조회되며,
          운용규모는 2026년 10월 초 기준 추정치로 실제와 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
}
