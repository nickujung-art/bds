import { describe, it, expect } from 'vitest'
import { determineBadge, getPriceColor } from '@/components/map/markers/badge-logic'

const BASE: Parameters<typeof determineBadge>[0] = {
  status:           'active',
  built_year:       2010,
  view_count:       0,
  price_change_30d: null,
  hagwon_grade:     null,
  household_count:  500,
  tx_count_30d:     0,
  p95_view_count:   100,
  p95_tx_count:     10,
}

describe('determineBadge — 배지 우선순위', () => {
  it('status=pre_sale이면 pre_sale 배지를 반환한다', () => {
    expect(determineBadge({ ...BASE, status: 'pre_sale' })).toBe('pre_sale')
  })

  it('built_year >= 2021이면 new_build 배지를 반환한다', () => {
    expect(determineBadge({ ...BASE, built_year: 2022 })).toBe('new_build')
  })

  it('pre_sale이 new_build보다 높은 우선순위를 가진다', () => {
    expect(determineBadge({ ...BASE, status: 'pre_sale', built_year: 2023 })).toBe('pre_sale')
  })

  it('tx_count_30d >= p95_tx_count이면 crown을 반환한다', () => {
    expect(determineBadge({ ...BASE, tx_count_30d: 10, p95_tx_count: 10 })).toBe('crown')
  })

  it('p95_tx_count = 0이면 crown을 부여하지 않는다', () => {
    expect(determineBadge({ ...BASE, tx_count_30d: 0, p95_tx_count: 0 })).toBe('none')
  })

  it('view_count >= p95_view_count이면 hot을 반환한다', () => {
    expect(determineBadge({ ...BASE, view_count: 100, p95_view_count: 100 })).toBe('hot')
  })

  it('price_change_30d > 0.05이면 surge를 반환한다', () => {
    expect(determineBadge({ ...BASE, price_change_30d: 0.06 })).toBe('surge')
  })

  it('price_change_30d < -0.05이면 drop을 반환한다', () => {
    expect(determineBadge({ ...BASE, price_change_30d: -0.06 })).toBe('drop')
  })

  it('hagwon_grade=A+이면 school을 반환한다', () => {
    expect(determineBadge({ ...BASE, hagwon_grade: 'A+' })).toBe('school')
  })

  it('household_count >= 1000이면 large_complex를 반환한다', () => {
    expect(determineBadge({ ...BASE, household_count: 1000 })).toBe('large_complex')
  })

  it('status=in_redevelopment이면 redevelop을 반환한다', () => {
    expect(determineBadge({ ...BASE, status: 'in_redevelopment' })).toBe('redevelop')
  })

  it('모든 조건 불충족 시 none을 반환한다', () => {
    expect(determineBadge(BASE)).toBe('none')
  })
})

describe('getPriceColor', () => {
  it('null → gray', () => { expect(getPriceColor(null)).toBe('#6B7280') })
  it('700 → emerald', () => { expect(getPriceColor(700)).toBe('#10B981') })
  it('1200 → amber', () => { expect(getPriceColor(1200)).toBe('#F59E0B') })
  it('2000 → red', () => { expect(getPriceColor(2000)).toBe('#EF4444') })
})
