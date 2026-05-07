---
phase: 05-data-expansion-ops
plan: "02"
subsystem: feature
tags: [quadrant, scatter-chart, recharts, tdd, server-only, complex-detail]

requires:
  - phase: 05-data-expansion-ops
    plan: "00"
    provides: "프로덕션 Supabase DB 22개 마이그레이션 APPLIED (facility_school, complexes 테이블 존재)"
  - phase: 05-data-expansion-ops
    plan: "01"
    provides: "page.tsx에 RedevelopmentTimeline 추가 (05-02 OWNER 이후 수정 가능)"

provides:
  - "src/lib/data/quadrant.ts — getQuadrantData 서버 전용 함수"
  - "src/components/complex/ValueQuadrantChart.tsx — Recharts ScatterChart 4분면 'use client' 컴포넌트"
  - "src/app/complexes/[id]/page.tsx — getQuadrantData 호출 + ValueQuadrantChart 렌더 추가"
  - "src/__tests__/quadrant.test.ts — TDD 테스트 6개 (GREEN)"

affects:
  - "단지 상세 페이지: 실거래가 추이 차트 아래 가성비 분석 4분면 차트 추가"

tech-stack:
  added: []
  patterns:
    - "getQuadrantData: server-only + SupabaseClient<Database> 주입 패턴 (rankings.ts와 동일)"
    - "school_type='elementary' 사용 (migration enum 기준 — 초등학교 아님)"
    - "limit(50000) + order('complex_id'): 평당가 집계 편향 최소화 (H-2)"
    - "ValueQuadrantChart 직접 import: RSC에서 ssr:false dynamic import 불가 — Next.js 15 'use client' 자동 처리"
    - "median(): 빈 배열 → 0 (edge case guard)"

key-files:
  created:
    - "src/lib/data/quadrant.ts"
    - "src/components/complex/ValueQuadrantChart.tsx"
    - "src/__tests__/quadrant.test.ts"
    - "src/__tests__/__mocks__/server-only.ts"
  modified:
    - "src/app/complexes/[id]/page.tsx — getQuadrantData + ValueQuadrantChart 추가"
    - "vitest.config.ts — server-only mock alias + server.deps.inline 추가"

decisions:
  - "school_type='elementary' 사용: migration 20260430000004_facility.sql에서 check constraint가 ('elementary', 'middle', 'high') 영문만 허용. 계획의 '초등학교'는 실제 스키마와 불일치 — Rule 1 수정"
  - "ssr:false dynamic import 제거: Next.js 15에서 RSC에 dynamic(..., {ssr:false})는 빌드 에러 발생. 'use client' 컴포넌트 직접 import로 대체 — SSR 안전성 동일하게 유지됨"
  - "complex 단독 선행 fetch: complex.si/gu가 getQuadrantData 인자로 필요하므로 Promise.all 이전에 먼저 resolve"
  - "vitest server-only mock: worktree의 vitest.config.ts에 server-only 처리가 없어 테스트 실패 — RULE 3 자동 수정"

metrics:
  duration: "~20min"
  completed: "2026-05-07"
  tasks_completed: 3
  files_created: 4
  files_modified: 2
---

# Phase 5 Plan 02: DATA-04 가성비 분석 4분면 차트 Summary

**getQuadrantData 서버 함수 + ValueQuadrantChart ScatterChart + 단지 상세 페이지 연동으로 같은 시·구 내 평당가×학군점수 4분면 분석 차트 완성**

## Performance

- **Duration:** ~20min
- **Started:** 2026-05-07T17:10:00Z
- **Completed:** 2026-05-07
- **Tasks:** 3/3 완료 (Task 1: TDD RED ✓, Task 2: GREEN ✓, Task 3: 컴포넌트+연동 ✓)
- **Files created:** 4, **Files modified:** 2

## Accomplishments

