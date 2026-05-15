'use client'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { useState } from 'react'
import { BadgeMarker } from './markers/BadgeMarker'
import { getPriceColor } from './markers/badge-logic'
import type { BadgeType } from './markers/badge-logic'

interface Props {
  id:               string
  name:             string
  lat:              number
  lng:              number
  avgSalePerPyeong: number | null
  showLabel:        boolean
  badge:            BadgeType
  onSelect:         (id: string) => void
  householdCount:   number | null
}

export function ComplexMarker({
  id, name, lat, lng,
  avgSalePerPyeong, showLabel, badge, onSelect, householdCount,
}: Props) {
  const [hover, setHover] = useState(false)
  const priceColor = getPriceColor(avgSalePerPyeong)

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
          <BadgeMarker badge={badge} priceLabel={showLabel ? avgSalePerPyeong : null} />
        </div>
      </CustomOverlayMap>

      {hover && (
        <CustomOverlayMap position={{ lat, lng }} yAnchor={2.4} zIndex={20}>
          <div
            style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{name}</div>
            {avgSalePerPyeong !== null && (
              <div style={{ color: priceColor, fontWeight: 500 }}>
                {avgSalePerPyeong.toLocaleString()}만원/평
              </div>
            )}
            {householdCount !== null && (
              <div style={{ color: '#6B7280', fontSize: 11 }}>{householdCount.toLocaleString()}세대</div>
            )}
          </div>
        </CustomOverlayMap>
      )}
    </>
  )
}
