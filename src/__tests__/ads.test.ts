/**
 * Step11 수용 기준 테스트 — 광고 관리
 *
 * - getActiveAds: approved+활성 기간만 반환, draft/만료/미래/다른placement 제외
 * - admin actions: 비로그인 → error 반환
 * - POST /api/ads/events: 유효성 검사 → 400, 정상 → 201
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import type { Database } from '@/types/database'
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

// ── 픽스처 IDs ──────────────────────────────────────────────────
const insertedIds: string[] = []

function makeAd(overrides: Partial<Database['public']['Tables']['ad_campaigns']['Insert']> = {}) {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 86400_000).toISOString()
  const tomorrow  = new Date(now.getTime() + 86400_000).toISOString()
  return {
    advertiser_name: '테스트광고주',
    title:           '테스트광고',
    image_url:       'https://via.placeholder.com/300x250',
    link_url:        'https://example.com',
    placement:       'sidebar' as const,
    starts_at:       yesterday,
    ends_at:         tomorrow,
    status:          'approved' as const,
    ...overrides,
  }
}

afterAll(async () => {
  if (insertedIds.length) {
    await admin.from('ad_campaigns').delete().in('id', insertedIds)
  }
})

// ── getActiveAds ─────────────────────────────────────────────────
import { getActiveAds } from '@/lib/data/ads'

describe('getActiveAds', () => {
  it('approved + 활성 기간 → 반환', async () => {
    const { data } = await admin.from('ad_campaigns').insert(makeAd()).select('id').single()
    insertedIds.push((data as { id: string }).id)

    const result = await getActiveAds('sidebar', admin)
    expect(result.some(a => a.id === (data as { id: string }).id)).toBe(true)
  })

  it('draft status → 반환 안 됨', async () => {
    const { data } = await admin
      .from('ad_campaigns')
      .insert(makeAd({ status: 'draft' }))
      .select('id')
      .single()
    insertedIds.push((data as { id: string }).id)

    const result = await getActiveAds('sidebar', admin)
    expect(result.some(a => a.id === (data as { id: string }).id)).toBe(false)
  })

  it('approved + 만료(ends_at 과거) → 반환 안 됨', async () => {
    const past = new Date(Date.now() - 172_800_000).toISOString()
    const { data } = await admin
      .from('ad_campaigns')
      .insert(makeAd({ ends_at: past, starts_at: new Date(Date.now() - 259_200_000).toISOString() }))
      .select('id')
      .single()
    insertedIds.push((data as { id: string }).id)

    const result = await getActiveAds('sidebar', admin)
    expect(result.some(a => a.id === (data as { id: string }).id)).toBe(false)
  })

  it('approved + 미래(starts_at 미래) → 반환 안 됨', async () => {
    const future = new Date(Date.now() + 172_800_000).toISOString()
    const { data } = await admin
      .from('ad_campaigns')
      .insert(makeAd({ starts_at: future, ends_at: new Date(Date.now() + 259_200_000).toISOString() }))
      .select('id')
      .single()
    insertedIds.push((data as { id: string }).id)

    const result = await getActiveAds('sidebar', admin)
    expect(result.some(a => a.id === (data as { id: string }).id)).toBe(false)
  })

  it('다른 placement → 해당 placement 쿼리에 미포함', async () => {
    const { data } = await admin
      .from('ad_campaigns')
      .insert(makeAd({ placement: 'banner_top' }))
      .select('id')
      .single()
    insertedIds.push((data as { id: string }).id)

    const result = await getActiveAds('in_feed', admin)
    expect(result.some(a => a.id === (data as { id: string }).id)).toBe(false)
  })
})

// ── admin actions — 비로그인 가드 ────────────────────────────────
import { approveAdCampaign, rejectAdCampaign, pauseAdCampaign } from '@/lib/auth/ad-actions'

const FAKE_ID = '00000000-0000-0000-0000-000000000001'

describe('approveAdCampaign (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const result = await approveAdCampaign(FAKE_ID)
    expect(result.error).toBeTruthy()
  })
})

describe('rejectAdCampaign (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const result = await rejectAdCampaign(FAKE_ID)
    expect(result.error).toBeTruthy()
  })
})

describe('pauseAdCampaign (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const result = await pauseAdCampaign(FAKE_ID)
    expect(result.error).toBeTruthy()
  })
})

// ── POST /api/ads/events ─────────────────────────────────────────
describe('POST /api/ads/events', () => {
  it('body 없음 → 400', async () => {
    const { POST } = await import('@/app/api/ads/events/route')
    const req = new Request('http://localhost/api/ads/events', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('잘못된 event_type → 400', async () => {
    const { POST } = await import('@/app/api/ads/events/route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: FAKE_ID, event_type: 'view' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('campaign_id 없음 → 400', async () => {
    const { POST } = await import('@/app/api/ads/events/route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_type: 'impression' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('유효한 impression → 201', async () => {
    // 실제 campaign이 없어도 API 레이어는 201 반환 (DB insert 실패는 무시)
    const { POST } = await import('@/app/api/ads/events/route')
    const req = new Request('http://localhost/api/ads/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: FAKE_ID, event_type: 'impression' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
