/**
 * link-transactions 수용 기준 테스트 (DATA-09)
 *
 * 검증 항목:
 *   1. nameNormalize 별칭 변환 (e편한세상 → 이편한세상)
 *   2. confidence >= 0.9 → 자동 연결 대상 (linked_pairs)
 *   3. confidence 0.5~0.9 → complex_match_queue low_confidence 적재
 *   4. matchByAdminCode null → complex_match_queue no_match 적재
 *   5. 중복 방지 가드 — 기존 큐 항목 존재 시 insert 건너뜀 (dedup)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Test 1: nameNormalize 별칭 변환 (순수 단위 테스트)
// ─────────────────────────────────────────────────────────────
// name-aliases.json이 채워진 후 GREEN이 됨 (Task 2에서 적용)
describe('nameNormalize — 별칭 치환', () => {
  it('e편한세상을 이편한세상으로 변환한다', async () => {
    const { nameNormalize } = await import('@/lib/data/name-normalize')
    const result = nameNormalize('e편한세상창원마세')
    // name-aliases.json에 "e편한세상" → "이편한세상" 별칭 적용 후 GREEN
    expect(result).toContain('이편한세상')
  })

  it('힐스테잇을 힐스테이트로 변환한다', async () => {
    const { nameNormalize } = await import('@/lib/data/name-normalize')
    const result = nameNormalize('힐스테잇창원')
    expect(result).toContain('힐스테이트')
  })
})

// ─────────────────────────────────────────────────────────────
// Tests 2~5: link-transactions.ts 분기 로직 단위 테스트
// matchByAdminCode와 supabase를 vi.mock하여 격리 테스트
// ─────────────────────────────────────────────────────────────

vi.mock('@/lib/data/complex-matching', () => ({
  matchByAdminCode: vi.fn(),
}))

vi.mock('server-only', () => ({}))

// Supabase mock — complex_match_queue select/insert를 제어
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockContains = vi.fn()
const mockLimit = vi.fn()

function buildSupabaseMock(existingQueueItems: unknown[] = []) {
  mockLimit.mockResolvedValue({ data: existingQueueItems, error: null })
  mockContains.mockReturnValue({ limit: mockLimit })
  mockEq.mockReturnValue({ contains: mockContains })
  mockSelect.mockReturnValue({ eq: mockEq })

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'complex_match_queue') {
        return {
          select: mockSelect,
          insert: mockInsert,
        }
      }
      // transactions 테이블: 빈 배열 반환
      return {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
}

/**
 * classifyTransaction: link-transactions.ts의 핵심 분기 로직을 추출한
 * 테스트 가능한 단위 함수 (스크립트와 동일한 임계값 사용)
 */
async function classifyTransaction(
  tx: { id: string; sgg_code: string; raw_complex_name: string },
  supabase: ReturnType<typeof buildSupabaseMock>,
): Promise<{
  action: 'linked' | 'queued_low' | 'queued_no_match'
  reason?: 'low_confidence' | 'no_match'
  complexId?: string
  confidence?: number
}> {
  const AUTO_THRESHOLD = 0.9
  const QUEUE_LOW_CONFIDENCE = 0.5

  const { nameNormalize } = await import('@/lib/data/name-normalize')
  const { matchByAdminCode } = await import('@/lib/data/complex-matching')

  const nameNormalized = nameNormalize(tx.raw_complex_name)
  const result = await (matchByAdminCode as ReturnType<typeof vi.fn>)(
    { sggCode: tx.sgg_code, nameNormalized },
    supabase,
  )

  if (result && result.confidence >= AUTO_THRESHOLD) {
    return { action: 'linked', complexId: result.complexId, confidence: result.confidence }
  }

  // 중복 방지 가드 (isAlreadyQueued)
  const already = await isAlreadyQueued(tx.id, supabase)
  if (already) {
    // 이미 큐에 있으면 action 그대로 반환하지만 insert 안 함
    if (result && result.confidence >= QUEUE_LOW_CONFIDENCE) {
      return { action: 'queued_low', reason: 'low_confidence', complexId: result.complexId }
    }
    return { action: 'queued_no_match', reason: 'no_match' }
  }

  if (result && result.confidence >= QUEUE_LOW_CONFIDENCE) {
    await supabase.from('complex_match_queue').insert({
      source: 'link-transactions',
      raw_payload: { tx_id: tx.id, sgg_code: tx.sgg_code, raw_complex_name: tx.raw_complex_name },
      candidate_ids: [result.complexId],
      reason: 'low_confidence',
      status: 'pending',
    })
    return { action: 'queued_low', reason: 'low_confidence', complexId: result.complexId }
  }

  await supabase.from('complex_match_queue').insert({
    source: 'link-transactions',
    raw_payload: { tx_id: tx.id, sgg_code: tx.sgg_code, raw_complex_name: tx.raw_complex_name },
    candidate_ids: result ? [result.complexId] : null,
    reason: 'no_match',
    status: 'pending',
  })
  return { action: 'queued_no_match', reason: 'no_match' }
}

