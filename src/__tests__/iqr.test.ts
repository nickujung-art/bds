/**
 * UX-01 — IQR 1.5x 이상치 계산 유틸리티
 * RED: src/lib/utils/iqr.ts 미존재 → import 실패 예상
 */
import { describe, it, expect } from 'vitest'

describe('computeIqrOutliers', () => {
  it('정상 분포: 이상치 없음 → outliers 빈 배열', async () => {
    const { computeIqrOutliers } = await import('@/lib/utils/iqr')
    const points = [
      { yearMonth: '2026-01', price: 50000, area: 84 },
      { yearMonth: '2026-02', price: 51000, area: 84 },
      { yearMonth: '2026-03', price: 49000, area: 84 },
      { yearMonth: '2026-04', price: 52000, area: 84 },
      { yearMonth: '2026-05', price: 50500, area: 84 },
    ]
    const { normal, outliers } = computeIqrOutliers(points)
    expect(outliers).toHaveLength(0)
    expect(normal).toHaveLength(5)
  })

  it('극단값 포함: IQR 1.5x 범위 밖 → outliers로 분류', async () => {
    const { computeIqrOutliers } = await import('@/lib/utils/iqr')
    // 50000~52000 분포 + 극단값 999999
    const points = [
      { yearMonth: '2026-01', price: 50000, area: 84 },
      { yearMonth: '2026-02', price: 51000, area: 84 },
      { yearMonth: '2026-03', price: 49000, area: 84 },
      { yearMonth: '2026-04', price: 52000, area: 84 },
      { yearMonth: '2026-05', price: 50500, area: 84 },
      { yearMonth: '2026-06', price: 999999, area: 84 }, // 명백한 이상치
    ]
    const { normal, outliers } = computeIqrOutliers(points)
    expect(outliers).toHaveLength(1)
    expect(outliers[0]!.price).toBe(999999)
    expect(normal).toHaveLength(5)
  })

  it('빈 배열 입력 → 둘 다 빈 배열', async () => {
    const { computeIqrOutliers } = await import('@/lib/utils/iqr')
    const { normal, outliers } = computeIqrOutliers([])
    expect(normal).toEqual([])
    expect(outliers).toEqual([])
  })

  it('단일 거래: IQR 계산 불가 → 모두 normal로 분류', async () => {
    const { computeIqrOutliers } = await import('@/lib/utils/iqr')
    const points = [{ yearMonth: '2026-01', price: 50000, area: 84 }]
    const { normal, outliers } = computeIqrOutliers(points)
    expect(normal).toHaveLength(1)
    expect(outliers).toEqual([])
  })
})
