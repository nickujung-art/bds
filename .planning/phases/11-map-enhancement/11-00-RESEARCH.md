# Phase 11: 지도 고도화 - Research

**Researched:** 2026-05-15
**Domain:** react-kakao-maps-sdk + supercluster + Supabase DB 확장 + 사이드 패널 UX
**Confidence:** HIGH

---

## Summary

Phase 11은 기존 단순 핀 지도(MapMarker + CustomOverlayMap 조합)를 게임화된 인터랙티브 지도로 전환하는 작업이다. 현재 코드베이스는 supercluster 클러스터링까지는 구현되어 있으나, 클러스터 클릭 줌인·평당가 라벨·사이드 패널·SVG 배지 마커가 모두 미구현 상태다.

핵심 기술 결정은 마커 렌더링 방식이다. 현재 `ClusterMarker`는 `CustomOverlayMap`으로 구현되어 있고 `ComplexMarker`는 `MapMarker`를 사용한다. SVG 배지 마커(MAP-04)를 구현하려면 `ComplexMarker`도 `CustomOverlayMap` 방식으로 전환해야 한다. 단, 수백 개 `CustomOverlayMap` 동시 렌더링은 DOM 성능 이슈를 유발할 수 있으므로, supercluster의 줌 레벨 기반 가시성 필터링이 필수적이다 (현재 `maxZoom: 12` 설정이 이미 이를 보호).

DB 확장은 세 컬럼(`avg_sale_per_pyeong`, `view_count`, `price_change_30d`)을 `complexes` 테이블에 추가하는 것과 `increment_view_count` RPC 함수 추가로 구성된다. `avg_sale_per_pyeong`은 기존 `quadrant.ts`에서 이미 트랜잭션 기반으로 계산하는 패턴이 있으므로 일배치 집계 방식으로 컬럼에 저장하면 된다.

**Primary recommendation:** ClusterMarker 클릭 시 `supercluster.getLeaves(clusterId, Infinity)` + `kakao.maps.LatLngBounds` + `map.setBounds()` 조합으로 줌인. ComplexMarker는 `CustomOverlayMap` 기반 SVG 마커로 전환하되 supercluster maxZoom 제한으로 성능 보호.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 클러스터 줌인 (MAP-01) | Browser/Client | — | kakao.maps.Map 인스턴스 접근 필요. useMap() hook은 Map 컴포넌트 트리 내에서만 동작 |
| hover 미리보기 카드 (MAP-01) | Browser/Client | — | 마우스 이벤트 = 클라이언트 전용 |
| 평당가 라벨 (MAP-02) | Browser/Client + DB | Batch job | avg_sale_per_pyeong 컬럼은 DB 일배치 집계, 렌더링은 클라이언트 |
| 사이드 패널 데이터 fetch (MAP-03) | API Route | — | 클라이언트 컴포넌트에서 Supabase 직접 쿼리 금지(CLAUDE.md). API Route → createReadonlyClient() 패턴 |
| SVG 배지 마커 (MAP-04) | Browser/Client | — | CustomOverlayMap + React SVG 컴포넌트 |
| view_count +1 (MAP-05) | API Route (Server Action) | — | 단지 상세 page.tsx는 revalidate=86400 ISR. 별도 RPC 호출 필요 |
| price_change_30d 집계 (MAP-05) | Batch job (DB 함수) | — | 30일 변동률은 배치 or DB 함수로 주기적 갱신 |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAP-01 | 클러스터 클릭 줌인 + 마커 hover 미리보기 카드 | supercluster.getLeaves(Infinity) + kakao.maps.LatLngBounds.extend() + map.setBounds() 조합으로 구현. ClusterMarker에 onClick 핸들러 추가. ComplexMarker hover 카드에 avg_sale_per_pyeong·household_count 표시 |
| MAP-02 | 평당가 라벨 마커 (avg_sale_per_pyeong 컬럼 추가) | complexes 테이블에 avg_sale_per_pyeong INTEGER 컬럼 추가. 일배치 SQL 함수로 최근 1년 매매 거래 평균 집계. 줌 레벨 7 이하(충분히 확대)에서 라벨 on. 가격대별 색상(저/중/고) |
| MAP-03 | 사이드 패널 (PC 우측 슬라이드인 / 모바일 바텀 시트) | 마커 클릭 시 complexId 상태 → API Route /api/complexes/[id]/map-panel → 단지 기본정보 + 최근 거래 + 학원등급 반환. Tailwind translate 트랜지션으로 슬라이드인 |
| MAP-04 | 게임화 마커 배지 시스템 (SVG 일체형, 1~3순위) | CustomOverlayMap + React SVG 인라인 컴포넌트. 이모지 금지. 배지 우선순위 로직: 1순위(pre_sale/recently_built/광고) > 2순위(view_count 상위5%/거래량 상위5%/급등/급락) > 3순위(학원 A+/A/대단지/재건축) |
| MAP-05 | 지도 마커 DB 확장 (view_count, price_change_30d, increment RPC) | complexes에 view_count INTEGER DEFAULT 0, price_change_30d NUMERIC 컬럼 추가. increment_view_count(p_complex_id uuid) SECURITY DEFINER RPC 추가. price_change_30d는 일배치 SQL 함수로 갱신 |
</phase_requirements>

