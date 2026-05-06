/**
 * SEC-02 테스트 — createSupabaseAdminClient 팩토리 함수 검증
 *
 * TDD Wave 0: 팩토리 계약 검증
 * - Test 1: env vars 존재 시 SupabaseClient 반환 (GREEN — 이미 구현됨)
 * - Test 2: URL 미설정 시 Error throw (GREEN — 이미 구현됨)
 * - Test 3: KEY 미설정 시 Error throw (GREEN — 이미 구현됨)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.unstubAllEnvs()
})

describe('createSupabaseAdminClient', () => {
  it('Test 1: env vars 존재 시 SupabaseClient(.from 메서드)를 반환한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { createSupabaseAdminClient } = await import('./admin')
    const client = createSupabaseAdminClient()

    expect(client).toBeTruthy()
    expect(typeof client.from).toBe('function')
  })

  it('Test 2: NEXT_PUBLIC_SUPABASE_URL 미설정 시 Error를 throw한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { createSupabaseAdminClient } = await import('./admin')
    expect(() => createSupabaseAdminClient()).toThrow()
  })

  it('Test 3: SUPABASE_SERVICE_ROLE_KEY 미설정 시 Error를 throw한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    const { createSupabaseAdminClient } = await import('./admin')
    expect(() => createSupabaseAdminClient()).toThrow()
  })
})
