import type { CafePostRecord } from '@/lib/data/cafe-posts'

interface Props {
  posts: CafePostRecord[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function CafePostsList({ posts }: Props) {
  if (posts.length === 0) return null

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3
        style={{
          font:   '700 15px/1.4 var(--font-sans)',
          margin: '0 0 4px',
        }}
      >
        카페 이야기
      </h3>
      <p
        style={{
          font:         '500 12px/1.4 var(--font-sans)',
          color:        'var(--fg-tertiary)',
          margin:       '0 0 12px',
        }}
      >
        AI로 단지 연관 글을 수집합니다. 정확도 검증 중인 글은 표시되지 않아요.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {posts.map((post, i) => (
          <li
            key={post.id}
            style={{
              borderBottom: i < posts.length - 1 ? '1px solid var(--line-subtle)' : 'none',
              padding:      '12px 0',
            }}
          >
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                font:           '500 13px/1.5 var(--font-sans)',
                color:          'var(--fg-pri)',
                textDecoration: 'none',
                display:        'block',
                marginBottom:   2,
              }}
            >
              {post.title}
            </a>
            <div
              style={{
                font:  '500 11px/1 var(--font-sans)',
                color: 'var(--fg-tertiary)',
                display: 'flex',
                gap: 8,
              }}
            >
              {post.cafe_name && <span>{post.cafe_name}</span>}
              {post.posted_at && <span>{formatDate(post.posted_at)}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
