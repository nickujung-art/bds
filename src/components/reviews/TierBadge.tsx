// 서버 컴포넌트 (RSC) — 클라이언트 directive 없음
import type { MemberTier } from '@/lib/data/member-tier'

interface TierBadgeProps {
  tier: MemberTier
  cafeVerified: boolean // cafe_nickname IS NOT NULL
  className?: string
}

/**
 * 회원 등급 + 카페 인증 배지.
 * DIFF-01: bronze + cafeVerified=false → null 반환 (빈 공간 예약 없음)
 */
export function TierBadge({ tier, cafeVerified }: TierBadgeProps) {
  const badges: Array<{ emoji: string; bg: string; color: string; label: string }> = []

  if (tier === 'gold') {
    badges.push({
      emoji: '👑',
      bg: 'var(--bg-surface-2)',
      color: 'var(--fg-pri)',
      label: '골드 등급',
    })
  } else if (tier === 'silver') {
    badges.push({
      emoji: '🔥',
      bg: 'var(--bg-surface-2)',
      color: 'var(--fg-sec)',
      label: '실버 등급',
    })
  }

  if (cafeVerified) {
    badges.push({
      emoji: '💬',
      bg: 'var(--bg-positive-tint)',
      color: 'var(--fg-positive)',
      label: '카페 인증',
    })
  }

  if (badges.length === 0) return null

  return (
    <span
      aria-label="회원 등급 배지"
      style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 4 }}
    >
      {badges.map(b => (
        <span
          key={b.emoji}
          aria-label={b.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 18,
            padding: '0 6px',
            borderRadius: 6,
            background: b.bg,
            color: b.color,
            font: '600 10px/1 var(--font-sans)',
            letterSpacing: '0.02em',
          }}
        >
          {b.emoji}
        </span>
      ))}
    </span>
  )
}
