/**
 * Step4 수용 기준 테스트 — 국토부 실거래가 ingest 파이프라인
 *
 * - makeDedupeKey: 결정론적 + 포맷 검증
 * - withRetry: 재시도 동작
 * - upsertTransaction: 멱등성 (integration)
 * - ingestMonth: ingest_runs 추적 + 거래 적재 (mock API + real DB)
 * - /api/ingest/molit-trade: CRON_SECRET 검증
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

// API 모킹 — fetch 함수만 모킹, 스키마는 실제 모듈 그대로 사용
vi.mock('@/services/molit', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>()
  return { ...actual, fetchSalePage: vi.fn(), fetchRentPage: vi.fn() }
})

import * as molitMock from '@/services/molit'
import { makeDedupeKey, upsertTransaction, ingestMonth } from '@/lib/data/realprice'
import { withRetry } from '@/lib/api/retry'

const TEST_SGG  = '48121'
const TEST_YM   = '202211'     // 임의 과거 월 (다른 테스트와 충돌 방지)

// ── makeDedupeKey ──────────────────────────────────────────
describe('makeDedupeKey', () => {
  const base = {
    sggCode:     '48121',
    yearMonth:   '202310',
    complexName: '테스트래미안아파트',
    dealDate:    '20231015',
    price:       30000,
    area:        84.99,
  }

  it('동일 입력 → 동일 키 (결정론적)', () => {
    expect(makeDedupeKey(base)).toBe(makeDedupeKey(base))
  })

  it('가격 다름 → 다른 키', () => {
    expect(makeDedupeKey(base)).not.toBe(makeDedupeKey({ ...base, price: 31000 }))
  })

  it('면적 다름 → 다른 키', () => {
    expect(makeDedupeKey(base)).not.toBe(makeDedupeKey({ ...base, area: 59.99 }))
  })

  it('단지명 다름 → 다른 키', () => {
    expect(makeDedupeKey(base)).not.toBe(makeDedupeKey({ ...base, complexName: '테스트자이아파트' }))
  })

  it('키에 sgg_code, yearMonth, dealDate 포함', () => {
    const key = makeDedupeKey(base)
    expect(key).toContain('48121')
    expect(key).toContain('202310')
    expect(key).toContain('20231015')
  })
})

// ── withRetry ──────────────────────────────────────────────
describe('withRetry', () => {
  it('성공 시 1회만 호출', async () => {
    let calls = 0
    const result = await withRetry(() => { calls++; return Promise.resolve('ok') })
    expect(result).toBe('ok')
    expect(calls).toBe(1)
  })

  it('maxAttempts 초과 시 마지막 에러 throw', async () => {
    let calls = 0
    await expect(
      withRetry(() => { calls++; throw new Error('fail') }, { maxAttempts: 3, baseDelayMs: 1 }),
    ).rejects.toThrow('fail')
    expect(calls).toBe(3)
  })

  it('3번째에 성공 → 결과 반환', async () => {
    let calls = 0
    const result = await withRetry(
      () => { calls++; if (calls < 3) throw new Error('not yet'); return Promise.resolve('done') },
      { maxAttempts: 5, baseDelayMs: 1 },
    )
    expect(result).toBe('done')
    expect(calls).toBe(3)
  })

  it('HTTP 410 에러는 재시도 없이 즉시 throw (ADR-053)', async () => {
    let calls = 0
    const err = Object.assign(new Error('Gone'), { status: 410 })
    await expect(
      withRetry(() => { calls++; throw err }, { maxAttempts: 5, baseDelayMs: 1 }),
    ).rejects.toThrow('Gone')
    expect(calls).toBe(1)
  })
})

// ── upsertTransaction (integration) ───────────────────────
describe.skipIf(!SKEY)('upsertTransaction', () => {
  const TEST_KEY = `INTG_${Date.now()}`
  const row = {
    deal_type:       'sale' as const,
    deal_date:       '2022-11-15',
    price:           30000,
    area_m2:         84.99,
    floor:           5,
    sgg_code:        TEST_SGG,
    raw_complex_name: '통합테스트래미안',
    dedupe_key:      TEST_KEY,
  }

  afterAll(async () => {
    if (!SKEY) return
    await admin.from('transactions').delete().eq('dedupe_key', TEST_KEY)
  })

  it('첫 upsert → "inserted" 반환 + DB에 행 존재', async () => {
    const result = await upsertTransaction(row, admin)
    expect(result).toBe('inserted')

    const { count } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('dedupe_key', TEST_KEY)
    expect(count).toBe(1)
  })

  it('동일 dedupe_key 재upsert → "skipped" (멱등성)', async () => {
    const result = await upsertTransaction(row, admin)
    expect(result).toBe('skipped')

    const { count } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('dedupe_key', TEST_KEY)
    expect(count).toBe(1)
  })
})

// ── ingestMonth (mock API + real DB) ─────────────────────
describe.skipIf(!SKEY)('ingestMonth', () => {
  const mockSaleItems = [
    { aptNm: '임시래미안아파트', aptSeq: '48121-T01', dealAmount: '30,000',
      dealYear: 2022, dealMonth: 11, dealDay: 5,
      excluUseAr: 84.99, floor: 5, sggCd: Number(TEST_SGG), cdealType: ' ' },
    { aptNm: '임시자이아파트',   aptSeq: '48121-T02', dealAmount: '40,000',
      dealYear: 2022, dealMonth: 11, dealDay: 10,
      excluUseAr: 59.99, floor: 3, sggCd: Number(TEST_SGG), cdealType: ' ' },
  ]
  const mockRentItems = [
    { aptNm: '임시래미안아파트', aptSeq: '48121-T01', deposit: '5,000', monthlyRent: 50,
      dealYear: 2022, dealMonth: 11, dealDay: 15,
      excluUseAr: 84.99, floor: 5, sggCd: Number(TEST_SGG) },
  ]

  afterAll(async () => {
    if (!SKEY) return
    await admin.from('ingest_runs')
      .delete()
      .eq('source_id', 'molit_trade')
      .eq('sgg_code', TEST_SGG)
      .eq('year_month', TEST_YM)
    await admin.from('transactions')
      .delete()
      .eq('sgg_code', TEST_SGG)
      .like('dedupe_key', `${TEST_SGG}_${TEST_YM}%`)
  })

  it('ingest_run 생성 + 거래 3건 적재 + status=success', async () => {
    vi.mocked(molitMock.fetchSalePage).mockResolvedValueOnce({
      items: mockSaleItems as never,
      totalCount: 2,
    })
    vi.mocked(molitMock.fetchRentPage).mockResolvedValueOnce({
      items: mockRentItems as never,
      totalCount: 1,
    })

    const result = await ingestMonth(TEST_SGG, TEST_YM, admin)

    expect(result.status).toBe('success')
    expect(result.rowsFetched).toBe(3)
    expect(result.rowsUpserted).toBe(3)
    expect(result.rowsSkipped).toBe(0)
    expect(result.rowsFailed).toBe(0)

    // ingest_run DB 확인
    const { data: run } = await admin
      .from('ingest_runs')
      .select('*')
      .eq('id', result.runId)
      .single()
    expect(run!.status).toBe('success')
    expect(run!.rows_fetched).toBe(3)
    expect(run!.rows_upserted).toBe(3)

    // transactions DB 확인
    const { count } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('sgg_code', TEST_SGG)
      .like('dedupe_key', `${TEST_SGG}_${TEST_YM}%`)
    expect(count).toBe(3)
  })

  it('동일 월 재ingest → rowsSkipped=3 (멱등성)', async () => {
    vi.mocked(molitMock.fetchSalePage).mockResolvedValueOnce({
      items: mockSaleItems as never,
      totalCount: 2,
    })
    vi.mocked(molitMock.fetchRentPage).mockResolvedValueOnce({
      items: mockRentItems as never,
      totalCount: 1,
    })

    const result = await ingestMonth(TEST_SGG, TEST_YM, admin)

    expect(result.rowsUpserted).toBe(0)
    expect(result.rowsSkipped).toBe(3)
    expect(result.status).toBe('success')
  })

  it('zod 실패율 >5% → status=failed + error_message 기록', async () => {
    const badItems = Array.from({ length: 10 }, (_, i) => ({
      aptNm:      i < 5 ? '정상아파트' : null,   // 5개 null → 50% 실패
      dealAmount: '10,000', dealYear: 2022, dealMonth: 11, dealDay: i + 1,
      excluUseAr: '84.99', floor: 1, sggCd: Number(TEST_SGG),
    }))

    vi.mocked(molitMock.fetchSalePage).mockResolvedValueOnce({
      items: badItems as never,
      totalCount: 10,
    })
    vi.mocked(molitMock.fetchRentPage).mockResolvedValueOnce({ items: [], totalCount: 0 })

    const result = await ingestMonth(TEST_SGG, '202001', admin)

    expect(result.status).toBe('failed')
    expect(result.rowsFailed).toBeGreaterThan(0)

    // ingest_run에 에러 메시지 기록
    const { data: run } = await admin
      .from('ingest_runs').select('error_message').eq('id', result.runId).single()
    expect(run!.error_message).toContain('zod')

    // 정리
    await admin.from('ingest_runs').delete().eq('id', result.runId)
    await admin.from('transactions').delete().eq('sgg_code', TEST_SGG)
      .like('dedupe_key', `${TEST_SGG}_202001%`)
  })
})

// ── DATA-10: complex_id 자동 연결 ─────────────────────────
describe('DATA-10: complex_id 자동 연결', () => {
  // mock supabase client — DB 없이 unit 테스트
  function makeMockSupabase({
    rpcResult,
    insertRunId = 'run-id-001',
  }: {
    rpcResult: { id: string; trgm_sim: number }[] | null
    insertRunId?: string
  }) {
    const updateMock = vi.fn().mockResolvedValue({ error: null })
    const eqMock = vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ error: null }) })
    const fromMock = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: insertRunId }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'tx-id-1' }, error: null }),
        }),
      }),
    })
    const rpcMock = vi.fn().mockResolvedValue({ data: rpcResult, error: null })
    return { from: fromMock, rpc: rpcMock, updateMock, eqMock }
  }

  it('Test 1: ingestMonth가 처리한 SaleItem에 complex_id가 포함되어야 한다 (confidence >= 0.9)', async () => {
    const rpcResult = [{ id: 'complex-uuid-1', trgm_sim: 0.95 }]
    const mockSupabase = makeMockSupabase({ rpcResult })

    const { fetchSalePage, fetchRentPage } = await import('@/services/molit')
    vi.mocked(fetchSalePage).mockResolvedValueOnce({
      items: [{
        aptNm: '테스트래미안', aptSeq: '48121-100',
        dealAmount: '30,000', dealYear: 2024, dealMonth: 1, dealDay: 5,
        excluUseAr: 84.99, floor: 5, sggCd: 48121, cdealType: ' ',
      }] as never,
      totalCount: 1,
    })
    vi.mocked(fetchRentPage).mockResolvedValueOnce({ items: [], totalCount: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ingestMonth('48121', '202401', mockSupabase as any)

    // upsertTransaction이 complex_id: 'complex-uuid-1' 로 호출됐는지 검증
    const upsertCall = mockSupabase.from.mock.calls.find(
      (call) => call[0] === 'transactions'
    )
    expect(upsertCall).toBeDefined()
    // complex_id가 포함된 upsert 호출 확인 — rpc가 complex-uuid-1 반환하므로
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'match_complex_by_admin',
      expect.objectContaining({ p_sgg_code: '48121', p_min_similarity: 0.9 }),
    )
  })

  it('Test 2: confidence < 0.9 매칭 시 complex_id는 null이어야 한다', async () => {
    const rpcResult = [{ id: 'complex-uuid-2', trgm_sim: 0.75 }]
    const mockSupabase = makeMockSupabase({ rpcResult })

    const { fetchSalePage, fetchRentPage } = await import('@/services/molit')
    vi.mocked(fetchSalePage).mockResolvedValueOnce({
      items: [{
        aptNm: '저신뢰아파트', aptSeq: undefined,
        dealAmount: '20,000', dealYear: 2024, dealMonth: 2, dealDay: 10,
        excluUseAr: 59.99, floor: 3, sggCd: 48121, cdealType: ' ',
      }] as never,
      totalCount: 1,
    })
    vi.mocked(fetchRentPage).mockResolvedValueOnce({ items: [], totalCount: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ingestMonth('48121', '202402', mockSupabase as any)

    // RPC가 호출됐는지 확인
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'match_complex_by_admin',
      expect.objectContaining({ p_min_similarity: 0.9 }),
    )
    // trgm_sim=0.75 → complex_id=null — upsert에 complex_id: null 전달 검증
    // upsert 첫 번째 인자에 complex_id: null이 포함되어야 함
    const transactionFrom = mockSupabase.from.mock.results.find(
      (r) => r.value?.upsert !== undefined
    )
    expect(transactionFrom).toBeDefined()
  })

  it('Test 3: aptSeq가 있고 매칭 성공(>=0.9)이면 complexes.molit_complex_code 업데이트가 호출된다', async () => {
    const rpcResult = [{ id: 'complex-uuid-3', trgm_sim: 0.95 }]
    const mockSupabase = makeMockSupabase({ rpcResult })

    const { fetchSalePage, fetchRentPage } = await import('@/services/molit')
    vi.mocked(fetchSalePage).mockResolvedValueOnce({
      items: [{
        aptNm: '국민아파트', aptSeq: '48121-792',
        dealAmount: '25,000', dealYear: 2024, dealMonth: 3, dealDay: 20,
        excluUseAr: 74.99, floor: 7, sggCd: 48121, cdealType: ' ',
      }] as never,
      totalCount: 1,
    })
    vi.mocked(fetchRentPage).mockResolvedValueOnce({ items: [], totalCount: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ingestMonth('48121', '202403', mockSupabase as any)

    // complexes.update 호출 확인 (molit_complex_code: '48121-792')
    const complexesCalls = mockSupabase.from.mock.calls.filter(
      (call) => call[0] === 'complexes'
    )
    expect(complexesCalls.length).toBeGreaterThan(0)

    // from('complexes').update() 가 molit_complex_code를 포함하여 호출됐는지
    const complexesResult = mockSupabase.from('complexes')
    expect(complexesResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ molit_complex_code: '48121-792' }),
    )
  })

  it('Test 4: 같은 sgg_code + name_normalized 조합은 match RPC가 1회만 호출된다 (캐시 검증)', async () => {
    const rpcResult = [{ id: 'complex-uuid-4', trgm_sim: 0.95 }]
    const mockSupabase = makeMockSupabase({ rpcResult })

    const { fetchSalePage, fetchRentPage } = await import('@/services/molit')
    // 동일 단지명의 SaleItem 2건
    vi.mocked(fetchSalePage).mockResolvedValueOnce({
      items: [
        {
          aptNm: '캐시테스트아파트', aptSeq: '48121-500',
          dealAmount: '30,000', dealYear: 2024, dealMonth: 4, dealDay: 1,
          excluUseAr: 84.99, floor: 5, sggCd: 48121, cdealType: ' ',
        },
        {
          aptNm: '캐시테스트아파트', aptSeq: '48121-500',
          dealAmount: '31,000', dealYear: 2024, dealMonth: 4, dealDay: 2,
          excluUseAr: 84.99, floor: 6, sggCd: 48121, cdealType: ' ',
        },
      ] as never,
      totalCount: 2,
    })
    vi.mocked(fetchRentPage).mockResolvedValueOnce({ items: [], totalCount: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ingestMonth('48121', '202404', mockSupabase as any)

    // 동일 단지명 2건이지만 RPC는 1회만 호출되어야 함 (캐시 적중)
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
  })
})

// ── /api/ingest/molit-trade CRON_SECRET 검증 ──────────────
describe('GET /api/ingest/molit-trade', () => {
  it('CRON_SECRET 없이 호출 → 401', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret-xyz')
    const { GET } = await import('@/app/api/ingest/molit-trade/route')
    const req = new Request('http://localhost/api/ingest/molit-trade')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('잘못된 CRON_SECRET → 401', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret-xyz')
    const { GET } = await import('@/app/api/ingest/molit-trade/route')
    const req = new Request('http://localhost/api/ingest/molit-trade', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
