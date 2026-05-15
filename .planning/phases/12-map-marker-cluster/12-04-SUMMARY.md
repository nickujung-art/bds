---
phase: 12-map-marker-cluster
plan: "04"
subsystem: map-integration
tags: [KakaoMap, DongClusterChip, ComplexMarker, zoom-policy, cluster-chip, badge-logic]
dependency_graph:
  requires:
    - "12-01: badge-logic.ts BadgeInput 4종(status/built_year/tx_count_30d/p95_tx_count)"
    - "12-02: DongClusterChip.tsx props(lat/lng/clusterId/clusterIndex)"
    - "12-03: ComplexMarker props 확장(si/gu/recentPrice/recentDate/recentAreaM2/builtYear)"
  provides:
    - "KakaoMap: 3단계 줌 레벨 정책 통합 완료"
    - "Phase 12 전체 통합: HouseMarker + DongClusterChip + hover 툴팁 + 줌 정책"
  affects:
    - "MAP-09: 줌 레벨 정책 완성"
tech_stack:
  added: []
  patterns:
    - "showOnlyCluster = mapLevel >= 10: 명시적 변수로 렌더 분기 의도 명확화"
    - "ClusterMarker → DongClusterChip: 숫자 원형에서 동/구+최고실거래가 사각형 칩으로 교체"
key_files:
  created: []
  modified:
    - src/components/map/KakaoMap.tsx
decisions:
  - "showOnlyCluster 명시적 변수: mapLevel >= 10 인라인 비교 대신 변수로 분리 — 3단계 정책 가독성 향상"
  - "ClusterMarker 완전 제거: import 및 렌더 로직 모두 DongClusterChip으로 교체"
metrics:
  duration: "10분"
  completed_date: "2026-05-15"
  tasks_completed: 1
  files_changed: 1
---

# Phase 12 Plan 04: KakaoMap 통합 — 3단계 줌 레벨 정책 + DongClusterChip Summary

KakaoMap.tsx에서 ClusterMarker를 DongClusterChip으로 교체하고, showOnlyCluster 명시적 변수를 추가하여 Phase 12의 3단계 줌 레벨 정책을 완성했다.

## What Was Built

### KakaoMap.tsx 통합 변경 사항

**1. import 교체**

```typescript
// 이전
import { ClusterMarker } from './ClusterMarker'

// 이후
import { DongClusterChip } from './DongClusterChip'
```

**2. 3단계 줌 레벨 정책 명시화**

```typescript
const showLabel       = mapLevel <= 9   // 실거래가 라벨: level 7~9, ≤6 모두 표시
const showName        = mapLevel <= 6   // 단지명: level ≤6에서만
const showOnlyCluster = mapLevel >= 10  // level ≥10: 클러스터 칩만
```

**3. 렌더 로직 교체**

```typescript
// 클러스터: DongClusterChip (동/구 이름 + 최고 실거래가 사각형 칩)
if (feature.properties.cluster) {
  return (
    <DongClusterChip
      key={`cluster-${...}`}
      lat={lat}
      lng={lng}
      clusterId={feature.properties.cluster_id as number}
      clusterIndex={clusterIndex}
    />
  )
}

// level ≥ 10: 개별 마커 렌더 안 함
if (showOnlyCluster) return null

// level 7~9 / ≤6: ComplexMarker (HouseMarker + hover 툴팁)
return (
  <ComplexMarker
    showLabel={showLabel}
    showName={showName}
    recentPrice={props.recent_price ?? null}
    recentDate={props.recent_date ?? null}
    recentAreaM2={props.recent_area_m2 ?? null}
    builtYear={props.built_year ?? null}
    si={props.si ?? null}
    gu={props.gu ?? null}
    ...
  />
)
```

**4. determineBadge 호출 (4종 BadgeInput 유지)**

```typescript
const badge = determineBadge({
  status:       props.status       ?? 'active',
  built_year:   props.built_year   ?? null,
  tx_count_30d: props.tx_count_30d ?? 0,
  p95_tx_count: p95TxCount,
})
```

p95ViewCount 참조 없음 (Phase 12-03에서 이미 제거됨).

### 수락 기준 검증 결과

| 기준 | 결과 |
|------|------|
| ClusterMarker 제거 | 0건 (완전 제거) |
| DongClusterChip 존재 | 2건 (import + 렌더) |
| showOnlyCluster 존재 | 2건 (선언 + 사용) |
| showName 존재 | 2건 (선언 + 전달) |
| p95ViewCount 없음 | 0건 |
| recentDate/recentAreaM2/builtYear | 3건 모두 |
| TypeScript 오류 | 없음 (tsc --noEmit 통과) |
| 컴파일 | Compiled successfully in 33.1s |

## Deviations from Plan

없음 — 계획대로 정확히 실행됨. KakaoMap.tsx는 이전 wave(12-03)에서 showLabel/showName, ComplexMarker 신규 props 전달, p95ViewCount 제거가 이미 완료되어 있었으므로 이번 plan에서는 ClusterMarker → DongClusterChip 교체와 showOnlyCluster 명시적 변수 추가만 필요했다.

## Known Stubs

없음.

## Threat Flags

없음 — T-12-08(카카오 SDK 키), T-12-09(공개 거래 데이터) 모두 accept 처리. 신규 trust boundary 없음.

## Self-Check: PASSED

- FOUND: src/components/map/KakaoMap.tsx (DongClusterChip import + showOnlyCluster + 렌더 로직)
- FOUND commit a8bc1ae: feat(12-04): KakaoMap 통합 — DongClusterChip + 3단계 줌 레벨 정책
- ClusterMarker 참조: 0건 확인
- DongClusterChip 참조: 2건 확인
- TypeScript: 오류 없음
