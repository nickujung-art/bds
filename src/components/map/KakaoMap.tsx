'use client'

import { Map } from 'react-kakao-maps-sdk'
import { useCallback, useState } from 'react'
import { clusterComplexes, type ComplexMapItem, type ClusterFeature } from '@/lib/data/complexes-map'
import { ComplexMarker } from './ComplexMarker'
import { ClusterMarker } from './ClusterMarker'

interface Props {
  complexes: ComplexMapItem[]
  initialCenter?: { lat: number; lng: number }
  initialLevel?: number
}

// 창원·김해 중심 좌표
const DEFAULT_CENTER = { lat: 35.2278, lng: 128.6817 }
const DEFAULT_LEVEL  = 8

export function KakaoMap({ complexes, initialCenter = DEFAULT_CENTER, initialLevel = DEFAULT_LEVEL }: Props) {
  const [clusters, setClusters] = useState<ClusterFeature[]>([])

  const handleIdle = useCallback(
    (map: kakao.maps.Map) => {
      const bounds = map.getBounds()
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      // kakao level: 1=가장 확대, 14=가장 축소 → supercluster zoom 역변환
      const zoom = Math.max(0, Math.min(14 - map.getLevel(), 17))
      setClusters(
        clusterComplexes(
          complexes,
          [sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()],
          zoom,
        ),
      )
    },
    [complexes],
  )

  return (
    <Map
      center={initialCenter}
      level={initialLevel}
      className="h-full w-full"
      onIdle={handleIdle}
      onTileLoaded={handleIdle}
    >
      {clusters.map((feature, i) => {
        const lng = feature.geometry.coordinates[0] ?? 0
        const lat = feature.geometry.coordinates[1] ?? 0
        if (feature.properties.cluster) {
          return (
            <ClusterMarker
              key={`cluster-${feature.properties.cluster_id ?? i}`}
              lat={lat}
              lng={lng}
              count={feature.properties.point_count as number}
            />
          )
        }
        return (
          <ComplexMarker
            key={feature.properties.id as string}
            id={feature.properties.id as string}
            name={feature.properties.name as string}
            lat={lat}
            lng={lng}
          />
        )
      })}
    </Map>
  )
}
