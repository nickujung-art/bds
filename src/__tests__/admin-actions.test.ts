/**
 * Phase 3 ADMIN-01, ADMIN-03: 회원 관리 + 신고 처리 Server Action
 * RED state: actions not yet implemented (Wave 2)
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { URL_, SKEY, AKEY } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

const FAKE_ID = '00000000-0000-0000-0000-000000000001'

describe('suspendMember / reactivateMember (no auth)', () => {
  it('suspendMember 비로그인 → error', async () => {
    const { suspendMember } = await import('@/lib/auth/admin-actions')
    const result = await suspendMember(FAKE_ID)
    expect(result.error).toBeTruthy()
  })
  it('reactivateMember 비로그인 → error', async () => {
    const { reactivateMember } = await import('@/lib/auth/admin-actions')
    const result = await reactivateMember(FAKE_ID)
    expect(result.error).toBeTruthy()
  })
})

describe('resolveReport (no auth)', () => {
  it('accepted 비로그인 → error', async () => {
    const { resolveReport } = await import('@/lib/auth/admin-actions')
    const result = await resolveReport(FAKE_ID, 'accepted')
    expect(result.error).toBeTruthy()
  })
  it('rejected 비로그인 → error', async () => {
    const { resolveReport } = await import('@/lib/auth/admin-actions')
    const result = await resolveReport(FAKE_ID, 'rejected')
    expect(result.error).toBeTruthy()
  })
  it('잘못된 action 값 → error', async () => {
    const { resolveReport } = await import('@/lib/auth/admin-actions')
    // @ts-expect-error: invalid action 값 강제 전달
    const result = await resolveReport(FAKE_ID, 'invalid')
    expect(result.error).toBeTruthy()
  })
})
