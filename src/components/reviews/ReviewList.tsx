import type { ComplexReview, ReviewStats } from '@/lib/data/reviews'

interface Props {
  reviews: ComplexReview[]
  stats:   ReviewStats
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span aria-label={`${rating}점`} style={{ lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{
            fontSize: size,
            color: n <= rating ? 'var(--dj-orange)' : 'var(--line-default)',
          }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function formatDate(s: string) {
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function ReviewStats({ stats }: { stats: ReviewStats }) {
  if (!stats.count) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Stars rating={Math.round(stats.avg_rating ?? 0)} size={16} />
      <span
        className="tnum"
        style={{ font: '700 16px/1 var(--font-sans)', color: 'var(--dj-orange)' }}
      >
        {stats.avg_rating?.toFixed(1)}
      </span>
      <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
        ({stats.count}개)
      </span>
    </div>
  )
}

export function ReviewList({ reviews, stats }: Props) {
  if (!reviews.length) {
    return (
      <div
        style={{
          padding: '20px 0',
          font: '500 13px/1.4 var(--font-sans)',
          color: 'var(--fg-tertiary)',
          textAlign: 'center',
        }}
      >
        아직 후기가 없습니다. 첫 번째 후기를 남겨보세요.
      </div>
    )
  }
  return (
    <div>
      <ReviewStats stats={stats} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {reviews.map((r, i) => (
          <div
            key={r.id}
            style={{
              padding: '14px 0',
              borderBottom: i < reviews.length - 1 ? '1px solid var(--line-subtle)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Stars rating={r.rating} size={13} />
              {r.gps_verified && (
                <span
                  style={{
                    font: '500 10px/1 var(--font-sans)',
                    color: '#16a34a',
                    background: '#dcfce7',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  GPS 인증
                </span>
              )}
              <span
                style={{
                  marginLeft: 'auto',
                  font: '500 11px/1 var(--font-sans)',
                  color: 'var(--fg-tertiary)',
                }}
              >
                {formatDate(r.created_at)}
              </span>
            </div>
            <p
              style={{
                font: '500 13px/1.6 var(--font-sans)',
                color: 'var(--fg-pri)',
                margin: 0,
              }}
            >
              {r.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
