import { formatGap } from '@/lib/format'

interface GapLabelProps {
  gap: number | null
}

function ArrowUp() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="m6 14 6-6 6 6" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="m6 10 6 6 6-6" />
    </svg>
  )
}

export function GapLabel({ gap }: GapLabelProps) {
  if (gap === null || gap === 0) return null

  const absGap = Math.abs(gap)
  const isAbove = gap > 0
  const label = isAbove ? '높음' : '낮음'
  const formattedGap = formatGap(absGap)
  const ariaLabel = `매물 시세 비교: 시세보다 ${formattedGap} ${label}`

  return (
    <span
      className={`badge ${isAbove ? 'neg' : 'pos'}`}
      aria-label={ariaLabel}
      style={{
        height: '22px',
        padding: '0 8px',
        borderRadius: '6px',
        font: '600 11px/1 var(--font-sans)',
        letterSpacing: '0.02em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {isAbove ? <ArrowUp /> : <ArrowDown />}
      시세보다 {formattedGap} {label}
    </span>
  )
}
