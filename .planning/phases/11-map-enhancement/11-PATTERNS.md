# Phase 11: 지도 고도화 - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 10 (신규/수정 대상)
**Analogs found:** 10 / 10

---

## File Classification

| 신규/수정 파일 | Role | Data Flow | Closest Analog | Match Quality |
|----------------|------|-----------|----------------|---------------|
| `src/components/map/ComplexMarker.tsx` | component | event-driven | `src/components/complex/AiChatPanel.tsx` | role-match (슬라이드 패널 + SVG 아이콘 패턴) |
| `src/components/map/ClusterMarker.tsx` | component | event-driven | `src/components/map/ClusterMarker.tsx` (자기 자신, 확장) | exact |
| `src/components/map/KakaoMap.tsx` | component | event-driven | `src/components/map/KakaoMap.tsx` (자기 자신, 확장) | exact |
| `src/components/map/MapView.tsx` | component | request-response | `src/components/map/MapView.tsx` (자기 자신, 확장) | exact |
| `src/components/map/MapSidePanel.tsx` | component | request-response | `src/components/complex/AiChatPanel.tsx` | exact (고정 패널 + fetch + 슬라이드인) |
| `src/components/map/markers/BadgeMarker.tsx` | component | event-driven | `src/components/map/ClusterMarker.tsx` | role-match (CustomOverlayMap + SVG) |
| `src/components/map/markers/badge-logic.ts` | utility | transform | `src/lib/data/member-tier.ts` (티어 판단 순수 함수) | role-match |
| `src/lib/data/complexes-map.ts` | service | CRUD | `src/lib/data/complexes-map.ts` (자기 자신, 확장) | exact |
| `src/app/api/complexes/[id]/map-panel/route.ts` | route | request-response | `src/app/api/health/route.ts` + `src/app/api/admin/gps-approve/route.ts` | role-match |
| `supabase/migrations/YYYYMMDD_map_enhancement.sql` | migration | CRUD | `supabase/migrations/20260514000003_facility_edu.sql` | exact |

---

## Pattern Assignments

### `src/components/map/ClusterMarker.tsx` (component, event-driven) — 수정

**Analog:** `src/components/map/ClusterMarker.tsx` (기존 파일 — 확장)

**현재 파일** (`src/components/map/ClusterMarker.tsx` lines 1-24):
```typescript
'use client'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'

interface Props {
  lat:   number
  lng:   number
  count: number
}

export function ClusterMarker({ lat, lng, count }: Props) {
  const size = count > 100 ? 44 : count > 20 ? 38 : 32

  return (
    <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={0.5}>
      <div
        className="flex items-center justify-center rounded-full bg-blue-700 text-white font-semibold shadow-md cursor-pointer select-none"
        style={{ width: size, height: size, fontSize: count > 99 ? 10 : 12 }}
      >
        {count > 999 ? '999+' : count}
      </div>
    </CustomOverlayMap>
  )
}
```

**추가할 패턴 — useMap + onClick 줌인** (RESEARCH.md Pattern 1):
```typescript
// 추가 import
import { CustomOverlayMap, useMap } from 'react-kakao-maps-sdk'
import type Supercluster from 'supercluster'

// Props 확장
interface Props {
  lat:          number
  lng:          number
  count:        number
  clusterId:    number           // feature.properties.cluster_id
  clusterIndex: Supercluster    // KakaoMap에서 prop으로 전달
}

// handleClick — useMap()은 Map children 안에서만 유효
const map = useMap('ClusterMarker')

const handleClick = () => {
  const leaves = clusterIndex.getLeaves(clusterId, Infinity)
  const bounds = new kakao.maps.LatLngBounds()
  for (const leaf of leaves) {
    const [lngLeaf, latLeaf] = leaf.geometry.coordinates as [number, number]
    bounds.extend(new kakao.maps.LatLng(latLeaf ?? 0, lngLeaf ?? 0))
  }
  map.setBounds(bounds)
}
```

**KakaoMap.tsx에서 prop 전달 위치** (`src/components/map/KakaoMap.tsx` lines 70-76):
```typescript
<ClusterMarker
  key={`cluster-${feature.properties.cluster_id ?? i}`}
  lat={lat}
  lng={lng}
  count={feature.properties.point_count as number}
  // 추가
  clusterId={feature.properties.cluster_id as number}
  clusterIndex={clusterIndex}
/>
```

