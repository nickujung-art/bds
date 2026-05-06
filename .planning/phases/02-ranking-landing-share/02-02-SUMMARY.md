---
phase: "02"
plan: "02"
subsystem: rankings-data-layer
tags: [tdd, rankings, cron, github-actions, supabase-upsert]
dependency_graph:
  requires:
    - 02-01 (complex_rankings 테이블 마이그레이션)
  provides:
    - getRankingsByType 함수 (Wave 2 랜딩 페이지에서 사용)
    - computeRankings 함수 (cron에서 매시간 호출)
    - GET /api/cron/rankings endpoint
    - rankings-cron.yml GitHub Actions 워크플로우
  affects:
    - 02-03: getRankingsByType()를 랜딩 페이지에서 import
tech_stack:
  added: []
  patterns:
    - Mock Supabase 클라이언트 패턴 (로컬 Supabase 없이 단위 테스트)
    - CRON_SECRET Bearer 헤더 인증 (molit-trade와 동일 패턴)
    - ingest_runs 실행 기록 (FK 오류 시 graceful skip)
key_files:
  created:
    - src/lib/data/rankings.ts
    - src/app/api/cron/rankings/route.ts
    - .github/workflows/rankings-cron.yml
  modified:
    - src/__tests__/rankings.test.ts (mock 패턴으로 리팩터링 + @ts-expect-error 제거)
    - src/types/database.ts (complex_rankings 테이블 + rank_type enum 추가)
decisions:
  - ingest_runs.source_id는 FK이므로 data_sources에 'rankings' row 없으면 try/catch로 skip
  - RankType을 Database enum에서 파생 (Database["public"]["Enums"]["rank_type"])
  - 테스트에서 helpers/db.ts admin 클라이언트 대신 mock 주입 (SKEY 없어도 동작)
  - ingest_runs 실제 컬럼: source_id(FK), completed_at, rows_upserted (plan 가정과 다름)
metrics:
  duration: "10분"
  completed: "2026-05-06"
  tasks: 2
  files: 5
---

# Phase 2 Plan 02: 랭킹 데이터 레이어 + cron 파이프라인 Summary

4종 랭킹 산식(신고가·거래량·평당가·관심도)을 집계해 complex_rankings에 UPSERT하는 데이터 레이어와 매시간 실행 GitHub Actions cron 완성.

## What Was Built

### Task 1: rankings.ts — 4종 랭킹 산식 + 읽기 함수

`src/lib/data/rankings.ts` 신규 생성:

- **getRankingsByType(supabase, rankType, limit)**: complex_rankings 테이블에서 rank_type별 상위 N개를 rank 오름차순으로 반환. 랜딩 페이지(02-03)에서 createReadonlyClient()로 호출 예정.

- **computeRankings(supabase)**: 4종 집계 함수를 순서대로 실행하고 complex_rankings에 UPSERT:
  - `aggregateHighPrice`: transactions에서 단지별 MAX(price), 30일 window
  - `aggregateVolume`: COUNT(*) 단지별 거래건수
  - `aggregatePricePerPyeong`: ROUND(AVG(price / (area_m2 / 3.3058)))
  - `aggregateInterest`: favorites JOIN complexes, sgg_code 필터

- 모든 transactions 쿼리에 `.is('cancel_date', null).is('superseded_by', null)` 포함 (CRITICAL 준수)
- sgg_code IN 창원·김해 6개 하드코딩: `['48121','48123','48125','48127','48129','48250']`
- `Database["public"]["Enums"]["rank_type"]`에서 RankType 파생

`src/types/database.ts` 업데이트:
- `complex_rankings` 테이블 Row/Insert/Update 타입 추가
- `rank_type` enum 추가 (`high_price | volume | price_per_pyeong | interest`)

`src/__tests__/rankings.test.ts` 리팩터링:
- helpers/db.ts의 admin 클라이언트(SKEY 필요) 대신 mock Supabase 클라이언트 패턴 적용
- `@ts-expect-error` 주석 전체 제거 (모듈 구현 완료)
- 6개 테스트 모두 GREEN

