/**
 * DIFF-01 — TierBadge 컴포넌트: cafeVerified 💬 마크
 * RED: 구현 없음 → 실패 예상
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('TierBadge', () => {
  it('cafeVerified=true → 💬 마크 렌더', async () => {
    const { getTierBadge } = await import('@/lib/data/member-tier')
    const result = getTierBadge({ tier: 'bronze', cafeVerified: true })
    expect(result).toContain('💬')
  })

  it('cafeVerified=false, tier=bronze → 마크 없음', async () => {
    const { getTierBadge } = await import('@/lib/data/member-tier')
    const result = getTierBadge({ tier: 'bronze', cafeVerified: false })
    expect(result).toBe('')
  })

  it('tier=silver, cafeVerified=false → 🔥 마크', async () => {
    const { getTierBadge } = await import('@/lib/data/member-tier')
    const result = getTierBadge({ tier: 'silver', cafeVerified: false })
    expect(result).toContain('🔥')
  })

  it('tier=gold, cafeVerified=false → 👑 마크', async () => {
    const { getTierBadge } = await import('@/lib/data/member-tier')
    const result = getTierBadge({ tier: 'gold', cafeVerified: false })
    expect(result).toContain('👑')
  })

  it('tier=gold, cafeVerified=true → 👑 + 💬 둘 다 포함', async () => {
    const { getTierBadge } = await import('@/lib/data/member-tier')
    const result = getTierBadge({ tier: 'gold', cafeVerified: true })
    expect(result).toContain('👑')
    expect(result).toContain('💬')
  })
})
