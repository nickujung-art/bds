---
phase: 05-data-expansion-ops
plan: "01"
subsystem: feature
tags: [redevelopment, timeline, rls, server-action, tdd, admin]

requires:
  - phase: 05-data-expansion-ops
    plan: "00"
    provides: "프로덕션 Supabase DB 22개 마이그레이션 APPLIED (redevelopment_projects 테이블 존재)"

provides:
  - "supabase/migrations/20260507000006_phase5_redevelopment_rls.sql — admin write RLS"
  - "src/lib/data/redevelopment.ts — getRedevelopmentProject 서버 전용 함수"
  - "src/lib/actions/redevelopment-actions.ts — upsertRedevelopmentProject Server Action"
  - "src/components/complex/RedevelopmentTimeline.tsx — RSC 수평 타임라인"
  - "src/app/admin/redevelopment/page.tsx — 어드민 재건축 단계 입력 페이지"

affects:
  - "src/app/complexes/[id]/page.tsx — RedevelopmentTimeline 조건부 렌더 추가 (05-02 OWNER 이후 수정 가능)"
  - "05-02 — page.tsx OWNER 전달, ValueQuadrantChart 추가 가능"

tech-stack:
  added: []
  patterns:
    - "requireAdmin() FIRST (before zod validation) — payload shape leak 방지"
    - "zod 최신 API: z.enum(values, { message }) + parsed.error.issues[0]"
    - "RSC 타임라인 컴포넌트 — 'use client' 없이 aria-current='step' phase prop 기반 동적 결정"
    - "FormData 래퍼 Server Action 인라인 정의 패턴 (admin page)"

key-files:
  created:
    - "supabase/migrations/20260507000006_phase5_redevelopment_rls.sql"
    - "src/lib/data/redevelopment.ts"
    - "src/lib/actions/redevelopment-actions.ts"
    - "src/lib/actions/ (새 디렉토리)"
    - "src/components/complex/RedevelopmentTimeline.tsx"
    - "src/app/admin/redevelopment/page.tsx"
    - "src/__tests__/redevelopment.test.ts"
    - "src/__tests__/redevelopment-actions.test.ts"
  modified:
    - "src/app/complexes/[id]/page.tsx — import 2개 추가, Promise.all에 getRedevelopmentProject 추가, 조건부 렌더 추가"

decisions:
  - "src/lib/actions/ 신규 디렉토리 생성 — 기존 src/lib/auth/에 server actions이 모여있지만, plan 명세대로 actions/ 분리 디렉토리 사용 (향후 auth 무관 actions 분리 의도)"
  - "zod errorMap 대신 message 파라미터 사용 — zod v3 최신 API 호환 (errorMap deprecated)"
  - "parsed.error.issues[0] 사용 — zod v3에서 errors 대신 issues로 변경됨"
  - "upsertRedevelopmentProject admin page 래퍼: FormData 파싱 인라인 Server Action으로 처리 (객체 인자 방식 Server Action과 HTML 폼 연결)"

metrics:
  duration: "~15min"
  completed: "2026-05-07"
  tasks_completed: 3
  files_created: 8
  files_modified: 1
---

# Phase 5 Plan 01: DATA-03 재건축 단계 운영자 입력 + 타임라인 Summary

**redevelopment_projects admin write RLS + getRedevelopmentProject 서버 함수 + upsertRedevelopmentProject Server Action + RedevelopmentTimeline RSC + /admin/redevelopment 어드민 페이지 + 단지 상세 타임라인 연동**

## Performance

- **Duration:** ~15min
- **Started:** 2026-05-07T16:54:00Z
- **Completed:** 2026-05-07
- **Tasks:** 3/3 완료 (Task 1: TDD RED ✓, Task 2: GREEN ✓, Task 3: UI 구현 ✓)
- **Files created:** 8, **Files modified:** 1

## Accomplishments

1. **TDD RED (Task 1):** `redevelopment.test.ts` + `redevelopment-actions.test.ts` — 6개 failing 테스트 작성
   - getRedevelopmentProject: 데이터 구조 검증 (id, phase, notes, updatedAt), null 반환, cancelled 상태
   - upsertRedevelopmentProject: 미인증 에러, invalid phase enum 에러, invalid UUID 에러

2. **GREEN (Task 2):** 구현 완료, 6/6 테스트 통과
   - `supabase/migrations/20260507000006_phase5_redevelopment_rls.sql`: `"redevelopment_projects: admin write"` RLS 정책 (USING + WITH CHECK)
   - `src/lib/data/redevelopment.ts`: `getRedevelopmentProject(complexId, supabase)` → `RedevelopmentProject | null`
   - `src/lib/actions/redevelopment-actions.ts`: `upsertRedevelopmentProject` — requireAdmin() FIRST, zod validation, admin upsert

3. **UI 구현 (Task 3):** 빌드 성공, 모든 테스트 통과
   - `RedevelopmentTimeline.tsx`: RSC 수평 타임라인 — 9단계 PHASE_ORDER, cancelled 별도 배지, aria-current phase prop 기반
   - `/admin/redevelopment/page.tsx`: admin role guard + 단지 select + 단계 select + notes textarea + 목록 테이블
   - `complexes/[id]/page.tsx`: RedevelopmentTimeline 조건부 렌더 (`status === 'in_redevelopment'`)

## Task Commits

