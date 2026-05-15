import { describe, it, expect } from 'vitest'
import { determineBadge } from '@/components/map/markers/badge-logic'

const BASE: Parameters<typeof determineBadge>[0] = {
  status:       'active',
  built_year:   2010,
  tx_count_30d: 0,
  p95_tx_count: 10,
}

describe('determineBadge — Phase 12 배지 3종', () => {
  it('status=pre_sale이면 pre_sale 배지를 반환한다', () => {
    expect(determineBadge({ ...BASE, status: 'pre_sale' })).toBe('pre_sale')
  })

  it('built_year >= 2021이면 new_build 배지를 반환한다', () => {
    expect(determineBadge({ ...BASE, built_year: 2022 })).toBe('new_build')
  })

  it('pre_sale이 new_build보다 높은 우선순위를 가진다', () => {
    expect(determineBadge({ ...BASE, status: 'pre_sale', built_year: 2023 })).toBe('pre_sale')
  })

  it('tx_count_30d >= p95_tx_count이면 hot을 반환한다', () => {
    expect(determineBadge({ ...BASE, tx_count_30d: 10, p95_tx_count: 10 })).toBe('hot')
  })

  it('p95_tx_count = 0이면 hot을 부여하지 않는다', () => {
    expect(determineBadge({ ...BASE, tx_count_30d: 0, p95_tx_count: 0 })).toBe('none')
  })

  it('모든 조건 불충족 시 none을 반환한다', () => {
    expect(determineBadge(BASE)).toBe('none')
  })
})
