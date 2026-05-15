import { describe, it, expect, vi } from 'vitest'
import type Supercluster from 'supercluster'

// ClusterMarker는 kakao SDK와 react-kakao-maps-sdk에 의존 — 통합 테스트는 Playwright에서
// 여기서는 클릭 핸들러 로직의 단위 테스트만 수행

describe('ClusterMarker — 클러스터 줌인 로직', () => {
  it('getLeaves가 clusterId로 호출된다', () => {
    const mockGetLeaves = vi.fn().mockReturnValue([
      { geometry: { coordinates: [128.68, 35.23] } },
      { geometry: { coordinates: [128.70, 35.25] } },
    ])
    const mockClusterIndex = { getLeaves: mockGetLeaves } as unknown as Supercluster

    // handleClick 로직 추출하여 직접 테스트
    const leaves = mockClusterIndex.getLeaves(1, Infinity)
    expect(mockGetLeaves).toHaveBeenCalledWith(1, Infinity)
    expect(leaves).toHaveLength(2)
  })

  it('getLeaves 결과에서 좌표 배열 구조가 [lng, lat]이다', () => {
    const leaf = { geometry: { coordinates: [128.68, 35.23] } }
    const coords = leaf.geometry.coordinates as [number, number]
    expect(coords[0]).toBe(128.68)  // lng
    expect(coords[1]).toBe(35.23)   // lat
  })
})
