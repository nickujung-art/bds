---
phase: "08"
plan: "00"
subsystem: db-schema
tags: [gamification, kakao-channel, cafe-posts, tdd-red, migration]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/20260512000001_phase8_gamification.sql
    - supabase/migrations/20260512000002_phase8_kakao_channel.sql
    - supabase/migrations/20260512000003_phase8_cafe_posts.sql
    - src/__tests__/member-tier.test.ts
    - src/__tests__/daum-cafe.test.ts
    - src/__tests__/kakao-channel.test.ts
    - src/__tests__/compare.test.ts
    - src/__tests__/tierbadge.test.ts
  affects:
    - profiles (activity_points, member_tier 컬럼 추가)
    - Phase 8 Wave 1/2/3 구현 태스크 전체
tech_stack:
  added:
    - solapi (SOLAPI SDK v6 — 카카오 알림톡 발송)
    - nuqs (URL state 관리 — 비교 표)
  patterns:
    - SECURITY DEFINER 트리거 (포인트 적립 원자성 보장)
    - RLS owner-only (전화번호 개인정보 보호)
    - TDD RED 스캐폴드 (구현 전 테스트 선작성)
key_files:
  created:
    - supabase/migrations/20260512000001_phase8_gamification.sql
    - supabase/migrations/20260512000002_phase8_kakao_channel.sql
    - supabase/migrations/20260512000003_phase8_cafe_posts.sql
    - src/__tests__/member-tier.test.ts
    - src/__tests__/daum-cafe.test.ts
    - src/__tests__/kakao-channel.test.ts
    - src/__tests__/compare.test.ts
    - src/__tests__/tierbadge.test.ts
  modified:
    - package.json (solapi, nuqs 추가)
    - package-lock.json
decisions:
  - "activity_points UPDATE는 SECURITY DEFINER 트리거만 가능 — 클라이언트 직접 호출 차단 (T-8-01)"
  - "전화번호는 RLS owner-only 정책으로 보호, 서버 로그 출력 금지 (T-8-04)"
  - "Task 1(SOLAPI 계정 설정)과 Task 4(db push)는 human-action checkpoint — Task 2/3는 독립적으로 선행 완료"
metrics:
  duration: "~20분"
  completed_date: "2026-05-12"
  tasks_completed: 2
  tasks_pending: 2
  files_created: 8
  files_modified: 2
---

# Phase 8 Plan 00: DB 마이그레이션 + RED 테스트 스캐폴드 Summary

**One-liner:** Phase 8 게이미피케이션/카카오채널/카페글 DB 스키마 3개 마이그레이션 + TDD RED 테스트 5개 + solapi/nuqs 패키지 설치

---

## What Was Built

### Task 2: Phase 8 DB 마이그레이션 3개 파일 (commit: 4727896)

**파일 1 — `20260512000001_phase8_gamification.sql`**
- `profiles` 테이블에 `activity_points integer DEFAULT 0`, `member_tier text DEFAULT 'bronze'` 컬럼 추가
- `activity_logs` 테이블 신설 (user_id, points, reason, created_at) + RLS owner read
- `add_activity_points()` SECURITY DEFINER 함수 — 포인트 적립 + tier 자동 갱신
- `award_review_points()` + `reviews_award_points` 트리거 — 후기 작성 시 +10점
- `award_comment_points()` + `comments_award_points` 트리거 — 댓글 작성 시 +3점

**파일 2 — `20260512000002_phase8_kakao_channel.sql`**
- `kakao_channel_subscriptions` 테이블 신설 (user_id UNIQUE, phone_number, is_active)
- RLS owner all + admin read 정책
- 전화번호 개인정보 보호 COMMENT 명시

**파일 3 — `20260512000003_phase8_cafe_posts.sql`**
- `cafe_posts` 테이블 신설 (complex_id nullable, title, url UNIQUE, confidence, is_verified)
- complex_id + matched_at 복합 인덱스
- RLS public read (write: service_role only)

### Task 3: RED 테스트 스캐폴드 + 패키지 설치 (commit: c6c569a)

