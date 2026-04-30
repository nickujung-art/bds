/**
 * Step5 수용 기준 테스트 — 단지 상세 데이터 레이어
 *
 * - getComplexById: 존재/미존재
 * - getComplexTransactionSummary: 월별 집계, 유효 거래만 포함
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, SKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

// ── 픽스처 ──────────────────────────────────────────────────
let testComplexId: string

const TEST_COMPLEX = {
  canonical_name:  '테스트래미안아파트',
  name_normalized: '테스트래미안아파트',
  sgg_code:        '48121',
  road_address:    '경상남도 창원시 의창구 테스트로 1',
  built_year:      2010,
  household_count: 500,
  floors_above:    20,
  status:          'active' as const,
}

beforeAll(async () => {
  const { data, error } = await admin
    .from('complexes')
    .insert(TEST_COMPLEX)
    .select('id')
    .single()
  if (error) throw new Error(`픽스처 insert 실패: ${error.message}`)
  testComplexId = (data as { id: string }).id

  // 거래 데이터 삽입 — 매매 3건(유효), 전세 1건(유효), 취소 1건
  const mkKey = (suffix: string) => `TEST_DETAIL_${testComplexId}_${suffix}`
  await admin.from('transactions').insert([
    // 매매 — 2023-01
    {
      complex_id: testComplexId, deal_type: 'sale', deal_date: '2023-01-10',
      price: 30000, area_m2: 84.99, floor: 5, sgg_code: '48121',
      dedupe_key: mkKey('sale_01'),
    },
    // 매매 — 2023-01 (같은 월, 다른 거래)
    {
      complex_id: testComplexId, deal_type: 'sale', deal_date: '2023-01-20',
      price: 32000, area_m2: 84.99, floor: 8, sgg_code: '48121',
      dedupe_key: mkKey('sale_02'),
    },
    // 매매 — 2023-06
    {
      complex_id: testComplexId, deal_type: 'sale', deal_date: '2023-06-15',
      price: 35000, area_m2: 59.99, floor: 3, sgg_code: '48121',
      dedupe_key: mkKey('sale_06'),
    },
    // 매매 — 취소된 거래 (cancel_date IS NOT NULL → 집계 제외)
    {
      complex_id: testComplexId, deal_type: 'sale', deal_date: '2023-03-10',
      price: 28000, area_m2: 84.99, floor: 2, sgg_code: '48121',
      dedupe_key: mkKey('sale_cancel'),
      cancel_date: '2023-03-15',
    },
    // 전세 — 2023-02
    {
      complex_id: testComplexId, deal_type: 'jeonse', deal_date: '2023-02-01',
      price: 20000, area_m2: 84.99, floor: 7, sgg_code: '48121',
      dedupe_key: mkKey('jeonse_01'),
    },
  ])
})

afterAll(async () => {
  await admin.from('transactions').delete()
    .like('dedupe_key', `TEST_DETAIL_${testComplexId}%`)
  await admin.from('complexes').delete().eq('id', testComplexId)
})

// ── getComplexById ──────────────────────────────────────────
import { getComplexById, getComplexTransactionSummary } from '@/lib/data/complex-detail'

describe('getComplexById', () => {
  it('존재하는 ID → 단지 정보 반환', async () => {
    const complex = await getComplexById(testComplexId, admin)
    expect(complex).not.toBeNull()
    expect(complex!.id).toBe(testComplexId)
    expect(complex!.canonical_name).toBe('테스트래미안아파트')
    expect(complex!.built_year).toBe(2010)
    expect(complex!.household_count).toBe(500)
  })

  it('없는 ID → null 반환', async () => {
    const complex = await getComplexById('00000000-0000-0000-0000-000000000000', admin)
    expect(complex).toBeNull()
  })
})

// ── getComplexTransactionSummary ────────────────────────────
describe('getComplexTransactionSummary', () => {
  it('매매 집계 → 월별 평균가 배열, cancel_date 행 제외', async () => {
    const summary = await getComplexTransactionSummary(testComplexId, 'sale', admin)
    // 유효 매매: 2023-01(2건), 2023-06(1건) → 2개 월
    expect(summary.length).toBe(2)
    expect(summary[0]!.yearMonth).toBe('2023-01')
    expect(summary[0]!.avgPrice).toBe(31000)   // (30000+32000)/2
    expect(summary[0]!.count).toBe(2)
    expect(summary[1]!.yearMonth).toBe('2023-06')
    expect(summary[1]!.avgPrice).toBe(35000)
    expect(summary[1]!.count).toBe(1)
  })

  it('전세 집계 → 보증금 평균', async () => {
    const summary = await getComplexTransactionSummary(testComplexId, 'jeonse', admin)
    expect(summary.length).toBe(1)
    expect(summary[0]!.yearMonth).toBe('2023-02')
    expect(summary[0]!.avgPrice).toBe(20000)
  })

  it('데이터 없는 타입 → 빈 배열', async () => {
    const summary = await getComplexTransactionSummary(testComplexId, 'monthly', admin)
    expect(summary).toEqual([])
  })

  it('없는 complex_id → 빈 배열', async () => {
    const summary = await getComplexTransactionSummary(
      '00000000-0000-0000-0000-000000000000', 'sale', admin,
    )
    expect(summary).toEqual([])
  })
})
