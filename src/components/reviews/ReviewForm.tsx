'use client'

import { useState, useTransition } from 'react'
import { submitReview } from '@/lib/auth/review-actions'

interface Props {
  complexId: string
  onSuccess?: () => void
}

const LABELS = ['', '별로예요', '그저 그래요', '보통이에요', '좋아요', '최고예요']

export function ReviewForm({ complexId, onSuccess }: Props) {
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [content, setContent]   = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('평점을 선택해주세요.'); return }
    setError(null)
    startTransition(async () => {
      const result = await submitReview({ complexId, content, rating })
      if (result.error) {
        setError(result.error)
      } else {
        setRating(0)
        setContent('')
        onSuccess?.()
      }
    })
  }

  const display = hovered || rating

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Star selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(n)}
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                color: n <= display ? 'var(--dj-orange)' : 'var(--line-default)',
                fontSize: 22,
                lineHeight: 1,
              }}
              aria-label={`${n}점`}
            >
              ★
            </button>
          ))}
        </div>
        {display > 0 && (
          <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
            {LABELS[display]}
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="이 단지에 살거나 살았던 경험을 공유해주세요. (10자 이상)"
        maxLength={500}
        rows={3}
        className="input"
        style={{ resize: 'vertical', font: '500 13px/1.55 var(--font-sans)', padding: '8px 10px' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            font: '500 11px/1 var(--font-sans)',
            color: content.length < 10 ? '#dc2626' : 'var(--fg-tertiary)',
          }}
        >
          {content.length}/500
        </span>
        {error && (
          <span style={{ font: '500 12px/1 var(--font-sans)', color: '#dc2626', flex: 1, textAlign: 'center' }}>
            {error}
          </span>
        )}
        <button
          type="submit"
          className="btn btn-sm btn-orange"
          disabled={pending}
          style={{ flexShrink: 0 }}
        >
          {pending ? '등록 중…' : '후기 등록'}
        </button>
      </div>
    </form>
  )
}
