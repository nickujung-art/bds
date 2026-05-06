/**
 * Phase 3 SHARE-03, SHARE-04: 카드뉴스 생성 API
 * RED state: route module not yet implemented (Wave 2)
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

describe('GET /api/cardnews/generate', () => {
  it('비로그인 호출 → 401 Unauthorized', async () => {
    const { GET } = await import('@/app/api/cardnews/generate/route')
    const req = new Request('http://localhost/api/cardnews/generate')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('runtime은 nodejs (Edge runtime은 TTF 4MB 한도 초과)', async () => {
    const mod = await import('@/app/api/cardnews/generate/route')
    expect((mod as { runtime?: string }).runtime).toBe('nodejs')
  })
})
