'use client'

import { Map, useKakaoLoader } from 'react-kakao-maps-sdk'
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
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY!,
    libraries: ['services'],
  })
  const [clusters, setClusters] = useState<ClusterFeature[]>([])

  const handleIdle = useCallback(
    (map: kakao.maps.Map) => {
      const bounds = map.getBounds()
      const sw = bounds.getSouthWest()
      const ne = bounds.getNorthEast()
      // kakao level: 1=가장 확대, 14=가장 축소 → supercluster zoom 역변환
      // 카카오 level 1 → zoom 19, level 14 → zoom 6 (maxZoom 16 초과 시 개별 핀 표시)
      const zoom = Math.max(0, 20 - map.getLevel())
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

  if (loading) return (
    <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
      카카오 지도 로딩 중…
    </div>
  )
  if (error) return (
    <div className="flex h-full items-center justify-center bg-red-50 text-sm text-red-500 flex-col gap-2 p-4 text-center">
      <span>카카오 지도 SDK 로드 실패</span>
      <span className="text-xs text-gray-400">{String(error)}</span>
      <span className="text-xs text-gray-400">NEXT_PUBLIC_KAKAO_JS_KEY가 올바르게 설정되어 있는지, Kakao 콘솔에서 해당 도메인이 등록되어 있는지 확인하세요.</span>
    </div>
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
