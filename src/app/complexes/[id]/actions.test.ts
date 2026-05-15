import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/readonly', () => ({
  createReadonlyClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}))

import { incrementViewCount } from './actions'
import { createReadonlyClient } from '@/lib/supabase/readonly'

describe('incrementViewCount — view_count Server Action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('유효한 complexId로 호출 시 supabase.rpc를 호출한다', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.mocked(createReadonlyClient).mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createReadonlyClient>)

    await incrementViewCount('550e8400-e29b-41d4-a716-446655440000')

    expect(mockRpc).toHaveBeenCalledWith('increment_view_count', {
      p_complex_id: '550e8400-e29b-41d4-a716-446655440000',
    })
  })

  it('rpc 오류가 발생해도 throw하지 않는다', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } })
    vi.mocked(createReadonlyClient).mockReturnValue({ rpc: mockRpc } as unknown as ReturnType<typeof createReadonlyClient>)

    // Server Action은 에러를 throw하지 않고 반환
    await expect(incrementViewCount('test-id')).resolves.toBeUndefined()
  })
})
