/**
 * SEC-03 테스트 — getComplexesForMap status='active' 필터 검증
 *
 * TDD Wave 0: RED 상태로 시작
 * - Test 1: .eq('status', 'active') 체인 호출 확인 — RED (구현 전)
 * - Test 2: error 반환 시 throw 확인 — GREEN (기존 동작)
 */
import { describe, it, expect, vi } from 'vitest'
import { getComplexesForMap } from './complexes-map'

vi.mock('server-only', () => ({}))

describe('getComplexesForMap', () => {
  it('Test 1: 호출 시 쿼리에 .eq("status", "active") 체인이 포함되어야 한다', async () => {
    const eqSpy = vi.fn().mockResolvedValue({ data: [], error: null })

    // 체인: from → select → in → not → not → eq
    // 각 메서드는 다음 체이닝 메서드를 반환
    const chainObj = {
      not: vi.fn(),
      eq: eqSpy,
      in: vi.fn(),
    }
    chainObj.not.mockReturnValue(chainObj)
    chainObj.in.mockReturnValue(chainObj)

    const selectSpy = vi.fn().mockReturnValue(chainObj)
    const fromSpy = vi.fn().mockReturnValue({ select: selectSpy })

    const mockSupabase = { from: fromSpy } as unknown as Parameters<typeof getComplexesForMap>[1]

    await getComplexesForMap(['48121'], mockSupabase)

    // 현재 구현에는 .eq('status', 'active')가 없으므로 RED
    expect(eqSpy).toHaveBeenCalledWith('status', 'active')
  })

  it('Test 2: error 반환 시 Error를 throw한다', async () => {
    // eq가 error를 반환 (SEC-03 구현 후 eq가 마지막 체인이 됨)
    const eqSpy = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const chainObj = {
      not: vi.fn(),
      eq: eqSpy,
      in: vi.fn(),
    }
    chainObj.not.mockReturnValue(chainObj)
    chainObj.in.mockReturnValue(chainObj)

    const selectSpy = vi.fn().mockReturnValue(chainObj)
    const fromSpy = vi.fn().mockReturnValue({ select: selectSpy })

    const mockSupabase = { from: fromSpy } as unknown as Parameters<typeof getComplexesForMap>[1]

    // SEC-03 구현 후에는 eq가 마지막 호출 → error throw
    // 현재 구현에서는 not()이 마지막이라 chain을 await하여 [] 반환 → throw 없음
    // 이 테스트는 SEC-03 구현 후 GREEN
    await expect(getComplexesForMap(['48121'], mockSupabase)).rejects.toThrow(
      'getComplexesForMap failed',
    )
  })
})
