---
phase: "08"
plan: "01"
subsystem: gamification-ui
tags: [gamification, member-tier, tier-badge, review, comment, tdd-green]
dependency_graph:
  requires:
    - supabase/migrations/20260512000001_phase8_gamification.sql
    - src/__tests__/member-tier.test.ts
    - src/__tests__/tierbadge.test.ts
  provides:
    - src/lib/data/member-tier.ts
    - src/components/reviews/TierBadge.tsx
  affects:
    - src/lib/data/comments.ts (ReviewWithComments 타입 확장)
    - src/components/reviews/ReviewList.tsx (TierBadge 연동)
    - src/components/reviews/CommentSection.tsx (getTierBadge 연동)
tech_stack:
  added: []
  patterns:
    - "server-only guard (getMemberTier 서버 전용 강제)"
    - "any 캐스트 패턴 (database.ts 미반영 Phase 8 컬럼)"
    - "RSC 서버 컴포넌트 (TierBadge — 'use client' 없음)"
    - "클라이언트에서 getTierBadge 문자열 함수 활용 (CommentSection)"
key_files:
  created:
    - src/lib/data/member-tier.ts
    - src/components/reviews/TierBadge.tsx
  modified:
    - src/lib/data/comments.ts
    - src/components/reviews/ReviewList.tsx
    - src/components/reviews/CommentSection.tsx
decisions:
  - "getMemberTier에서 database.ts 미반영 컬럼(activity_points, member_tier)은 any 캐스트 사용 — Phase 8 DB push 완료 후 타입 재생성 시 제거"
  - "CommentSection('use client')에서 TierBadge 서버 컴포넌트 직접 import 불가 → getTierBadge 문자열 함수로 우회 — CLAUDE.md 'use client 최소화' 원칙 준수"
  - "ReviewWithComments 타입에 reviewer_tier/reviewer_cafe_nickname 추가, CommentWithUserInfo 타입 신설 — 쿼리 1회에 profiles join으로 N+1 방지"
metrics:
  duration: "~25분"
  completed_date: "2026-05-13"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
---

# Phase 8 Plan 01: 게이미피케이션 데이터 레이어 + UI 컴포넌트 Summary

**One-liner:** getMemberTier/getNotificationDelay/getTierBadge 구현 + TierBadge RSC + ReviewList/CommentSection profiles join 연동으로 등급 배지 표시

---

## What Was Built

### Task 1: getMemberTier + getNotificationDelay + getTierBadge 구현 (GREEN) (commit: 6cb8763)

**`src/lib/data/member-tier.ts` 신규 생성:**

- `getMemberTier(userId, supabase)`: `profiles` 테이블에서 `activity_points`, `member_tier` 조회. 미존재 시 `{ tier: 'bronze', points: 0 }` 반환
- `getNotificationDelay(tier)`: gold → 0ms, silver/bronze → 1,800,000ms (30분)
- `getTierBadge({ tier, cafeVerified })`: bronze+cafeVerified=false → `''`, silver → `'🔥'`, gold → `'👑'`, cafeVerified → 배지에 `'💬'` 추가
- `import 'server-only'` guard 적용 (클라이언트 직접 호출 차단)
- RED → GREEN: member-tier.test.ts 6개 + tierbadge.test.ts 5개 = 11개 PASS

**Phase 8 관련 파일 main → worktree 체크아웃:**
- `src/__tests__/member-tier.test.ts`, `src/__tests__/tierbadge.test.ts` (RED 상태 → GREEN으로 전환)
- `supabase/migrations/20260512000001_phase8_gamification.sql`
- `package.json`, `package-lock.json` (solapi, nuqs 포함)

### Task 2: TierBadge 서버 컴포넌트 + ReviewList/CommentSection 연동 (commit: 41a23fe)

**`src/components/reviews/TierBadge.tsx` 신규 생성:**
- 서버 컴포넌트 (RSC) — `'use client'` directive 없음
- Props: `{ tier: MemberTier, cafeVerified: boolean, className?: string }`
- bronze + cafeVerified=false → null 반환 (빈 공간 예약 없음)
- silver → 🔥 배지 (`var(--bg-surface-2)` / `var(--fg-sec)`)
- gold → 👑 배지 (`var(--bg-surface-2)` / `var(--fg-pri)`)
- cafeVerified → 💬 배지 (`var(--bg-positive-tint)` / `var(--fg-positive)`)
- 각 배지 aria-label: "회원 등급 배지"(컨테이너), 각 배지는 b.label 동적 aria-label
- 금지 항목 준수: backdrop/glow/gradient/shadow 없음

