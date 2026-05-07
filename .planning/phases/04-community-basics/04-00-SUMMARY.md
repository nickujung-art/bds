---
phase: "04"
plan: "00"
subsystem: db-schema
tags: [migration, tdd, red-tests, rls, postgis, supabase]
dependency_graph:
  requires: []
  provides:
    - Phase4 DB 스키마 (comments, new_listings, presale_transactions, notification_topics, cafe_join_codes)
    - check_gps_proximity PostGIS 함수
    - report_target_type enum 'comment' 값
    - notifications.type CHECK 'digest' 값
    - facility_kapt 컬럼 확장 (elevator_count, heat_type, management_type, total_area)
    - 8개 RED 테스트 스캐폴드 (Wave 1~3 구현 전제)
  affects:
    - Wave 1: 04-01 (COMM-01 댓글), 04-02 (COMM-02 GPS)
    - Wave 2: 04-03 (COMM-03+04), 04-04 (DATA-01), 04-05 (DATA-02)
    - Wave 3: 04-06 (COMM-05), 04-07 (NOTIF-01), 04-08 (NOTIF-02)
tech_stack:
  added: []
  patterns:
    - PostgreSQL enum 트랜잭션 분리 (ALTER TYPE ... ADD VALUE를 별도 마이그레이션으로 분리)
    - PostGIS SECURITY DEFINER 함수 (check_gps_proximity — GPS 스푸핑 저항)
    - RLS 표준 3정책 패턴 (complex_reviews 패턴 대조)
key_files:
  created:
    - supabase/migrations/20260507000003_phase4_enum.sql
    - supabase/migrations/20260507000004_phase4_tables.sql
    - src/lib/auth/comment-actions.test.ts
    - src/lib/auth/review-actions.test.ts
    - src/lib/auth/topic-actions.test.ts
    - src/lib/data/cafe-link.test.ts
    - src/lib/notifications/digest.test.ts
    - src/services/kapt.test.ts
    - src/services/molit-presale.test.ts
    - src/components/admin/SlaUtils.test.ts
  modified: []
decisions:
  - "PostgreSQL enum ADD VALUE 트랜잭션 분리 — 두 마이그레이션 파일로 분리 (000003 enum만, 000004 DDL)"
  - "supabase db push --local 플래그 사용 (프로젝트 link 불필요한 로컬 개발 환경)"
  - "Docker Desktop 자동 시작 — docker daemon 미실행 상태 감지 후 자동 시작 (Rule 3 auto-fix)"
metrics:
  duration: "약 30분"
  completed_date: "2026-05-07"
  tasks_completed: 3
  files_created: 10
---

# Phase 4 Plan 00: DB 스키마 + RED 테스트 스캐폴드 Summary

Phase 4 Wave 0 완료 — Wave 1~3 기능 구현의 전제 조건인 DB 스키마와 TDD RED 테스트 스캐폴드를 확립했다.

## What Was Built

PostgreSQL enum 트랜잭션 분리 패턴으로 두 마이그레이션 파일을 생성하고, `supabase db push`로 로컬 DB에 적용했다. 5개 신규 테이블 + RLS + PostGIS `check_gps_proximity` 함수가 DB에 반영되었다. 8개 요구사항(COMM-01~04, DATA-01~02, NOTIF-01~02)에 대한 RED 테스트 스캐폴드가 생성되어 Wave 1~3 구현의 TDD 출발점이 준비되었다.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: enum 마이그레이션 | `a3e9b26` | chore(04-00): Phase4 enum 마이그레이션 |
| Task 2: 테이블 마이그레이션 | `ad0a7e8` | chore(04-00): Phase4 테이블 마이그레이션 |
| Task 3: db push + RED 테스트 | `7f019d9` | test(04-00): RED 테스트 스캐폴드 8개 생성 |

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| `supabase db push` 에러 없이 완료 | PASS (000003 + 000004 적용) |
| `report_target_type` enum에 'comment' 추가 | PASS |
| `notifications.type` CHECK에 'digest' 포함 | PASS |
| 5개 테이블 생성 (comments, new_listings, presale_transactions, notification_topics, cafe_join_codes) | PASS |
| `check_gps_proximity` SQL 함수 생성 | PASS |
| `facility_kapt` 컬럼 추가 (elevator_count, heat_type, management_type, total_area) | PASS |
| 8개 테스트 스캐폴드 RED 상태로 존재 | PASS (모듈 미존재 에러로 FAIL) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker Desktop 미실행 상태에서 supabase start 실패**
- **Found during:** Task 3 (supabase db push 시도 시)
- **Issue:** Docker daemon이 실행되지 않아 `npx supabase status`가 `failed to inspect container health` 에러 반환
- **Fix:** Docker Desktop 프로세스를 백그라운드로 시작 → daemon 준비 후 `npx supabase start` 실행
- **Files modified:** 없음 (인프라 조작)
- **Impact:** 마이그레이션 적용 가능 상태로 복구됨

**2. [Rule 3 - Blocking] supabase db push에 --local 플래그 필요**
- **Found during:** Task 3 (첫 번째 db push 시도 시)
- **Issue:** `npx supabase db push` 실행 시 "Cannot find project ref. Have you run supabase link?" 에러
- **Fix:** `--local` 플래그 추가 (`npx supabase db push --local`)
- **Files modified:** 없음

**3. comment-actions.test.ts auth 검증 순서 개선**
- **Found during:** Task 3 (테스트 작성 시)
- **Issue:** 원래 계획의 content-too-short/too-long 테스트가 auth mock 없이 작성됨 — 실제 submitComment 구현에서 auth 체크가 먼저 실행될 것이므로 auth mock 추가
- **Fix:** `beforeEach(vi.clearAllMocks)` 추가 및 content 검증 테스트에도 auth mock (로그인 사용자) 설정
- **Files modified:** src/lib/auth/comment-actions.test.ts

## Known Stubs

없음 — 이 플랜은 마이그레이션 파일과 RED 테스트 스캐폴드만 생성했다. 구현 코드는 Wave 1~3 플랜에서 작성된다.

## Threat Flags

없음 — 신규 네트워크 엔드포인트, 인증 경로, 파일 접근 패턴 없음. 마이그레이션에서 추가된 RLS 정책은 모두 계획에 포함된 보안 요구사항이다.

## Self-Check: PASSED

- supabase/migrations/20260507000003_phase4_enum.sql: FOUND
- supabase/migrations/20260507000004_phase4_tables.sql: FOUND
- src/lib/auth/comment-actions.test.ts: FOUND (RED — "Cannot find module @/lib/auth/comment-actions")
- src/lib/auth/review-actions.test.ts: FOUND
- src/lib/data/cafe-link.test.ts: FOUND
- src/components/admin/SlaUtils.test.ts: FOUND
- src/services/kapt.test.ts: FOUND (RED — "fetchKaptBasicInfo is not a function")
- src/services/molit-presale.test.ts: FOUND
- src/lib/notifications/digest.test.ts: FOUND
- src/lib/auth/topic-actions.test.ts: FOUND
- Commits a3e9b26, ad0a7e8, 7f019d9: FOUND in git log
