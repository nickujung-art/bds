/**
 * LEGAL-01 / LEGAL-04 수용 기준 테스트 — consent-actions.ts Server Actions
 *
 * - agreeToTerms: 비로그인 → error, 체크박스 누락 → error
 * - deleteAccount: 비로그인 → error
 * - reactivateAccount: 비로그인 → error
 *
 * RLS 우회 (RESEARCH.md Pitfall 2):
 *   profiles.update 정책에 `with check (role in ('user'))` 포함 →
 *   모든 profiles UPDATE는 createSupabaseAdminClient() 경유 필수.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { URL_, AKEY } from './helpers/db'

// ── Next.js 서버 모듈 모킹 ─────────────────────────────────────
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set:    vi.fn(),
  })),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ── 비로그인 상태 모킹: getUser() → null ──────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
})

import {
  agreeToTerms,
  deleteAccount,
  reactivateAccount,
} from '@/lib/auth/consent-actions'

// ── agreeToTerms ────────────────────────────────────────────────
describe('agreeToTerms', () => {
  it('비로그인 호출 → 로그인이 필요합니다 에러', async () => {
    const fd = new FormData()
    fd.append('terms', 'on')
    fd.append('privacy', 'on')
    const result = await agreeToTerms(fd)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('terms 누락 → 동의 에러', async () => {
    // 임시로 로그인 상태로 변경하여 체크박스 검증 테스트
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
    } as ReturnType<typeof createSupabaseServerClient>)

    const fd = new FormData()
    fd.append('privacy', 'on')
    // terms 누락
    const result = await agreeToTerms(fd)
    expect(result.error).toBe('이용약관과 개인정보처리방침에 모두 동의해야 합니다.')
  })

  it('privacy 누락 → 동의 에러', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
    } as ReturnType<typeof createSupabaseServerClient>)

    const fd = new FormData()
    fd.append('terms', 'on')
    // privacy 누락
    const result = await agreeToTerms(fd)
    expect(result.error).toBe('이용약관과 개인정보처리방침에 모두 동의해야 합니다.')
  })
})

// ── deleteAccount ───────────────────────────────────────────────
describe('deleteAccount', () => {
  it('비로그인 호출 → 로그인이 필요합니다 에러', async () => {
    const result = await deleteAccount()
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})

// ── reactivateAccount ───────────────────────────────────────────
describe('reactivateAccount', () => {
  it('비로그인 호출 → 로그인이 필요합니다 에러', async () => {
    const result = await reactivateAccount()
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})
