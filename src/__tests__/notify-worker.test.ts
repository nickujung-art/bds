/**
 * Step10 수용 기준 테스트 — 알림 워커
 *
 * - generatePriceAlerts: favorites+거래 → notifications 생성, dedup 작동
 * - deliverPendingNotifications: pending → sent 상태 전환, 전송 실패 → failed
 * - POST /api/worker/notify: CRON_SECRET 검증 (없음→401, 틀림→401, 맞음→200)
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, AKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

// ── Resend mock ──────────────────────────────────────────────
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  })),
}))

// ── web-push mock ────────────────────────────────────────────
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}))

const CRON = 'test-cron-secret-xyz'

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
  vi.stubEnv('CRON_SECRET', CRON)
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'UUxI4O8-FbRouAevSmBQ6co62GroUysl9cv_weINNKA')
})

// ── 픽스처 ────────────────────────────────────────────────────
let testComplexId: string
let testUserId:    string

beforeAll(async () => {
  const { data: complex, error: cErr } = await admin
    .from('complexes')
    .insert({
      canonical_name:  '테스트알림단지아파트',
      name_normalized: '테스트알림단지아파트',
      sgg_code:        '48121',
      road_address:    '경상남도 창원시 의창구 알림로 1',
      status:          'active' as const,
    })
    .select('id')
    .single()
  if (cErr) throw new Error(`complex insert 실패: ${cErr.message}`)
  testComplexId = (complex as { id: string }).id

  const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
    email:         `notify_test_${Date.now()}@test.local`,
    password:      'test1234!',
    email_confirm: true,
  })
  if (uErr) throw new Error(`user create 실패: ${uErr.message}`)
  testUserId = userRes.user.id

  // favorite 등록
  await admin.from('favorites').insert({
    user_id:    testUserId,
    complex_id: testComplexId,
    alert_enabled: true,
  })
})

afterAll(async () => {
  if (testUserId) {
    await admin.from('notifications').delete().eq('user_id', testUserId)
    await admin.from('favorites').delete().eq('user_id', testUserId)
    await admin.from('transactions').delete().eq('complex_id', testComplexId)
  }
  if (testComplexId) await admin.from('complexes').delete().eq('id', testComplexId)
  if (testUserId)   await admin.auth.admin.deleteUser(testUserId)
})

// ── generatePriceAlerts ──────────────────────────────────────
import { generatePriceAlerts } from '@/lib/notifications/generate-alerts'

describe('generatePriceAlerts', () => {
  it('최근 거래 없음 → 알림 0건 생성', async () => {
    const count = await generatePriceAlerts(admin)
    expect(count).toBe(0)
  })

  it('관심단지에 최근 거래 추가 → 알림 1건 생성', async () => {
    const dealDate = new Date().toISOString().split('T')[0]!
    await admin.from('transactions').insert({
      complex_id:  testComplexId,
      deal_type:   'sale',
      price:       85000,
      area_m2:     112.7,
      floor:       10,
      deal_date:   dealDate,
      sgg_code:    '48121',
      dedupe_key:  `TEST_${testComplexId}_${dealDate}_85000`,
    })

    const count = await generatePriceAlerts(admin)
    expect(count).toBe(1)

    const { data } = await admin
      .from('notifications')
      .select('type, event_type, status')
      .eq('user_id', testUserId)
      .eq('target_id', testComplexId)
    expect(data).toHaveLength(1)
    expect(data![0]!.type).toBe('price_alert')
    expect(data![0]!.status).toBe('pending')
  })

  it('같은 날짜 재실행 → dedup 작동 (추가 알림 없음)', async () => {
    const countBefore = (
      await admin.from('notifications').select('id').eq('user_id', testUserId)
    ).data?.length ?? 0

    await generatePriceAlerts(admin)

    const countAfter = (
      await admin.from('notifications').select('id').eq('user_id', testUserId)
    ).data?.length ?? 0

    expect(countAfter).toBe(countBefore)
  })
})

// ── deliverPendingNotifications ──────────────────────────────
import { deliverPendingNotifications } from '@/lib/notifications/deliver'

describe('deliverPendingNotifications', () => {
  it('pending 알림 → sent로 전환, delivered_at 설정', async () => {
    const { sent, failed } = await deliverPendingNotifications(admin)
    expect(sent).toBeGreaterThanOrEqual(1)
    expect(failed).toBe(0)

    const { data } = await admin
      .from('notifications')
      .select('status, delivered_at')
      .eq('user_id', testUserId)
    expect(data![0]!.status).toBe('sent')
    expect(data![0]!.delivered_at).not.toBeNull()
  })

  it('pending 없으면 sent=0 반환', async () => {
    const { sent, failed } = await deliverPendingNotifications(admin)
    expect(sent).toBe(0)
    expect(failed).toBe(0)
  })
})

// ── POST /api/worker/notify ──────────────────────────────────
describe('POST /api/worker/notify', () => {
  it('x-cron-secret 없음 → 401', async () => {
    const { POST } = await import('@/app/api/worker/notify/route')
    const req = new Request('http://localhost/api/worker/notify', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('x-cron-secret 틀림 → 401', async () => {
    const { POST } = await import('@/app/api/worker/notify/route')
    const req = new Request('http://localhost/api/worker/notify', {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong-secret' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('x-cron-secret 맞음 → 200, generated/sent/failed 필드 포함', async () => {
    const { POST } = await import('@/app/api/worker/notify/route')
    const req = new Request('http://localhost/api/worker/notify', {
      method: 'POST',
      headers: { 'x-cron-secret': CRON },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { generated: number; sent: number; failed: number }
    expect(body).toHaveProperty('generated')
    expect(body).toHaveProperty('sent')
    expect(body).toHaveProperty('failed')
  })
})
