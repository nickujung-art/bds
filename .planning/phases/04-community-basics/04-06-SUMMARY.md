---
phase: 04-community-basics
plan: "06"
subsystem: community
tags: [cafe-code, cron, admin, github-actions]
dependency_graph:
  requires: [04-00]
  provides: [cafe_join_codes worker, cafe-code-weekly cron, admin/status cafe code display]
  affects: [admin/status page]
tech_stack:
  added: []
  patterns: [worker endpoint pattern, GitHub Actions cron, admin server component]
key_files:
  created:
    - src/app/api/worker/cafe-code/route.ts
    - .github/workflows/cafe-code-weekly.yml
    - src/app/admin/status/page.tsx
  modified:
    - src/types/database.ts
decisions:
  - "Used getMonday() with UTC date math for consistent week_start across timezones in worker"
  - "Admin status page fetches cafe code alongside other stats in Promise.all for single-trip efficiency"
  - "Added cafe_join_codes, reports types + enums to database.ts to unblock TypeScript compilation"
metrics:
  duration: 12 minutes
  completed: 2026-05-07
  tasks_completed: 2
  files_changed: 4
---

# Phase 4 Plan 06: 주간 카페 가입 코드 시스템 Summary

주간 회전 카페 가입 코드 worker endpoint + GitHub Actions 주간 cron + admin/status 코드 표시 구현.

## What Was Built

1. **`POST /api/worker/cafe-code`** — x-cron-secret 인증 → 이번 주 월요일 날짜 계산 → UNIQUE 제약으로 중복 체크 → 8자 alphanumeric 코드 생성 후 `cafe_join_codes` INSERT. 혼동 문자(0/O, 1/I) 제외한 문자셋 사용.

2. **`.github/workflows/cafe-code-weekly.yml`** — `cron: '5 0 * * 1'` (매주 월요일 09:05 KST)로 worker endpoint POST 호출. HTTP status 200 아닐 시 exit 1.

3. **`src/app/admin/status/page.tsx`** — 시스템 상태 페이지 생성. 이번 주 카페 가입 코드를 큰 monospace 폰트(dj-orange)로 최상단에 표시. 코드 미생성 시 "매주 월요일 09:05 KST에 자동 생성됩니다" 안내.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Types] cafe_join_codes 타입을 database.ts에 추가**
- **Found during:** Task 1
- **Issue:** `cafe_join_codes` 테이블이 Phase 4 Wave 0 마이그레이션에만 존재하고 `src/types/database.ts`에 반영되지 않아 TypeScript 컴파일 오류 발생
- **Fix:** `database.ts`에 `cafe_join_codes` Row/Insert/Update 타입 정의 추가
- **Files modified:** src/types/database.ts
- **Commit:** 5f71a71

**2. [Rule 3 - Blocking Issue] reports 테이블 타입 + report_status/report_target_type enum 추가**
- **Found during:** Task 2
- **Issue:** admin/status/page.tsx가 `reports` 테이블을 쿼리하는데 worktree의 database.ts에 해당 타입이 없어 TypeScript 오류 발생 (main repo에는 존재하나 worktree 기반 커밋에 미포함)
- **Fix:** `reports` 테이블 타입 + `report_status`/`report_target_type` enum을 database.ts에 추가. `report_target_type`에 Phase 4에서 추가된 `'comment'` 값도 포함
- **Files modified:** src/types/database.ts
- **Commit:** 7676a0f

## Success Criteria Verification

1. POST /api/worker/cafe-code가 x-cron-secret 없을 때 401 반환 — `if (!secret || secret !== process.env.CRON_SECRET) return 401` 구현됨
2. 같은 주에 두 번 호출하면 두 번째는 skipped: true 반환 — existing 체크 후 `{ code, skipped: true }` 반환 구현됨
3. GitHub Actions cron이 `5 0 * * 1` (매주 월요일 09:05 KST)로 설정됨
4. admin/status 페이지에서 현재 주의 카페 가입 코드 확인 가능
5. ESLint 에러 없음 (pre-existing tsc test 에러는 현재 plan 범위 외)

## Known Stubs

None — cafe code display is wired to live `cafe_join_codes` table query.

## Threat Flags

None — all threat model mitigations (T-04-06-01, T-04-06-03) implemented as planned.

## Self-Check: PASSED

- src/app/api/worker/cafe-code/route.ts — FOUND
- .github/workflows/cafe-code-weekly.yml — FOUND
- src/app/admin/status/page.tsx — FOUND
- Commits 5f71a71 and 7676a0f — FOUND
