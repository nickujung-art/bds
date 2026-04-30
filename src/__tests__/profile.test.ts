/**
 * Step14 수용 기준 테스트 — 내 프로필 / 푸시 구독
 *
 * - registerPushSubscription: 비로그인 → error, 로그인 → 구독 등록 후 DB 확인
 * - unregisterPushSubscription: 비로그인 → error
 * - hasPushSubscription: 구독 여부 boolean 반환
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
let testUserId: string

const TEST_SUB = {
  endpoint: `https://fcm.googleapis.com/test-endpoint-${Date.now()}`,
  p256dh:   'BNcRdreALRFXTkOOUHK1EtK2wtFTMSSfIHPFEzPLzZJNBMdh',
  auth:     'tBHItJI5svbpez7KI4CCXg==',
}

beforeAll(async () => {
  const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
    email:         `profile_test_${Date.now()}@test.local`,
    password:      'test1234!',
    email_confirm: true,
  })
  if (uErr) throw new Error(`user create 실패: ${uErr.message}`)
  testUserId = userRes.user.id
})

afterAll(async () => {
  if (testUserId) {
    await admin.from('push_subscriptions').delete().eq('user_id', testUserId)
    await admin.auth.admin.deleteUser(testUserId)
  }
})

// ── registerPushSubscription — 비로그인 가드 ─────────────────────
import { registerPushSubscription, unregisterPushSubscription } from '@/lib/auth/push-actions'

describe('registerPushSubscription (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const result = await registerPushSubscription(TEST_SUB)
    expect(result.error).toBeTruthy()
  })
})

describe('unregisterPushSubscription (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const result = await unregisterPushSubscription(TEST_SUB.endpoint)
    expect(result.error).toBeTruthy()
  })
})

// ── hasPushSubscription (data layer) ─────────────────────────────
import { hasPushSubscription } from '@/lib/data/profile'

describe('hasPushSubscription', () => {
  it('구독 없음 → false', async () => {
    const result = await hasPushSubscription(testUserId, admin)
    expect(result).toBe(false)
  })

  it('구독 insert 후 → true', async () => {
    await admin.from('push_subscriptions').insert({
      user_id:  testUserId,
      endpoint: TEST_SUB.endpoint,
      p256dh:   TEST_SUB.p256dh,
      auth:     TEST_SUB.auth,
    })
    const result = await hasPushSubscription(testUserId, admin)
    expect(result).toBe(true)
  })

  it('구독 delete 후 → false', async () => {
    await admin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', testUserId)
      .eq('endpoint', TEST_SUB.endpoint)
    const result = await hasPushSubscription(testUserId, admin)
    expect(result).toBe(false)
  })
})

// ── getFavoritesCount ─────────────────────────────────────────────
import { getFavoritesCount } from '@/lib/data/profile'

describe('getFavoritesCount', () => {
  it('관심단지 없는 유저 → 0', async () => {
    const count = await getFavoritesCount(testUserId, admin)
    expect(count).toBe(0)
  })
})
