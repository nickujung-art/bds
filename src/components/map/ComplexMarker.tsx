'use client'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { HouseMarker } from './markers/HouseMarker'
import type { BadgeType } from './markers/badge-logic'

function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000)
  const man = price % 10000
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`
  if (eok > 0) return `${eok}억`
  return `${price.toLocaleString()}만`
}

interface Props {
  id:             string
  name:           string
  lat:            number
  lng:            number
  badge:          BadgeType
  onSelect:       (id: string) => void
  householdCount: number | null
  si:             string | null
  gu:             string | null
  recentPrice:    number | null
  recentDate:     string | null
  recentAreaM2:   number | null
  builtYear:      number | null
}

export const ComplexMarker = memo(function ComplexMarker({
  id, name, lat, lng,
  badge, onSelect, householdCount,
  si, gu, recentPrice, recentDate, recentAreaM2, builtYear,
}: Props) {
  const [hover, setHover] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
    setHover(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHover(false), 150)
  }, [])

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }, [])

  const pyeong = recentAreaM2 !== null ? (recentAreaM2 / 3.3058).toFixed(1) : null
  const sigu = [si, gu].filter(Boolean).join(' ')

  return (
    <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={1.0} zIndex={hover ? 10 : 1}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        {/* hover 툴팁: 핀 바로 위에 절대 위치 */}
        {hover && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 6,
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              minWidth: 180,
              zIndex: 100,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 1 }}>
              {name}
            </div>
            {sigu && (
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>
                {sigu}
              </div>
            )}

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
        )}

        {/* 핀 */}
        <div
          onClick={() => onSelect(id)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          role="button"
          aria-label={`${name} 단지 선택`}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(id) }}
        >
          <HouseMarker badge={badge} recentPrice={recentPrice} name={name} />
        </div>
      </div>
    </CustomOverlayMap>
  )
})
