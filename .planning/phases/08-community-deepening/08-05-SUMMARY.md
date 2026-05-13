---
phase: "08"
plan: "05"
subsystem: kakao-channel-notifications
tags: [kakao-alimtalk, solapi, server-action, tdd-green, security, react-hook-form]
dependency_graph:
  requires:
    - "08-00"  # DB 마이그레이션 (kakao_channel_subscriptions 테이블)
    - "08-02"  # deliverKakaoChannelNotifications 인터페이스 참조
  provides:
    - src/services/kakao-channel.ts
    - src/app/actions/kakao-channel-actions.ts
    - src/components/profile/KakaoChannelSubscribeForm.tsx
  affects:
    - src/app/profile/page.tsx
    - src/app/api/worker/notify/route.ts
    - src/lib/notifications/deliver.ts
tech_stack:
  added:
    - react-hook-form (v7.75.0 — KakaoChannelSubscribeForm 폼 유효성 검사)
    - "@hookform/resolvers (v5.2.2 — zod resolver)"
  patterns:
    - server-only 마크 (T-8-02: SOLAPI API key 서버 전용)
    - T-8-04: phone_number 로그 출력 금지 (전화번호 개인정보 보호)
    - Mock 모드 패턴 (SOLAPI env var 없을 때 경고만 출력 후 스킵)
    - useActionState 없이 react-hook-form + manual formData 변환으로 Server Action 호출
key_files:
  created:
    - src/services/kakao-channel.ts
    - src/app/actions/kakao-channel-actions.ts
    - src/components/profile/KakaoChannelSubscribeForm.tsx
  modified:
    - src/lib/notifications/deliver.ts (deliverKakaoChannelNotifications 추가)
    - src/app/profile/page.tsx (KakaoChannelSubscribeForm 통합)
    - src/app/api/worker/notify/route.ts (kakaoSent, kakaoFailed 반환)
    - package.json (react-hook-form, @hookform/resolvers 추가)
decisions:
  - "react-hook-form + zod으로 클라이언트 폼 유효성 검사, useActionState는 미사용 (formAction 변수 lint 오류 회피)"
  - "kakao-channel-actions.ts는 src/app/actions/에 배치 (프로젝트에 actions 디렉토리 신규 생성)"
  - "conflict 해결 시 08-02의 shouldDeliverNow 딜레이 로직 채택 — 더 풍부한 기능"
  - "zod v3에서 .issues 사용 (.errors는 zod/v4 전용)"
metrics:
  duration: "~19분"
  completed_date: "2026-05-13"
  tasks_completed: 2
  tasks_pending: 0
  files_created: 3
  files_modified: 4
---

# Phase 8 Plan 05: 카카오톡 채널 알림 인프라 + 구독 UI Summary

**One-liner:** SOLAPI 알림톡 어댑터(Mock 모드 지원) + subscribeKakaoChannel Server Action + KakaoChannelSubscribeForm('use client') 구현, 프로필 페이지 통합 및 notify 워커 카카오 분기 추가

---

## What Was Built

### Task 1: sendAlimtalk SOLAPI 어댑터 + Server Action (commit: b59582f)

**파일 1 — `src/services/kakao-channel.ts`**
- `import 'server-only'` 마크 — T-8-02 준수 (SOLAPI API key 클라이언트 번들 노출 방지)
- `sendAlimtalk({ to, pfId, templateId, variables })` 함수 구현
- SOLAPI env var 없을 때 `console.warn` 후 return (Mock 모드) — 개발/테스트 환경 안전
- T-8-04: `to` 파라미터(전화번호) 로그 출력 절대 금지
- `disableSms: false` — 알림톡 실패 시 SMS fallback 활성화

**파일 2 — `src/app/actions/kakao-channel-actions.ts`**
- `'use server'` 마크 Server Action
- zod 스키마 유효성 검사 (`phone: /^010-\d{4}-\d{4}$/`, `consent: true 필수`)
- `kakao_channel_subscriptions` upsert — user_id 중복 시 is_active=true 갱신
- T-8-04 준수: DB 삽입 전 phone 로그 출력 없음
- DB 타입 미반영 테이블 → `(supabase as any)` 캐스팅 (Phase 8 마이그레이션 push 대기 중)

**파일 3 — `src/lib/notifications/deliver.ts` (deliverKakaoChannelNotifications 추가)**
- 08-02 에이전트의 `shouldDeliverNow` 통합 (gold 즉시, silver/bronze 30분 딜레이)
- `kakao_channel_subscriptions` 구독자 순회 → 각 사용자의 pending 알림 발송
- T-8-04: subscription.phone_number 로그 출력 금지 주석 명시

**테스트 결과:** `kakao-channel.test.ts` 3개 모두 GREEN

### Task 2: KakaoChannelSubscribeForm UI + 프로필 페이지 통합 + notify 워커 확장 (commit: c6c28af)

