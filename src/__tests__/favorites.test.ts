/**
 * Step9 수용 기준 테스트 — 관심단지 (favorites)
 *
 * - getFavorites: 유저의 관심단지 목록 반환 (complex 포함)
 * - isFavorited: 관심 여부 boolean 반환
 * - addFavorite / removeFavorite: 비로그인 → error 반환
 * - toggleFavoriteAlert: 비로그인 → error 반환
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, AKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

// ── 픽스처 ─────────────────────────────────────────────────────
let testComplexId: string
let testUserId: string

beforeAll(async () => {
  const { data: complex, error: cErr } = await admin
    .from('complexes')
    .insert({
      canonical_name:  '테스트관심단지아파트',
      name_normalized: '테스트관심단지아파트',
      sgg_code:        '48121',
      road_address:    '경상남도 창원시 의창구 테스트로 99',
      status:          'active' as const,
    })
    .select('id')
    .single()
  if (cErr) throw new Error(`complex insert 실패: ${cErr.message}`)
  testComplexId = (complex as { id: string }).id

  const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
    email:         `fav_test_${Date.now()}@test.local`,
    password:      'test1234!',
    email_confirm: true,
  })
  if (uErr) throw new Error(`user create 실패: ${uErr.message}`)
  testUserId = userRes.user.id
})

afterAll(async () => {
  if (testUserId)   await admin.from('favorites').delete().eq('user_id', testUserId)
  if (testComplexId) await admin.from('complexes').delete().eq('id', testComplexId)
  if (testUserId)   await admin.auth.admin.deleteUser(testUserId)
})

// ── getFavorites ───────────────────────────────────────────────
import { getFavorites, isFavorited } from '@/lib/data/favorites'

describe('getFavorites', () => {
  it('관심단지 없으면 빈 배열 반환', async () => {
    const result = await getFavorites(testUserId, admin)
    expect(result).toEqual([])
  })

  it('insert 후 → 단지 1건 포함, canonical_name·alert_enabled 반환', async () => {
    await admin.from('favorites').insert({ user_id: testUserId, complex_id: testComplexId })

    const result = await getFavorites(testUserId, admin)
    expect(result).toHaveLength(1)
    expect(result[0]!.complex.canonical_name).toBe('테스트관심단지아파트')
    expect(result[0]!.alert_enabled).toBe(true)
  })

  it('alert_enabled 업데이트 반영', async () => {
    await admin
      .from('favorites')
      .update({ alert_enabled: false })
      .eq('user_id', testUserId)
      .eq('complex_id', testComplexId)

    const result = await getFavorites(testUserId, admin)
    expect(result[0]!.alert_enabled).toBe(false)
  })
})

describe('isFavorited', () => {
  it('관심 단지 → true', async () => {
    const result = await isFavorited(testUserId, testComplexId, admin)
    expect(result).toBe(true)
  })

  it('없는 단지 ID → false', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099'
    const result = await isFavorited(testUserId, fakeId, admin)
    expect(result).toBe(false)
  })

  it('delete 후 → false', async () => {
    await admin
      .from('favorites')
      .delete()
      .eq('user_id', testUserId)
      .eq('complex_id', testComplexId)

    const result = await isFavorited(testUserId, testComplexId, admin)
    expect(result).toBe(false)
  })
})

// ── server actions — 비로그인 가드 ──────────────────────────────
import { addFavorite, removeFavorite, toggleFavoriteAlert } from '@/lib/auth/favorite-actions'

describe('addFavorite (no auth)', () => {
  it('비로그인 상태 → error 반환', async () => {
    const result = await addFavorite('00000000-0000-0000-0000-000000000001')
    expect(result.error).toBeTruthy()
  })
})

describe('removeFavorite (no auth)', () => {
  it('비로그인 상태 → error 반환', async () => {
    const result = await removeFavorite('00000000-0000-0000-0000-000000000001')
    expect(result.error).toBeTruthy()
  })
})

describe('toggleFavoriteAlert (no auth)', () => {
  it('비로그인 상태 → error 반환', async () => {
    const result = await toggleFavoriteAlert('00000000-0000-0000-0000-000000000001', true)
    expect(result.error).toBeTruthy()
  })
})
