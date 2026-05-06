/**
 * SEC-01 통합 테스트 — Rate limiting + IP hash
 *
 * TDD Wave 0: RED 상태로 시작
 * - Test 1/4: 기존 동작(400/201) — GREEN
 * - Test 2: rate limit 초과 → 429 — RED (구현 전)
 * - Test 3: ip_hash INSERT 확인 — RED (구현 전)
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

// adEventRatelimit mock — 기본 값: 성공 (rate limit 미초과)
const mockLimit = vi.fn().mockResolvedValue({
  success: true,
  remaining: 99,
  reset: Date.now() + 60_000,
})
vi.mock('@/lib/ratelimit', () => ({
  adEventRatelimit: { limit: mockLimit },
}))

// createSupabaseAdminClient mock — insert 캡처용
let capturedInsert: Record<string, unknown> | null = null
const mockInsert = vi.fn().mockImplementation((data: Record<string, unknown>) => {
  capturedInsert = data
  return Promise.resolve({ error: null })
})
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

beforeAll(() => {
  vi.stubEnv('RATE_LIMIT_SECRET', 'test-secret')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
})

afterEach(() => {
  capturedInsert = null
  mockLimit.mockResolvedValue({
    success: true,
    remaining: 99,
    reset: Date.now() + 60_000,
  })
})

describe('POST /api/ads/events', () => {
  it('Test 1: 정상 요청 → 201 반환', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'impression' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('Test 2: rate limit 초과 시 → 429 반환 + Retry-After 헤더', async () => {
    mockLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'click' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).not.toBeNull()
  })

  it('Test 3: 성공 요청 시 ip_hash 필드가 INSERT에 포함됨', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'click' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(capturedInsert).toHaveProperty('ip_hash')
    expect(typeof capturedInsert?.ip_hash).toBe('string')
    expect((capturedInsert?.ip_hash as string).length).toBe(64) // sha256 hex = 64 chars
  })

  it('Test 4: campaign_id 누락 → 400 반환', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_type: 'click' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