---

### `src/components/map/ComplexMarker.tsx` (component, event-driven) — 수정

**Analog:** `src/components/map/ComplexMarker.tsx` (기존 파일) + `src/components/map/ClusterMarker.tsx` (CustomOverlayMap 패턴)

**현재 파일 — MapMarker 방식** (`src/components/map/ComplexMarker.tsx` lines 1-35):
```typescript
'use client'

import { MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  id:   string
  name: string
  lat:  number
  lng:  number
}

export function ComplexMarker({ id, name, lat, lng }: Props) {
  const router  = useRouter()
  const [hover, setHover] = useState(false)

  return (
    <>
      <MapMarker
        position={{ lat, lng }}
        onClick={() => router.push(`/complexes/${id}`)}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
      />
      {hover && (
        <CustomOverlayMap position={{ lat, lng }} yAnchor={2.2}>
          <div className="rounded bg-white px-2 py-1 text-xs font-medium shadow-md ring-1 ring-gray-200 whitespace-nowrap">
            {name}
          </div>
        </CustomOverlayMap>
      )}
    </>
  )
}
```

**변경 방향 — CustomOverlayMap + SVG 마커로 전환** (RESEARCH.md Pattern 2):
```typescript
// MapMarker 제거, CustomOverlayMap 단일화
// Props 확장 — ComplexMapItem 필드 추가
interface Props {
  id:                  string
  name:                string
  lat:                 number
  lng:                 number
  avgSalePerPyeong:    number | null   // 평당가 라벨
  showLabel:           boolean         // 줌 레벨 7 이하 시 true
  badge:               BadgeType       // determineBadge() 결과
  onSelect:            (id: string) => void  // 사이드 패널 열기 (router.push 대신)
}

// CustomOverlayMap 단일 사용
<CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={1.0}>
  <div
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    onClick={() => onSelect(id)}
    style={{ cursor: 'pointer' }}
  >
    <BadgeMarker badge={badge} priceLabel={showLabel ? avgSalePerPyeong : null} />
  </div>
</CustomOverlayMap>
```

**hover 미리보기 카드 패턴** (기존 ComplexMarker lines 27-33 참조, 확장):
```typescript
// hover 카드 — CustomOverlayMap yAnchor={2.2} 그대로 유지
{hover && (
  <CustomOverlayMap position={{ lat, lng }} yAnchor={2.2}>
    <div className="rounded bg-white px-2 py-1 text-xs font-medium shadow-md ring-1 ring-gray-200 whitespace-nowrap">
      <div>{name}</div>
      {avgSalePerPyeong && (
        <div style={{ color: getPriceColor(avgSalePerPyeong) }}>
          {avgSalePerPyeong.toLocaleString()}만원/평
        </div>
      )}
    </div>
  </CustomOverlayMap>
)}
```

---

### `src/components/map/KakaoMap.tsx` (component, event-driven) — 수정

**Analog:** `src/components/map/KakaoMap.tsx` (기존 파일 — 확장)

**기존 상태 관리 패턴** (lines 19-41):
```typescript
'use client'

import { Map, useKakaoLoader } from 'react-kakao-maps-sdk'
import { useCallback, useMemo, useState } from 'react'

const [clusters, setClusters] = useState<ClusterFeature[]>([])
const clusterIndex = useMemo(() => buildClusterIndex(complexes), [complexes])

const computeClusters = useCallback(
  (map: kakao.maps.Map) => {
    const bounds = map.getBounds()
    const sw = bounds.getSouthWest()
    const ne = bounds.getNorthEast()
    const zoom = Math.max(0, 20 - map.getLevel())
    setClusters(
      clusterIndex.getClusters([sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()], zoom),
    )
  },
  [clusterIndex],
)
```

