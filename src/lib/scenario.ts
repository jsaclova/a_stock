import type { DcaResult, ScenarioResult, ScenarioPoint } from "@/types";

/**
 * Builds a virtual decline scenario from real DCA data.
 *
 * The simulation takes the last 12 months of real data as the "decline phase":
 * prices are pushed down progressively so the final month reaches the user's
 * target decline percentage. After the decline, a 12-month "recovery phase"
 * is appended where prices climb back toward the pre-decline level.
 *
 * DCA buying continues through both phases, so the simulator shows how
 * cost-averaging performs through a crash and rebound.
 */
export function buildScenario(
  result: DcaResult,
  declinePct: number,
): ScenarioResult {
  const prices = result.monthlyPrices;
  if (prices.length === 0) {
    return {
      symbol: result.symbol,
      declinePct,
      simulatedPrices: [],
      totalInvested: 0,
      totalShares: 0,
      currentValue: 0,
      totalReturn: 0,
      totalReturnPct: 0,
      maxDrawdownValue: 0,
      maxDrawdownPct: 0,
      bottomPrice: 0,
    };
  }

  const monthlyAmount = result.totalInvested / prices.length;
  const declineFraction = declinePct / 100;

  // Use the last 12 real months as the decline window
  const declineMonths = Math.min(12, prices.length);
  const declineStartIdx = prices.length - declineMonths;
  const preDeclinePrice = prices[declineStartIdx].close;
  const bottomPrice = preDeclinePrice * (1 - declineFraction);

  const simulated: ScenarioPoint[] = [];

  // Phase 1: Real history before the decline — unchanged
  for (let i = 0; i < declineStartIdx; i++) {
    simulated.push({
      date: prices[i].date,
      close: prices[i].close,
      isSimulated: false,
    });
  }

  // Phase 2: Decline phase — last 12 months pushed down linearly to the target
  for (let i = 0; i < declineMonths; i++) {
    const progress = declineMonths > 1 ? i / (declineMonths - 1) : 1;
    const startPrice = prices[declineStartIdx].close;
    const realPrice = prices[declineStartIdx + i].close;
    const declinedPrice = startPrice * (1 - declineFraction * progress);
    // Blend real price with the decline trajectory so it feels organic
    const blended = realPrice * (1 - progress) + declinedPrice * progress;
    simulated.push({
      date: prices[declineStartIdx + i].date,
      close: Math.round(blended * 100) / 100,
      isSimulated: true,
    });
  }

  // Phase 3: Recovery phase — 12 simulated months climbing back to pre-decline price
  const recoveryMonths = 12;
  const lastDate = new Date(prices[prices.length - 1].date);
  for (let i = 1; i <= recoveryMonths; i++) {
    const progress = i / recoveryMonths;
    const recoveredPrice = bottomPrice + (preDeclinePrice - bottomPrice) * progress;
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + i);
    simulated.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      close: Math.round(recoveredPrice * 100) / 100,
      isSimulated: true,
    });
  }

  // Compute DCA across all simulated months
  let totalShares = 0;
  let totalInvested = 0;
  let maxDrawdownValue = 0;
  let maxDrawdownPct = 0;

  for (let i = 0; i < simulated.length; i++) {
    const p = simulated[i];
    const shares = monthlyAmount / p.close;
    totalShares += shares;
    totalInvested += monthlyAmount;

    const investedSoFar = (i + 1) * monthlyAmount;
    const valueSoFar = totalShares * p.close;
    const drawdown = valueSoFar - investedSoFar;
    const drawdownPct = (drawdown / investedSoFar) * 100;
    if (drawdown < maxDrawdownValue) {
      maxDrawdownValue = drawdown;
      maxDrawdownPct = drawdownPct;
    }
  }

  const finalPrice = simulated[simulated.length - 1].close;
  const currentValue = totalShares * finalPrice;
  const totalReturn = currentValue - totalInvested;
  const totalReturnPct = (totalReturn / totalInvested) * 100;

  return {
    symbol: result.symbol,
    declinePct,
    simulatedPrices: simulated,
    totalInvested: Math.round(totalInvested),
    totalShares: Math.round(totalShares * 10000) / 10000,
    currentValue: Math.round(currentValue),
    totalReturn: Math.round(totalReturn),
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    maxDrawdownValue: Math.round(maxDrawdownValue),
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    bottomPrice: Math.round(bottomPrice * 100) / 100,
  };
}

