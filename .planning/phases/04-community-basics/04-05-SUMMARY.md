---
phase: "04"
plan: "05"
subsystem: presale-data
tags: [molit, presale, isr, cron, adapter, tdd]
dependency_graph:
  requires:
    - "04-00 (Phase4 DB 스키마 — new_listings, presale_transactions 테이블)"
  provides:
    - "MOLIT 분양권전매 XML API 어댑터 (fetchPresaleTrades)"
    - "/presale ISR 페이지 (revalidate=3600)"
    - "일배치 cron /api/cron/daily (분양 API 통합)"
    - "랜딩 nav 분양 링크 /presale 활성화"
  affects:
    - "src/app/page.tsx (nav + 신축·분양 섹션)"
    - "vercel.json (daily cron 등록)"
tech_stack:
  added: []
  patterns:
    - "MOLIT XML API regex 파싱 (fast-xml-parser 없이 내장 정규식)"
    - "Zod safeParse — 파싱 실패 아이템 skip, 앱 크래시 없음"
    - "ISR revalidate=3600 (createReadonlyClient cookies() 미호출)"
    - "complex_id nullable 설계 (MOLIT API 좌표 없어 자동 매칭 불가)"
    - "UPSERT ignoreDuplicates:true — 일배치 중복 적재 방지"
key_files:
  created:
    - src/services/molit-presale.ts
    - src/services/molit-presale.test.ts
    - src/lib/data/presale.ts
    - src/app/api/cron/daily/route.ts
    - src/app/presale/page.tsx
    - src/components/presale/PresaleCard.tsx
  modified:
    - src/app/page.tsx
    - vercel.json
decisions:
  - "regex XML 파싱 채택 (fast-xml-parser 신규 의존성 없음)"
  - "AnySupabaseClient 타입 (database.ts Phase4 테이블 미반영 우회)"
  - "complex_id null 허용 — Phase 5 어드민 수동 매칭 예정"
  - "cron route 내 untyped supabase client 사용 (new_listings, presale_transactions 미등록 DB type)"
metrics:
  duration: "약 30분"
  completed_date: "2026-05-07"
  tasks_completed: 3
  files_created: 6
  files_modified: 2
---

# Phase 4 Plan 05: MOLIT 분양 API + /presale ISR + 일배치 cron Summary

MOLIT 분양권전매 XML API 어댑터, /presale ISR 페이지, 일배치 cron 통합, 랜딩 nav 활성화 구현 완료. transactions 대원칙(cancel_date IS NULL AND superseded_by IS NULL)을 presale_transactions에도 동일 적용.

## What Was Built

- **`src/services/molit-presale.ts`**: MOLIT 분양권전매 API 어댑터. Zod safeParse + regex XML 파싱으로 fast-xml-parser 의존성 없이 구현. fetchPresaleTrades, parseAmount, currentYearMonth, LAWD_CODES export.
- **`src/lib/data/presale.ts`**: getActiveListings + getPresaleTransactions 데이터 레이어. getPresaleTransactions에 cancel_date IS NULL + superseded_by IS NULL 조건 포함 (대원칙).
- **`src/app/api/cron/daily/route.ts`**: 일배치 cron. Authorization: Bearer CRON_SECRET 검증 후 창원(38110) + 김해(38370) MOLIT API 호출, new_listings + presale_transactions UPSERT.
- **`src/app/presale/page.tsx`**: ISR 페이지 (revalidate=3600). createReadonlyClient로 cookies() 미호출, 빈 상태 메시지 처리.
- **`src/components/presale/PresaleCard.tsx`**: complex_id null → 링크 없는 단순 카드, complex_id 있음 → /complexes/{id} Link 활성화.
- **`src/app/page.tsx`**: nav 분양 링크 href="#" → "/presale" 활성화 + 신축·분양 섹션 추가.
- **`vercel.json`**: /api/cron/daily 04:00 KST(19:00 UTC) 등록.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: molit-presale.ts + presale.ts (GREEN) | `f7ca06c` | feat(04-05): molit-presale.ts + presale.ts 구현 (GREEN) |
| Task 2: 일배치 cron route | `5ad2f97` | feat(04-05): 일배치 cron route + vercel.json 분양 endpoint 등록 |
| Task 3: /presale ISR + PresaleCard + nav | `c6b58d8` | feat(04-05): /presale ISR 페이지 + PresaleCard + nav 분양 링크 활성화 |

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| molit-presale.test.ts 3개 테스트 GREEN | PASS |
| /api/cron/daily Authorization: Bearer 인증 후 MOLIT API 호출 | PASS |
| presale_transactions 쿼리에 cancel_date IS NULL AND superseded_by IS NULL 포함 | PASS |
| /presale ISR 페이지에 revalidate = 3600 설정 | PASS |
| 랜딩 페이지 nav 분양 링크 /presale 활성화 | PASS |
| src/services/molit-presale.ts 존재 및 fetchPresaleTrades export | PASS |
| src/lib/data/presale.ts 존재 및 getActiveListings export | PASS |
| src/components/presale/PresaleCard.tsx 존재 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] database.ts 미등록 Phase4 테이블 타입 충돌**
- **Found during:** Task 1, 3
- **Issue:** database.ts에 new_listings, presale_transactions 테이블 타입이 없어 SupabaseClient<Database> 타입과 충돌. supabase gen types가 실행되지 않은 상태.
- **Fix:** presale.ts에 AnySupabaseClient 최소 인터페이스 정의 (`{ from: (table: string) => any }`). cron route에서는 untyped createClient 사용.
- **Files modified:** src/lib/data/presale.ts, src/app/api/cron/daily/route.ts
- **Commit:** c6b58d8 (task 3 포함)

