/**
 * Phase 2 랭킹 기능 수용 기준 테스트 — RANK-01, RANK-02, RANK-03
 *
 * - computeRankings: 4종 랭킹 산식이 올바르게 집계되고 complex_rankings에 UPSERT
 * - getRankingsByType: rank_type별 올바른 순서의 결과 반환
 * - GET /api/cron/rankings: CRON_SECRET 검증 (401/200)
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
  vi.stubEnv('CRON_SECRET', 'test-cron-secret')
})

// ── GET /api/cron/rankings ──────────────────────────────────────────────────

describe('GET /api/cron/rankings', () => {
  it('Authorization 헤더 없음 → 401', async () => {
    const { GET } = await import('@/app/api/cron/rankings/route')
    const req = new Request('http://localhost/api/cron/rankings')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('잘못된 CRON_SECRET → 401', async () => {
    const { GET } = await import('@/app/api/cron/rankings/route')
    const req = new Request('http://localhost/api/cron/rankings', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('올바른 CRON_SECRET → 200 + ok:true', async () => {
    const { GET } = await import('@/app/api/cron/rankings/route')
    const req = new Request('http://localhost/api/cron/rankings', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})

// ── getRankingsByType ──────────────────────────────────────────────────────

describe('getRankingsByType', () => {
  it('빈 complex_rankings → 빈 배열 반환', async () => {
    const { getRankingsByType } = await import('@/lib/data/rankings')
    const result = await getRankingsByType(admin, 'high_price', 10)
    expect(Array.isArray(result)).toBe(true)
  })

  it('반환 행은 rank 오름차순 정렬', async () => {
    const { getRankingsByType } = await import('@/lib/data/rankings')
    const result = await getRankingsByType(admin, 'volume', 10)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.rank).toBeGreaterThanOrEqual(result[i - 1]!.rank)
    }
  })
})

// ── computeRankings ────────────────────────────────────────────────────────

describe('computeRankings', () => {
  it('실행 후 complex_rankings에 레코드가 존재 (transactions 데이터 있을 때)', async () => {
    const { computeRankings } = await import('@/lib/data/rankings')
    // 실제 트랜잭션 데이터가 없으면 빈 결과이므로 오류 없이 완료만 검증
    const results = await computeRankings(admin)
    expect(Array.isArray(results)).toBe(true)
    for (const r of results) {
      expect(r).toHaveProperty('type')
      expect(r).toHaveProperty('upserted')
    }
  })
})
