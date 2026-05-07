// GPS 검증 테스트 추가 (COMM-02)
import { describe, it, expect, vi } from 'vitest'
import { verifyGpsForReview } from '@/lib/auth/review-actions'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('verifyGpsForReview (COMM-02)', () => {
  it('미로그인 시 gps_verified: false를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)
    const result = await verifyGpsForReview('r1', 'c1', 35.2, 128.7)
    expect(result.gps_verified).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('RPC check_gps_proximity가 true이면 gps_verified: true를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      rpc: vi.fn().mockResolvedValue({ data: true }),
      from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }),
    } as never)
    const result = await verifyGpsForReview('r1', 'c1', 35.2, 128.7)
    expect(result.gps_verified).toBe(true)
  })

  it('RPC check_gps_proximity가 false이면 gps_verified: false를 반환한다', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      rpc: vi.fn().mockResolvedValue({ data: false }),
    } as never)
    const result = await verifyGpsForReview('r1', 'c1', 99.9, 99.9)
    expect(result.gps_verified).toBe(false)
  })
})
