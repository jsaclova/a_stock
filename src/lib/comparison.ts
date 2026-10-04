import type { DcaResult, ComparisonRow } from "@/types";

/**
 * Compares monthly DCA (1x/month, full amount) vs weekly DCA (4x/month, quarter amount)
 * under the user's virtual decline scenario.
 *
 * The simulation builds a synthetic weekly price series from the real monthly data
 * by interpolating between monthly closes, then applies the decline scenario
 * (progressive drop over 12 months, then 12-month recovery). Both strategies
 * invest the same total per month, so the only difference is granularity.
 */
export function buildComparison(
  result: DcaResult,
  declinePct: number,
  monthlyAmount: number = 1000,
): ComparisonRow[] {
  const prices = result.monthlyPrices;
  if (prices.length === 0) return [];

  const declineFraction = declinePct / 100;
  const declineMonths = Math.min(12, prices.length);
  const declineStartIdx = prices.length - declineMonths;
  const preDeclinePrice = prices[declineStartIdx].close;
  const bottomPrice = preDeclinePrice * (1 - declineFraction);

  // Build a synthetic weekly price series by interpolating monthly closes
  // Each month becomes ~4 weekly points
  const weeklyPrices: { date: string; close: number; isSimulated: boolean }[] = [];

  for (let i = 0; i < prices.length; i++) {
    let close = prices[i].close;

    // Apply decline during the decline window
    if (i >= declineStartIdx) {
      const progress = declineMonths > 1
        ? (i - declineStartIdx) / (declineMonths - 1)
        : 1;
      const startPrice = prices[declineStartIdx].close;
      const declinedPrice = startPrice * (1 - declineFraction * progress);
      close = close * (1 - progress) + declinedPrice * progress;
    }

    // Interpolate 4 weekly points within this month
    const nextClose = i + 1 < prices.length ? prices[i + 1].close : close;
    for (let w = 0; w < 4; w++) {
      const frac = w / 4;
      const interpolated = close + (nextClose - close) * frac * 0.3;
      weeklyPrices.push({
        date: prices[i].date,
        close: Math.round(interpolated * 100) / 100,
        isSimulated: i >= declineStartIdx,
      });
    }
  }

  // Append 12 months of recovery as weekly points
  const recoveryMonths = 12;
  const lastDate = new Date(prices[prices.length - 1].date);
  for (let m = 1; m <= recoveryMonths; m++) {
    const progress = m / recoveryMonths;
    const recoveredPrice = bottomPrice + (preDeclinePrice - bottomPrice) * progress;
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + m);
    for (let w = 0; w < 4; w++) {
      weeklyPrices.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        close: Math.round(recoveredPrice * 100) / 100,
        isSimulated: true,
      });
    }
  }

  // Also build a monthly price series with decline applied (for monthly DCA)
  const monthlySimPrices: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    let close = prices[i].close;
    if (i >= declineStartIdx) {
      const progress = declineMonths > 1
        ? (i - declineStartIdx) / (declineMonths - 1)
        : 1;
      const startPrice = prices[declineStartIdx].close;
      const declinedPrice = startPrice * (1 - declineFraction * progress);
      close = close * (1 - progress) + declinedPrice * progress;
    }
    monthlySimPrices.push(Math.round(close * 100) / 100);
  }
  for (let m = 1; m <= recoveryMonths; m++) {
    const progress = m / recoveryMonths;
    const recoveredPrice = bottomPrice + (preDeclinePrice - bottomPrice) * progress;
    monthlySimPrices.push(Math.round(recoveredPrice * 100) / 100);
  }

  // Compute DCA at checkpoints: 1yr, 2yr, 3yr, 5yr
  const checkpoints = [
    { period: "1년 후", months: 12 },
    { period: "2년 후", months: 24 },
    { period: "3년 후", months: 36 },
    { period: "5년 후", months: 60 },
  ];

  const weeklyAmount = monthlyAmount / 4;

  const rows: ComparisonRow[] = checkpoints.map(({ period, months }) => {
    const idx = Math.min(months, monthlySimPrices.length) - 1;
    if (idx < 0) {
      return {
        period,
        monthsElapsed: 0,
        monthlyInvested: 0,
        monthlyValue: 0,
        monthlyReturnPct: 0,
        weeklyInvested: 0,
        weeklyValue: 0,
        weeklyReturnPct: 0,
        avgCostDiff: 0,
      };
    }

    // Monthly DCA: buy once per month at the monthly price
    let mShares = 0;
    let mInvested = 0;
    for (let i = 0; i <= idx; i++) {
      mShares += monthlyAmount / monthlySimPrices[i];
      mInvested += monthlyAmount;
    }
    const mValue = mShares * monthlySimPrices[idx];

    // Weekly DCA: buy 4 times per month at interpolated weekly prices
    const weekIdx = Math.min(months * 4, weeklyPrices.length) - 1;
    let wShares = 0;
    let wInvested = 0;
    for (let i = 0; i <= weekIdx; i++) {
      wShares += weeklyAmount / weeklyPrices[i].close;
      wInvested += weeklyAmount;
    }
    const wValue = wShares * weeklyPrices[weekIdx].close;

    const mReturnPct = (mValue - mInvested) / mInvested * 100;
    const wReturnPct = (wValue - wInvested) / wInvested * 100;

    // Average cost per share comparison
    const mAvgCost = mInvested / mShares;
    const wAvgCost = wInvested / wShares;
    const avgCostDiff = ((wAvgCost - mAvgCost) / mAvgCost) * 100;

    return {
      period,
      monthsElapsed: months,
      monthlyInvested: Math.round(mInvested),
      monthlyValue: Math.round(mValue),
      monthlyReturnPct: Math.round(mReturnPct * 100) / 100,
      weeklyInvested: Math.round(wInvested),
      weeklyValue: Math.round(wValue),
      weeklyReturnPct: Math.round(wReturnPct * 100) / 100,
      avgCostDiff: Math.round(avgCostDiff * 100) / 100,
    };
  });

  return rows;
}
