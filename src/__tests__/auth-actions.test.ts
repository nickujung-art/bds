/**
 * Step8 수용 기준 테스트 — Supabase Auth Server Actions
 *
 * - signInWithEmail: 이메일 검증 (빈값·형식 오류 → 에러 반환)
 * - signOut: 정상 반환
 * - auth callback route: code 없음 → /login redirect
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { URL_, AKEY } from './helpers/db'

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

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
})

import { signInWithEmail, signOut } from '@/lib/auth/actions'

// ── signInWithEmail ─────────────────────────────────────────
describe('signInWithEmail', () => {
  it('빈 이메일 → error 반환', async () => {
    const result = await signInWithEmail('')
    expect(result.error).toBeTruthy()
  })

  it('공백만 → error 반환', async () => {
    const result = await signInWithEmail('   ')
    expect(result.error).toBeTruthy()
  })

  it('이메일 형식 아닌 값 → error 반환', async () => {
    const result = await signInWithEmail('notanemail')
    expect(result.error).toBeTruthy()
  })

  it('유효한 이메일 → ok or supabase error (API 호출 시도)', async () => {
    // 로컬 Supabase가 실행 중이면 실제 OTP 전송 시도 (Inbucket으로 감)
    // 네트워크 없이 실행되면 error 반환 — 어느 쪽이든 throws 하지 않음
    const result = await signInWithEmail('test@example.com')
    expect(result).toHaveProperty('error')  // error: null | string
  })
})

// ── signOut ─────────────────────────────────────────────────
describe('signOut', () => {
  it('/ 로 redirect (Next.js redirect는 throw로 구현)', async () => {
    await expect(signOut()).rejects.toThrow('REDIRECT:/')
  })
})

// ── auth callback route ──────────────────────────────────────
describe('GET /auth/callback', () => {
  it('code 없이 호출 → /login으로 redirect', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const req = new Request('http://localhost/auth/callback')
    await expect(GET(req)).rejects.toThrow('REDIRECT:/login')
  })
})