**추가할 상태** (selectedComplexId + mapLevel):
```typescript
// 선택 상태 — MapSidePanel 연동
const [selectedComplexId, setSelectedComplexId] = useState<string | null>(null)

// 줌 레벨 상태 — 평당가 라벨 on/off
const [mapLevel, setMapLevel] = useState(DEFAULT_LEVEL)

// computeClusters 확장 — map.getLevel() 추출
const computeClusters = useCallback(
  (map: kakao.maps.Map) => {
    setMapLevel(map.getLevel())   // 추가
    const bounds = map.getBounds()
    // ... 기존 코드 그대로
  },
  [clusterIndex],
)

// showLabel — 카카오 레벨 7 이하에서 평당가 표시
const showLabel = mapLevel <= 7

// p95 계산 (클라이언트에서 1회 — useMemo)
const { p95ViewCount, p95TxCount } = useMemo(() => {
  const viewCounts = complexes.map(c => c.view_count ?? 0).sort((a, b) => a - b)
  const txCounts = complexes.map(c => c.tx_count_30d ?? 0).sort((a, b) => a - b)
  const p95Idx = Math.floor(viewCounts.length * 0.95)
  return {
    p95ViewCount: viewCounts[p95Idx] ?? 0,
    p95TxCount:   txCounts[p95Idx] ?? 0,
  }
}, [complexes])
```

**MapSidePanel 통합** (Map 컴포넌트 바깥에 배치 — Map children에 넣으면 안 됨):
```typescript
return (
  <>
    <Map ...>
      {clusters.map((feature, i) => {
        // ... 기존 ClusterMarker / ComplexMarker 렌더링
        // ComplexMarker에 onSelect={setSelectedComplexId} prop 추가
      })}
    </Map>
    <MapSidePanel
      selectedComplexId={selectedComplexId}
      onClose={() => setSelectedComplexId(null)}
    />
  </>
)
```

---

### `src/components/map/MapView.tsx` (component, request-response) — 수정

**Analog:** `src/components/map/MapView.tsx` (기존 파일 — 최소 수정)

**기존 패턴** (lines 1-38):
```typescript
'use client'

import dynamic from 'next/dynamic'
import type { ComplexMapItem } from '@/lib/data/complexes-map'

// SSR 비활성화 — kakao 글로벌 객체는 브라우저에서만 존재
const KakaoMap = dynamic(
  () => import('./KakaoMap').then((m) => m.KakaoMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        지도 불러오는 중…
      </div>
    ),
  },
)

export function MapView({ complexes }: Props) {
  // NEXT_PUBLIC_KAKAO_JS_KEY 없으면 에러 표시
  return (
    <div className="relative h-full w-full">
      <KakaoMap complexes={complexes} />
    </div>
  )
}
```

**변경 사항 — MapSidePanel 추가는 KakaoMap 내부에서 처리하므로 MapView 변경 최소화**.
MapSidePanel이 KakaoMap 내부에 위치하면 MapView.tsx 변경 불필요. KakaoMap이 선택 상태를 직접 관리.

---

### `src/components/map/MapSidePanel.tsx` (component, request-response) — 신규

**Analog:** `src/components/complex/AiChatPanel.tsx` (lines 65-463)

**AiChatPanel의 슬라이드인 패널 패턴** (lines 247-268):
```typescript
// position: fixed + right: 0 + translateX 슬라이드인
<div
  role="dialog"
  aria-label="패널 제목"
  aria-modal="true"
  style={{
    position: 'fixed',
    top: 0,
    right: 0,
    width: 'min(400px, 100vw)',
    height: '100vh',
    zIndex: 200,
    background: 'var(--bg-surface)',
    borderLeft: '1px solid var(--line-default)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    transform: 'translateX(0)',
    transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
  }}
>
```

**AiChatPanel의 헤더 패턴** (lines 269-303):
```typescript
<div
  style={{
    height: '60px',
    padding: '0 20px',
    borderBottom: '1px solid var(--line-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  }}
>
  <span style={{ font: '700 15px/1.4 var(--font-sans)', color: 'var(--fg-pri)' }}>
    패널 제목
  </span>
  <button
    className="btn btn-ghost btn-icon"
    onClick={onClose}
    aria-label="패널 닫기"
  >
    <XIcon />
  </button>
</div>
```

**AiChatPanel의 fetch 패턴** (lines 123-130):
```typescript
// 'use client' 컴포넌트에서 API Route로 데이터 fetch
const res = await fetch('/api/chat/complex', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ complexId, messages }),
})
if (!res.ok || !res.body) throw new Error('fetch failed')
```

