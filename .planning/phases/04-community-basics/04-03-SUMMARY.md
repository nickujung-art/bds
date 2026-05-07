---
phase: "04"
plan: "03"
subsystem: community-cafe-link-sla
tags: [cafe-link, sla, admin, reports, server-component, comm-03, comm-04]
dependency_graph:
  requires:
    - Phase 4 Plan 00 (reports 테이블 + report_target_type enum)
    - Phase 4 Plan 01 (ReviewList.tsx CommentSection 연결)
  provides:
    - CafeLink 컴포넌트: 단지명으로 네이버 카페 검색 외부 링크
    - getSlaState 함수: 신고 SLA 3단계 분류 (ok/warning/overdue)
    - admin/reports 페이지: SLA 배지 컬럼 + comment target_type 지원
  affects:
    - src/components/reviews/ReviewList.tsx (CafeLink 추가)
    - src/components/reviews/NeighborhoodOpinion.tsx (complexName prop 전달)
    - src/app/complexes/[id]/page.tsx (complexName 전달 + getReviewsWithComments 사용)
tech_stack:
  added: []
  patterns:
    - encodeURIComponent로 단지명 URL 인코딩 (XSS/URL 인젝션 방지)
    - getSlaState 서버 컴포넌트에서 계산 (클라이언트 시간 조작 방지)
    - IIFE 패턴으로 td 내 복잡한 조건부 렌더링
    - database.ts 타입 미등록 테이블 → as any 캐스트 (임시, DB 재생성 전까지)
key_files:
  created:
    - src/app/admin/reports/page.tsx
    - src/components/admin/ReportActions.tsx
    - src/lib/auth/admin-actions.ts
    - src/lib/data/comments.ts
    - src/lib/auth/comment-actions.ts
    - src/components/reviews/CommentSection.tsx
  modified:
    - src/components/reviews/ReviewList.tsx
    - src/components/reviews/NeighborhoodOpinion.tsx
    - src/app/complexes/[id]/page.tsx
decisions:
  - "CafeLink는 후기 목록 최상단에 배치 — 빈 후기 상태에서도 카페 링크가 노출되도록"
  - "complexName prop은 optional — 하위 호환성 유지, 전달 없으면 CafeLink 미표시"
  - "04-01 의존 파일(CommentSection, comments.ts, comment-actions.ts) 이 worktree에 반입 — worktree가 04-01 병합 이전 기반이므로"
  - "admin/reports/page.tsx 신규 생성 — worktree에 03-04 병합 결과가 없어 main 버전 기반으로 SLA 기능 추가"
  - "SLA 계산을 서버 컴포넌트(revalidate=0)에서 수행 — 클라이언트 시간 조작 불가"
metrics:
  duration: "약 25분"
  completed_date: "2026-05-07"
  tasks_completed: 2
  files_created: 6
  files_modified: 3
---

# Phase 4 Plan 03: 카페 외부 링크 + 신고 SLA 배지 Summary

네이버 카페 외부 링크(COMM-03)와 어드민 신고 SLA 배지(COMM-04) 구현 완료.

## What Was Built

**CafeLink (COMM-03):** `ReviewList.tsx`에 `CafeLink` 함수 컴포넌트를 추가했다. URL은 `https://cafe.naver.com/ArticleSearchList.nhn?search.query=${encodeURIComponent(complexName)}`로 생성되며 `target="_blank"`, `rel="noopener noreferrer"`, `aria-label`이 포함된다. `complexName` prop이 없으면 CafeLink가 렌더링되지 않는다. `NeighborhoodOpinion.tsx`에 `complexName` prop을 추가하고 `ReviewList`로 전달한다. `page.tsx`는 `complex.canonical_name`을 `NeighborhoodOpinion`에 전달한다.