---

## Standard Stack

### Core (이미 설치됨 — 추가 설치 불필요)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-kakao-maps-sdk | ^1.2.1 | 카카오 지도 React 래퍼 | 이미 사용 중. Map, CustomOverlayMap, MapMarker, useMap hook 제공 |
| supercluster | ^8.0.1 | 지오스패셜 클러스터링 | 이미 사용 중. getLeaves, getClusterExpansionZoom API 제공 |
| Tailwind CSS | 3.4+ | 스타일링 | 프로젝트 표준 |

### Supporting (추가 설치 없음)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | 기존 | URL 상태 관리 | 선택된 단지 ID URL 상태화가 필요할 경우 (선택적) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CustomOverlayMap (SVG 마커) | MapMarker + image spritesheet | CustomOverlayMap이 React 컴포넌트 렌더링 가능하여 SVG/조건부 배지 구현 용이. 단, DOM 오버헤드 있음 |
| API Route (사이드 패널) | Server Action | 클라이언트 컴포넌트에서 Server Action 직접 호출 가능하나, CLAUDE.md 규칙에서 외부 노출 없는 mutation은 Server Action. 조회(read)는 API Route가 더 명확 |

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser]
  KakaoMap.tsx (Client Component)
    │
    ├── ClusterMarker (CustomOverlayMap) ─── onClick → getLeaves(Infinity) → LatLngBounds → map.setBounds()
    │
    ├── ComplexMarker (CustomOverlayMap, SVG) ─── onMouseEnter → hover preview card
    │                                         └── onClick → setSelectedComplexId(id)
    │
    └── MapSidePanel (Client Component)
          │ selectedComplexId 변경 시
          └── fetch('/api/complexes/{id}/map-panel') ──→ [API Route]
                                                            └── createReadonlyClient()
                                                                → complexes + transactions + hagwon_score

[Supabase DB]
  complexes 테이블
    ├── avg_sale_per_pyeong (INTEGER) ← 일배치 SQL 함수 (update_avg_sale_per_pyeong)
    ├── view_count (INTEGER)          ← increment_view_count() RPC (단지 상세 페이지)
    └── price_change_30d (NUMERIC)    ← 일배치 SQL 함수 (update_price_change_30d)

[Batch / Cron]
  Vercel Cron 04:00 KST
    └── /api/cron/daily → avg_sale_per_pyeong 갱신 + price_change_30d 갱신
```

### Recommended Project Structure
```
src/
├── components/map/
│   ├── KakaoMap.tsx            # 기존 — map ref 저장, selectedComplexId 상태 추가
│   ├── ComplexMarker.tsx       # 변경 — MapMarker → CustomOverlayMap + SVG
│   ├── ClusterMarker.tsx       # 변경 — onClick 클러스터 줌인 추가
│   ├── MapSidePanel.tsx        # 신규 — PC 슬라이드인 / 모바일 바텀 시트
│   ├── HoverPreviewCard.tsx    # 신규 — 마커 hover 미리보기 카드
│   ├── BadgeMarker.tsx         # 신규 — SVG 배지 마커 렌더러
│   └── MapView.tsx             # 기존 — MapSidePanel 추가
├── lib/
│   ├── data/
│   │   ├── complexes-map.ts    # 변경 — ComplexMapItem에 avg_sale_per_pyeong, view_count, price_change_30d, status, built_year, household_count 추가
│   │   └── map-panel.ts        # 신규 — getMapPanelData(complexId) API 데이터 레이어
│   └── utils/
│       └── badge-priority.ts   # 신규 — determineBadge() 배지 우선순위 로직
└── app/
    └── api/
        └── complexes/
            └── [id]/
                └── map-panel/
                    └── route.ts  # 신규 — GET /api/complexes/[id]/map-panel
supabase/migrations/
    └── 20260516000001_phase11_map_columns.sql  # avg_sale_per_pyeong, view_count, price_change_30d, RPC
```

### Pattern 1: 클러스터 클릭 줌인 (MAP-01)

**What:** ClusterMarker 클릭 시 해당 클러스터의 모든 포인트를 getLeaves로 추출 → LatLngBounds 계산 → map.setBounds()

**When to use:** cluster 피처의 properties.cluster === true인 경우

**구현 흐름:**

ClusterMarker 컴포넌트는 Map 컴포넌트 트리 내에 있으므로 `useMap()` hook으로 map 인스턴스에 직접 접근 가능. clusterIndex도 prop으로 전달하거나 Context로 공유.

```typescript
// Source: react-kakao-maps-sdk useMap 타입 정의 (node_modules에서 확인)
// useMap()은 Map 컴포넌트 children 내에서만 호출 가능 → kakao.maps.Map 반환
// Source: Kakao Maps Web API 공식 문서 (확인됨)

// ClusterMarker.tsx
import { useMap } from 'react-kakao-maps-sdk'
import type Supercluster from 'supercluster'

interface Props {
  lat: number
  lng: number
  count: number
  clusterId: number
  clusterIndex: Supercluster  // KakaoMap에서 prop으로 전달
}

