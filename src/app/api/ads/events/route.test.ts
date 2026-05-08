/**
 * 광고 이벤트 API 테스트 — Rate limiting + IP hash + conversion + anomaly
 *
 * Phase 6 Plan 01: conversion 이벤트 추가 + is_anomaly 감지
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

// adEventRatelimit + adClickDailyLimit mock
const mockLimit = vi.fn().mockResolvedValue({
  success: true,
  remaining: 99,
  reset: Date.now() + 60_000,
})
const mockDailyLimit = vi.fn().mockResolvedValue({
  success: true,
  remaining: 9,
  reset: Date.now() + 86_400_000,
})
vi.mock('@/lib/ratelimit', () => ({
  adEventRatelimit:  { limit: mockLimit },
  adClickDailyLimit: { limit: mockDailyLimit },
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
  mockLimit.mockClear()
  mockLimit.mockResolvedValue({
    success: true,
    remaining: 99,
    reset: Date.now() + 60_000,
  })
  mockDailyLimit.mockClear()
  mockDailyLimit.mockResolvedValue({
    success: true,
    remaining: 9,
    reset: Date.now() + 86_400_000,
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

  // Phase 6 신규 테스트 케이스
  it('Test 5: conversion event_type 허용 → 201 반환', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'conversion' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('Test 6: unknown event_type → 400 반환', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'unknown' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('Test 7: click 이벤트에서 일별 한도 초과 시 is_anomaly=true로 INSERT', async () => {
    mockDailyLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 86_400_000,
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'click' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(capturedInsert).toHaveProperty('is_anomaly', true)
  })

  it('Test 8: impression 이벤트는 일별 한도 체크 안 함 (is_anomaly=false)', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'test-campaign-id', event_type: 'impression' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(capturedInsert).toHaveProperty('is_anomaly', false)
    // impression은 dailyLimit.limit()를 호출하지 않아야 함
    expect(mockDailyLimit).not.toHaveBeenCalled()
  })
})