**SLA 배지 (COMM-04):** `admin/reports/page.tsx`에 `getSlaState` 함수를 추가했다. 신고 접수 후 경과 시간 기준으로 ok(<16h), warning(16~24h), overdue(>24h) 3단계로 분류한다. 테이블 헤더에 'SLA' 컬럼이 추가됐고, pending 신고는 SLA 배지를 표시한다. 처리 완료된 신고는 '—'를 표시한다. `ReportRow.target_type`에 `'comment'`가 추가됐다.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: ReviewList CafeLink (COMM-03) | `b4cee87` | feat(04-03): ReviewList.tsx 카페 외부 링크 CafeLink 추가 (COMM-03) |
| Task 2: admin/reports SLA 배지 (COMM-04) | `1e305e7` | feat(04-03): admin/reports SLA 배지 + 'comment' target_type 추가 (COMM-04) |

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| CafeLink URL: cafe.naver.com/ArticleSearchList.nhn + encodeURIComponent | PASS |
| target="_blank", rel="noopener noreferrer", aria-label 포함 | PASS |
| ReviewList props에 complexName 추가, NeighborhoodOpinion → ReviewList 전달 | PASS |
| ReportRow.target_type에 'comment' 추가 | PASS |
| getSlaState 함수 존재, 3단계 분류 | PASS |
| SLA 컬럼 헤더에 추가 (일시 다음) | PASS |
| pending 신고: SLA 배지 표시, 처리 완료: '—' | PASS |
| npm run lint 에러 없이 통과 | PASS |
| npm run build | BLOCKED (pre-existing, 아래 참조) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] worktree에 04-01 의존 파일 미존재**
- **Found during:** Task 1 시작 시
- **Issue:** 이 worktree가 `8872804` 기준으로 생성되어 04-01 병합 커밋(`edf452d`)이 없음. `CommentSection.tsx`, `comments.ts`, `comment-actions.ts` 파일이 없어 ReviewList.tsx 업데이트 불가
- **Fix:** local main 브랜치에서 해당 파일들을 가져와 worktree에 직접 생성
- **Files created:** `src/components/reviews/CommentSection.tsx`, `src/lib/data/comments.ts`, `src/lib/auth/comment-actions.ts`
- **Commit:** `b4cee87`

**2. [Rule 3 - Blocking] worktree에 admin/reports 관련 파일 미존재**
- **Found during:** Task 2 시작 시
- **Issue:** `src/app/admin/reports/page.tsx`, `src/components/admin/ReportActions.tsx`, `src/lib/auth/admin-actions.ts`가 03-04 병합 결과로 main에만 존재, worktree에 없음
- **Fix:** main 브랜치에서 파일 내용을 가져와 SLA 기능을 포함한 버전으로 직접 생성
- **Files created:** 위 3개 파일
- **Commit:** `1e305e7`

**3. [Rule 2 - Missing critical] database.ts 타입 미등록 테이블 쿼리**
- **Found during:** Task 2 lint 실행 시
- **Issue:** reports 테이블 및 profiles.suspended_at이 database.ts 타입에 없어 TypeScript 에러 발생
- **Fix:** 기존 코드베이스 패턴(as any + eslint-disable comment)으로 처리
- **Files modified:** `src/app/admin/reports/page.tsx`, `src/lib/auth/admin-actions.ts`
- **Commit:** `1e305e7`

### Pre-existing Issues (Out of Scope)

**build 실패: public/fonts/PretendardVariable.woff2 미존재**
- worktree에 `public/fonts` 디렉토리가 없음. main에는 `PretendardSubset.ttf`만 있고 `PretendardVariable.woff2`가 없어 `src/app/layout.tsx`의 localFont 참조가 실패
- 이는 이 plan의 변경사항이 아닌 pre-existing 인프라 문제
- TypeScript 타입 체크(`npx tsc --noEmit`)는 우리 파일에서 에러 없음

## Threat Flags

None — 위협 모델에서 식별된 위협 모두 설계 내에서 처리됨:
- T-04-03-01: `encodeURIComponent(complexName)` 적용 완료
- T-04-03-02: `noopener noreferrer`로 referer 차단 완료
- T-04-03-03: 기존 requireAdmin() 가드 유지 (이 plan은 UI 수정만)

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| ReviewList.tsx exists | FOUND |
| admin/reports/page.tsx exists | FOUND |
| CommentSection.tsx exists | FOUND |
| comments.ts exists | FOUND |
| comment-actions.ts exists | FOUND |
| ReportActions.tsx exists | FOUND |
| admin-actions.ts exists | FOUND |
| SUMMARY.md exists | FOUND |
| Commit b4cee87 exists | FOUND |
| Commit 1e305e7 exists | FOUND |
| cafe.naver.com URL in ReviewList.tsx | FOUND |
| encodeURIComponent in ReviewList.tsx | FOUND |
| getSlaState in admin/reports/page.tsx | FOUND |
| 'comment' target_type in admin/reports/page.tsx | FOUND |
