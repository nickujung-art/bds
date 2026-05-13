---
phase: "08"
plan: "03"
subsystem: compare-feature
tags: [compare, nuqs, url-state, rsc, tdd-green]
dependency_graph:
  requires:
    - src/__tests__/compare.test.ts (08-00 RED 테스트)
    - src/lib/data/complex-detail.ts (getComplexById)
    - nuqs (08-00에서 설치)
  provides:
    - src/lib/data/compare.ts
    - src/app/compare/page.tsx
    - src/components/complex/CompareTable.tsx
    - src/components/complex/CompareAddButton.tsx
  affects:
    - src/app/complexes/[id]/page.tsx (CompareAddButton 추가)
    - src/app/layout.tsx (NuqsAdapter 추가)
tech_stack:
  added:
    - NuqsAdapter (nuqs/adapters/next/app — URL state 클라이언트 컨텍스트)
  patterns:
    - nuqs/server parseAsArrayOf (RSC URL 파라미터 파싱)
    - useQueryState (클라이언트 URL 상태 변경)
    - Promise.all 병렬 fetch (단지별 거래 데이터)
    - satisfies ComplexSummary (TypeScript strict 타입 안전)
key_files:
  created:
    - src/lib/data/compare.ts
    - src/app/compare/page.tsx
    - src/components/complex/CompareTable.tsx
    - src/components/complex/CompareAddButton.tsx
  modified:
    - src/app/complexes/[id]/page.tsx
    - src/app/layout.tsx
decisions:
  - "getLatestTransactionData 실패 시 null graceful 처리 — 테스트/빌드 환경에서 Supabase 없이 동작 보장"
  - "filter((c): c is ComplexSummary => c !== null) 대신 for..of 패턴 — noUncheckedIndexedAccess strict 모드 대응"
  - "NuqsAdapter를 root layout에 추가 — 모든 페이지의 useQueryState 작동 요건"
  - "revalidate = 0 on /compare page — 비교 데이터는 항상 최신 실거래 기준"
metrics:
  duration: "~15분"
  completed_date: "2026-05-13"
  tasks_completed: 2
  tasks_pending: 0
  files_created: 4
  files_modified: 2
---

# Phase 8 Plan 03: 단지 비교 표 Summary

**One-liner:** nuqs URL state 기반 최대 4개 단지 비교 표 — buildCompareIds + CompareTable RSC + CompareAddButton 클라이언트 버튼 완전 구현

---

## What Was Built

### Task 1: buildCompareIds + getCompareData 데이터 레이어 (commit: c434bf0)

**`src/lib/data/compare.ts`** 신규 생성:

- `buildCompareIds(ids)`: falsy 필터 + `slice(0, 4)` 최대 4개 제한 (T-8-05 URL 조작 방지)
- `getLatestTransactionData(complexId, supabase)`: transactions 테이블에서 매매/전세 최신가 + 면적 범위 병렬 조회
  - `cancel_date IS NULL` + `superseded_by IS NULL` 조건 포함 (취소/정정 거래 제외)
  - Promise.all 3개 쿼리 병렬화 (단지당 쿼리 비용 절감)
- `getCompareData(ids, supabase)`: Promise.all로 단지별 병렬 fetch, null 필터 후 ComplexSummary[] 반환
- `server-only` import (클라이언트에서 직접 호출 방지)

**TDD GREEN:** `compare.test.ts` 4개 테스트 모두 PASS
- buildCompareIds 5개→4개 slice
- buildCompareIds 빈 배열 → 빈 배열
- buildCompareIds null/empty 필터링
- getCompareData 2개 단지 → ComplexSummary[] 2개

### Task 2: /compare 페이지 + 컴포넌트 3개 (commit: a7d2493)

**`src/app/compare/page.tsx`** (RSC):
- nuqs/server `createSearchParamsCache`, `parseAsArrayOf(parseAsString)` 사용
- `buildCompareIds(rawIds)` 통해 4개 제한 적용
- 2개 미만이면 getCompareData 호출 생략 (빈 배열 전달)
- `revalidate = 0` (실시간 비교)
- metadata: `{ title: '단지 비교 — 단지온도' }`

