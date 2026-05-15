'use client'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { memo, useState } from 'react'
import { HouseMarker } from './markers/HouseMarker'
import type { BadgeType } from './markers/badge-logic'

// 1억 기준 포맷: 9,500만 / 1억 5,000만
function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000)
  const man = price % 10000
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`
  if (eok > 0) return `${eok}억`
  return `${price.toLocaleString()}만`
}

interface Props {
  id:               string
  name:             string
  lat:              number
  lng:              number
  showLabel:        boolean
  showName:         boolean        // true면 단지명 표시 (level ≤ 6)
  badge:            BadgeType
  onSelect:         (id: string) => void
  householdCount:   number | null
  // Phase 12 추가 — hover 툴팁 카드
  si:               string | null
  gu:               string | null
  recentPrice:      number | null
  recentDate:       string | null
  recentAreaM2:     number | null
  builtYear:        number | null
}

export const ComplexMarker = memo(function ComplexMarker({
  id, name, lat, lng,
  showLabel, showName, badge, onSelect, householdCount,
  si, gu, recentPrice, recentDate, recentAreaM2, builtYear,
}: Props) {
  const [hover, setHover] = useState(false)

  // HouseMarker에 전달할 가격: showLabel=false면 null (줌 레벨 낮을 때 가격 숨김)
  const displayPrice = showLabel ? recentPrice : null

  // 평수 변환: m² / 3.3058 → X.X평
  const pyeong = recentAreaM2 !== null ? (recentAreaM2 / 3.3058).toFixed(1) : null

  // 시구 조합
  const sigu = [si, gu].filter(Boolean).join(' ')

  return (
    <>
      <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={1.0} zIndex={hover ? 10 : 1}>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => onSelect(id)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          role="button"
          aria-label={`${name} 단지 선택`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(id) }}
        >
          <HouseMarker
            badge={badge}
            recentPrice={displayPrice}
            showName={showName}
            name={name}
          />
        </div>
      </CustomOverlayMap>

      {/* hover 툴팁 카드 (D-02 locked 레이아웃) */}
      {hover && (
        <CustomOverlayMap position={{ lat, lng }} yAnchor={2.4} zIndex={20}>
          <div
            style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              minWidth: 180,
              fontFamily: 'inherit',
            }}
          >
            {/* 상단: 단지명 + 시구 */}
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 1 }}>
              {name}
            </div>
            {sigu && (
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>
                {sigu}
              </div>
            )}

            {/* 중단: 최근 실거래 */}
            {(recentPrice !== null || recentDate !== null || pyeong !== null) && (
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>최근 실거래</div>
                {recentPrice !== null && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {formatPrice(recentPrice)}
                  </div>
                )}
                {recentDate && (
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{recentDate}</div>
                )}
                {pyeong !== null && (
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{pyeong}평</div>
                )}
              </div>
            )}

            {/* 하단: 세대수 · 준공연도 */}
            {(householdCount !== null || builtYear !== null) && (
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 6, fontSize: 11, color: '#6B7280' }}>
                {[
                  householdCount !== null ? `${householdCount.toLocaleString()}세대` : null,
                  builtYear !== null ? `${builtYear}년` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>
        </CustomOverlayMap>
      )}
    </>
  )
})
