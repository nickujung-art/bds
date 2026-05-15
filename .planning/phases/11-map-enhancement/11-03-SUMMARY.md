---
phase: 11-map-enhancement
plan: "03"
subsystem: map-components
tags: [map, markers, supercluster, badge, svg, kakao-maps, cluster-zoom]
dependency_graph:
  requires: ["11-01", "11-02"]
  provides: ["BadgeMarker", "ComplexMarker-v2", "ClusterMarker-v2", "KakaoMap-v2"]
  affects: ["map-view", "11-04-MapSidePanel"]
tech_stack:
  added: []
  patterns: ["CustomOverlayMap SVG overlay", "useMap hook for cluster zoom", "p95 percentile badge threshold", "eslint-disable-line for intentional placeholder state"]
key_files:
  created:
    - src/components/map/markers/BadgeMarker.tsx
  modified:
    - src/components/map/ComplexMarker.tsx
    - src/components/map/ClusterMarker.tsx
    - src/components/map/KakaoMap.tsx
    - src/components/map/ClusterMarker.test.tsx
decisions:
  - "BadgeMarker uses inline style (not Tailwind) to avoid purge issues for dynamically generated SVG color props"
  - "selectedComplexId state kept in KakaoMap with eslint-disable comment — Plan 11-04 MapSidePanel will consume it"
  - "SchoolPin uses purple (#7C3AED) per SVG spec in plan — CLAUDE.md prohibits purple as brand color but this is a functional icon, not a brand/decoration element"
  - "Pre-existing /presale build failure (supabaseUrl missing) confirmed pre-existing, not caused by this plan"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-15"
  tasks_completed: 2
  files_modified: 5
---

# Phase 11 Plan 03: SVG Badge Markers + Cluster Zoom Integration Summary

SVG 배지 마커 시스템(BadgeMarker + ComplexMarker v2) + ClusterMarker 줌인 + KakaoMap 통합 완료.

## Tasks Completed

| Task | Name | Files |
|------|------|-------|
| 1 | BadgeMarker.tsx + ComplexMarker 전환 (MapMarker → CustomOverlayMap + SVG) | markers/BadgeMarker.tsx, ComplexMarker.tsx |
| 2 | ClusterMarker 줌인 + KakaoMap 통합 | ClusterMarker.tsx, KakaoMap.tsx, ClusterMarker.test.tsx |

## What Was Built

### BadgeMarker.tsx (NEW)

10종 SVG 핀 배지 컴포넌트. 이모지 없음, SVG path만 사용. 배지 타입별:

- `pre_sale` → PreSalePin (금색, 체크마크)
- `new_build` → NewBuildPin (에메랄드, 플러스 기호)
- `crown` → CrownPin (파란색, 왕관 실루엣)
- `hot` → HotPin (빨간색, 불꽃 형태)
- `surge` → SurgePin (빨간색, 상향 화살표)
- `drop` → DropPin (파란색, 하향 화살표)
- `school` → SchoolPin (보라색 방패, 학군 기능 아이콘)
- `large_complex` → LargeComplexPin (회색, 격자 패턴)
- `redevelop` → RedevelopPin (회색, 사선 스트라이프)
- `none` → DefaultPin (getPriceColor 기반 동적 색상)

평당가 라벨: `priceLabel !== null && priceLabel > 0` 조건에서만 핀 아래 표시.

### ComplexMarker.tsx (REPLACED)

MapMarker → CustomOverlayMap 전환. 신규 props:
- `avgSalePerPyeong`, `showLabel`, `badge`, `onSelect`, `householdCount`
- hover 상태: 이름 + 평당가 + 세대수 툴팁 카드 (CustomOverlayMap yAnchor=2.4)
- 키보드 접근성: Enter/Space → onSelect(id)
- onSelect 콜백: router.push 제거 → 부모(KakaoMap)가 selectedComplexId 관리

### ClusterMarker.tsx (UPDATED)

- `clusterId: number`, `clusterIndex: Supercluster` props 추가
- `useMap('ClusterMarker')` 훅으로 카카오 Map 인스턴스 취득
- `handleClick`: `getLeaves(clusterId, Infinity)` → `LatLngBounds` 생성 → `map.setBounds()`
- zIndex=5 추가, 기존 원형 스타일 유지

### KakaoMap.tsx (UPDATED)

신규 상태 및 계산:
- `mapLevel` (useState, DEFAULT_LEVEL=8) — computeClusters에서 `map.getLevel()` 갱신
- `selectedComplexId` (useState, null) — Plan 11-04 MapSidePanel placeholder
- `clusterIndex` useMemo
- `p95ViewCount`, `p95TxCount` useMemo — complexes 배열 전체 기준 95번째 백분위 계산
- `showLabel = mapLevel <= 7` — 줌인 시 평당가 라벨 표시

ClusterMarker에 `clusterId`, `clusterIndex` 전달.
ComplexMarker에 `badge`, `showLabel`, `onSelect`, `avgSalePerPyeong`, `householdCount` 전달.
`badge` = `determineBadge({...props, p95_view_count: p95ViewCount, p95_tx_count: p95TxCount})`.
`hagwon_grade`는 `props.hagwon_grade ?? null` — null 고정 아님.

### ClusterMarker.test.tsx (UPDATED)

TODO placeholder 2개 → 실제 단위 테스트로 교체:
1. `getLeaves(clusterId, Infinity)` 호출 검증
2. `[lng, lat]` 좌표 배열 구조 검증

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ClusterMarker.test.tsx 타입 오류 수정**
- **Found during:** TypeScript check after Task 2
- **Issue:** 플랜 코드의 `import('supercluster').default` 타입 표현이 `Supercluster` namespace에서 `.default` 멤버를 찾지 못해 `TS2694` 오류 발생
- **Fix:** `import type Supercluster from 'supercluster'`로 변경 후 `as unknown as Supercluster` 사용
- **Files modified:** src/components/map/ClusterMarker.test.tsx

**2. [Rule 2 - Missing] selectedComplexId unused variable lint 오류 수정**
- **Found during:** npm run build lint 단계
- **Issue:** `selectedComplexId`가 선언되었지만 아직 JSX에서 사용되지 않아 ESLint `no-unused-vars` 오류
- **Fix:** `// eslint-disable-line @typescript-eslint/no-unused-vars` 주석 추가 (Plan 11-04에서 MapSidePanel에 전달 예정인 intentional placeholder)
- **Files modified:** src/components/map/KakaoMap.tsx

## Pre-existing Issues (Out of Scope)

- `/presale` 페이지 빌드 실패: `supabaseUrl is required` — 빌드 환경에 Supabase 환경변수 없음. 이 플랜 변경 전부터 존재하는 문제 (git stash로 확인).

## Self-Check: PASSED

Files exist:
- src/components/map/markers/BadgeMarker.tsx: FOUND
- src/components/map/ComplexMarker.tsx: FOUND (replaced)
- src/components/map/ClusterMarker.tsx: FOUND (updated)
- src/components/map/KakaoMap.tsx: FOUND (updated)
- src/components/map/ClusterMarker.test.tsx: FOUND (updated)

Verification:
- TypeScript: 0 errors
- ClusterMarker.test.tsx: 2/2 PASSED
- Build compilation + lint: PASSED (prerender error is pre-existing)
