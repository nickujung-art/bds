import { describe, it, expect } from 'vitest'
import { getSlaState } from '@/components/admin/SlaUtils'

describe('getSlaState (COMM-04)', () => {
  it('생성 후 16h 이내이면 ok를 반환한다', () => {
    const recent = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
    expect(getSlaState(recent)).toBe('ok')
  })

  it('생성 후 16h~24h이면 warning을 반환한다', () => {
    const warn = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    expect(getSlaState(warn)).toBe('warning')
  })

  it('생성 후 24h 초과이면 overdue를 반환한다', () => {
    const overdue = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(getSlaState(overdue)).toBe('overdue')
  })
})
