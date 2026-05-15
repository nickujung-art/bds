import { describe, it, expect, vi } from 'vitest'
import { getComplexesForMap } from './complexes-map'

vi.mock('server-only', () => ({}))

describe('getComplexesForMap', () => {
  it('Test 1: 호출 시 쿼리에 .neq("status", "demolished") 체인이 포함되어야 한다', async () => {
    const neqSpy = vi.fn().mockResolvedValue({ data: [], error: null })

    // 체인: from → select → in → not → not → neq
    const chainObj = {
      not:  vi.fn(),
      neq:  neqSpy,
      in:   vi.fn(),
    }
    chainObj.not.mockReturnValue(chainObj)
    chainObj.in.mockReturnValue(chainObj)

    const selectSpy = vi.fn().mockReturnValue(chainObj)
    const fromSpy   = vi.fn().mockReturnValue({ select: selectSpy })

    const mockSupabase = { from: fromSpy } as unknown as Parameters<typeof getComplexesForMap>[1]

    await getComplexesForMap(['48121'], mockSupabase)

    expect(neqSpy).toHaveBeenCalledWith('status', 'demolished')
  })

  it('Test 2: error 반환 시 Error를 throw한다', async () => {
    const neqSpy = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const chainObj = {
      not:  vi.fn(),
      neq:  neqSpy,
      in:   vi.fn(),
    }
    chainObj.not.mockReturnValue(chainObj)
    chainObj.in.mockReturnValue(chainObj)

    const selectSpy = vi.fn().mockReturnValue(chainObj)
    const fromSpy   = vi.fn().mockReturnValue({ select: selectSpy })

    const mockSupabase = { from: fromSpy } as unknown as Parameters<typeof getComplexesForMap>[1]

    await expect(getComplexesForMap(['48121'], mockSupabase)).rejects.toThrow(
      'getComplexesForMap failed',
    )
  })
})