**MapSidePanel용 fetch 패턴** (RESEARCH.md Pattern 3):
```typescript
'use client'

import { useState, useEffect } from 'react'

// AiChatPanel의 isOpen 상태 대신 selectedComplexId prop으로 제어
interface Props {
  selectedComplexId: string | null
  onClose: () => void
}

export function MapSidePanel({ selectedComplexId, onClose }: Props) {
  const [panelData, setPanelData] = useState<MapPanelData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedComplexId) return
    setLoading(true)
    fetch(`/api/complexes/${selectedComplexId}/map-panel`)
      .then(r => r.ok ? r.json() : null)
      .then(setPanelData)
      .catch(() => setPanelData(null))
      .finally(() => setLoading(false))
  }, [selectedComplexId])

  // selectedComplexId가 null이면 패널 숨김
  // Tailwind translate 트랜지션 또는 AiChatPanel의 inline style 방식 중 선택
}
```

**모바일 바텀 시트** (md: 브레이크포인트 활용):
```typescript
// PC: position fixed, right 0, 전체 높이 슬라이드인
// 모바일: position fixed, bottom 0, 전체 너비 바텀 시트 (AiChatPanel 방식 응용)
// Tailwind 브레이크포인트로 구분
<div
  className="fixed z-[200] bg-white shadow-lg
    md:top-0 md:right-0 md:h-full md:w-[min(400px,100vw)] md:border-l
    max-md:bottom-0 max-md:left-0 max-md:w-full max-md:h-[60vh] max-md:rounded-t-xl"
  // transition은 AiChatPanel 패턴 그대로
>
```

---

### `src/components/map/markers/BadgeMarker.tsx` (component, event-driven) — 신규

**Analog:** `src/components/map/ClusterMarker.tsx` (CustomOverlayMap + inline style)

**ClusterMarker SVG 없는 div 마커 패턴** (lines 1-24):
```typescript
// CustomOverlayMap + div 조합 — BadgeMarker는 SVG로 대체
<CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={0.5}>
  <div
    className="flex items-center justify-center rounded-full bg-blue-700 text-white font-semibold shadow-md cursor-pointer select-none"
    style={{ width: size, height: size, fontSize: count > 99 ? 10 : 12 }}
  >
    {count > 999 ? '999+' : count}
  </div>
</CustomOverlayMap>
```

**BadgeMarker SVG 마커 패턴** (RESEARCH.md Pattern 2):
```typescript
// 이모지 금지 — SVG path로만 구현 (CLAUDE.md)
// AI 슬롭 금지 — backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb 금지

interface BadgeMarkerProps {
  badge:      BadgeType
  priceLabel: number | null  // null이면 라벨 숨김
}

// 각 배지별 SVG — 인라인 컴포넌트로 분리
function CrownSvg() {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 12 18 26 18 26S36 30 36 18C36 8.06 27.94 0 18 0z" fill="#1A56DB"/>
      <path d="M8 22l3-8 4 5 3-9 3 9 4-5 3 8H8z" fill="#FFD700"/>
    </svg>
  )
}

function DefaultPinSvg({ color }: { color: string }) {
  // 가격대별 색상 — getPriceColor() 결과 주입
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill={color}/>
      <circle cx="14" cy="14" r="5" fill="#fff"/>
    </svg>
  )
}
```

**평당가 색상** (RESEARCH.md Code Examples):
```typescript
// src/components/map/markers/BadgeMarker.tsx 또는 badge-logic.ts에 포함
export function getPriceColor(avgSalePerPyeong: number | null): string {
  if (!avgSalePerPyeong) return '#6B7280'  // gray-500: 데이터 없음
  if (avgSalePerPyeong < 800) return '#10B981'   // emerald: 저가
  if (avgSalePerPyeong < 1500) return '#F59E0B'  // amber: 중가
  return '#EF4444'  // red: 고가
}
```

---

### `src/components/map/markers/badge-logic.ts` (utility, transform) — 신규

**Analog:** `src/lib/data/member-tier.ts` (티어 판단 순수 함수)

