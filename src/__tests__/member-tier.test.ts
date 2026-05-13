/**
 * DIFF-01, DIFF-05 — 회원 등급 + 활동 포인트
 * RED: 구현 없음 → 실패 예상
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

describe('member tier', () => {
  it('getMemberTier: 0점 → bronze 반환', async () => {
    const { getMemberTier } = await import('@/lib/data/member-tier')
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { activity_points: 0, member_tier: 'bronze' },
        error: null,
      }),
    }
    const result = await getMemberTier('user-1', mockSupabase as never)
    expect(result.tier).toBe('bronze')
    expect(result.points).toBe(0)
  })

  it('getMemberTier: 50점 → silver 반환', async () => {
    const { getMemberTier } = await import('@/lib/data/member-tier')
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { activity_points: 50, member_tier: 'silver' },
        error: null,
      }),
    }
    const result = await getMemberTier('user-1', mockSupabase as never)
    expect(result.tier).toBe('silver')
  })

  it('getMemberTier: 200점 → gold 반환', async () => {
    const { getMemberTier } = await import('@/lib/data/member-tier')
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { activity_points: 200, member_tier: 'gold' },
        error: null,
      }),
    }
    const result = await getMemberTier('user-1', mockSupabase as never)
    expect(result.tier).toBe('gold')
  })

  it('member tier priority: gold → 즉시 알림(딜레이 0)', async () => {
    const { getNotificationDelay } = await import('@/lib/data/member-tier')
    expect(getNotificationDelay('gold')).toBe(0)
  })

  it('member tier priority: silver → 30분 딜레이(ms)', async () => {
    const { getNotificationDelay } = await import('@/lib/data/member-tier')
    expect(getNotificationDelay('silver')).toBe(30 * 60 * 1000)
  })

  it('member tier priority: bronze → 30분 딜레이(ms)', async () => {
    const { getNotificationDelay } = await import('@/lib/data/member-tier')
    expect(getNotificationDelay('bronze')).toBe(30 * 60 * 1000)
  })
})
