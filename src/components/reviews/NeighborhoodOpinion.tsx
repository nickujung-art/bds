'use client'

import { useState, useEffect } from 'react'
import type { ReviewStats } from '@/lib/data/reviews'
import type { ReviewWithComments } from '@/lib/data/comments'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { ReviewList } from './ReviewList'
import { ReviewForm } from './ReviewForm'

interface Props {
  complexId:      string
  complexName?:   string
  initialReviews: ReviewWithComments[]
  initialStats:   ReviewStats
}

export function NeighborhoodOpinion({ complexId, complexName, initialReviews, initialStats }: Props) {
  const [showForm, setShowForm]       = useState(false)
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const loginUrl = `/login?next=/complexes/${complexId}`

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--dj-orange)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1 1 2 2 2 0-3-1-5 1-8z" />
            </svg>
          </span>
          <h3 style={{ font: '700 15px/1.4 var(--font-sans)', margin: 0 }}>
            동네 의견
          </h3>
        </div>

        {isLoggedIn ? (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowForm(v => !v)}
            style={{ fontSize: 12 }}
          >
            {showForm ? '취소' : '후기 쓰기'}
          </button>
        ) : (
          <a
            href={loginUrl}
            className="btn btn-sm btn-secondary"
            style={{ textDecoration: 'none', fontSize: 12 }}
          >
            로그인 후 작성
          </a>
        )}
      </div>

      {showForm && (
        <div
          style={{
            padding: '14px 0',
            borderBottom: '1px solid var(--line-subtle)',
            marginBottom: 4,
          }}
        >
          <ReviewForm
            complexId={complexId}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      )}

      <ReviewList
        reviews={initialReviews}
        stats={initialStats}
        currentUserId={currentUserId}
        complexName={complexName}
      />
    </div>
  )
}