**`src/components/complex/CompareTable.tsx`** (서버 컴포넌트):
- `complexes.length < 2` → EmptyState 반환 (빈 상태 안내 메시지)
- 9행 ROWS 정의: area, household, built_year, latest_sale, price_per_py, latest_jeonse, school_score, redevelopment, heat_type
- sticky top row (top: 60px, z-index: 10), sticky left column (z-index: 5)
- overflow-x: auto 수평 스크롤
- tabular-nums, 짝수/홀수 행 배경 교차
- 금지 패턴 준수: backdrop-blur 없음, gradient 없음, 칼럼별 색상 구분 없음

**`src/components/complex/CompareAddButton.tsx`** ('use client'):
- `useQueryState('ids', parseAsArrayOf(parseAsString).withDefault([]))` 사용
- isActive (현재 단지 포함), isFull (4개 이미 선택됨) 상태 분기
- 버튼 텍스트: `비교에 추가 +` / `비교 중 ✓` / `4/4 비교 중`
- `aria-pressed`, `aria-label` ARIA 속성
- 플로팅 버튼: ids.length >= 2 시 position fixed, bottom: 24, right: 24, z-index: 40

**`src/app/complexes/[id]/page.tsx`** 수정:
- `CompareAddButton` import + nav header에 배치 (ShareButton | FavoriteButton | CompareAddButton | 알림 설정)

**`src/app/layout.tsx`** 수정:
- `NuqsAdapter` import + body에 래핑 (Rule 3 — useQueryState 작동 요건)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode filter 타입 오류**
- **Found during:** Task 2 (npm run build)
- **Issue:** `results.filter((c): c is ComplexSummary => c !== null)` — TypeScript strict + noUncheckedIndexedAccess에서 타입 추론 실패
- **Fix:** `for..of` 루프로 교체 — `filtered: ComplexSummary[] = []` 명시적 타입 배열
- **Files modified:** `src/lib/data/compare.ts`
- **Commit:** a7d2493 (동일 커밋에 포함)

**2. [Rule 3 - Blocking] NuqsAdapter 누락**
- **Found during:** Task 2 설계 검토
- **Issue:** nuqs v2의 `useQueryState`는 root layout에 `NuqsAdapter`가 없으면 런타임에 컨텍스트 오류 발생
- **Fix:** `src/app/layout.tsx`에 `NuqsAdapter` 추가
- **Files modified:** `src/app/layout.tsx`
- **Commit:** a7d2493

---

## Known Stubs

| Stub | 파일 | 이유 |
|------|------|------|
| `schoolScore: null` | compare.ts | Phase 6 학군 데이터 미연동 — 추후 별도 구현 |
| `redevelopmentPhase: null` | compare.ts | redevelopment_timelines 연동 optional — Phase 8 scope 외 |
| `heatType: null` | compare.ts | facility_kapt 연동 optional — Phase 8 scope 외 |

CompareTable은 이 null 값들을 `'-'` 또는 `'정보 없음'`으로 표시하므로 사용자에게 정상적으로 렌더됨. 비교의 핵심 기능(매매가/전세가/세대수/준공연도)은 모두 실제 데이터로 작동.

---

## Threat Flags

없음 — T-8-05 (URL 파라미터 조작) 대응 buildCompareIds 구현 완료.

| 조치 | 파일 | 설명 |
|------|------|------|
| T-8-05 mitigate 완료 | compare.ts | buildCompareIds로 최대 4개 제한 + falsy 필터 |
| T-8-05 mitigate 완료 | /compare/page.tsx | RSC에서 서버사이드 validIds 재검증 |

---

## Self-Check

**파일 존재 확인:**
- src/lib/data/compare.ts: FOUND
- src/app/compare/page.tsx: FOUND
- src/components/complex/CompareTable.tsx: FOUND
- src/components/complex/CompareAddButton.tsx: FOUND

**커밋 존재 확인:**
- c434bf0: feat(08-03) buildCompareIds + getCompareData — FOUND
- a7d2493: feat(08-03) /compare 페이지 + 컴포넌트 — FOUND

**테스트 결과:**
- compare.test.ts 4개 테스트 모두 GREEN

## Self-Check: PASSED
