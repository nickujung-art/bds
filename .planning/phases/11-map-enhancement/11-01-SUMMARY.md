---
phase: 11-map-enhancement
plan: "01"
subsystem: map-data
tags: [map, clustering, badge, complexes, typescript]
dependency_graph:
  requires: ["11-00"]
  provides: ["ComplexMapItem-expanded", "badge-logic", "determineBadge"]
  affects: ["src/lib/data/complexes-map.ts", "src/components/map/markers/badge-logic.ts"]
tech_stack:
  added: []
  patterns: ["inline-score-transform", "pure-function-badge-logic", "supercluster-properties"]
key_files:
  modified:
    - src/lib/data/complexes-map.ts
    - src/lib/utils/badge-logic.test.ts
    - src/__tests__/complexes-map.test.ts
  created:
    - src/components/map/markers/badge-logic.ts
decisions:
  - "facility_edu 테이블 JOIN 없이 complexes.hagwon_score 컬럼 직접 사용 + 인라인 scoreToGradeInline() 변환"
  - ".eq('status','active') 제거 후 .neq('status','demolished') 으로 교체 — pre_sale 등 다른 status도 마커에 표시"
  - "기존 complexes-map.test.ts 픽스처를 BASE_COMPLEX spread 패턴으로 업데이트 (Rule 1 auto-fix)"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-15"
  tasks_completed: 2
  files_changed: 4
---

# Phase 11 Plan 01: ComplexMapItem 확장 + badge-logic 구현 Summary

ComplexMapItem에 8개 Phase 11 필드를 추가하고, determineBadge() 순수 함수로 배지 우선순위 로직을 확립했다.

## Tasks Completed

| Task | Name | Files | Status |
|------|------|-------|--------|
| 1 | ComplexMapItem + getComplexesForMap + buildClusterIndex 확장 | complexes-map.ts | Done |
| 2 | badge-logic.ts 구현 + 테스트 GREEN | badge-logic.ts, badge-logic.test.ts | Done |

## What Was Built

### Task 1: complexes-map.ts 확장

- `ComplexMapItem` 인터페이스: 5개 → 13개 필드 (avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d, status, built_year, household_count, hagwon_grade 추가)
- `getComplexesForMap` 쿼리: `hagwon_score` 포함 select, `.eq('status','active')` 제거 → `.neq('status','demolished')` 로 교체
- `scoreToGradeInline()` 인라인 헬퍼: complexes.hagwon_score (0~1) → 등급 문자열 (A+~D) 변환
- `buildClusterIndex` properties: 8개 신규 필드 추가

### Task 2: badge-logic.ts + 테스트

- `src/components/map/markers/badge-logic.ts` 신규 생성
- `BadgeType` union type (10가지)
- `BadgeInput` interface
- `determineBadge()` — 3단계 우선순위 순수 함수
- `getPriceColor()` — 평당가 기반 색상 반환 (저/중/고가)
- 16개 테스트 모두 GREEN

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 기존 complexes-map.test.ts 픽스처 타입 불일치**
- **Found during:** Task 1 TypeScript 검증
- **Issue:** `src/__tests__/complexes-map.test.ts` 의 `clusterComplexes` 테스트 픽스처가 구 인터페이스(5필드) 객체를 사용 — ComplexMapItem 확장 후 TS2345 타입 오류 발생
- **Fix:** 픽스처에 `BASE_COMPLEX` spread 객체 추가 (8개 신규 필드 기본값 포함)
- **Files modified:** `src/__tests__/complexes-map.test.ts`
- **Commit:** (included in task commit)

## Verification Results

```
TypeScript: 0 errors (grep -v node_modules)
Tests: 16/16 passed — src/lib/utils/badge-logic.test.ts
```

## Self-Check: PASSED

- [x] `src/lib/data/complexes-map.ts` exists and has 13 fields in ComplexMapItem
- [x] `src/components/map/markers/badge-logic.ts` exists with all 4 exports
- [x] `src/lib/utils/badge-logic.test.ts` imports from correct path
- [x] TypeScript compiles clean
- [x] 16 badge-logic tests GREEN

## Known Stubs

None — all fields are wired from the complexes table. hagwon_grade derived inline from hagwon_score column.

## Threat Flags

None — no new network endpoints or auth paths introduced. getComplexesForMap continues to use server-side Supabase client with RLS anon read policy.
