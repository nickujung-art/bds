/**
 * UX-01 — IQR 1.5x 이상치 분류
 * 입력: 개별 거래 데이터 (price 기준 정렬 후 Q1/Q3 산출)
 * 출력: normal (평균선 계산용), outliers (투명 점 표시용)
 */

export interface PricePoint {
  yearMonth: string
  price:     number
  area:      number
}

export interface IqrResult {
  normal:   PricePoint[]
  outliers: PricePoint[]
}

export function computeIqrOutliers(points: PricePoint[]): IqrResult {
  if (points.length < 2) {
    return { normal: [...points], outliers: [] }
  }

  const sorted = [...points].map(p => p.price).sort((a, b) => a - b)
  const q1Idx = Math.floor(sorted.length * 0.25)
  const q3Idx = Math.floor(sorted.length * 0.75)
  const q1 = sorted[q1Idx] ?? 0
  const q3 = sorted[q3Idx] ?? 0
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr

  const normal:   PricePoint[] = []
  const outliers: PricePoint[] = []
  for (const p of points) {
    if (p.price >= lower && p.price <= upper) normal.push(p)
    else outliers.push(p)
  }
  return { normal, outliers }
}
