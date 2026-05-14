/**
 * Phase 9 UX — 기간 slice + 평형 그룹 + 시설 계산 + 계절 평균
 * RED: 대상 함수 미존재 → import 실패 예상
 */
import { describe, it, expect } from 'vitest'

describe('filterByPeriod (UX-01)', () => {
  it("'1y' → 최근 1년 내 거래만 반환", async () => {
    const { filterByPeriod } = await import('@/lib/utils/period-filter')
    const now = new Date('2026-05-14')
    const points = [
      { dealDate: '2026-04-01', price: 50000, area: 84 }, // 1y in
      { dealDate: '2025-06-01', price: 48000, area: 84 }, // 1y in (11개월 전)
      { dealDate: '2024-01-01', price: 40000, area: 84 }, // 1y out
    ]
    const result = filterByPeriod(points, '1y', now)
    expect(result).toHaveLength(2)
  })

  it("'all' → 모든 거래 반환", async () => {
    const { filterByPeriod } = await import('@/lib/utils/period-filter')
    const now = new Date('2026-05-14')
    const points = [
      { dealDate: '2020-01-01', price: 30000, area: 84 },
      { dealDate: '2026-04-01', price: 50000, area: 84 },
    ]
    const result = filterByPeriod(points, 'all', now)
    expect(result).toHaveLength(2)
  })

  it("'3y' → 36개월 컷오프", async () => {
    const { filterByPeriod } = await import('@/lib/utils/period-filter')
    const now = new Date('2026-05-14')
    const points = [
      { dealDate: '2023-06-01', price: 45000, area: 84 }, // 3y in
      { dealDate: '2022-12-01', price: 42000, area: 84 }, // 3y out
    ]
    const result = filterByPeriod(points, '3y', now)
    expect(result).toHaveLength(1)
    expect(result[0]!.dealDate).toBe('2023-06-01')
  })
})

describe('extractAreaGroups (UX-02)', () => {
  it('동일 평형 다양한 area_m2 값 → ROUND로 그룹화', async () => {
    const { extractAreaGroups } = await import('@/lib/utils/area-groups')
    const points = [
      { dealDate: '2026-01-01', price: 50000, area: 84.99 },
      { dealDate: '2026-02-01', price: 51000, area: 84.97 },
      { dealDate: '2026-03-01', price: 49000, area: 84.82 },
      { dealDate: '2026-04-01', price: 60000, area: 109.5 },
    ]
    const groups = extractAreaGroups(points)
    expect(groups).toEqual([85, 110]) // ROUND 결과, 거래량 순
  })

  it('최다 거래 평형이 첫 번째로 정렬됨', async () => {
    const { extractAreaGroups } = await import('@/lib/utils/area-groups')
    const points = [
      { dealDate: '2026-01-01', price: 50000, area: 59 },
      { dealDate: '2026-02-01', price: 51000, area: 84 },
      { dealDate: '2026-03-01', price: 49000, area: 84 },
      { dealDate: '2026-04-01', price: 60000, area: 84 },
    ]
    const groups = extractAreaGroups(points)
    expect(groups[0]).toBe(84) // 3건 — 최다
    expect(groups[1]).toBe(59)
  })

  it('빈 배열 → 빈 배열', async () => {
    const { extractAreaGroups } = await import('@/lib/utils/area-groups')
    expect(extractAreaGroups([])).toEqual([])
  })
})

describe('parking/elevator 계산 (UX-03)', () => {
  it('parkingPerUnit: 840면 / 700세대 → "1.2"', async () => {
    const { formatParkingPerUnit } = await import('@/lib/utils/facility-format')
    const result = formatParkingPerUnit(840, 700)
    expect(result).toBe('1.2')
  })

  it('parkingPerUnit: 세대수 0 또는 null → null', async () => {
    const { formatParkingPerUnit } = await import('@/lib/utils/facility-format')
    expect(formatParkingPerUnit(840, null)).toBeNull()
    expect(formatParkingPerUnit(840, 0)).toBeNull()
    expect(formatParkingPerUnit(null, 700)).toBeNull()
  })

  it('elevatorPerBuilding: 12대 / 6동 → "2"', async () => {
    const { formatElevatorPerBuilding } = await import('@/lib/utils/facility-format')
    const result = formatElevatorPerBuilding(12, 6)
    expect(result).toBe('2')
  })

  it('elevatorPerBuilding: building_count null → null (UX-03 fallback)', async () => {
    const { formatElevatorPerBuilding } = await import('@/lib/utils/facility-format')
    expect(formatElevatorPerBuilding(12, null)).toBeNull()
  })
})

describe('getSeasonalAverages (UX-04)', () => {
  it('하절기 + 동절기 혼재 6개월: 양쪽 평균 계산', async () => {
    const { getSeasonalAverages } = await import('@/lib/data/management-cost')
    // year_month "YYYY-MM-01" 형식 — D-08 6~9월 하절기, 10~3월 동절기
    const rows = [
      { year_month: '2026-01-01', common_cost_total: 100000, individual_cost_total: 200000, long_term_repair_monthly: 50000 },
      { year_month: '2025-12-01', common_cost_total: 110000, individual_cost_total: 210000, long_term_repair_monthly: 50000 },
      { year_month: '2025-11-01', common_cost_total: 105000, individual_cost_total: 205000, long_term_repair_monthly: 50000 },
      { year_month: '2025-10-01', common_cost_total: 100000, individual_cost_total: 200000, long_term_repair_monthly: 50000 },
      { year_month: '2025-09-01', common_cost_total: 80000, individual_cost_total: 100000, long_term_repair_monthly: 50000 }, // 하절기
      { year_month: '2025-08-01', common_cost_total: 85000, individual_cost_total: 110000, long_term_repair_monthly: 50000 }, // 하절기
    ] as never
    const result = getSeasonalAverages(rows, 700)
    expect(result.winterCount).toBe(4)
    expect(result.summerCount).toBe(2)
    expect(result.winterAvg).toBeGreaterThan(0)
    expect(result.summerAvg).toBeGreaterThan(0)
    expect(result.winterAvg).toBeGreaterThan(result.summerAvg!) // 겨울 > 여름 (난방비)
    expect(result.summerPerUnit).toBeGreaterThan(0)
  })

  it('D-08: summerCount < 1 || winterCount < 1 → 표시 불가 신호 (해당 평균 null)', async () => {
    const { getSeasonalAverages } = await import('@/lib/data/management-cost')
    const rows = [
      { year_month: '2026-01-01', common_cost_total: 100000, individual_cost_total: 200000, long_term_repair_monthly: 50000 },
      { year_month: '2025-12-01', common_cost_total: 110000, individual_cost_total: 210000, long_term_repair_monthly: 50000 },
    ] as never
    const result = getSeasonalAverages(rows, 700)
    expect(result.winterCount).toBe(2)
    expect(result.summerCount).toBe(0)
    expect(result.summerAvg).toBeNull()
  })

  it('householdCount null → perUnit 모두 null', async () => {
    const { getSeasonalAverages } = await import('@/lib/data/management-cost')
    const rows = [
      { year_month: '2025-08-01', common_cost_total: 80000, individual_cost_total: 100000, long_term_repair_monthly: 50000 },
    ] as never
    const result = getSeasonalAverages(rows, null)
    expect(result.summerPerUnit).toBeNull()
    expect(result.winterPerUnit).toBeNull()
  })
})