**member-tier.ts 패턴** — 확인을 위해 검색:
```typescript
// 순수 함수 + 명확한 타입 + export type 패턴
// badge-logic.ts는 이와 동일한 구조로 작성

export type BadgeType =
  | 'pre_sale'
  | 'new_build'
  | 'crown'
  | 'hot'
  | 'surge'
  | 'drop'
  | 'school'
  | 'large_complex'
  | 'redevelop'
  | 'none'

export interface BadgeInput {
  status:          string
  built_year:      number | null
  view_count:      number
  price_change_30d: number | null
  hagwon_grade:    string | null
  household_count: number | null
  tx_count_30d:    number
  p95_view_count:  number
  p95_tx_count:    number
}

// 순수 함수 — 부수효과 없음, 테스트 용이
export function determineBadge(input: BadgeInput): BadgeType {
  if (input.status === 'pre_sale') return 'pre_sale'
  if (input.built_year !== null && input.built_year >= 2021) return 'new_build'
  if (input.tx_count_30d >= input.p95_tx_count && input.p95_tx_count > 0) return 'crown'
  if (input.view_count >= input.p95_view_count && input.p95_view_count > 0) return 'hot'
  if (input.price_change_30d !== null && input.price_change_30d > 0.05) return 'surge'
  if (input.price_change_30d !== null && input.price_change_30d < -0.05) return 'drop'
  if (input.hagwon_grade && ['A+', 'A'].includes(input.hagwon_grade)) return 'school'
  if (input.household_count !== null && input.household_count >= 1000) return 'large_complex'
  if (input.status === 'in_redevelopment') return 'redevelop'
  return 'none'
}
```

---

### `src/lib/data/complexes-map.ts` (service, CRUD) — 수정

**Analog:** `src/lib/data/complexes-map.ts` (기존 파일 — 쿼리 확장)

**기존 ComplexMapItem + getComplexesForMap** (lines 1-28):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import Supercluster from 'supercluster'

export interface ComplexMapItem {
  id:             string
  canonical_name: string
  lat:            number
  lng:            number
  sgg_code:       string
}

export async function getComplexesForMap(
  sggCodes: string[],
  supabase: SupabaseClient,
): Promise<ComplexMapItem[]> {
  const { data, error } = await supabase
    .from('complexes')
    .select('id, canonical_name, lat, lng, sgg_code')
    .in('sgg_code', sggCodes)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('status', 'active')

  if (error) throw new Error(`getComplexesForMap failed: ${error.message}`)
  return (data ?? []) as ComplexMapItem[]
}
```

**확장 방향** — ComplexMapItem에 새 컬럼 추가 + select 쿼리 확장:
```typescript
// ComplexMapItem 확장 (마이그레이션 완료 후 동시 업데이트)
export interface ComplexMapItem {
  id:                  string
  canonical_name:      string
  lat:                 number
  lng:                 number
  sgg_code:            string
  // Phase 11 추가 컬럼
  avg_sale_per_pyeong: number | null   // 만원/평, 배치 집계
  view_count:          number           // 조회수
  price_change_30d:    number | null   // 30일 변동률 %
  tx_count_30d:        number           // 30일 거래량 (배치)
  status:              string           // 배지 로직용
  built_year:          number | null   // 신축 배지
  household_count:     number | null   // 대단지 배지
  hagwon_grade:        string | null   // 학군 배지 (hagwon_score_percentile 기반 계산된 grade)
}

