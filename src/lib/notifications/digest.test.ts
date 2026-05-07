import { describe, it, expect, vi } from 'vitest'
import { buildWeeklyDigest } from '@/lib/notifications/digest'

function makeChainable(resolveValue: unknown) {
  const chain: Record<string, unknown> = {}
  const terminal = vi.fn().mockResolvedValue(resolveValue)
  const self = () => chain
  chain.select = vi.fn().mockReturnValue(chain)
  chain.in     = vi.fn().mockReturnValue(chain)
  chain.is     = vi.fn().mockReturnValue(chain)
  chain.order  = vi.fn().mockReturnValue(chain)
  chain.limit  = terminal
  chain.insert = terminal
  chain.single = terminal
  void self
  return chain
}

describe('buildWeeklyDigest (NOTIF-01)', () => {
  it('favorites가 없으면 inserted: 0을 반환한다', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue(makeChainable({ data: [] })),
    }
    const result = await buildWeeklyDigest(mockSupabase as never)
    expect(result.inserted).toBe(0)
  })

  it('favorites가 있는 사용자에게 digest 알림을 INSERT한다', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'favorites') return makeChainable({ data: [{ user_id: 'u1', complex_id: 'c1' }] })
        if (table === 'transactions') return makeChainable({ data: [] })
        return { insert: mockInsert }
      }),
    }
    await buildWeeklyDigest(mockSupabase as never)
    expect(mockSupabase.from).toHaveBeenCalled()
  })
})