export interface LongTermForecast {
  symbol: string;
  monthlyAmount: number;
  assumedAnnualReturnPct: number;
  year5: ForecastPoint;
  year10: ForecastPoint;
}

export interface ForecastPoint {
  monthsFromNow: number;
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  price: number;
}

/**
 * 가상 하락 시나리오 이후에도 계속 적립식으로 투자했을 때의
 * 5년 후 / 10년 후 예측 수익률.
 *
 * - 하락(최근 12개월) + 12개월 반등까지는 buildScenario와 동일한 궤적 사용
 * - 반등 이후에는 과거 실제 데이터의 연평균 성장률(CAGR)을 적용해
 *   10년 후까지 월복리로 외삽. CAGR이 0~12% 범위를 벗어나면 7%로 고정.
 * - 매월 같은 금액을 계속 적립한다고 가정.
 * - 기준점: 현재(마지막 실제 데이터)로부터 5년(60개월), 10년(120개월) 후.
 */
export function buildLongTermForecast(
  result: DcaResult,
  declinePct: number,
): LongTermForecast | null {
  const prices = result.monthlyPrices;
  if (prices.length < 2) return null;

  const monthlyAmount = result.totalInvested / prices.length;
  if (!monthlyAmount || monthlyAmount <= 0) return null;

  const declineFraction = declinePct / 100;
  const declineMonths = Math.min(12, prices.length);
  const declineStartIdx = prices.length - declineMonths;
  const preDeclinePrice = prices[declineStartIdx].close;
  const bottomPrice = preDeclinePrice * (1 - declineFraction);

  // 과거 실제 데이터의 월평균 성장률 → 연율 환산
  const first = prices[0].close;
  const last = prices[prices.length - 1].close;
  const months = prices.length - 1;
  let annualReturn = 0.07;
  if (first > 0 && last > 0 && months > 0) {
    const monthlyGrowth = Math.pow(last / first, 1 / months) - 1;
    const implied = Math.pow(1 + monthlyGrowth, 12) - 1;
    annualReturn = Number.isFinite(implied)
      ? Math.min(0.12, Math.max(0, implied))
      : 0.07;
  }
  const monthlyGrowth = Math.pow(1 + annualReturn, 1 / 12) - 1;

  // 하락+반등 이후 가격 궤적 (현재 이후 120개월까지)
  const futurePrices: number[] = [];
  // 1~12개월: 바닥에서 하락 전 가격까지 선형 반등
  for (let i = 1; i <= 12; i++) {
    const progress = i / 12;
    futurePrices.push(bottomPrice + (preDeclinePrice - bottomPrice) * progress);
  }
  // 13~120개월: 연평균 성장률로 복리 외삽
  let p = preDeclinePrice;
  for (let i = 13; i <= 120; i++) {
    p = p * (1 + monthlyGrowth);
    futurePrices.push(p);
  }

  // 과거 누적(하락 적용된 궤적 기준) + 미래 적립 합산
  const pastSimulated: number[] = [];
  for (let i = 0; i < declineStartIdx; i++) {
    pastSimulated.push(prices[i].close);
  }
  for (let i = 0; i < declineMonths; i++) {
    const progress = declineMonths > 1 ? i / (declineMonths - 1) : 1;
    const declinedPrice = prices[declineStartIdx].close * (1 - declineFraction * progress);
    const blended = prices[declineStartIdx + i].close * (1 - progress) + declinedPrice * progress;
    pastSimulated.push(blended);
  }

  let shares = 0;
  for (const close of pastSimulated) {
    shares += monthlyAmount / close;
  }
  const pastInvested = pastSimulated.length * monthlyAmount;

  const at = (monthsFromNow: number): ForecastPoint => {
    let s = shares;
    let invested = pastInvested;
    for (let i = 0; i < monthsFromNow; i++) {
      const close = futurePrices[i];
      s += monthlyAmount / close;
      invested += monthlyAmount;
    }
    const price = futurePrices[monthsFromNow - 1];
    const currentValue = s * price;
    const totalReturn = currentValue - invested;
    return {
      monthsFromNow,
      totalInvested: Math.round(invested),
      currentValue: Math.round(currentValue),
      totalReturn: Math.round(totalReturn),
      totalReturnPct: Math.round((totalReturn / invested) * 10000) / 100,
      price: Math.round(price * 100) / 100,
    };
  };

  return {
    symbol: result.symbol,
    monthlyAmount: Math.round(monthlyAmount),
    assumedAnnualReturnPct: Math.round(annualReturn * 10000) / 100,
    year5: at(60),
    year10: at(120),
  };
}