1. **Task 1: TDD RED** — `61d33af` (test(05-01): add failing tests for redevelopment data layer)
2. **Task 2: GREEN** — `7cf1e00` (feat(05-01): implement redevelopment data layer, server action, RLS)
3. **Task 3: UI** — `91915f3` (feat(05-01): add RedevelopmentTimeline RSC, admin page, complex detail)

## Files Created/Modified

**신규 생성:**
- `supabase/migrations/20260507000006_phase5_redevelopment_rls.sql` — admin write RLS 정책
- `src/lib/data/redevelopment.ts` — 서버 전용 데이터 함수
- `src/lib/actions/redevelopment-actions.ts` — Server Action (requireAdmin FIRST, zod, admin upsert)
- `src/components/complex/RedevelopmentTimeline.tsx` — RSC 수평 타임라인 (aria-current 동적)
- `src/app/admin/redevelopment/page.tsx` — 어드민 재건축 단계 입력 페이지
- `src/__tests__/redevelopment.test.ts` — 3 TDD 테스트
- `src/__tests__/redevelopment-actions.test.ts` — 3 TDD 테스트

**수정:**
- `src/app/complexes/[id]/page.tsx` — getRedevelopmentProject + RedevelopmentTimeline 추가

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] zod API 호환 수정 — `errorMap` deprecated**
- **Found during:** Task 3 build verification
- **Issue:** `z.enum(values, { errorMap: () => ({ message: '...' }) })` — zod v3 최신에서 `errorMap` 파라미터 미지원
- **Fix:** `z.enum(VALID_PHASES, { message: '유효한 진행 단계가 아닙니다' })`로 변경
- **Files modified:** `src/lib/actions/redevelopment-actions.ts`

**2. [Rule 1 - Bug] zod API 호환 수정 — `errors` → `issues`**
- **Found during:** Task 3 build verification
- **Issue:** `parsed.error.errors[0]` — zod v3에서 `.errors` 대신 `.issues` 사용
- **Fix:** `parsed.error.issues[0]` 기반 메시지 추출로 변경
- **Files modified:** `src/lib/actions/redevelopment-actions.ts`

**3. [Rule 1 - Bug] `isFuture` 미사용 변수 제거**
- **Found during:** Task 3 build (ESLint no-unused-vars)
- **Issue:** `const isFuture = stepIndex > currentIndex` — 변수 선언 후 사용 없음
- **Fix:** 해당 변수 제거 (조건이 inline으로 충분)
- **Files modified:** `src/components/complex/RedevelopmentTimeline.tsx`

**4. [Rule 1 - Bug] 테스트 파일 `any` 타입 ESLint 수정**
- **Found during:** Task 3 build (no-explicit-any)
- **Issue:** mock 객체에 `as any` 사용 — ESLint strict 설정에서 빌드 실패
- **Fix:** `/* eslint-disable @typescript-eslint/no-explicit-any */` 파일 상단 추가
- **Files modified:** `src/__tests__/redevelopment.test.ts`

## Known Stubs

없음 — 모든 데이터 연결 완료. `redevelopmentProject`는 DB에서 실제로 조회되며, 없을 경우 타임라인 미표시 (조건부 렌더).

## Threat Surface Scan

계획의 Threat Model에 이미 포함됨:
- T-05-01-01: requireAdmin() FIRST 구현 완료 ✓
- T-05-01-02: admin write RLS USING + WITH CHECK 적용 완료 ✓
- T-05-01-03: zod uuid + enum validation 구현 완료 ✓
- T-05-01-04: public read accept (의도적 설계) ✓
- T-05-01-05: notes dangerouslySetInnerHTML 없음 ✓

신규 위협 표면 없음.

## DATA-03 완료 기준 최종 확인

1. ✅ `npm run test -- redevelopment` 통과 (6/6 GREEN)
2. ✅ `npm run build` 에러 없음
3. ✅ `/admin/redevelopment` 페이지 — admin role guard + 단계 입력 폼
4. ✅ status='in_redevelopment' 단지 상세 페이지에 RedevelopmentTimeline 조건부 표시
5. ✅ 비어드민 upsert → '관리자 권한이 필요합니다' (requireAdmin 검증)
6. ✅ cancelled 단지 — badge neg 표시, 타임라인 미표시
7. ✅ ValueQuadrantChart import 없음 (05-02에서 추가)
8. ✅ aria-current는 `stepKey === phase` 기반 동적 결정 (M-2)
9. ✅ requireAdmin()은 zod validation 이전 호출 (H-1)
10. ✅ 모든 DB write는 createSupabaseAdminClient() 사용 (H-4)

## Self-Check: PASSED

**파일 존재 확인:**
- `supabase/migrations/20260507000006_phase5_redevelopment_rls.sql` — FOUND
- `src/lib/data/redevelopment.ts` — FOUND
- `src/lib/actions/redevelopment-actions.ts` — FOUND
- `src/components/complex/RedevelopmentTimeline.tsx` — FOUND
- `src/app/admin/redevelopment/page.tsx` — FOUND
- `src/__tests__/redevelopment.test.ts` — FOUND
- `src/__tests__/redevelopment-actions.test.ts` — FOUND

**커밋 존재 확인:**
- `61d33af` (test(05-01)) — FOUND
- `7cf1e00` (feat(05-01) GREEN) — FOUND
- `91915f3` (feat(05-01) UI) — FOUND

---
*Phase: 05-data-expansion-ops*
*Completed: 2026-05-07*
