'use client'

import { memo } from 'react'
import type { BadgeType } from './badge-logic'

export interface HouseMarkerProps {
  badge:       BadgeType
  recentPrice: number | null
  name:        string
}

// 핀 바디 안에 표시할 축약 가격
function formatPriceShort(price: number): string {
  if (price >= 10000) {
    const tenths = Math.round(price / 1000)
    return tenths % 10 === 0 ? `${tenths / 10}억` : `${(tenths / 10).toFixed(1)}억`
  }
  return `${Math.round(price / 100) * 100}만`
}

function getBodyColor(badge: BadgeType): string {
  if (badge === 'pre_sale') return '#EF4444'
  if (badge === 'new_build') return '#14B8A6'
  return '#F97316'
}

export const HouseMarker = memo(function HouseMarker({
  badge, recentPrice, name,
}: HouseMarkerProps) {
  const bodyColor = getBodyColor(badge)

  return (
    // 외부 div: 고정 44×58px, 왕관은 bottom: 100%로 위에 절대 위치
    <div style={{ position: 'relative', width: 44, height: 58 }} aria-label={name}>

      {/* 왕관 — hot 배지만, 핀 SVG 위에 절대 배치 */}
      {badge === 'hot' && (
        <svg
          width="22"
          height="11"
          viewBox="0 0 22 11"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'block',
            marginBottom: 1,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
          }}
        >
          <path
            d="M0,11 L3.5,4 L8,8.5 L11,0 L14,8.5 L18.5,4 L22,11 Z"
            fill="#FCD34D"
            stroke="#D97706"
            strokeWidth="0.8"
          />
        </svg>
      )}

      {/* 핀 SVG: 바디 먼저 렌더 후 지붕 선을 위에 렌더 */}
      <svg
        width="44"
        height="58"
        viewBox="0 0 44 58"
        fill="none"
        style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
      >
        {/* 바디 */}
        <rect x="0" y="28" width="44" height="22" fill={bodyColor} />

        {/* 포인터 */}
        <polygon points="14,50 22,58 30,50" fill={bodyColor} />

        {/* 지붕: 열린 V선 (하단 연결선 없음), 끝 라운드, 회색 굵은 선 */}
        <path
          d="M0,28 L22,10 L44,28"
          stroke="#9CA3AF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* 가격 HTML 오버레이 — SVG text 대신 HTML로 렌더링 신뢰도 향상 */}
      {recentPrice !== null && (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 0,
            right: 0,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: 'white',
            pointerEvents: 'none',
            lineHeight: 1,
            letterSpacing: '-0.2px',
          }}
        >
          {formatPriceShort(recentPrice)}
        </div>
      )}
    </div>
  )
})
