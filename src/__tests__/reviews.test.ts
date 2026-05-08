/**
 * Step12 수용 기준 테스트 — 커뮤니티 후기 V0.9
 *
 * - getComplexReviews: 단지별 후기 목록 반환
 * - getComplexReviewStats: 평균 평점 + 건수
 * - submitReview: 비로그인 → error 반환
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, AKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

// ── 픽스처 ────────────────────────────────────────────────────────
let testComplexId: string
let testUserId: string

beforeAll(async () => {
  if (!SKEY) return
  const { data: complex, error: cErr } = await admin
    .from('complexes')
    .insert({
      canonical_name:  '테스트후기단지아파트',
      name_normalized: '테스트후기단지아파트',
      sgg_code:        '48121',
      road_address:    '경상남도 창원시 의창구 후기로 1',
      status:          'active' as const,
    })
    .select('id')
    .single()
  if (cErr) throw new Error(`complex insert 실패: ${cErr.message}`)
  testComplexId = (complex as { id: string }).id

  const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
    email:         `review_test_${Date.now()}@test.local`,
    password:      'test1234!',
    email_confirm: true,
  })
  if (uErr) throw new Error(`user create 실패: ${uErr.message}`)
  testUserId = userRes.user.id
})

afterAll(async () => {
  if (!SKEY) return
  if (testComplexId) await admin.from('complex_reviews').delete().eq('complex_id', testComplexId)
  if (testComplexId) await admin.from('complexes').delete().eq('id', testComplexId)
  if (testUserId)   await admin.auth.admin.deleteUser(testUserId)
})

// ── getComplexReviews ─────────────────────────────────────────────
import { getComplexReviews, getComplexReviewStats } from '@/lib/data/reviews'

describe.skipIf(!SKEY)('getComplexReviews', () => {
  it('후기 없음 → 빈 배열', async () => {
    const result = await getComplexReviews(testComplexId, admin)
    expect(result).toEqual([])
  })

  it('후기 insert → id·content·rating·gps_verified 반환', async () => {
    await admin.from('complex_reviews').insert({
      complex_id:   testComplexId,
      user_id:      testUserId,
      content:      '조용하고 살기 좋은 단지입니다.',
      rating:       4,
      gps_verified: false,
    })

    const result = await getComplexReviews(testComplexId, admin)
    expect(result).toHaveLength(1)
    expect(result[0]!.content).toBe('조용하고 살기 좋은 단지입니다.')
    expect(result[0]!.rating).toBe(4)
    expect(result[0]!.gps_verified).toBe(false)
  })

  it('최신 순 정렬 (가장 최근이 첫 번째)', async () => {
    await admin.from('complex_reviews').insert({
      complex_id: testComplexId,
      user_id:    testUserId,
      content:    '두 번째 후기입니다. 교통이 편리해요.',
      rating:     5,
    })

    const result = await getComplexReviews(testComplexId, admin)
    expect(result).toHaveLength(2)
    expect(result[0]!.content).toBe('두 번째 후기입니다. 교통이 편리해요.')
  })
})

describe.skipIf(!SKEY)('getComplexReviewStats', () => {
  it('후기 있음 → count=2, avg_rating=4.5', async () => {
    const stats = await getComplexReviewStats(testComplexId, admin)
    expect(stats.count).toBe(2)
    expect(stats.avg_rating).toBeCloseTo(4.5, 1)
  })
})

// ── submitReview — 비로그인 가드 ─────────────────────────────────
import { submitReview } from '@/lib/auth/review-actions'

describe.skipIf(!SKEY)('submitReview (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const result = await submitReview({
      complexId: testComplexId,
      content:   '로그인 없이 후기 작성 시도',
      rating:    3,
    })
    expect(result.error).toBeTruthy()
  })
})

// ── content 유효성 검사 (data layer) ─────────────────────────────
describe.skipIf(!SKEY)('content 길이 제약', () => {
  it('10자 미만 → DB에서 거부', async () => {
    const { error } = await admin.from('complex_reviews').insert({
      complex_id: testComplexId,
      user_id:    testUserId,
      content:    '짧음',
      rating:     3,
    })
    expect(error).not.toBeNull()
  })

  it('500자 초과 → DB에서 거부', async () => {
    const { error } = await admin.from('complex_reviews').insert({
      complex_id: testComplexId,
      user_id:    testUserId,
      content:    'a'.repeat(501),
      rating:     3,
    })
    expect(error).not.toBeNull()
  })
})