**2. [Rule 3 - Blocking] molit-presale.test.ts 워크트리 미반영**
- **Found during:** Task 1
- **Issue:** Wave 0에서 생성된 src/services/molit-presale.test.ts가 워크트리에 없음 (워크트리 base commit 8872804가 Phase 4 머지 이전).
- **Fix:** Wave 0 git show로 원본 확인 후 워크트리에 동일 파일 생성.
- **Files modified:** src/services/molit-presale.test.ts (신규)
- **Commit:** f7ca06c

### Pre-existing Issues (Out of Scope)

- `src/__tests__/complex-search.test.ts`, `ads.test.ts` 등의 TypeScript 오류: 기존 문제, 이 플랜 범위 외.
- `public/fonts/PretendardVariable.woff2` 누락으로 인한 빌드 실패: 워크트리 base commit 이전 문제, 이 플랜 범위 외.

## Known Stubs

- `new_listings.price_min`, `new_listings.price_max`: cron에서 deal_price로 동일 값 저장 (분양가 범위가 아닌 단일 거래가). Phase 5에서 어드민 수동 입력으로 보완 예정.
- `new_listings.total_units`, `new_listings.move_in_date`: null 허용, PresaleCard에서 '미정' 표시. MOLIT 분양권전매 API에 해당 필드 없음.
- `complex_id`: null 유지 (자동 매칭 불가 — MOLIT API에 좌표 없음). Phase 5 어드민 수동 매칭 UI 예정.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-04-05-01 (mitigated) | src/app/api/cron/daily/route.ts | Authorization: Bearer CRON_SECRET 검증 적용 완료 |
| T-04-05-02 (mitigated) | src/services/molit-presale.ts | Zod safeParse — 파싱 실패 아이템 skip 완료 |
| T-04-05-03 (mitigated) | src/app/api/cron/daily/route.ts | ignoreDuplicates: true 적용 완료 |
| T-04-05-04 (mitigated) | src/services/molit-presale.ts | MOLIT_API_KEY 서버 전용 환경변수, 클라이언트 번들 미포함 |

## Self-Check: PASSED

| Item | Result |
|------|--------|
| src/services/molit-presale.ts | FOUND |
| src/services/molit-presale.test.ts | FOUND |
| src/lib/data/presale.ts | FOUND |
| src/app/api/cron/daily/route.ts | FOUND |
| src/app/presale/page.tsx | FOUND |
| src/components/presale/PresaleCard.tsx | FOUND |
| Commit f7ca06c | FOUND |
| Commit 5ad2f97 | FOUND |
| Commit c6b58d8 | FOUND |
