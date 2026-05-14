/**
 * UX-01 — 기간 필터 (client-side slice)
 * D-02: '1y' | '3y' | '5y' | 'all' (기본값 '3y'는 호출자에서 nuqs withDefault로 처리)
 */

export type PeriodKey = '1y' | '3y' | '5y' | 'all'

const YEARS_MAP: Record<Exclude<PeriodKey, 'all'>, number> = {
  '1y': 1,
  '3y': 3,
  '5y': 5,
}

interface DatedPoint {
  dealDate: string  // "YYYY-MM-DD"
}

export function filterByPeriod<T extends DatedPoint>(
  points: T[],
  period: PeriodKey,
  now: Date = new Date(),
): T[] {
  if (period === 'all') return points
  const years = YEARS_MAP[period]
  const cutoff = new Date(now)
  cutoff.setFullYear(cutoff.getFullYear() - years)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return points.filter(p => p.dealDate >= cutoffStr)
}