5개 테스트 파일 작성 (모두 RED 상태 — 구현 모듈 미존재):
- `member-tier.test.ts`: getMemberTier 3단계(bronze/silver/gold) + getNotificationDelay 우선순위
- `tierbadge.test.ts`: getTierBadge 💬/🔥/👑 마크 조합 5가지
- `daum-cafe.test.ts`: searchCafePosts HTTP 정상/오류 + extractComplexNames 프롬프트 인젝션 방지
- `kakao-channel.test.ts`: sendAlimtalk SOLAPI 호출 + deliverKakaoChannelNotifications 존재 확인
- `compare.test.ts`: buildCompareIds 4개 제한/빈배열/null 필터 + getCompareData 병렬 fetch

패키지 설치: `solapi` (알림톡 SDK), `nuqs` (URL state 관리)

---

## Tasks Pending (Human Action Required)

### Task 1: SOLAPI 계정 + 카카오 비즈니스 채널 사전 설정 [NOT STARTED]

Wave 2(DIFF-04) 구현 전 선행 필요:
1. https://solapi.com 계정 가입
2. SOLAPI 대시보드 → 카카오 채널 연동 신청 (3~5 영업일)
3. 알림톡 템플릿 2개 등록 및 승인 신청 (1~3 영업일)
4. `.env.local`에 환경 변수 4개 추가:
   - `SOLAPI_API_KEY=<발급된 키>`
   - `SOLAPI_API_SECRET=<발급된 시크릿>`
   - `SOLAPI_SENDER_NUMBER=<인증된 발신번호>`
   - `KAKAO_CHANNEL_PF_ID=<채널 PF ID>`

**계정 없어도 Wave 2 코드 구현은 가능 — "solapi-skip" 으로 진행 가능.**

### Task 4: supabase db push [BLOCKING]

작성된 마이그레이션 3개를 원격 DB에 적용해야 합니다:
```bash
supabase db push
```
성공 후 "db-pushed" 신호 전달.

---

## Deviations from Plan

**Task 실행 순서 조정:**
- Plan 순서: Task 1(checkpoint) → Task 2(auto) → Task 3(auto) → Task 4(checkpoint)
- 실행 순서: Task 2(auto) → Task 3(auto) → Task 1/Task 4 동시 checkpoint 안내
- 이유: Task 2/3는 Task 1(외부 서비스 가입)과 완전히 독립적. 코드 작업을 먼저 완료하는 것이 효율적.
- Task 1의 정보는 SUMMARY에 포함하여 사용자에게 전달.

**DROP TRIGGER IF EXISTS 추가 (Rule 1 — Bug 방지):**
- Plan 코드에는 없었으나, 마이그레이션을 멱등성 있게 실행하기 위해 `DROP TRIGGER IF EXISTS` 추가
- `20260512000001_phase8_gamification.sql`의 트리거 생성 전 적용

---

## Known Stubs

없음 — 이 Plan은 DB 스키마와 RED 테스트만 작성. 구현 모듈은 Wave 1/2에서 작성 예정.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: Information Disclosure | kakao_channel_subscriptions | 전화번호 개인정보 — RLS owner-only 적용, COMMENT에 로그 출력 금지 명시 |
| threat_flag: Tampering | activity_logs | SECURITY DEFINER 함수만 write 가능 — 클라이언트 직접 UPDATE 차단 |

---

## Self-Check

**파일 존재 확인:**
- supabase/migrations/20260512000001_phase8_gamification.sql: FOUND
- supabase/migrations/20260512000002_phase8_kakao_channel.sql: FOUND
- supabase/migrations/20260512000003_phase8_cafe_posts.sql: FOUND
- src/__tests__/member-tier.test.ts: FOUND
- src/__tests__/daum-cafe.test.ts: FOUND
- src/__tests__/kakao-channel.test.ts: FOUND
- src/__tests__/compare.test.ts: FOUND
- src/__tests__/tierbadge.test.ts: FOUND

**커밋 존재 확인:**
- 4727896: feat(08-00) DB 마이그레이션 3개 — FOUND
- c6c569a: test(08-00) RED 테스트 5개 + 패키지 — FOUND

**RED 테스트 검증:**
- member-tier.test.ts 실행 시 `@/lib/data/member-tier` 모듈 미존재로 FAIL — RED 확인

## Self-Check: PASSED