**파일 4 — `src/components/profile/KakaoChannelSubscribeForm.tsx`**
- `'use client'` — react-hook-form + zod으로 클라이언트 폼 유효성 검사
- `subscribeKakaoChannel` Server Action 직접 호출 (manual formData 변환)
- 성공 시 `isSubmitted` 상태로 성공 UI 표시 (폼 숨김)
- 인풋: `inputMode="tel"`, `maxLength={13}`, `autoComplete="tel"`, placeholder `010-0000-0000`
- 에러 상태: `border-color: var(--fg-negative)`, focus 상태: `border-color: var(--dj-orange)`
- 동의 체크박스: `/privacy` 링크 포함, `consent` 없이 제출 불가
- T-8-04: `console.log` 없음

**파일 5 — `src/app/profile/page.tsx`**
- `KakaoChannelSubscribeForm` 임포트 및 통합
- 알림 설정 카드: `PushToggle` → `TopicToggle` → `[구분선 1px var(--line-subtle)]` → `KakaoChannelSubscribeForm`

**파일 6 — `src/app/api/worker/notify/route.ts`**
- `deliverKakaoChannelNotifications(supabase)` 호출 추가
- 반환 JSON에 `kakaoSent`, `kakaoFailed` 필드 추가
- 기존 `generated`, `sent`, `failed` 필드 유지

---

## Deviations from Plan

### 1. [Rule 3 - Blocking] react-hook-form, @hookform/resolvers 미설치

- **발견 시점:** Task 2 lint 실행 시
- **문제:** `KakaoChannelSubscribeForm`에서 사용하는 `react-hook-form`이 package.json에 없음
- **수정:** `npm install react-hook-form @hookform/resolvers` 실행
- **패키지:** react-hook-form@7.75.0, @hookform/resolvers@5.2.2

### 2. [Rule 1 - Bug] zod v3에서 `.errors` 없음 → `.issues` 사용

- **발견 시점:** Task 2 lint (TypeScript 오류)
- **문제:** `parsed.error.errors`는 zod v4 API. 이 프로젝트는 zod v3 사용
- **수정:** `parsed.error.errors[0]?.message` → `parsed.error.issues[0]?.message`

### 3. [Rule 1 - Bug] DB 타입 미반영 — `(supabase as any)` 캐스팅

- **발견 시점:** Task 2 lint (TypeScript 오류)
- **문제:** `kakao_channel_subscriptions` 테이블이 생성된 마이그레이션이 아직 `supabase db push`가 실행되지 않아 DB 타입에 포함 안됨
- **수정:** `(supabase as any)` 캐스팅으로 TypeScript 오류 우회

### 4. [Rule 3 - Blocking] Merge conflict (kakao-channel.ts, deliver.ts)

- **발견 시점:** 다른 병렬 에이전트(worktree-agent-a9d745e7dfd1ee7f4, 08-02)와 파일 충돌
- **충돌 파일:** `src/services/kakao-channel.ts`, `src/lib/notifications/deliver.ts`
- **해결:** 08-02 에이전트의 `shouldDeliverNow` 딜레이 로직 채택하고 우리 Plan의 T-8-04 보안 주석 통합
- **결과:** 두 구현의 장점을 합친 최선의 버전으로 conflict 해결

### 5. [Info] useActionState 미사용

- **이유:** `useActionState`를 사용하면 `formAction` 변수가 생성되고 lint에서 "assigned but never used" 오류 발생
- **대안:** react-hook-form의 `handleSubmit` 내에서 Server Action을 직접 호출하는 방식 채택

---

## Known Stubs

없음 — KakaoChannelSubscribeForm은 완전히 구현됨. SOLAPI 계정이 없으면 Mock 모드로 동작하지만 이는 의도된 동작.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: Information Disclosure | kakao-channel-actions.ts | T-8-04: phone_number 로그 출력 금지 — `(supabase as any)` 캐스팅으로 타입 우회 시에도 실제 데이터는 서버에서만 처리 |
| threat_flag: Information Disclosure | kakao-channel.ts | T-8-02: `import 'server-only'` 마크으로 클라이언트 번들 포함 방지 |

---

## Self-Check

**파일 존재 확인:**
- src/services/kakao-channel.ts: FOUND
- src/app/actions/kakao-channel-actions.ts: FOUND
- src/components/profile/KakaoChannelSubscribeForm.tsx: FOUND

**커밋 존재 확인:**
- b59582f: feat(08-05) sendAlimtalk SOLAPI 어댑터 — FOUND
- c6c28af: chore merge executor worktree (KakaoChannelSubscribeForm 포함) — FOUND

**테스트 결과:**
- kakao-channel.test.ts 3개 GREEN — PASSED
- console.log in kakao-channel.ts: 0 — PASSED
- console.log in KakaoChannelSubscribeForm.tsx: 0 — PASSED
- deliverKakaoChannelNotifications in notify/route.ts: >=1 — PASSED
- KakaoChannelSubscribeForm in profile page: >=1 — PASSED

## Self-Check: PASSED