export function ClusterMarker({ lat, lng, count, clusterId, clusterIndex }: Props) {
  const map = useMap()

  const handleClick = () => {
    // supercluster.getLeaves(clusterId, Infinity) — 클러스터 내 전체 포인트
    const leaves = clusterIndex.getLeaves(clusterId, Infinity)
    const bounds = new kakao.maps.LatLngBounds()
    leaves.forEach((leaf) => {
      const [lngLeaf, latLeaf] = leaf.geometry.coordinates
      bounds.extend(new kakao.maps.LatLng(latLeaf, lngLeaf))
    })
    map.setBounds(bounds)  // 카카오 map.setBounds(bounds[, paddingTop, ...])
  }

  // ... render
}
```

**중요:** KakaoMap.tsx에서 clusterIndex를 ClusterMarker에 prop으로 전달해야 함. cluster_id는 `feature.properties.cluster_id`에서 얻음 (현재 코드베이스에 `feature.properties.cluster_id ?? i` 패턴 존재).

### Pattern 2: CustomOverlayMap 기반 SVG 마커 (MAP-04)

**What:** MapMarker 대신 CustomOverlayMap으로 SVG React 컴포넌트를 마커로 사용

**When to use:** 배지 조건에 따라 다른 SVG 마커 렌더링이 필요할 때

```typescript
// Source: react-kakao-maps-sdk CustomOverlayMap 타입 정의 (node_modules에서 확인)
// [VERIFIED: 로컬 타입 정의]

// BadgeMarker.tsx 예시 — SVG 인라인, 이모지 금지
function CrownBadge() {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 핀 본체 */}
      <path d="M18 0C8.06 0 0 8.06 0 18c0 12 18 26 18 26S36 30 36 18C36 8.06 27.94 0 18 0z" fill="#1A56DB"/>
      {/* 왕관 SVG path */}
      <path d="M8 22l3-8 4 5 3-9 3 9 4-5 3 8H8z" fill="#FFD700"/>
    </svg>
  )
}

// ComplexMarker.tsx에서 사용
<CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={1.0}>
  <div onClick={handleClick} style={{ cursor: 'pointer' }}>
    {badge === 'crown' ? <CrownBadge /> : <DefaultMarker priceLabel={priceLabel} color={priceColor} />}
  </div>
</CustomOverlayMap>
```

### Pattern 3: 사이드 패널 데이터 fetch (MAP-03)

**What:** 마커 클릭 시 클라이언트 컴포넌트에서 API Route로 단지 데이터 요청

**When to use:** 클라이언트 컴포넌트에서 Supabase 직접 쿼리 금지(CLAUDE.md) → API Route 경유

```typescript
// /app/api/complexes/[id]/map-panel/route.ts
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const supabase = createReadonlyClient()
  const data = await getMapPanelData(id, supabase)
  if (!data) return NextResponse.json(null, { status: 404 })
  return NextResponse.json(data)
}
```

클라이언트에서:
```typescript
// MapSidePanel.tsx — 'use client'
const [panelData, setPanelData] = useState<MapPanelData | null>(null)

useEffect(() => {
  if (!selectedComplexId) return
  fetch(`/api/complexes/${selectedComplexId}/map-panel`)
    .then(r => r.json())
    .then(setPanelData)
}, [selectedComplexId])
```

### Pattern 4: avg_sale_per_pyeong 배치 집계 (MAP-02, MAP-05)

**What:** complexes 테이블 컬럼 직접 갱신 — 일배치 SQL 함수

**기존 패턴 참조:** `quadrant.ts`에서 이미 transactions 기반 평당가 계산 로직 존재

```sql
-- DB 함수로 배치 집계 (Migration에 포함)
CREATE OR REPLACE FUNCTION public.refresh_complex_price_stats()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.complexes c
  SET
    avg_sale_per_pyeong = (
      SELECT (avg(price / (area_m2 / 3.3058)) / 10000)::integer
      FROM public.transactions t
      WHERE t.complex_id = c.id
        AND t.deal_type = 'sale'
        AND t.deal_date >= (CURRENT_DATE - INTERVAL '1 year')
        AND t.cancel_date IS NULL
        AND t.superseded_by IS NULL
    ),
    price_change_30d = (
      -- 최근 30일 avg vs 이전 30일 avg 변동률
      ...
    ),
    updated_at = now()
  WHERE c.status = 'active';
