import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { HouseMarker } from './HouseMarker'

// ── Test 1: badge='none' → 오렌지 색상 (#F97316)
test('badge none일 때 오렌지 색상(#F97316) SVG가 렌더된다', () => {
  const { container } = render(
    <HouseMarker badge="none" recentPrice={null} showName={false} name="테스트 단지" />
  )
  const svgContent = container.innerHTML
  expect(svgContent).toContain('F97316')
})

// ── Test 2: badge='pre_sale' → 빨강 (#EF4444)
test('badge pre_sale일 때 빨간 색상(#EF4444) 요소가 렌더된다', () => {
  const { container } = render(
    <HouseMarker badge="pre_sale" recentPrice={null} showName={false} name="분양 단지" />
  )
  const svgContent = container.innerHTML
  expect(svgContent).toContain('EF4444')
})

// ── Test 3: badge='new_build' → 민트 (#14B8A6)
test('badge new_build일 때 민트 색상(#14B8A6) 요소가 렌더된다', () => {
  const { container } = render(
    <HouseMarker badge="new_build" recentPrice={null} showName={false} name="신축 단지" />
  )
  const svgContent = container.innerHTML
  expect(svgContent).toContain('14B8A6')
})

// ── Test 4: badge='hot' → 왕관 path (fill='#FCD34D')
test('badge hot일 때 왕관 path(fill=#FCD34D)가 렌더된다', () => {
  const { container } = render(
    <HouseMarker badge="hot" recentPrice={null} showName={false} name="핫 단지" />
  )
  const svgContent = container.innerHTML
  expect(svgContent).toContain('FCD34D')
})

// ── Test 5: recentPrice=95000 → '9억 5,000만' 텍스트
test('recentPrice=95000일 때 "9억 5,000만" 텍스트가 렌더된다', () => {
  render(
    <HouseMarker badge="none" recentPrice={95000} showName={false} name="테스트 단지" />
  )
  expect(screen.getByText('9억 5,000만')).toBeTruthy()
})

// ── Test 6: recentPrice=null → 가격 텍스트 없음
test('recentPrice=null일 때 가격 텍스트가 없다', () => {
  const { container } = render(
    <HouseMarker badge="none" recentPrice={null} showName={false} name="테스트 단지" />
  )
  // 가격 관련 텍스트가 없어야 함 (억/만 텍스트)
  expect(container.querySelector('[data-testid="price-label"]')).toBeNull()
})

// ── Test 7: showName=true → name 텍스트가 렌더된다
test('showName=true일 때 단지명이 렌더된다', () => {
  render(
    <HouseMarker badge="none" recentPrice={null} showName={true} name="용지아이파크" />
  )
  expect(screen.getByText('용지아이파크')).toBeTruthy()
})

// ── Test 8: showName=false → name 텍스트가 없다
test('showName=false일 때 단지명이 없다', () => {
  const { container } = render(
    <HouseMarker badge="none" recentPrice={null} showName={false} name="용지아이파크" />
  )
  // 단지명 텍스트가 렌더되지 않아야 함
  const nameEl = container.querySelector('[data-testid="complex-name"]')
  expect(nameEl).toBeNull()
})
