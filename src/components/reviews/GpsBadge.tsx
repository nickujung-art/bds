interface GpsBadgeProps {
  level: 0 | 1 | 2 | 3
}

const BADGE_CONFIG = {
  0: null,
  1: { label: '방문인증', className: 'badge neutral' },
  2: { label: '거주인증', className: 'badge pos' },
  3: { label: '소유자인증', className: 'badge orange' },
} as const

export function GpsBadge({ level }: GpsBadgeProps) {
  const config = BADGE_CONFIG[level]
  if (!config) return null

  return (
    <span className={config.className} aria-label={`GPS 인증 배지: ${config.label}`}>
      {config.label}
    </span>
  )
}
