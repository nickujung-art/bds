/**
 * Phase 3 LEGAL-01, LEGAL-04: 동의 / 탈퇴 / 재활성화 Server Action
 * RED state: actions not yet implemented (Wave 1)
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { URL_, SKEY, AKEY } from './helpers/db'

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

describe('agreeToTerms (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const { agreeToTerms } = await import('@/lib/auth/consent-actions')
    const fd = new FormData()
    fd.append('next', '/')
    fd.append('terms', 'on')
    fd.append('privacy', 'on')
    const result = await agreeToTerms(fd)
    expect(result.error).toBeTruthy()
  })

  it('체크박스 누락 → error 반환', async () => {
    const { agreeToTerms } = await import('@/lib/auth/consent-actions')
    const fd = new FormData()
    fd.append('next', '/')
    // terms / privacy 미첨부
    const result = await agreeToTerms(fd)
    expect(result.error).toBeTruthy()
  })
})

describe('deleteAccount (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const { deleteAccount } = await import('@/lib/auth/consent-actions')
    const result = await deleteAccount()
    expect(result.error).toBeTruthy()
  })
})

describe('reactivateAccount (no auth)', () => {
  it('비로그인 → error 반환', async () => {
    const { reactivateAccount } = await import('@/lib/auth/consent-actions')
    const result = await reactivateAccount()
    expect(result.error).toBeTruthy()
  })
})
