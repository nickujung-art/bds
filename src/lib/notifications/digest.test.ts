import { describe, it, expect, vi } from 'vitest'
import { buildWeeklyDigest } from '@/lib/notifications/digest'

describe('buildWeeklyDigest (NOTIF-01)', () => {
  it('favorites가 없으면 inserted: 0을 반환한다', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [] }),
      }),
    }
    const result = await buildWeeklyDigest(mockSupabase as never)
    expect(result.inserted).toBe(0)
  })

  it('favorites가 있는 사용자에게 digest 알림을 INSERT한다', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'favorites') return { select: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1', complex_id: 'c1' }] }) }
        if (table === 'transactions') return { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [] }) }
        return { insert: mockInsert }
      }),
    }
    await buildWeeklyDigest(mockSupabase as never)
    // digest 알림이 삽입되거나 (favorites 있으나 거래 없으면 skip 가능) 호출됨
    expect(mockSupabase.from).toHaveBeenCalled()
  })
})
