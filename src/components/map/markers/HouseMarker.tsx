'use client'

import { memo } from 'react'
import type { BadgeType } from './badge-logic'

export interface HouseMarkerProps {
  badge:       BadgeType     // 색상 결정 + 왕관 오버레이
  recentPrice: number | null // 만원 단위 — null이면 숨김
  showName:    boolean       // true면 단지명 표시
  name:        string
}

// 1억 기준 포맷: 9,500만 / 1억 5,000만
function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000)
  const man = price % 10000
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`
  if (eok > 0) return `${eok}억`
  return `${price.toLocaleString()}만`
}

// 마커 색상 결정
function getColors(badge: BadgeType): { roofColor: string; bodyColor: string } {
  if (badge === 'pre_sale') return { roofColor: '#EF4444', bodyColor: '#EF4444' }
  if (badge === 'new_build') return { roofColor: '#14B8A6', bodyColor: '#14B8A6' }
  // hot / none → 오렌지 바디, 회색 지붕
  return { roofColor: '#9CA3AF', bodyColor: '#F97316' }
}

export const HouseMarker = memo(function HouseMarker({
  badge, recentPrice, showName, name,
}: HouseMarkerProps) {
  const { roofColor, bodyColor } = getColors(badge)

  const ariaLabel =
    badge === 'pre_sale' ? `${name} — 분양` :
    badge === 'new_build' ? `${name} — 신축` :
    badge === 'hot' ? `${name} — 거래활발` :
    `${name} — 단지`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 집 모양 SVG — viewBox 0 0 40 48 */}
      <svg
        width="40"
        height="48"
        viewBox="0 0 40 48"
        fill="none"
        aria-label={ariaLabel}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* hot 왕관: 지붕 위 — badge=hot일 때만 */}
        {badge === 'hot' && (
          <g transform="translate(10, -8)">
            <path
              d="M0,8 L4,2 L8,6 L12,0 L16,6 L20,2 L20,8 Z"
              fill="#FCD34D"
              stroke="#D97706"
              strokeWidth="0.5"
            />
          </g>
        )}

        {/* 굴뚝: 지붕 왼쪽 위 작은 돌기 */}
        <rect
          x="26"
          y="2"
          width="6"
          height="8"
          rx="1"
          fill={roofColor}
        />

        {/* 지붕 삼각형 */}
        <polygon
          points="4,22 20,6 36,22"
          fill={roofColor}
        />

        {/* 바디: C형 (오른쪽 약간 열린 형태) */}
        <path
          d="M8 22 L8 44 L28 44 L28 22 Z"
          fill={bodyColor}
        />
        {/* 오른쪽 개구부 — 흰색으로 덮어 C형 연출 */}
        <rect x="28" y="22" width="8" height="22" fill="white" />
      </svg>

      {/* 실거래가 라벨 */}
      {recentPrice !== null && (
        <div
          data-testid="price-label"
          style={{
            marginTop: 2,
            padding: '1px 4px',
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            color: bodyColor,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
            lineHeight: 1.3,
          }}
        >
          {formatPrice(recentPrice)}
        </div>
      )}

      {/* 단지명 */}
      {showName && (
        <div
          data-testid="complex-name"
          style={{
            marginTop: 1,
            fontSize: 11,
            fontWeight: 500,
            color: '#374151',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
      )}
    </div>
  )
})
