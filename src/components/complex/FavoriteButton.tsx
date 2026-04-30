'use client'

import { useState, useTransition } from 'react'
import { addFavorite, removeFavorite } from '@/lib/auth/favorite-actions'

interface Props {
  complexId:        string
  initialFavorited?: boolean
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12v17l-6-4-6 4z" />
    </svg>
  )
}

export function FavoriteButton({ complexId, initialFavorited = false }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      if (favorited) {
        const { error } = await removeFavorite(complexId)
        if (!error) setFavorited(false)
      } else {
        const { error } = await addFavorite(complexId)
        if (error === '로그인이 필요합니다') {
          window.location.href = `/login?next=/complexes/${complexId}`
          return
        }
        if (!error) setFavorited(true)
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`btn btn-md ${favorited ? 'btn-orange' : 'btn-secondary'}`}
      style={{ gap: 6, opacity: isPending ? 0.7 : 1 }}
    >
      <BookmarkIcon filled={favorited} />
      {favorited ? '관심단지 ✓' : '관심단지'}
    </button>
  )
}
