import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('react-kakao-maps-sdk', () => ({
  CustomOverlayMap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ setBounds: vi.fn() }),
}))

const makeClusterIndex = (
  leaves: Array<{ gu?: string | null; dong?: string | null; recent_price?: number | null }>,
) => ({
  getLeaves: () =>
    leaves.map((l, i) => ({
      geometry: { coordinates: [128.6 + i * 0.01, 35.2 + i * 0.01] },
      properties: { id: `id-${i}`, name: `단지${i}`, cluster: false, ...l },
    })),
})

import { DongClusterChip } from './DongClusterChip'

describe('DongClusterChip', () => {
  test('gu와 recent_price가 있으면 구 이름과 가격을 표시한다', () => {
    const clusterIndex = makeClusterIndex([{ gu: '성산구', recent_price: 125000 }])
    render(
      <DongClusterChip
        lat={35.2}
        lng={128.6}
        clusterId={1}
        clusterIndex={clusterIndex as never}
      />,
    )
    expect(screen.getByText('성산구')).toBeTruthy()
    expect(screen.getByText('12억 5,000만')).toBeTruthy()
  })

  test('gu가 null이고 dong이 있으면 dong 이름을 표시한다', () => {
    const clusterIndex = makeClusterIndex([{ gu: null, dong: '상남동', recent_price: 85000 }])
    render(
      <DongClusterChip
        lat={35.2}
        lng={128.6}
        clusterId={2}
        clusterIndex={clusterIndex as never}
      />,
    )
    expect(screen.getByText('상남동')).toBeTruthy()
    expect(screen.getByText('8억 5,000만')).toBeTruthy()
  })

  test('recent_price가 null이면 가격을 표시하지 않는다', () => {
    const clusterIndex = makeClusterIndex([{ gu: '의창구', recent_price: null }])
    render(
      <DongClusterChip
        lat={35.2}
        lng={128.6}
        clusterId={3}
        clusterIndex={clusterIndex as never}
      />,
    )
    expect(screen.getByText('의창구')).toBeTruthy()
    // 가격 없음 — 억/만 텍스트가 없어야 함
    expect(screen.queryByText(/억|만/)).toBeNull()
  })

  test('여러 leaves 중 최대 recent_price가 표시된다', () => {
    const clusterIndex = makeClusterIndex([
      { gu: '성산구', recent_price: 50000 },
      { gu: '성산구', recent_price: 130000 },
      { gu: '성산구', recent_price: 90000 },
    ])
    render(
      <DongClusterChip
        lat={35.2}
        lng={128.6}
        clusterId={4}
        clusterIndex={clusterIndex as never}
      />,
    )
    // 13억 (130000 = 13억, man=0이므로 '13억'만 표시)
    expect(screen.getByText('13억')).toBeTruthy()
  })

  test('gu와 dong이 모두 null이면 기타를 표시한다', () => {
    const clusterIndex = makeClusterIndex([{ gu: null, dong: null, recent_price: null }])
    render(
      <DongClusterChip
        lat={35.2}
        lng={128.6}
        clusterId={5}
        clusterIndex={clusterIndex as never}
      />,
    )
    expect(screen.getByText('기타')).toBeTruthy()
  })
})