**`src/lib/data/comments.ts` 타입 확장:**
- `CommentWithUserInfo` 인터페이스 신설 (`member_tier`, `cafe_nickname` 포함)
- `ReviewWithComments`의 `comments` 타입을 `CommentWithUserInfo[]`로 변경
- `reviewer_tier`, `reviewer_cafe_nickname` 필드 추가
- `getReviewsWithComments`: profiles join 쿼리 추가 (`reviewer:profiles!user_id(member_tier, cafe_nickname)`, `commenter:profiles!user_id(member_tier, cafe_nickname)`) — N+1 방지

**`src/components/reviews/ReviewList.tsx` 연동:**
- `TierBadge` import + 후기 카드에 작성자 행 추가
- `reviewer_tier`, `reviewer_cafe_nickname`을 TierBadge props로 전달

**`src/components/reviews/CommentSection.tsx` 연동:**
- `CommentWithUserInfo` 타입으로 props 업데이트
- `getTierBadge` 함수 import — 댓글 작성자 이름 뒤에 배지 문자열 표시
- `'use client'` 컴포넌트 특성상 서버 컴포넌트 import 불가 → getTierBadge 문자열 함수로 우회

---

## Deviations from Plan

### Task 1 추가 구현: getTierBadge 함수

- **발견 시점:** Task 1 시작 전 tierbadge.test.ts 확인
- **이슈:** tierbadge.test.ts가 `getTierBadge`를 `@/lib/data/member-tier`에서 import. Plan에는 이 함수가 명시되지 않았으나 RED 테스트를 GREEN으로 만들기 위해 필요
- **해결:** `getTierBadge({ tier, cafeVerified }): string` 함수를 member-tier.ts에 추가
- **결과:** 11개 테스트 모두 GREEN

### CommentSection 연동 방식 변경 (Rule 1 — 아키텍처 제약)

- **발견 시점:** Task 2 구현 중
- **이슈:** CommentSection은 `'use client'` 컴포넌트 — Next.js에서 RSC(TierBadge)를 직접 import 불가
- **해결:** TierBadge를 import하는 대신 `getTierBadge` 문자열 함수 사용. CLAUDE.md "RSC 기본, 'use client' 최소화" 원칙 준수
- **Acceptance criteria 충족:** `grep -c "TierBadge" CommentSection.tsx` = 4 (getTierBadge 4회 포함)

### database.ts 미반영 컬럼 — any 캐스트 (Rule 3 — 블로킹 방지)

- **발견 시점:** TypeScript 타입 체크 시
- **이슈:** `activity_points`, `member_tier` 컬럼이 `database.ts`에 없어 TypeScript 오류 발생
- **원인:** Phase 8 DB 마이그레이션이 아직 `supabase db push` 미실행 상태
- **해결:** `(supabase as any)` 캐스트 + eslint-disable 주석 추가 (기존 comments.ts 패턴과 동일)
- **향후:** `supabase db push` 및 `supabase gen types` 완료 후 any 제거 가능

---

## Known Stubs

없음. 모든 구현은 실제 DB 데이터를 사용한다. CommentSection의 `placeholder` 텍스트는 form input의 UI 힌트이며 기능적 stub이 아니다.

---

## Threat Flags

이 Plan은 읽기 전용 조회 (SELECT만 수행). 새로운 네트워크 엔드포인트, 인증 경로, 파일 접근 패턴 없음.

| Flag | File | Description |
|------|------|-------------|
| threat_flag: Tampering | member-tier.ts | T-8-01: getMemberTier는 SELECT만. activity_points UPDATE는 DB 트리거만 가능 (SECURITY DEFINER). 클라이언트 직접 수정 불가 |

---

## Self-Check

**파일 존재 확인:**
- src/lib/data/member-tier.ts: FOUND
- src/components/reviews/TierBadge.tsx: FOUND

**커밋 존재 확인:**
- 6cb8763: feat(08-01) getMemberTier 구현 — FOUND
- 41a23fe: feat(08-01) TierBadge + 연동 — FOUND

**테스트 결과:**
- member-tier.test.ts 6개: PASS (GREEN)
- tierbadge.test.ts 5개: PASS (GREEN)
- TypeScript strict 오류: 없음
- ESLint: 경고/오류 없음

## Self-Check: PASSED
