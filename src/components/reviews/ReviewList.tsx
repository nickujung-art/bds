import type { ReviewStats } from '@/lib/data/reviews'
import type { ReviewWithComments } from '@/lib/data/comments'
import { CommentSection } from './CommentSection'

interface Props {
  reviews: ReviewWithComments[]
  stats:   ReviewStats
  currentUserId?: string | null
  complexName?: string
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

function CafeLink({ complexName }: { complexName: string }) {
  const href = `https://cafe.naver.com/ArticleSearchList.nhn?search.query=${encodeURIComponent(complexName)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`네이버 카페에서 ${complexName} 이웃 글 보기 (새 탭에서 열림)`}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            4,
        padding:        '8px 0 12px',
        font:           '500 11px/1 var(--font-sans)',
        color:          'var(--fg-brand)',
        textDecoration: 'none',
        borderBottom:   '1px solid var(--line-subtle)',
        marginBottom:   12,
        width:          '100%',
      }}
    >
      네이버 카페에서 {complexName} 이웃 글 보기 ↗
    </a>
  )
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

export function ReviewList({ reviews, stats, currentUserId, complexName }: Props) {
  if (!reviews.length) {
    return (
      <div>
        {complexName && <CafeLink complexName={complexName} />}
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
      </div>
    )
  }
  return (
    <div>
      {complexName && <CafeLink complexName={complexName} />}
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
                  aria-label="GPS 위치 인증 완료된 후기"
                  style={{
                    font: '500 10px/1 var(--font-sans)',
                    color: 'var(--fg-positive)',
                    background: 'var(--bg-positive-tint)',
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
            <CommentSection
              reviewId={r.id}
              complexId={r.complex_id}
              initialComments={r.comments ?? []}
              currentUserId={currentUserId}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
