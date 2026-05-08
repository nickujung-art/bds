/**
 * gap-label 테스트 — getGapLabelData() + formatGap()
 *
 * Phase 6 Plan 01 Task 2 (TDD RED)
 */
import { describe, it, expect, vi } from 'vitest'
import { getGapLabelData } from './gap-label'
import { formatGap } from '../format'

// Supabase 클라이언트 mock 헬퍼
function makeSupabaseMock(
  listingData: { price_per_py: number } | null,
  transactionRows: Array<{ price: number; area_m2: number }>,
) {
  const listingQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: listingData, error: null }),
  }

  const transactionQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: transactionRows, error: null }),
  }

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'listing_prices') return listingQuery
    if (table === 'transactions') return transactionQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from } as unknown as Parameters<typeof getGapLabelData>[1]
}

describe('getGapLabelData', () => {
  it('데이터 없을 때 두 값 모두 null 반환', async () => {
    const supabase = makeSupabaseMock(null, [])
    const result = await getGapLabelData('complex-1', supabase)
    expect(result.listingPricePerPy).toBeNull()
    expect(result.avgTransactionPricePerPy).toBeNull()
  })

  it('매물가 있을 때 listingPricePerPy 반환', async () => {
    const supabase = makeSupabaseMock({ price_per_py: 2000 }, [])
    const result = await getGapLabelData('complex-1', supabase)
    expect(result.listingPricePerPy).toBe(2000)
    expect(result.avgTransactionPricePerPy).toBeNull()
  })

  it('거래 데이터에서 price_per_py 평균 계산 (price / (area_m2 / 3.3058))', async () => {
    // 3.3058평 = 1평, price=3306만원 → price_per_py ≈ 1000만원/평
    // 두 건 평균 = 1000
    const rows = [
      { price: 3306, area_m2: 3.3058 },  // 1평 → 3306만원/평
      { price: 6612, area_m2: 6.6116 },  // 2평 → 3306만원/평
    ]
    const supabase = makeSupabaseMock(null, rows)
    const result = await getGapLabelData('complex-1', supabase)
    expect(result.avgTransactionPricePerPy).toBeCloseTo(3306, -1)
  })

  it('거래 없으면 avgTransactionPricePerPy null 반환', async () => {
    const supabase = makeSupabaseMock({ price_per_py: 1500 }, [])
    const result = await getGapLabelData('complex-1', supabase)
    expect(result.listingPricePerPy).toBe(1500)
    expect(result.avgTransactionPricePerPy).toBeNull()
  })
})

describe('formatGap', () => {
  it('500 → "500만원"', () => {
    expect(formatGap(500)).toBe('500만원')
  })

  it('10000 → "1억"', () => {
    expect(formatGap(10000)).toBe('1억')
  })

  it('10500 → "1억 500만원"', () => {
    expect(formatGap(10500)).toBe('1억 500만원')
  })

  it('20000 → "2억"', () => {
    expect(formatGap(20000)).toBe('2억')
  })

  it('9999 → "9999만원" (1억 미만)', () => {
    expect(formatGap(9999)).toBe('9999만원')
  })

  it('0 → "0만원"', () => {
    expect(formatGap(0)).toBe('0만원')
  })
})
