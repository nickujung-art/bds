/**
 * UX-02 — 평형 그룹 추출 (ROUND(area_m2) 기준)
 * area_m2 numeric(6,2) 정밀도 문제로 동일 평형이 다양한 값 (84.99, 84.82 등) → ROUND로 통합
 * 정렬: 거래량 내림차순 (D-04 기본값 = 최다 거래 평형)
 */

interface AreaPoint {
  area: number
}

export function extractAreaGroups<T extends AreaPoint>(points: T[]): number[] {
  if (points.length === 0) return []
  const counts = new Map<number, number>()
  for (const p of points) {
    const key = Math.round(p.area)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1]) // 거래량 내림차순
    .map(([area]) => area)
}

export function filterByArea<T extends AreaPoint>(points: T[], targetArea: number): T[] {
  const target = Math.round(targetArea)
  return points.filter(p => Math.round(p.area) === target)
}
