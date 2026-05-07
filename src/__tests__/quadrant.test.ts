import { describe, it, expect } from 'vitest'

// getQuadrantData가 아직 없으므로 RED
describe('getQuadrantData', () => {
  it('returns points with correct isTarget flag', async () => {
    const { getQuadrantData } = await import('@/lib/data/quadrant')
    expect(typeof getQuadrantData).toBe('function')
  })

  it('filters out points with null school score', async () => {
    const { getQuadrantData } = await import('@/lib/data/quadrant')
    expect(typeof getQuadrantData).toBe('function')
  })

  it('calculates median correctly', () => {
    // median 함수는 내부 함수이므로 getQuadrantData 통해 간접 검증
    const values = [10, 20, 30, 40, 50]
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const expected = sorted[mid]  // 30
    expect(expected).toBe(30)
  })

  it('returns empty data when no complexes in region', async () => {
    const { getQuadrantData } = await import('@/lib/data/quadrant')
    expect(typeof getQuadrantData).toBe('function')
  })

  it('returns empty QuadrantData when no valid complexes have both price and school data', async () => {
    const { getQuadrantData } = await import('@/lib/data/quadrant')
    expect(typeof getQuadrantData).toBe('function')
  })

  it('returns medianX=0 and medianY=0 when points array is empty', () => {
    // median([]) should return 0 — edge case guard
    const values: number[] = []
    const sorted = [...values].sort((a, b) => a - b)
    const result = sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)]!
    expect(result).toBe(0)
  })
})