// select 쿼리 확장
.select('id, canonical_name, lat, lng, sgg_code, avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d, status, built_year, household_count')
```

**buildClusterIndex도 properties에 새 필드 포함** (lines 34-44):
```typescript
export function buildClusterIndex(complexes: ComplexMapItem[]) {
  const index = new Supercluster({ radius: 60, maxZoom: 12 })
  index.load(
    complexes.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      properties: {
        id: c.id,
        name: c.canonical_name,
        cluster: false,
        // 추가
        avg_sale_per_pyeong: c.avg_sale_per_pyeong,
        view_count: c.view_count,
        price_change_30d: c.price_change_30d,
        tx_count_30d: c.tx_count_30d,
        status: c.status,
        built_year: c.built_year,
        household_count: c.household_count,
      },
    })),
  )
  return index
}
```

---

### `src/app/api/complexes/[id]/map-panel/route.ts` (route, request-response) — 신규

**Analog:** `src/app/api/health/route.ts` (GET + createReadonlyClient 패턴) + `src/app/api/admin/gps-approve/route.ts` (params 추출 패턴)

**health/route.ts의 GET + createReadonlyClient 패턴** (lines 1-23):
```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    // ... query
    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ status: 'fail', error: message }, { status: 503 })
  }
}
```

**map-panel/route.ts 패턴** (CLAUDE.md: 조회는 API Route + createReadonlyClient):
```typescript
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { NextResponse } from 'next/server'
import { getMapPanelData } from '@/lib/data/map-panel'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params

  // UUID 형식 검증 (RESEARCH.md Security — V5 Input Validation)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const supabase = createReadonlyClient()

  try {
    const data = await getMapPanelData(id, supabase)
    if (!data) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**CLAUDE.md 규칙:** API Route에서는 `createReadonlyClient()` 사용 (cookies() 미호출 → ISR 영향 없음). 인증 불필요 (지도 공개 데이터).

---

### `supabase/migrations/YYYYMMDD_map_enhancement.sql` (migration) — 신규

**Analog:** `supabase/migrations/20260514000003_facility_edu.sql` (ALTER TABLE + CREATE FUNCTION + GRANT 패턴)

**facility_edu.sql 패턴** (lines 1-28):
```sql
-- ALTER TABLE + ADD COLUMN IF NOT EXISTS
ALTER TABLE public.complexes
  ADD COLUMN IF NOT EXISTS hagwon_score smallint;

-- CREATE OR REPLACE FUNCTION + LANGUAGE sql STABLE
CREATE OR REPLACE FUNCTION public.hagwon_score_percentile(target_score integer)
RETURNS double precision
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE hagwon_score < target_score)::double precision
    / NULLIF(COUNT(*) FILTER (WHERE hagwon_score IS NOT NULL), 0)
  FROM public.complexes;
$$;
```

**complex_rankings.sql 패턴** (lines 1-20 — 인덱스 + comment):
```sql
CREATE INDEX complex_rankings_type_rank_idx
  ON public.complex_rankings (rank_type, rank);

comment on table public.complex_rankings is '...';
```

**map_enhancement.sql 작성 패턴** (RESEARCH.md Code Examples):
```sql
-- 1. 컬럼 추가
ALTER TABLE public.complexes
  ADD COLUMN IF NOT EXISTS avg_sale_per_pyeong integer,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_change_30d numeric,
  ADD COLUMN IF NOT EXISTS tx_count_30d integer NOT NULL DEFAULT 0;

-- 2. 인덱스 (facility_edu 패턴 — IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS complexes_view_count_idx
  ON public.complexes(view_count);
CREATE INDEX IF NOT EXISTS complexes_avg_sale_idx
  ON public.complexes(avg_sale_per_pyeong);

-- 3. view_count RPC (facility_edu의 SECURITY INVOKER 패턴)
CREATE OR REPLACE FUNCTION public.increment_view_count(p_complex_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE public.complexes
  SET view_count = view_count + 1, updated_at = now()
  WHERE id = p_complex_id;
$$;

-- 4. GRANT (facility_edu 패턴)
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

-- 5. 배치 집계 함수 — CLAUDE.md 규칙: cancel_date IS NULL AND superseded_by IS NULL 필수
CREATE OR REPLACE FUNCTION public.refresh_complex_price_stats()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.complexes c
  SET
    avg_sale_per_pyeong = (...  -- cancel_date IS NULL AND superseded_by IS NULL),
    price_change_30d    = (...  -- cancel_date IS NULL AND superseded_by IS NULL),
    tx_count_30d        = (...  -- cancel_date IS NULL AND superseded_by IS NULL),
    updated_at = now()
  WHERE c.status = 'active';
$$;
```

---

## Shared Patterns

### CustomOverlayMap + React 컴포넌트 마커
**Source:** `src/components/map/ClusterMarker.tsx` lines 3-24
**Apply to:** `ComplexMarker.tsx`, `BadgeMarker.tsx`
```typescript
import { CustomOverlayMap } from 'react-kakao-maps-sdk'

// xAnchor={0.5} yAnchor={1.0} — 핀 하단이 좌표에 닿음
// xAnchor={0.5} yAnchor={0.5} — 중심이 좌표에 닿음 (클러스터)
<CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={1.0}>
  <div style={{ cursor: 'pointer' }}>
    {/* SVG 또는 div */}
  </div>
</CustomOverlayMap>
```

### createReadonlyClient 패턴
**Source:** `src/lib/supabase/readonly.ts` lines 1-11
**Apply to:** `map-panel/route.ts`, `map-panel.ts` 데이터 레이어
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createReadonlyClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

### 슬라이드인 패널 (position: fixed + transition)
**Source:** `src/components/complex/AiChatPanel.tsx` lines 247-268
**Apply to:** `MapSidePanel.tsx`
```typescript
// position: fixed, right: 0, transition: transform 200ms
// 닫힘: translateX(100%) / 열림: translateX(0)
// 역할: dialog + aria-modal
style={{
  position: 'fixed',
  top: 0,
  right: 0,
  width: 'min(400px, 100vw)',
  height: '100vh',
  zIndex: 200,
  background: 'var(--bg-surface)',
  borderLeft: '1px solid var(--line-default)',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
  transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
}}
```

### SVG 아이콘 (이모지 금지, AiChatPanel 참조)
**Source:** `src/components/complex/AiChatPanel.tsx` lines 17-63
**Apply to:** `BadgeMarker.tsx`, `MapSidePanel.tsx` 닫기 버튼
```typescript
// 이모지 절대 금지 — SVG path만 사용 (CLAUDE.md)
// XIcon 패턴:
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
```

### API Route GET + params 추출 패턴
**Source:** `src/app/api/health/route.ts` + RESEARCH.md Pattern 3
**Apply to:** `map-panel/route.ts`
```typescript
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  // ... UUID 검증 후 createReadonlyClient() 사용
}
```

### AI 슬롭 금지 (CLAUDE.md)
**Apply to:** 모든 신규 컴포넌트
- `backdrop-blur` 금지
- `gradient-text` 금지
- `glow` 애니메이션 금지
- 보라/인디고 브랜드색 금지
- `gradient orb` 금지
- "Powered by AI" 배지 금지

### transactions 쿼리 필수 조건 (CLAUDE.md)
**Apply to:** `map_enhancement.sql`의 배치 집계 함수
```sql
-- 모든 transactions 쿼리에 반드시 포함
AND cancel_date IS NULL
AND superseded_by IS NULL
```

### useMap() 사용 제약
**Source:** RESEARCH.md Pitfall 1
**Apply to:** `ClusterMarker.tsx` (수정)
```typescript
// useMap()은 <Map> 컴포넌트 children 안에서만 호출 가능
// ClusterMarker는 Map의 직접 children → useMap() 사용 가능
// MapSidePanel은 Map 바깥 → useMap() 사용 금지, prop 경유
import { useMap } from 'react-kakao-maps-sdk'
const map = useMap('ClusterMarker')  // 인자는 에러 메시지용 식별자
```

---

## No Analog Found

Phase 11에서 아날로그 없이 신규 작성이 필요한 파일:

| 파일 | Role | Data Flow | 이유 |
|------|------|-----------|------|
| `src/lib/data/map-panel.ts` | service | request-response | 사이드 패널 전용 데이터 레이어 — 기존 complex-detail.ts와 유사하나 지도 전용 집계가 필요. `complex-detail.ts`의 `getComplexById` 패턴을 복사하여 확장 |

`map-panel.ts` 참조 패턴 — `src/lib/data/complex-detail.ts` lines 1-44:
```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getComplexById(
  id: string,
  supabase: SupabaseClient,
): Promise<ComplexDetail | null> {
  const { data, error } = await supabase
    .from('complexes')
    .select(`id, canonical_name, ...`)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getComplexById failed: ${error.message}`)
  return data as ComplexDetail | null
}
```

---

## Metadata

**Analog search scope:** `src/components/map/`, `src/components/complex/`, `src/lib/data/`, `src/app/api/`, `supabase/migrations/`
**Files scanned:** 16개 파일 직접 읽음
**Pattern extraction date:** 2026-05-15

