'use client'

import { memo } from 'react'
import { CustomOverlayMap, useMap } from 'react-kakao-maps-sdk'
import type Supercluster from 'supercluster'

interface Props {
  lat:          number
  lng:          number
  clusterId:    number
  clusterIndex: Supercluster
}

function formatPrice(price: number): string {
  const eok = Math.floor(price / 10000)
  const man = price % 10000
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`
  if (eok > 0) return `${eok}억`
  return `${price.toLocaleString()}만`
}

export const DongClusterChip = memo(function DongClusterChip({
  lat, lng, clusterId, clusterIndex,
}: Props) {
  const map = useMap('DongClusterChip')

  const leaves = clusterIndex.getLeaves(clusterId, Infinity)

  // 구/동 이름: 첫 번째 leave 기준
  const firstProps = leaves[0]?.properties as {
    gu?: string | null
    dong?: string | null
    recent_price?: number | null
  } | undefined
  const areaName = firstProps?.gu ?? firstProps?.dong ?? '기타'

  // 최근 최고 실거래가
  const maxPrice = leaves.reduce<number | null>((max, leaf) => {
    const p = (leaf.properties as { recent_price?: number | null }).recent_price ?? null
    if (p === null) return max
    return max === null ? p : Math.max(max, p)
  }, null)

  const handleClick = () => {
    const bounds = new window.kakao.maps.LatLngBounds()
    for (const leaf of leaves) {
      const coords = leaf.geometry.coordinates as [number, number]
      bounds.extend(new window.kakao.maps.LatLng(coords[1] ?? 0, coords[0] ?? 0))
    }
    map.setBounds(bounds)
  }

  return (
    <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={0.5} zIndex={5}>
      <div
        onClick={handleClick}
        role="button"
        aria-label={`${areaName} 지역 ${leaves.length}개 단지. 클릭하면 해당 단지들로 확대됩니다`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          minWidth: 80,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
          {areaName}
        </span>
        {maxPrice !== null && (
          <span style={{ fontSize: 11, fontWeight: 500, color: '#F97316', lineHeight: 1.2 }}>
            {formatPrice(maxPrice)}
          </span>
        )}
      </div>
    </CustomOverlayMap>
  )
})
