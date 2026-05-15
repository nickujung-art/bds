'use client'

import { CustomOverlayMap, useMap } from 'react-kakao-maps-sdk'
import type Supercluster from 'supercluster'

interface Props {
  lat:          number
  lng:          number
  count:        number
  clusterId:    number
  clusterIndex: Supercluster
}

export function ClusterMarker({ lat, lng, count, clusterId, clusterIndex }: Props) {
  const map = useMap('ClusterMarker')
  const size = count > 100 ? 44 : count > 20 ? 38 : 32

  const handleClick = () => {
    const leaves = clusterIndex.getLeaves(clusterId, Infinity)
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
        aria-label={`${count}개 단지 클러스터. 클릭하면 해당 단지들로 확대됩니다`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        className="flex items-center justify-center rounded-full bg-blue-700 text-white font-semibold shadow-md cursor-pointer select-none"
        style={{ width: size, height: size, fontSize: count > 99 ? 10 : 12 }}
      >
        {count > 999 ? '999+' : count}
      </div>
    </CustomOverlayMap>
  )
}
