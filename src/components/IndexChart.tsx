import type { Candle } from "@/types";

export const UP = "#00C853";
export const DOWN = "#FF3B30";
const GRID = "#262c38";
const TICK_FILL = "#6B7385";

export const etTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
export const etDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
});
const etMinuteFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

// "10:00 AM" → "10AM", "10:35 AM" → "10:35AM"
export function shortTime(ms: number): string {
  return etTimeFmt.format(new Date(ms)).replace(":00", "").replace(" ", "");
}

export function fmtTick(p: number): string {
  if (Math.abs(p) >= 1000) return Math.round(p).toLocaleString("en-US");
  return p.toFixed(2);
}

// 장중 봉에서 정시(ET) 위치의 x축 라벨 추출
export function intradayXLabels(candles: Candle[], max = 8): { i: number; label: string }[] {
  const labels: { i: number; label: string }[] = [];
  const seenHr = new Set<number>();
  candles.forEach((c, i) => {
    const parts = etMinuteFmt.formatToParts(new Date(c.t * 1000));
    const hr = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
    const min = Number(parts.find((p) => p.type === "minute")?.value ?? -1);
    if (min === 0 && !seenHr.has(hr) && labels.length < max) {
      seenHr.add(hr);
      labels.push({ i, label: shortTime(c.t * 1000) });
    }
  });
  return labels;
}

export interface ChartItem {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePct: number;
  dateLabel: string;
  mode: "candles" | "line";
  candles: Candle[];
  closes: number[];
  xLabels: { i: number; label: string }[];
  prevClose: number | null;
}

// finviz식 차트: 장중 캔들 + 거래량 + 전일종가 점선 + 현재가 태그 (월/년은 추세선)
export function IndexChart({ item, gid, compact }: { item: ChartItem; gid: string; compact?: boolean }) {
  const W = 360;
  const H = compact ? 118 : 168;
  const padL = 2;
  const padR = 52;
  const padT = 10;
  const padB = compact ? 8 : 20;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const isCandles = item.mode === "candles" && item.candles.length >= 2;
  const closes = isCandles ? item.candles.map((c) => c.close) : item.closes;
  const n = isCandles ? item.candles.length : closes.length;
  if (n < 2) return null;

  let dlo = Infinity;
  let dhi = -Infinity;
  if (isCandles) {
    for (const c of item.candles) {
      if (c.low < dlo) dlo = c.low;
      if (c.high > dhi) dhi = c.high;
    }
  } else {
    for (const v of closes) {
      if (v < dlo) dlo = v;
      if (v > dhi) dhi = v;
    }
  }
  if (item.prevClose != null) {
    dlo = Math.min(dlo, item.prevClose);
    dhi = Math.max(dhi, item.prevClose);
  }
  dlo = Math.min(dlo, item.value);
  dhi = Math.max(dhi, item.value);
  const spanPad = (dhi - dlo) * 0.08 || 1;
  const lo = dlo - spanPad;
  const hi = dhi + spanPad;
  const y = (p: number) => padT + (1 - (p - lo) / (hi - lo)) * ih;
  const stepX = iw / n;
  const cx = (i: number) => padL + stepX * i + stepX / 2;

  const priceTicks = [0, 1, 2, 3, 4].map((k) => dlo + ((dhi - dlo) * k) / 4);

  const vols = isCandles ? item.candles.map((c) => c.volume ?? 0) : [];
  const vmax = Math.max(1, ...vols);
  const vAreaH = ih * 0.22;
  const baseY = padT + ih;
  const up = item.change >= 0;
  const lineColor = up ? UP : DOWN;
  const bw = Math.max(1.5, Math.min(9, stepX * 0.6));

  const linePath = closes
    .map((v, i) => `${i === 0 ? "M" : "L"} ${cx(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${cx(n - 1).toFixed(1)},${baseY} L ${cx(0).toFixed(1)},${baseY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`${item.name} 차트`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {priceTicks.map((t, k) => (
        <g key={k}>
          <line x1={padL} x2={padL + iw} y1={y(t)} y2={y(t)} stroke={GRID} strokeDasharray="3 3" strokeWidth="1" />
          <text x={W - padR + 4} y={y(t) + 3} fontSize="9" fill={TICK_FILL}>
            {fmtTick(t)}
          </text>
        </g>
      ))}
      {!compact &&
        item.xLabels.map((t, k) => (
          <g key={k}>
            <line x1={cx(t.i)} x2={cx(t.i)} y1={padT} y2={baseY} stroke={GRID} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            <text x={cx(t.i)} y={H - 6} fontSize="9" fill={TICK_FILL} textAnchor="middle">
              {t.label}
            </text>
          </g>
        ))}
      {isCandles &&
        item.candles.map((c, i) => {
          const cUp = c.close >= c.open;
          const col = cUp ? UP : DOWN;
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          return <g key={i}>
            <line x1={cx(i)} x2={cx(i)} y1={y(c.high)} y2={y(c.low)} stroke={col} strokeWidth="1" />
            <rect
              x={cx(i) - bw / 2}
              y={top}
              width={bw}
              height={Math.max(1, bottom - top)}
              fill={col}
            />
          </g>;
        })}
      {isCandles &&
        item.candles.map((c, i) => {
          const h = ((c.volume ?? 0) / vmax) * vAreaH;
          if (h <= 0) return null;
          return (
            <rect
              key={`v${i}`}
              x={cx(i) - bw / 2}
              y={baseY - h}
              width={bw}
              height={h}
              fill="#3d8bff"
              opacity="0.8"
            />
          );
        })}
      {!isCandles && <path d={areaPath} fill={`url(#${gid})`} />}
      {!isCandles && (
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {item.prevClose != null && (
        <line
          x1={padL}
          x2={padL + iw}
          y1={y(item.prevClose)}
          y2={y(item.prevClose)}
          stroke={DOWN}
          strokeDasharray="4 3"
          strokeWidth="1"
        />
      )}
      <g>
        <rect x={W - padR + 1} y={y(item.value) - 8} width={padR - 3} height={16} rx={2} fill="#FFD60A" />
        <text
          x={W - padR + 1 + (padR - 3) / 2}
          y={y(item.value) + 3.5}
          fontSize="9.5"
          fontWeight="700"
          fill="#111"
          textAnchor="middle"
        >
          {fmtTick(item.value)}
        </text>
      </g>
    </svg>
  );
}
