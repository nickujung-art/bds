---
phase: "04"
plan: "01"
subsystem: community-comments
tags: [server-action, tdd, comment, review, supabase, client-component]
dependency_graph:
  requires:
    - Phase 4 Plan 00 (comments 테이블 RLS 마이그레이션)
  provides:
    - submitComment Server Action (auth-first, 10~500자 검증, DB insert)
    - deleteComment Server Action (auth-first, eq(user_id) 이중 방어)
    - getReviewsWithComments (N+1 방지 JOIN 쿼리)
    - CommentSection Client Component (댓글 목록 + 토글 + 작성 폼)
    - ReviewList 확장 (CommentSection 연결, GPS 배지 토큰 정합)
  affects:
    - src/app/complexes/[id]/page.tsx (getReviewsWithComments 사용)
    - src/components/reviews/NeighborhoodOpinion.tsx (ReviewWithComments[] 타입)
tech_stack:
  added: []
  patterns:
    - auth-first Server Action 패턴 (review-actions.ts 동일)
    - useTransition으로 pending 상태 처리 (ReviewForm 동일)
    - database.ts 타입 미등록 테이블 → as any 캐스트 (임시, Phase 4 DB 재생성 전까지)
    - NeighborhoodOpinion 클라이언트에서 currentUserId 추출 → ReviewList 전달
key_files:
  created:
    - src/lib/auth/comment-actions.test.ts
    - src/lib/auth/comment-actions.ts
    - src/lib/data/comments.ts
    - src/components/reviews/CommentSection.tsx
  modified:
    - src/components/reviews/ReviewList.tsx
    - src/components/reviews/NeighborhoodOpinion.tsx
    - src/app/complexes/[id]/page.tsx
decisions:
  - "database.ts 자동 생성 없이 Comment 인터페이스 수동 정의 — Phase 4 마이그레이션은 main 브랜치에만 있고 worktree branch가 이전 커밋 기반이므로"
  - "currentUserId는 NeighborhoodOpinion(Client) useEffect에서 추출 — page.tsx는 revalidate=86400 ISR이므로 cookie 기반 서버 auth 호출 부적합"
  - "as any 캐스트로 comments 테이블 쿼리 — database.ts TypeScript 타입이 comments 테이블을 아직 포함하지 않음 (04-00 마이그레이션이 worktree에 없음)"
metrics:
  duration: "약 30분"
  completed_date: "2026-05-07"
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase 4 Plan 01: 후기 댓글 시스템 Summary

Server Action + 데이터 레이어 + Client Component UI를 포함한 후기 댓글 시스템 전체 구현 완료.

## What Was Built

`submitComment`/`deleteComment` Server Action (auth-first 패턴, 10~500자 검증, user_id RLS 이중 방어), `getReviewsWithComments` N+1 방지 JOIN 쿼리, `CommentSection` Client Component (댓글 목록 3개 기본 표시/전체 토글/작성 폼), `ReviewList` 확장 (CommentSection 연결, GPS 배지 CSS 토큰 정합).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: comment-actions + comments (TDD GREEN) | `b03466f` | feat(04-01): comment-actions.ts + comments.ts 구현 (GREEN) |
| Task 2: CommentSection + ReviewList 수정 | `d31d925` | feat(04-01): CommentSection.tsx 구현 + ReviewList.tsx 수정 |

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| comment-actions.test.ts 5개 테스트 GREEN | PASS |
| submitComment — auth-first + 길이 검증 + insert + revalidatePath | PASS |
| ReviewList — getReviewsWithComments로 N+1 없이 한 번 쿼리 | PASS |
| CommentSection — 3개 기본 표시 + N개 더 보기 토글 + 작성 폼 | PASS |
| 미로그인 시 '로그인하면 댓글을 달 수 있어요' 텍스트 | PASS |
| GPS 배지 토큰 정합 (--bg-positive-tint, aria-label) | PASS |
| npm run build 에러 없이 완료 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] worktree에 comment-actions.test.ts 미존재**
- **Found during:** Task 1 시작 시
- **Issue:** 04-00 플랜의 RED 테스트 스캐폴드 커밋(`7f019d9`)이 main 브랜치에만 존재. worktree 브랜치(`8872804` 기반)가 04-00 커밋들 이전 상태로 생성됨
- **Fix:** main 브랜치에서 테스트 파일 내용을 참조해 worktree에 동일 파일 생성
- **Files modified:** src/lib/auth/comment-actions.test.ts (신규)

**2. [Rule 3 - Blocking] worktree에 public/fonts/PretendardVariable.woff2 미존재**
- **Found during:** Task 2 빌드 검증 시
- **Issue:** fonts/ 디렉토리가 .gitignore에 포함되어 worktree에 폰트 파일 없음. layout.tsx에서 localFont()로 참조하여 빌드 실패
- **Fix:** 로컬 main 리포지토리 `public/fonts/` 디렉토리에서 폰트 파일 복사
- **Files modified:** 없음 (gitignored 파일, 인프라 조작)

**3. [Rule 1 - Bug] database.ts에 comments 테이블 타입 미등록**
- **Found during:** Task 2 lint 검증 시
- **Issue:** 04-00 마이그레이션이 worktree에 없어 `database.ts`가 `comments` 테이블을 모름. TypeScript 컴파일 오류
- **Fix:** `comment-actions.ts`와 `comments.ts`에서 `supabase as any` 캐스트 사용 + `Comment` 인터페이스 수동 정의
- **Files modified:** src/lib/auth/comment-actions.ts, src/lib/data/comments.ts

**4. [Rule 2 - Missing] NeighborhoodOpinion에서 currentUserId 전달 누락**
- **Found during:** Task 2 구현 중
- **Issue:** ReviewList가 currentUserId를 받도록 변경했으나 NeighborhoodOpinion이 이를 전달하지 않음. page.tsx는 ISR(revalidate=86400)이므로 서버에서 auth 호출 부적합
- **Fix:** NeighborhoodOpinion useEffect의 기존 auth.getUser() 호출에서 userId 추출 → ReviewList에 전달
- **Files modified:** src/components/reviews/NeighborhoodOpinion.tsx

## Known Stubs

없음 — 모든 핵심 기능이 구현됨. CommentSection은 `initialComments` prop으로 데이터를 받으므로 추가 fetch 없이 동작함.

## Threat Flags

없음 — 신규 네트워크 엔드포인트 없음. submitComment/deleteComment Server Action은 RLS + 애플리케이션 레벨 이중 방어 적용 (T-04-01-01, T-04-01-02 mitigated).

## Self-Check: PASSED

- src/lib/auth/comment-actions.ts: FOUND
- src/lib/data/comments.ts: FOUND
- src/components/reviews/CommentSection.tsx: FOUND
- src/lib/auth/comment-actions.test.ts: FOUND
- Commit b03466f: FOUND in git log
- Commit d31d925: FOUND in git log
- 5 tests GREEN: CONFIRMED
- Build: PASSED