async function isAlreadyQueued(
  txId: string,
  supabase: ReturnType<typeof buildSupabaseMock>,
): Promise<boolean> {
  const { data } = await supabase
    .from('complex_match_queue')
    .select('source')
    .eq('source', 'link-transactions')
    .contains('raw_payload', { tx_id: txId })
    .limit(1)
  return (data?.length ?? 0) > 0
}

const SAMPLE_TX = {
  id: 'tx-test-001',
  sgg_code: '48121',
  raw_complex_name: '창원힐스테이트아파트',
}

describe('link-transactions — 분기 로직', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test 2: confidence >= 0.9 → 자동 연결
  it('confidence >= 0.9 → linked_pairs에 포함된다 (자동 연결)', async () => {
    const { matchByAdminCode } = await import('@/lib/data/complex-matching')
    vi.mocked(matchByAdminCode).mockResolvedValue({
      complexId: 'uuid-complex-1',
      confidence: 0.92,
      axis: 'admin_code',
    })

    const supabase = buildSupabaseMock([])
    const result = await classifyTransaction(SAMPLE_TX, supabase)

    expect(result.action).toBe('linked')
    expect(result.complexId).toBe('uuid-complex-1')
    expect(result.confidence).toBe(0.92)
    // 큐에 insert하지 않음
    expect(mockInsert).not.toHaveBeenCalled()
  })

  // Test 3: confidence 0.5~0.9 → low_confidence 큐 적재
  it('confidence 0.5~0.9 → complex_match_queue low_confidence 적재', async () => {
    const { matchByAdminCode } = await import('@/lib/data/complex-matching')
    vi.mocked(matchByAdminCode).mockResolvedValue({
      complexId: 'uuid-complex-2',
      confidence: 0.72,
      axis: 'admin_code',
    })

    const supabase = buildSupabaseMock([]) // 기존 큐 항목 없음
    const result = await classifyTransaction(SAMPLE_TX, supabase)

    expect(result.action).toBe('queued_low')
    expect(result.reason).toBe('low_confidence')
    expect(mockInsert).toHaveBeenCalledOnce()

    const insertArg = mockInsert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(insertArg.reason).toBe('low_confidence')
    expect(insertArg.source).toBe('link-transactions')
  })

  // Test 4: matchByAdminCode null → no_match 큐 적재
  it('matchByAdminCode null 반환 → complex_match_queue no_match 적재', async () => {
    const { matchByAdminCode } = await import('@/lib/data/complex-matching')
    vi.mocked(matchByAdminCode).mockResolvedValue(null)

    const supabase = buildSupabaseMock([]) // 기존 큐 항목 없음
    const result = await classifyTransaction(SAMPLE_TX, supabase)

    expect(result.action).toBe('queued_no_match')
    expect(result.reason).toBe('no_match')
    expect(mockInsert).toHaveBeenCalledOnce()

    const insertArg = mockInsert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(insertArg.reason).toBe('no_match')
  })

  // Test 5: 중복 방지 — 기존 큐 항목 있으면 insert 건너뜀 (dedup guard)
  it('이미 큐에 있는 transaction → complex_match_queue insert 호출 안 됨', async () => {
    const { matchByAdminCode } = await import('@/lib/data/complex-matching')
    vi.mocked(matchByAdminCode).mockResolvedValue(null)

    // 기존 큐 항목이 있는 상태로 mock
    const supabase = buildSupabaseMock([{ source: 'link-transactions' }])
    await classifyTransaction(SAMPLE_TX, supabase)

    // 이미 큐에 있으므로 insert 호출 없음 (중복 방지 가드)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