### Task 2: cron endpoint + GitHub Actions 워크플로우

`src/app/api/cron/rankings/route.ts` 신규 생성:
- `GET /api/cron/rankings` — Authorization: Bearer {CRON_SECRET} 검증
- 인증 실패(헤더 없음 또는 오답) → 401 Unauthorized
- 인증 성공 → computeRankings() 실행 → `{ ok: true, results, totalUpserted, runId, computedAt }`
- ingest_runs 실행 기록 (시작·성공·실패). data_sources FK 오류 시 graceful skip.
- 오류 응답은 error.message만 반환 (스택 트레이스 미노출, T-02-07 완화)

`.github/workflows/rankings-cron.yml` 신규 생성:
- schedule: `0 * * * *` (매 시간 정각 UTC)
- GET, Authorization: Bearer ${{ secrets.CRON_SECRET }}
- timeout-minutes: 3 (월 360분, 무료 한도 이내)
- workflow_dispatch: {} (수동 실행 지원)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ingest_runs 실제 스키마가 PLAN 가정과 다름**
- **Found during:** Task 2 구현 전 사전 확인
- **Issue:** PLAN은 `source`, `started_at`, `finished_at`, `rows_upserted` 컬럼을 가정했으나 실제 스키마는 `source_id` (FK to data_sources), `completed_at`, `rows_upserted` 사용
- **Fix:** route.ts에서 실제 컬럼명 사용. source_id FK 오류 시 try/catch로 ingest_runs 기록 skip하고 집계 계속 진행
- **Files modified:** src/app/api/cron/rankings/route.ts

**2. [Rule 1 - Bug] helpers/db.ts SKEY 없으면 모듈 로드 오류**
- **Found during:** Task 1 테스트 실행
- **Issue:** rankings.test.ts가 helpers/db.ts의 admin 클라이언트를 모듈 레벨에서 생성 → SKEY 빈 문자열 → SupabaseClient 생성 오류
- **Fix:** 테스트를 mock Supabase 클라이언트 패턴으로 리팩터링. `@supabase/admin`을 vi.mock으로 처리. 로컬 Supabase 없이도 동작
- **Files modified:** src/__tests__/rankings.test.ts

**3. [Rule 2 - Missing Critical] complex_rankings 타입이 Database에 미등록**
- **Found during:** Task 1 lint 실행
- **Issue:** supabase db pull 없이 마이그레이션만 추가했으므로 TypeScript 타입 미반영 → `supabase.from('complex_rankings')` 타입 오류
- **Fix:** database.ts에 complex_rankings 테이블 타입과 rank_type enum 수동 추가
- **Files modified:** src/types/database.ts

## TDD Gate Compliance

- RED: 02-01 SUMMARY 기준 — rankings.test.ts 스캐폴드 (모듈 미존재로 런타임 실패)
- GREEN: 이 플랜 — `feat(02-02)` 2개 커밋으로 구현 완료, 6개 테스트 PASS

## Known Stubs

없음. 이 플랜은 데이터 레이어와 cron만 포함. UI 컴포넌트 없음.

## Threat Flags

없음. T-02-04(cron 인증), T-02-05(admin client 전용 UPSERT), T-02-07(오류 메시지 제한) 모두 구현에서 완화됨.

## Self-Check: PASSED

- src/lib/data/rankings.ts: FOUND
- src/app/api/cron/rankings/route.ts: FOUND
- .github/workflows/rankings-cron.yml: FOUND
- 커밋 ee6e92c: FOUND (rankings.ts + database.ts + test 리팩터링)
- 커밋 24c6168: FOUND (route.ts + rankings-cron.yml)
- rankings.test.ts 6개 테스트: PASS
- `0 * * * *` 스케줄: rankings-cron.yml 6번줄 확인
- cancel_date/superseded_by 필터: rankings.ts 78-79, 112-113, 143-144번줄 확인
