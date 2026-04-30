import { describe, it, expect, vi, beforeEach } from 'vitest'

// 환경변수 모킹
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
})

// server.ts — next/headers 의존으로 직접 테스트 불가 (통합 테스트에서 검증)
describe('Supabase 클라이언트 설정', () => {
  it('admin 클라이언트: env var 누락 시 에러 throw', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    // server-only 모킹 (테스트 환경에서 import 가능하도록)
    vi.mock('server-only', () => ({}))

    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    expect(() => createSupabaseAdminClient()).toThrow('Supabase admin env vars missing')
  })

  it('admin 클라이언트: 정상 env var로 생성 성공', async () => {
    vi.mock('server-only', () => ({}))
    const { createSupabaseAdminClient } = await import('@/lib/supabase/admin')
    expect(() => createSupabaseAdminClient()).not.toThrow()
  })
})
