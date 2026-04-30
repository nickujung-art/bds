'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { FavoriteItem } from '@/lib/data/favorites'
import { removeFavorite, toggleFavoriteAlert } from '@/lib/auth/favorite-actions'

interface Props {
  favorites: FavoriteItem[]
}

function BookmarkFillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h12v17l-6-4-6 4z" />
    </svg>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-label={checked ? '알림 끄기' : '알림 켜기'}
      style={{
        display: 'inline-flex',
        width: 40,
        height: 24,
        borderRadius: 999,
        background: checked ? 'var(--dj-orange)' : 'var(--color-cool-90)',
        position: 'relative',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 160ms',
        padding: 0,
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: '#fff',
          transition: 'left 160ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

export function FavoritesTable({ favorites: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const handleRemove = (complexId: string) => {
    startTransition(async () => {
      const { error } = await removeFavorite(complexId)
      if (!error) {
        setItems((prev) => prev.filter((f) => f.complex_id !== complexId))
      }
    })
  }

  const handleToggleAlert = (complexId: string, current: boolean) => {
    startTransition(async () => {
      const { error } = await toggleFavoriteAlert(complexId, !current)
      if (!error) {
        setItems((prev) =>
          prev.map((f) =>
            f.complex_id === complexId ? { ...f, alert_enabled: !current } : f,
          ),
        )
      }
    })
  }

  if (items.length === 0) return null

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--line-default)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          font: '500 14px/1.4 var(--font-sans)',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--bg-surface-2)',
              font: '600 12px/1 var(--font-sans)',
              color: 'var(--fg-sec)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <th style={{ textAlign: 'left', padding: '14px 20px' }}>단지</th>
            <th style={{ textAlign: 'left', padding: '14px 20px' }}>위치</th>
            <th style={{ textAlign: 'center', padding: '14px 20px' }}>알림</th>
            <th style={{ textAlign: 'right', padding: '14px 20px' }}>알림 기준</th>
            <th style={{ textAlign: 'center', padding: '14px 20px' }}>삭제</th>
          </tr>
        </thead>
        <tbody>
          {items.map((fav) => {
            const loc = [fav.complex.si, fav.complex.gu, fav.complex.dong]
              .filter(Boolean)
              .join(' ')
            return (
              <tr
                key={fav.id}
                style={{ borderTop: '1px solid var(--line-subtle)' }}
              >
                <td style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--dj-orange)' }}>
                      <BookmarkFillIcon />
                    </span>
                    <Link
                      href={`/complexes/${fav.complex_id}`}
                      style={{
                        font: '700 14px/1.3 var(--font-sans)',
                        color: 'var(--fg-pri)',
                        textDecoration: 'none',
                      }}
                    >
                      {fav.complex.canonical_name}
                    </Link>
                  </div>
                </td>
                <td
                  style={{
                    padding: '18px 20px',
                    font: '500 13px/1 var(--font-sans)',
                    color: 'var(--fg-sec)',
                  }}
                >
                  {loc || '-'}
                </td>
                <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                  <ToggleSwitch
                    checked={fav.alert_enabled}
                    onChange={() => handleToggleAlert(fav.complex_id, fav.alert_enabled)}
                    disabled={isPending}
                  />
                </td>
                <td
                  style={{
                    padding: '18px 20px',
                    textAlign: 'right',
                    font: '500 13px/1 var(--font-sans)',
                    color: 'var(--fg-sec)',
                  }}
                  className="tnum"
                >
                  ±3%
                </td>
                <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleRemove(fav.complex_id)}
                    disabled={isPending}
                    style={{
                      color: 'var(--fg-tertiary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      font: '500 12px/1 var(--font-sans)',
                      padding: '4px 8px',
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color =
                        'var(--fg-negative)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLButtonElement).style.color =
                        'var(--fg-tertiary)'
                    }}
                    aria-label="관심단지 삭제"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