$$;
```

**중요:** 모든 transactions 쿼리는 `cancel_date IS NULL AND superseded_by IS NULL` 필수 (CLAUDE.md 규칙).

### Pattern 5: view_count increment RPC (MAP-05)

**What:** 단지 상세 페이지(revalidate=86400 ISR)에서 view_count를 안전하게 증가

**제약:** ISR 페이지이므로 server-only RPC 호출을 Server Action으로 분리

```sql
-- increment_view_count RPC (SECURITY DEFINER 불필요 — anon 허용)
CREATE OR REPLACE FUNCTION public.increment_view_count(p_complex_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.complexes
  SET view_count = view_count + 1
  WHERE id = p_complex_id;
$$;
```

단지 상세 page.tsx에서 Server Action으로:
```typescript
// src/app/complexes/[id]/actions.ts
'use server'
import { createReadonlyClient } from '@/lib/supabase/readonly'

export async function incrementViewCount(complexId: string): Promise<void> {
  const supabase = createReadonlyClient()
  await supabase.rpc('increment_view_count', { p_complex_id: complexId })
}
```

단지 상세 클라이언트 컴포넌트에서 useEffect로 호출 (페이지 로드 시 1회).

### Pattern 6: 배지 우선순위 로직 (MAP-04)

**What:** 한 단지에 여러 배지가 해당될 때 가장 높은 우선순위 1개만 표시

```typescript
// src/lib/utils/badge-priority.ts
// [ASSUMED] — 비즈니스 우선순위 정의 (요구사항 MAP-04 기반)

export type BadgeType =
  | 'pre_sale'         // 1순위: 분양 단지 (status === 'pre_sale')
  | 'new_build'        // 1순위: 신축 (built_year >= 2021)
  | 'crown'            // 2순위: 거래량 상위 5% (transactions 30일)
  | 'hot'              // 2순위: 조회수 상위 5% (view_count)
  | 'surge'            // 2순위: 급등 (price_change_30d > +5%)
  | 'drop'             // 2순위: 급락 (price_change_30d < -5%)
  | 'school'           // 3순위: 학군 (hagwon grade A+ 또는 A)
  | 'large_complex'    // 3순위: 대단지 (household_count >= 1000)
  | 'redevelop'        // 3순위: 재건축 진행 (status === 'in_redevelopment')
  | 'none'

const PRIORITY: BadgeType[] = [
  'pre_sale', 'new_build',          // 1순위
  'crown', 'hot', 'surge', 'drop',  // 2순위
  'school', 'large_complex', 'redevelop',  // 3순위
]

export interface BadgeInput {
  status: string
  built_year: number | null
  view_count: number
  price_change_30d: number | null
  hagwon_grade: string | null
  household_count: number | null
  tx_count_30d: number  // 최근 30일 거래량 (ComplexMapItem에 포함)
  p95_view_count: number   // 전체 단지 상위 5% 기준값 (지도 초기 로드 시 계산)
  p95_tx_count: number
}

export function determineBadge(input: BadgeInput): BadgeType {
  if (input.status === 'pre_sale') return 'pre_sale'
  if (input.built_year !== null && input.built_year >= 2021) return 'new_build'
  if (input.tx_count_30d >= input.p95_tx_count) return 'crown'
  if (input.view_count >= input.p95_view_count) return 'hot'
  if (input.price_change_30d !== null && input.price_change_30d > 5) return 'surge'
  if (input.price_change_30d !== null && input.price_change_30d < -5) return 'drop'
  if (input.hagwon_grade && ['A+', 'A'].includes(input.hagwon_grade)) return 'school'
  if (input.household_count !== null && input.household_count >= 1000) return 'large_complex'
  if (input.status === 'in_redevelopment') return 'redevelop'
  return 'none'
}
```

**p95 계산:** 지도 초기 로드 시 complexes 배열 전체를 순회하여 view_count, tx_count_30d의 95번째 백분위값을 클라이언트에서 계산. 서버 쿼리 1회로 끝.

### Pattern 7: 줌 레벨 연동 라벨 표시 (MAP-02)

**What:** 카카오 지도 레벨에서 특정 레벨 이하일 때 평당가 라벨 표시

```typescript
// KakaoMap.tsx — onIdle에서 level 추출
const [mapLevel, setMapLevel] = useState(DEFAULT_LEVEL)

const computeClusters = useCallback((map: kakao.maps.Map) => {
  setMapLevel(map.getLevel())
  // ... 기존 클러스터 계산
}, [clusterIndex])

// ComplexMarker에 showLabel prop 전달
// 카카오 레벨 7 이하 = 충분히 확대된 상태 (동네 단위 이상 확대)
const showLabel = mapLevel <= 7
```

**카카오 레벨 기준 (확인됨):**
- Level 1: 가장 확대 (건물 단위)
- Level 7: 동네·읍면동 단위
- Level 14: 가장 축소 (전국)

레벨 7 이하에서 라벨 표시가 적절한 기준. [ASSUMED] — 실제 서비스에서 사용자 테스트 후 조정 필요.

### Anti-Patterns to Avoid

- **CustomOverlayMap 무제한 렌더링:** supercluster가 줌 레벨에 따라 마커 수를 제한하므로 현재 구조에서는 보호됨. 하지만 maxZoom을 높이면 수백 개가 동시 렌더링될 수 있음. maxZoom: 12 유지 필수.
- **마커 클릭 시 Supabase 직접 쿼리:** 클라이언트 컴포넌트에서 Supabase 직접 쿼리 절대 금지. 반드시 API Route 경유.
- **avg_sale_per_pyeong 실시간 계산:** 마커 렌더링 시마다 트랜잭션 집계 쿼리 금지. 배치로 컬럼에 저장 후 getComplexesForMap에서 읽기.
- **이모지 사용:** SVG path로만 마커 아이콘 구현 (CLAUDE.md 규칙).
- **AI 슬롭 패턴:** backdrop-blur, gradient-text, glow 애니메이션, 보라/인디고 브랜드색, gradient orb 모두 금지.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 클러스터 포인트 범위 계산 | 수동 bbox 계산 | `supercluster.getLeaves(clusterId, Infinity)` + `LatLngBounds.extend()` | supercluster가 이미 정확한 포인트 좌표 반환 |
| 지도 범위 맞춤 줌 | 수동 레벨 계산 | `kakao.maps.map.setBounds(bounds)` | 카카오 내장 API가 패딩 포함 최적 줌 자동 계산 |
| 클러스터 UI (HTML) | MarkerClusterer 라이브러리 | 현재 supercluster + CustomOverlayMap 조합 유지 | 이미 구현되어 있고 커스텀 배지와 통합 용이 |

**Key insight:** supercluster의 getLeaves + 카카오의 setBounds 조합으로 클러스터 줌인의 핵심 로직이 단 몇 줄로 해결된다. 수동으로 줌 레벨을 계산하거나 좌표 범위를 구할 필요 없음.

---

## Runtime State Inventory

> 이 Phase는 컬럼 추가 마이그레이션이 포함되므로 런타임 상태 점검 필요.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | complexes 669개 — avg_sale_per_pyeong 컬럼 없음, view_count 컬럼 없음, price_change_30d 컬럼 없음 | 마이그레이션으로 컬럼 추가 후 배치 함수로 초기 집계 실행 |
| Live service config | Vercel Cron /api/cron/daily 존재 — avg_sale_per_pyeong/price_change_30d 갱신 로직 추가 필요 | 기존 cron route에 refresh_complex_price_stats() 호출 추가 |
| OS-registered state | None — 확인됨 | — |
| Secrets/env vars | NEXT_PUBLIC_KAKAO_JS_KEY 기존 존재, CRON_SECRET 기존 존재 | 신규 env 불필요 |
| Build artifacts | None — 확인됨 | — |

---

## Common Pitfalls

### Pitfall 1: useMap() 사용 위치 제약
**What goes wrong:** `useMap()` hook을 `Map` 컴포넌트 외부에서 호출하면 Error 발생 ("Map 객체 내부가 아니라면 Error를 발생 시킵니다" — 타입 정의 확인)
**Why it happens:** KakaoMapContext를 Map 컴포넌트가 제공하는데, ClusterMarker가 Map의 children으로 렌더링되므로 사실 useMap() 사용 가능. 단, MapSidePanel이 Map 바깥에 있으면 useMap() 사용 불가.
**How to avoid:** 클러스터 클릭 핸들러는 ClusterMarker(Map children) 안에서 useMap() 사용. 사이드 패널 열기는 selectedComplexId 상태 lifting으로 처리 (KakaoMap → MapView → MapSidePanel).
**Warning signs:** "Map 객체 내부가 아닙니다" 런타임 에러

### Pitfall 2: cluster_id vs index key 혼동
**What goes wrong:** 현재 KakaoMap.tsx 코드에서 `feature.properties.cluster_id ?? i`로 key를 설정하는데, supercluster의 cluster_id는 `cluster_id` 프로퍼티에 있음. getLeaves 호출 시 이 값이 필요.
**Why it happens:** supercluster가 반환하는 cluster feature의 properties에 `cluster_id` 필드가 있음 (ClusterFeature 타입).
**How to avoid:** ClusterMarker에 `clusterId={feature.properties.cluster_id as number}` prop 전달 확인. undefined 체크 필요.
**Warning signs:** getLeaves 호출 시 "No cluster with the specified id" 에러

### Pitfall 3: complexes 데이터에 새 컬럼 미포함
**What goes wrong:** getComplexesForMap이 현재 `id, canonical_name, lat, lng, sgg_code`만 select. avg_sale_per_pyeong, view_count, price_change_30d, status, built_year, household_count가 마커 렌더링에 필요하지만 쿼리에 없음.
**Why it happens:** MAP-02, MAP-04, MAP-05 구현 시 ComplexMapItem 타입과 쿼리를 함께 확장해야 함.
**How to avoid:** Wave 0 마이그레이션 완료 후 complexes-map.ts의 select 쿼리와 ComplexMapItem 타입을 동시 업데이트.
**Warning signs:** TypeScript 오류 또는 undefined 값 렌더링

### Pitfall 4: ISR 페이지에서 view_count 실시간 증가
**What goes wrong:** complexes/[id]/page.tsx는 `revalidate = 86400`. 여기서 view_count를 단순 RPC로 호출하면 ISR 캐시 내에서 중복 실행될 수 있음.
**Why it happens:** RSC에서 직접 RPC 호출 시 ISR 빌드 타임에도 실행됨.
**How to avoid:** view_count 증가는 클라이언트 컴포넌트의 useEffect에서 Server Action 호출. 1회성 effect로 처리.
**Warning signs:** 빌드 시간에 view_count가 증가하거나 페이지 로드마다 중복 증가

### Pitfall 5: 사이드 패널 모바일 바텀 시트 레이아웃 충돌
**What goes wrong:** PC에서는 우측 슬라이드인이지만 모바일에서는 하단 시트가 지도를 가림. 현재 MapPage가 `h-screen flex flex-col`로 고정되어 있어 모바일에서 레이아웃 조정 필요.
**Why it happens:** 지도가 `flex-1`로 전체 높이를 점유.
**How to avoid:** 모바일 바텀 시트는 `position: fixed`, bottom 슬라이드인으로 지도 위에 오버레이. PC 사이드 패널은 기존 SidePanel처럼 좌측에 위치하거나 우측 absolute 포지셔닝. Tailwind `md:` 브레이크포인트 활용.
**Warning signs:** 모바일에서 지도가 보이지 않거나 패널이 레이아웃 바깥으로 밀려남

### Pitfall 6: transactions 집계 시 cancel/superseded 미제외
**What goes wrong:** avg_sale_per_pyeong, price_change_30d 배치 함수에서 `cancel_date IS NULL AND superseded_by IS NULL` 조건 누락.
**Why it happens:** 프로젝트 전체 규칙 (CLAUDE.md).
**How to avoid:** 마이그레이션 SQL 작성 시 반드시 두 조건 포함 확인.
**Warning signs:** 이미 취소된 거래가 포함되어 가격 통계가 왜곡

---

## Code Examples

### 클러스터 줌인 전체 패턴
```typescript
// Source: react-kakao-maps-sdk Map.d.ts + supercluster README (getLeaves 확인됨)
// [VERIFIED: 로컬 타입 정의 + Kakao Maps 공식 API 문서]

// ClusterMarker.tsx
import { CustomOverlayMap, useMap } from 'react-kakao-maps-sdk'
import type Supercluster from 'supercluster'

export function ClusterMarker({
  lat, lng, count, clusterId, clusterIndex
}: {
  lat: number; lng: number; count: number
  clusterId: number; clusterIndex: Supercluster
}) {
  const map = useMap('ClusterMarker')
  const size = count > 100 ? 44 : count > 20 ? 38 : 32

  const handleClick = () => {
    const leaves = clusterIndex.getLeaves(clusterId, Infinity)
    const bounds = new kakao.maps.LatLngBounds()
    for (const leaf of leaves) {
      const [lngLeaf, latLeaf] = leaf.geometry.coordinates as [number, number]
      bounds.extend(new kakao.maps.LatLng(latLeaf ?? 0, lngLeaf ?? 0))
    }
    map.setBounds(bounds)
  }

  return (
    <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={0.5}>
      <div
        onClick={handleClick}
        className="flex items-center justify-center rounded-full bg-blue-700 text-white font-semibold shadow-md cursor-pointer select-none"
        style={{ width: size, height: size, fontSize: count > 99 ? 10 : 12 }}
      >
        {count > 999 ? '999+' : count}
      </div>
    </CustomOverlayMap>
  )
}
```

### 평당가 색상 분류
```typescript
// Source: [ASSUMED] — 창원·김해 평당가 분포 기반 임계값 (실제 데이터 확인 후 조정)
export function getPriceColor(avgSalePerPyeong: number | null): string {
  if (!avgSalePerPyeong) return '#6B7280'  // gray-500: 데이터 없음
  if (avgSalePerPyeong < 800) return '#10B981'   // emerald: 저가
  if (avgSalePerPyeong < 1500) return '#F59E0B'  // amber: 중가
  return '#EF4444'  // red: 고가
}
```

### DB 마이그레이션 구조
```sql
-- [VERIFIED: 기존 마이그레이션 패턴 참조]
-- supabase/migrations/20260516000001_phase11_map_columns.sql

ALTER TABLE public.complexes
  ADD COLUMN IF NOT EXISTS avg_sale_per_pyeong integer,       -- 만원/평, 최근 1년 평균
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_change_30d numeric;          -- %, 양수=상승 음수=하락

-- view_count 인덱스 (상위 5% 계산용)
CREATE INDEX IF NOT EXISTS complexes_view_count_idx ON public.complexes(view_count);
CREATE INDEX IF NOT EXISTS complexes_avg_sale_idx ON public.complexes(avg_sale_per_pyeong);

-- view_count +1 RPC
CREATE OR REPLACE FUNCTION public.increment_view_count(p_complex_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER AS $$
  UPDATE public.complexes
  SET view_count = view_count + 1, updated_at = now()
  WHERE id = p_complex_id;
$$;

-- RLS: anon도 호출 가능
GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

-- 배치 집계 함수
CREATE OR REPLACE FUNCTION public.refresh_complex_price_stats()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.complexes c
  SET
    avg_sale_per_pyeong = (
      SELECT (avg(price / (area_m2 / 3.3058)) / 10000)::integer
      FROM public.transactions t
      WHERE t.complex_id = c.id
        AND t.deal_type = 'sale'
        AND t.deal_date >= CURRENT_DATE - INTERVAL '1 year'
        AND t.cancel_date IS NULL
        AND t.superseded_by IS NULL
        AND t.area_m2 > 0
    ),
    price_change_30d = (
      -- 최근 30일 vs 이전 30일 매매 평균 변동률
      WITH recent AS (
        SELECT avg(price) AS avg_p
        FROM public.transactions t
        WHERE t.complex_id = c.id AND t.deal_type = 'sale'
          AND t.deal_date >= CURRENT_DATE - INTERVAL '30 days'
          AND t.cancel_date IS NULL AND t.superseded_by IS NULL
      ), prev AS (
        SELECT avg(price) AS avg_p
        FROM public.transactions t
        WHERE t.complex_id = c.id AND t.deal_type = 'sale'
          AND t.deal_date >= CURRENT_DATE - INTERVAL '60 days'
          AND t.deal_date < CURRENT_DATE - INTERVAL '30 days'
          AND t.cancel_date IS NULL AND t.superseded_by IS NULL
      )
      SELECT CASE
        WHEN prev.avg_p IS NULL OR prev.avg_p = 0 THEN NULL
        ELSE round(((recent.avg_p - prev.avg_p) / prev.avg_p * 100)::numeric, 2)
      END
      FROM recent, prev
    ),
    updated_at = now()
  WHERE c.status = 'active';
$$;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MapMarker (이미지 URL) | CustomOverlayMap + SVG 인라인 | React 시대 전환 | 동적 SVG, 조건부 배지 가능. DOM 오버헤드 증가 |
| 카카오 MarkerClusterer 라이브러리 | supercluster + CustomOverlayMap | Phase 11 이전 이미 구현 | 완전 커스텀 클러스터 UI 가능 |

**Deprecated/outdated:**
- `MarkerClusterer` (react-kakao-maps-sdk 내장): 이미 supercluster로 대체됨. 카카오 내장 클러스터러는 커스텀 마커 불가.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 줌 레벨 7 이하에서 평당가 라벨 표시가 적절한 기준 | Pattern 7 | 너무 이르거나 늦게 표시되면 UX 저하. 실제 테스트 후 조정 필요 |
| A2 | avg_sale_per_pyeong < 800만원: 저가, 800~1500: 중가, 1500+: 고가 | Code Examples | 창원·김해 실제 평당가 분포 확인 후 조정 필요 |
| A3 | view_count >= 상위 5% 기준으로 'hot' 배지 적용 | Pattern 6 | 단지 수가 적어 의미 없는 threshold가 나올 수 있음 |
| A4 | price_change_30d > +5%를 '급등', < -5%를 '급락'으로 정의 | Pattern 6 | 창원·김해 시장 변동성에 따라 threshold 조정 필요 |
| A5 | household_count >= 1000 세대를 '대단지' 기준으로 적용 | Pattern 6 | 지역 기준 상이할 수 있음 |
| A6 | pre_sale 상태를 '분양 단지' 1순위 배지에 사용 | Pattern 6 | status enum 'pre_sale' 값 존재 확인 필요 (complexes migration에서 확인됨 — HIGH) |

---

## Open Questions

1. **사이드 패널이 기존 SidePanel(검색)과 공존하는 방법**
   - What we know: 현재 MapPage에 좌측 검색 SidePanel(width: 320)이 있음. MAP-03은 "PC 우측 슬라이드인"이라고 명시
   - What's unclear: 검색 패널과 단지 상세 패널을 동시에 표시할지, 아니면 전환할지
   - Recommendation: 별도 Panel로 분리. 우측 absolute position으로 오버레이. 마커 클릭 시 우측에서 슬라이드인, 닫기 버튼으로 닫힘.

2. **tx_count_30d (최근 30일 거래량)를 ComplexMapItem에 포함할지**
   - What we know: 왕관 배지 조건이 "상위 5% 거래량". 이를 위해 각 단지의 30일 거래량이 필요.
   - What's unclear: 지도 초기 로드 시 669개 단지 × 트랜잭션 집계 쿼리는 부하가 큼
   - Recommendation: DB 함수 refresh_complex_price_stats()에 tx_count_30d 컬럼도 추가하여 배치로 저장. getComplexesForMap에서 함께 조회.

3. **단지 상세 페이지에서 view_count 중복 카운팅 방지**
   - What we know: ISR 페이지(revalidate=86400)에서 Server Action 호출
   - What's unclear: 같은 사용자가 back/forward로 돌아올 때 중복 카운팅 방지
   - Recommendation: sessionStorage로 방문 단지 ID 기록. 세션 내 최초 방문 시에만 increment 호출.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| react-kakao-maps-sdk | MAP-01~04 | ✓ | ^1.2.1 | — |
| supercluster | MAP-01 | ✓ | ^8.0.1 | — |
| kakao.maps.LatLngBounds | MAP-01 | ✓ (via SDK) | — | — |
| Supabase local | DB 마이그레이션 테스트 | 확인 필요 | — | supabase db push to remote |
| Vercel Cron | MAP-02, MAP-05 배치 | ✓ (기존 cron 존재) | — | 수동 스크립트 실행 |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (기존 설정) |
| Config file | vitest.config.ts (기존) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | 클러스터 클릭 시 getLeaves 호출 + setBounds | unit | `npm run test -- --run src/components/map/ClusterMarker.test.tsx` | ❌ Wave 0 |
| MAP-02 | avg_sale_per_pyeong 집계 함수 계산 정확성 | unit | `npm run test -- --run src/lib/utils/badge-priority.test.ts` | ❌ Wave 0 |
| MAP-03 | GET /api/complexes/[id]/map-panel 응답 구조 | unit | `npm run test -- --run src/app/api/complexes/id/map-panel/route.test.ts` | ❌ Wave 0 |
| MAP-04 | determineBadge() 우선순위 로직 | unit | `npm run test -- --run src/lib/utils/badge-priority.test.ts` | ❌ Wave 0 |
| MAP-05 | increment_view_count RPC 호출 (mock) | unit | `npm run test -- --run src/app/complexes/id/actions.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run`
- **Per wave merge:** `npm run test && npm run lint && npm run build`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/components/map/ClusterMarker.test.tsx` — MAP-01 클러스터 줌인 로직
- [ ] `src/lib/utils/badge-priority.test.ts` — MAP-04 배지 우선순위
- [ ] `src/app/api/complexes/[id]/map-panel/route.test.ts` — MAP-03 API Route
- [ ] `src/app/complexes/[id]/actions.test.ts` — MAP-05 view_count Server Action
- [ ] `src/lib/data/complexes-map.test.ts` — ComplexMapItem 타입 확장 검증

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | RLS: view_count RPC는 anon 허용, 단 UPDATE만 가능 |
| V5 Input Validation | yes | complexId UUID 형식 검증 (API Route에서 zod 또는 정규식) |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 임의 UUID로 view_count 무한 증가 | Tampering | rate limiting 미적용 시 문제. 단순 카운터이므로 Vercel Edge Config 수준 rate limit 적용 고려 (LOW 위험) |
| map-panel API에서 단지 정보 조회 | Information Disclosure | createReadonlyClient() + RLS anon read 정책으로 충분. 민감 데이터 없음 |

---

## Project Constraints (from CLAUDE.md)

플래너가 준수해야 할 CLAUDE.md 제약 사항:

1. **외부 API 호출은 `src/services/`에서만** — Phase 11에는 외부 API 호출 없음 (해당 없음)
2. **Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만** — MapSidePanel의 데이터 fetch는 반드시 API Route 경유. 클라이언트 컴포넌트에서 직접 쿼리 금지.
3. **모든 사용자 데이터 테이블은 RLS 정책 명시** — increment_view_count는 UPDATE이므로 RLS 또는 SECURITY INVOKER + GRANT 패턴으로 anon 허용 명시.
4. **complexes 테이블이 Golden Record** — avg_sale_per_pyeong, view_count, price_change_30d 모두 complexes에 추가. 외부 테이블로 분리 금지.
5. **광고 게재 조건** — Phase 11에서 광고 노출 없음 (해당 없음).
6. **Server Action 우선** — view_count 증가: write mutation → Server Action. 사이드 패널 데이터 fetch: read → API Route (Server Action은 mutation용).
7. **거래 데이터 조회 시 cancel_date IS NULL AND superseded_by IS NULL 항상 포함** — 배치 SQL 함수에 필수.
8. **AI 슬롭 금지** — backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb 금지.
9. **이모지 아이콘 사용 금지** — SVG path로만 마커 구현.
10. **TDD** — 구현 전 테스트 먼저 작성.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/react-kakao-maps-sdk/dist/components/Map.d.ts` — Map 컴포넌트 props, onCreate, onIdle, ref 패턴 확인
- `node_modules/react-kakao-maps-sdk/dist/components/CustomOverlayMap.d.ts` — CustomOverlayMap props 확인
- `node_modules/react-kakao-maps-sdk/dist/components/MapMarker.d.ts` — MapMarker props 확인
- `node_modules/react-kakao-maps-sdk/dist/hooks/useMap.d.ts` — useMap() 반환 타입 + 제약 조건 확인
- `src/components/map/KakaoMap.tsx` — 기존 구현 패턴 확인
- `src/components/map/ClusterMarker.tsx` — 기존 클러스터 마커 확인
- `src/components/map/ComplexMarker.tsx` — 기존 단지 마커 확인
- `src/lib/data/complexes-map.ts` — ComplexMapItem, buildClusterIndex, supercluster 사용 확인
- `supabase/migrations/20260430000002_complexes.sql` — complexes 테이블 스키마 확인
- `src/types/database.ts` — complexes Row 타입 (avg_sale_per_pyeong, view_count 미존재 확인)
- Kakao Maps Web API 공식 문서 (WebFetch) — map.setBounds(bounds), LatLngBounds 확인

### Secondary (MEDIUM confidence)
- GitHub supercluster README (WebFetch) — getLeaves(clusterId, Infinity), getClusterExpansionZoom API 확인
- `src/lib/data/quadrant.ts` — avg_sale_per_pyeong 계산 패턴 참조

### Tertiary (LOW confidence)
- 줌 레벨 7 기준 — [ASSUMED] 창원·김해 서비스 특성상 적합한 기준으로 추정. 실제 테스트 필요.
- 평당가 색상 임계값 — [ASSUMED] 실제 데이터 분포 확인 후 조정 필요.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 로컬 타입 정의로 모든 API 시그니처 확인
- Architecture: HIGH — 기존 코드베이스 패턴 완전 파악
- DB 확장 전략: HIGH — 기존 마이그레이션 패턴 일치
- 배지 우선순위 로직: MEDIUM — 임계값은 ASSUMED
- 줌 레벨 라벨 기준: LOW — 실제 UX 테스트 필요

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (react-kakao-maps-sdk API는 안정적, supercluster API는 안정적)
