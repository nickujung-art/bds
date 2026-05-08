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
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'

// ── 환경 변수 (모듈 import 전 설정) ───────────────────────────
const TEST_URL  = 'http://127.0.0.1:54321'
const TEST_AKEY = 'test-anon-key'
const TEST_SKEY = 'test-service-role-key'

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

// ── supabase 모킹 (기본: 비로그인 상태) ───────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
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
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', TEST_URL)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', TEST_AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', TEST_SKEY)
})

// 각 테스트 후 mock 초기화 (mockResolvedValueOnce 큐 누수 방지)
afterEach(() => {
  vi.clearAllMocks()
})

import {
  agreeToTerms,
  deleteAccount,
  reactivateAccount,
} from '@/lib/auth/consent-actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// 비로그인 mock 헬퍼
function mockUnauthenticated() {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>)
}

// 로그인 mock 헬퍼
function mockAuthenticated(userId = 'user-123') {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: userId } } })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>)
}

// ── agreeToTerms ────────────────────────────────────────────────
describe('agreeToTerms', () => {
  it('비로그인 호출 → 로그인이 필요합니다 에러', async () => {
    mockUnauthenticated()
    const fd = new FormData()
    fd.append('terms', 'on')
    fd.append('privacy', 'on')
    const result = await agreeToTerms(fd)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('terms 누락 → 동의 에러 (로그인 상태)', async () => {
    mockAuthenticated()
    const fd = new FormData()
    fd.append('privacy', 'on')
    // terms 누락
    const result = await agreeToTerms(fd)
    expect(result.error).toBe('이용약관과 개인정보처리방침에 모두 동의해야 합니다.')
  })

  it('privacy 누락 → 동의 에러 (로그인 상태)', async () => {
    mockAuthenticated()
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
    mockUnauthenticated()
    const result = await deleteAccount()
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})

// ── reactivateAccount ───────────────────────────────────────────
describe('reactivateAccount', () => {
  it('비로그인 호출 → 로그인이 필요합니다 에러', async () => {
    mockUnauthenticated()
    const result = await reactivateAccount()
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})
