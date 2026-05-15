'use client'

import { memo } from 'react'
import type { BadgeType } from './badge-logic'

export interface HouseMarkerProps {
  badge:       BadgeType
  recentPrice: number | null
  name:        string
}

// 핀 내부용 축약 가격: 1.5억, 12.5억, 9500만
function formatPriceShort(price: number): string {
  if (price >= 10000) {
    const tenths = Math.round(price / 1000)
    return tenths % 10 === 0 ? `${tenths / 10}억` : `${(tenths / 10).toFixed(1)}억`
  }
  return `${Math.round(price / 100) * 100}만`
}

function getColors(badge: BadgeType): { roofColor: string; bodyColor: string } {
  if (badge === 'pre_sale') return { roofColor: '#EF4444', bodyColor: '#EF4444' }
  if (badge === 'new_build') return { roofColor: '#14B8A6', bodyColor: '#14B8A6' }
  return { roofColor: '#9CA3AF', bodyColor: '#F97316' }
}

export const HouseMarker = memo(function HouseMarker({
  badge, recentPrice, name,
}: HouseMarkerProps) {
  const { roofColor, bodyColor } = getColors(badge)

  return (
    <svg
      width="44"
      height="58"
      viewBox="0 0 44 58"
      fill="none"
      aria-label={name}
      style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
    >
      {/* 왕관 (hot만) — y=0~10 영역에 배치, viewBox 안에 있어 클리핑 없음 */}
      {badge === 'hot' && (
        <path
          d="M12,10 L15,4 L19,8 L22,2 L25,8 L29,4 L32,10 Z"
          fill="#FCD34D"
          stroke="#D97706"
          strokeWidth="0.8"
        />
      )}

      {/* 지붕 삼각형 — y=10~28 */}
      <polygon points="0,28 22,10 44,28" fill={roofColor} />

      {/* 바디 — y=28~50 */}
      <rect x="0" y="28" width="44" height="22" fill={bodyColor} />

      {/* 실거래가 (바디 안, 흰색) */}
      {recentPrice !== null && (
        <text
          x="22"
          y="43"
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="white"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {formatPriceShort(recentPrice)}
        </text>
      )}

      {/* 포인터 — y=50~58, 바디와 동색 */}
      <polygon points="14,50 22,58 30,50" fill={bodyColor} />
    </svg>
  )
})