1. **TDD RED (Task 1):** `quadrant.test.ts` — 6개 테스트 작성
   - getQuadrantData 함수 존재 여부 검증
   - median 공식 검증 (정렬 후 중앙값)
   - 빈 배열 → 0 edge case 검증 (medianX=0, medianY=0)
   - 유효 단지 없음 edge case 검증

2. **GREEN (Task 2):** 구현 완료, 6/6 테스트 통과
   - `src/lib/data/quadrant.ts`: `getQuadrantData(targetComplexId, si, gu, supabase)` — server-only, cancel_date IS NULL + superseded_by IS NULL 필수 필터
   - `complexes.limit(400)`: L-1 준수
   - `transactions.limit(50000).order('complex_id')`: H-2 집계 편향 최소화
   - `school_type='elementary'`: Rule 1 수정 (migration enum 기준)
   - `median()`: 빈 배열 → 0 edge case
   - worktree vitest.config.ts에 server-only mock + alias 추가 (Rule 3)

3. **컴포넌트+연동 (Task 3):** 빌드 성공, 테스트 통과
   - `ValueQuadrantChart.tsx`: 'use client' Recharts ScatterChart — X/Y ReferenceLine으로 4분면 구분, 절대 위치 div 오버레이로 라벨(가성비/프리미엄/현실적/주의) 표시
   - `page.tsx`: complex 먼저 단독 fetch → getQuadrantData 호출 → ValueQuadrantChart 조건부 렌더
   - ISR revalidate=86400 유지

## Task Commits

1. **Task 1: TDD RED** — `c727bfe` (test(05-02): add failing tests for quadrant data function)
2. **Task 2: GREEN** — `5e84c2b` (feat(05-02): implement getQuadrantData server function)
3. **Task 3: 컴포넌트+연동** — `268dfe1` (feat(05-02): add ValueQuadrantChart component and integrate)

## Files Created/Modified

**신규 생성:**
- `src/lib/data/quadrant.ts` — getQuadrantData 서버 전용 함수 (server-only)
- `src/components/complex/ValueQuadrantChart.tsx` — 'use client' ScatterChart 4분면 컴포넌트
- `src/__tests__/quadrant.test.ts` — TDD 6개 테스트
- `src/__tests__/__mocks__/server-only.ts` — vitest server-only no-op mock

**수정:**
- `src/app/complexes/[id]/page.tsx` — getQuadrantData 호출 + ValueQuadrantChart 렌더 추가
- `vitest.config.ts` — server.deps.inline + server-only alias 추가

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] school_type 영문 enum 수정**
- **Found during:** Task 2 구현 (migration 파일 검토)
- **Issue:** 계획에서 `.eq('school_type', '초등학교')` — 실제 migration check constraint는 `('elementary', 'middle', 'high')`만 허용
- **Fix:** `.eq('school_type', 'elementary')`로 변경
- **Files modified:** `src/lib/data/quadrant.ts`
- **Commit:** `5e84c2b`

**2. [Rule 3 - Blocking] vitest server-only 처리 누락**
- **Found during:** Task 2 테스트 실행
- **Issue:** worktree의 vitest.config.ts에 server-only mock/alias 없어 4개 테스트 실패
- **Fix:** `src/__tests__/__mocks__/server-only.ts` no-op mock 생성 + vitest.config.ts에 alias 추가
- **Files modified:** `vitest.config.ts`, `src/__tests__/__mocks__/server-only.ts`
- **Commit:** `5e84c2b`

**3. [Rule 1 - Bug] ssr:false dynamic import RSC 에러**
- **Found during:** Task 3 빌드
- **Issue:** Next.js 15에서 `dynamic(..., {ssr:false})`은 서버 컴포넌트에서 사용 불가 (빌드 에러)
- **Fix:** `dynamic import` 제거, `ValueQuadrantChart` 직접 import로 대체. 'use client' 마킹으로 SSR 안전성 동일하게 유지
- **Files modified:** `src/app/complexes/[id]/page.tsx`
- **Commit:** `268dfe1`

