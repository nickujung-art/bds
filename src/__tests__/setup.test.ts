import { describe, it, expect } from 'vitest'

describe('프로젝트 설정', () => {
  it('TypeScript 환경 정상', () => {
    const arr: number[] = [1, 2, 3]
    // noUncheckedIndexedAccess: arr[0]은 number | undefined
    const first: number | undefined = arr[0]
    expect(first).toBe(1)
  })

  it('CSS 토큰 상수 확인', () => {
    const tokens = {
      orange: '#ea580c',
      canvas: '#F7F7F8',
    } as const
    expect(tokens.orange).toBe('#ea580c')
  })
})
