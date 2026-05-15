'use client'

import { Map, useKakaoLoader } from 'react-kakao-maps-sdk'
import { useCallback, useMemo, useState } from 'react'
import {
  buildClusterIndex,
  type ComplexMapItem,
  type ClusterFeature,
} from '@/lib/data/complexes-map'
import { determineBadge } from '@/components/map/markers/badge-logic'
import { ComplexMarker } from './ComplexMarker'
import { ClusterMarker } from './ClusterMarker'
import { MapSidePanel } from './MapSidePanel'

interface Props {
  complexes:      ComplexMapItem[]
  initialCenter?: { lat: number; lng: number }
  initialLevel?:  number
}

// 창원·김해 중심 좌표
const DEFAULT_CENTER = { lat: 35.2278, lng: 128.6817 }
const DEFAULT_LEVEL  = 8

export function KakaoMap({
  complexes,
  initialCenter = DEFAULT_CENTER,
  initialLevel  = DEFAULT_LEVEL,
}: Props) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY!,
    libraries: ['services'],
  })
  const [clusters,          setClusters]         = useState<ClusterFeature[]>([])
  const [mapLevel,          setMapLevel]          = useState<number>(DEFAULT_LEVEL)
  // selectedComplexId: MapSidePanel에 전달
  const [selectedComplexId, setSelectedComplexId] = useState<string | null>(null)

  // Supercluster 인덱스는 complexes가 바뀔 때만 재생성
  const clusterIndex = useMemo(() => buildClusterIndex(complexes), [complexes])

  // p95 기준값 계산 (클라이언트 1회 — 배지 계산에 사용)
  const p95TxCount = useMemo(() => {
    if (complexes.length === 0) return 0
    const txCounts = [...complexes].map((c) => c.tx_count_30d).sort((a, b) => a - b)
    const p95Idx   = Math.floor(complexes.length * 0.95)
    return txCounts[p95Idx] ?? 0
  }, [complexes])

  // 줌 레벨 7 이하에서 평당가 라벨 표시 (카카오 레벨 — 숫자 클수록 축소)
  const showLabel = mapLevel <= 7

  const computeClusters = useCallback(
    (map: kakao.maps.Map) => {
      setMapLevel(map.getLevel())
      const bounds = map.getBounds()
      const sw     = bounds.getSouthWest()
      const ne     = bounds.getNorthEast()
      // kakao level: 1=가장 확대, 14=가장 축소 → supercluster zoom 역변환
      const zoom   = Math.max(0, 20 - map.getLevel())
      setClusters(
        clusterIndex.getClusters(
          [sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()],
          zoom,
        ),
      )
    },
    [clusterIndex],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        카카오 지도 로딩 중…
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-red-50 text-sm text-red-500 flex-col gap-2 p-4 text-center">
        <span>카카오 지도 SDK 로드 실패</span>
        <span className="text-xs text-gray-400">{String(error)}</span>
        <span className="text-xs text-gray-400">NEXT_PUBLIC_KAKAO_JS_KEY가 올바르게 설정되어 있는지, Kakao 콘솔에서 해당 도메인이 등록되어 있는지 확인하세요.</span>
      </div>
    )
  }

  return (
    <>
      <Map
        center={initialCenter}
        level={initialLevel}
        className="h-full w-full"
        onCreate={computeClusters}
        onIdle={computeClusters}
        onTileLoaded={computeClusters}
      >
        {clusters.map((feature, i) => {
          const lng = feature.geometry.coordinates[0] ?? 0
          const lat = feature.geometry.coordinates[1] ?? 0

          if (feature.properties.cluster) {
            return (
              <ClusterMarker
                key={`cluster-${(feature.properties.cluster_id as number | undefined) ?? i}`}
                lat={lat}
                lng={lng}
                count={feature.properties.point_count as number}
                clusterId={feature.properties.cluster_id as number}
                clusterIndex={clusterIndex}
              />
            )
          }

          const props = feature.properties as {
            id:                  string
            name:                string
            avg_sale_per_pyeong: number | null
            view_count:          number
            price_change_30d:    number | null
            tx_count_30d:        number
            status:              string
            built_year:          number | null
            household_count:     number | null
            hagwon_grade:        string | null
          }

          const badge = determineBadge({
            status:       props.status       ?? 'active',
            built_year:   props.built_year   ?? null,
            tx_count_30d: props.tx_count_30d ?? 0,
            p95_tx_count: p95TxCount,
          })

          return (
            <ComplexMarker
              key={props.id}
              id={props.id}
              name={props.name}
              lat={lat}
              lng={lng}
              avgSalePerPyeong={props.avg_sale_per_pyeong ?? null}
              showLabel={showLabel}
              badge={badge}
              onSelect={setSelectedComplexId}
              householdCount={props.household_count ?? null}
            />
          )
        })}
      </Map>
      <MapSidePanel
        selectedComplexId={selectedComplexId}
        onClose={() => setSelectedComplexId(null)}
      />
    </>
  )
}