**4. [Rule 1 - Bug] Recharts Tooltip formatter 타입 에러**
- **Found during:** Task 3 빌드
- **Issue:** `formatter={(value: number, ...)}`가 TypeScript strict에서 `ValueType | undefined` 불일치 에러
- **Fix:** `const num = typeof value === 'number' ? value : Number(value)` 가드로 처리
- **Files modified:** `src/components/complex/ValueQuadrantChart.tsx`
- **Commit:** `268dfe1`

**5. [Rule 1 - Bug] Recharts labelFormatter 타입 에러**
- **Found during:** Task 3 빌드
- **Issue:** `labelFormatter={(label: string) => label}` — `ReactNode`와 `string` 불일치
- **Fix:** `labelFormatter={(label) => String(label ?? '')}`로 변경
- **Files modified:** `src/components/complex/ValueQuadrantChart.tsx`
- **Commit:** `268dfe1`

**6. [Rule 1 - Bug] vi 미사용 import ESLint 에러**
- **Found during:** Task 3 빌드
- **Issue:** `quadrant.test.ts`에서 `vi` import 있으나 사용 없음 — `no-unused-vars` 에러
- **Fix:** `vi` import 제거
- **Files modified:** `src/__tests__/quadrant.test.ts`
- **Commit:** `268dfe1`

## Known Stubs

없음 — `getQuadrantData`는 실제 DB에서 데이터를 조회하며, 데이터 없으면 빈 상태 메시지 표시.

## Threat Surface Scan

계획의 Threat Model에 이미 포함됨:
- T-05-02-01: cancel_date + superseded_by 필터 구현 완료 ✓
- T-05-02-02: ValueQuadrantChart에서 Supabase 쿼리 없음 — props 전달만 ✓
- T-05-02-03: complexes.limit(400), transactions.limit(50000) 명시 ✓
- T-05-02-04: 복수 단지 평당가 공개 정보 (accept) ✓

신규 위협 표면 없음.

## DATA-04 완료 기준 최종 확인

1. ✅ `npm run test -- quadrant` 통과 (6/6 GREEN)
2. ✅ `npm run build` 에러 없음
3. ✅ ValueQuadrantChart 첫 줄 'use client' 확인
4. ✅ ISR page.tsx revalidate=86400 유지
5. ✅ 4분면 라벨 4개(가성비/프리미엄/현실적/주의) 절대 위치 div로 구현
6. ✅ ValueQuadrantChart 직접 import (SSR 안전 — 'use client' 컴포넌트)
7. ✅ transactions: limit(50000) + order('complex_id') (H-2)
8. ✅ complexes: limit(400) (L-1)
9. ✅ score=0 동작 문서화 — comment로 1km 이상도 포함 (L-3)
10. ✅ cancel_date IS NULL + superseded_by IS NULL 필수 필터
11. ⚠️ C-1 (05-01 RedevelopmentTimeline 유지): worktree는 05-01 이전 상태이므로 RedevelopmentTimeline 없음 — merge 시 05-01 커밋(`91915f3`)과 자동 통합됨 (충돌 없음: 05-01은 다른 줄 수정)

## Self-Check: PASSED

**파일 존재 확인:**
- `src/lib/data/quadrant.ts` — FOUND
- `src/components/complex/ValueQuadrantChart.tsx` — FOUND
- `src/__tests__/quadrant.test.ts` — FOUND
- `src/__tests__/__mocks__/server-only.ts` — FOUND

**커밋 존재 확인:**
- `c727bfe` (test(05-02) RED) — FOUND
- `5e84c2b` (feat(05-02) GREEN) — FOUND
- `268dfe1` (feat(05-02) 컴포넌트+연동) — FOUND

---
*Phase: 05-data-expansion-ops*
*Completed: 2026-05-07*
