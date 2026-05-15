import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('react-kakao-maps-sdk', () => ({
  CustomOverlayMap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ setBounds: vi.fn() }),
}))

import { DongClusterChip } from './DongClusterChip'

const base = {
  lat:        35.2,
  lng:        128.6,
  memberLats: [35.2, 35.21],
  memberLngs: [128.6, 128.61],
}

describe('DongClusterChip', () => {
  test('gu 이름과 최고 실거래가를 표시한다', () => {
    render(<DongClusterChip {...base} gu="성산구" maxPrice={125000} />)
    expect(screen.getByText('성산구')).toBeTruthy()
    expect(screen.getByText('12억 5,000만')).toBeTruthy()
  })

  test('maxPrice가 null이면 가격을 표시하지 않는다', () => {
    render(<DongClusterChip {...base} gu="의창구" maxPrice={null} />)
    expect(screen.getByText('의창구')).toBeTruthy()
    expect(screen.queryByText(/억|만/)).toBeNull()
  })

  test('maxPrice가 정억수이면 "13억"만 표시한다', () => {
    render(<DongClusterChip {...base} gu="성산구" maxPrice={130000} />)
    expect(screen.getByText('13억')).toBeTruthy()
  })

  test('"기타" gu 이름이 표시된다', () => {
    render(<DongClusterChip {...base} gu="기타" maxPrice={null} />)
    expect(screen.getByText('기타')).toBeTruthy()
  })

  test('8억 5,000만 가격이 올바르게 포맷된다', () => {
    render(<DongClusterChip {...base} gu="마산회원구" maxPrice={85000} />)
    expect(screen.getByText('8억 5,000만')).toBeTruthy()
  })
})
