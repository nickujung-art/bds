import { describe, it, expect, vi } from 'vitest'
import { upsertNotificationTopic, deleteNotificationTopic } from '@/lib/auth/topic-actions'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

describe('upsertNotificationTopic (NOTIF-02)', () => {
  it('미로그인 시 에러를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const result = await upsertNotificationTopic('high_price')
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('정상 호출 시 error: null을 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as never)
    const result = await upsertNotificationTopic('high_price')
    expect(result.error).toBeNull()
  })
})

describe('deleteNotificationTopic (NOTIF-02)', () => {
  it('미로그인 시 에러를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const result = await deleteNotificationTopic('high_price')
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})
