import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitComment, deleteComment } from '@/lib/auth/comment-actions'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('submitComment (COMM-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('로그인하지 않은 사용자는 에러를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const result = await submitComment({ reviewId: 'r1', complexId: 'c1', content: '테스트 댓글입니다.' })
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('content가 10자 미만이면 에러를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never)
    const result = await submitComment({ reviewId: 'r1', complexId: 'c1', content: '짧음' })
    expect(result.error).toContain('10자 이상')
  })

  it('content가 500자 초과이면 에러를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    } as never)
    const result = await submitComment({ reviewId: 'r1', complexId: 'c1', content: 'a'.repeat(501) })
    expect(result.error).toContain('500자 이하')
  })

  it('정상 제출 시 error: null을 반환한다', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    } as never)
    const result = await submitComment({ reviewId: 'r1', complexId: 'c1', content: '정상적인 댓글 내용입니다.' })
    expect(result.error).toBeNull()
  })
})

describe('deleteComment (COMM-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('미로그인 시 에러를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const result = await deleteComment('cm1', 'c1')
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})
