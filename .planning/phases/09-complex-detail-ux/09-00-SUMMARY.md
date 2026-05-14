---
phase: 09-complex-detail-ux
plan: "00"
subsystem: database-infrastructure
tags: [migration, rpc, kapt, tdd-red, facility]
dependency_graph:
  requires: []
  provides:
    - facility_kapt.building_count 컬럼 (마이그레이션 작성 완료, push 대기)
    - complex_transactions_for_chart RPC (마이그레이션 작성 완료, push 대기)
    - kapt-facility-enrich.ts building_count upsert 경로
    - iqr.test.ts RED 테스트 (Wave 1 GREEN 전환 대상)
    - phase9-ux.test.ts RED 테스트 (Wave 1 GREEN 전환 대상)
  affects:
    - Wave 1 (09-01 ~ 09-04): supabase db push 완료 후 unblock
tech_stack:
  added: []
  patterns:
    - SQL ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotent migration)
    - PostgreSQL stable SQL function with nullable parameter
    - KAPT BasicInfo + DetailInfo 이중 API 호출 + 레이트 리밋 delay
    - Vitest dynamic import RED 테스트 패턴
key_files:
  created:
    - supabase/migrations/20260514000001_phase9_building_count.sql
    - supabase/migrations/20260514000002_phase9_transactions_for_chart.sql
    - src/__tests__/iqr.test.ts
    - src/__tests__/phase9-ux.test.ts
  modified:
    - scripts/kapt-facility-enrich.ts
decisions:
  - facility_kapt.building_count 위치: complexes 아닌 facility_kapt 선택 (KAPT 시설 정보 출처 일관성)
  - complex_transactions_for_chart: 신규 RPC로 개별 거래 행 반환 (기존 monthly_prices 월별 집계 보완)
  - kapt-facility-enrich.ts BasicInfo 호출 실패 시 warn + null 폴백 (전체 실행 중단 방지)
metrics:
  duration: "~8 minutes"
  completed_date: "2026-05-14"
  tasks_completed: 3
  tasks_total: 4
  files_created: 4
  files_modified: 1
---

# Phase 9 Plan 00: DB 기반 확립 + RED 테스트 스캐폴드 Summary

Wave 1 병렬 실행을 unblock하기 위한 DB 마이그레이션 2개 + kapt-facility-enrich.ts 패치 + TDD RED 테스트 5종 작성.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | building_count 마이그레이션 + complex_transactions_for_chart RPC | DONE | 6e35bcf |
| 2 | kapt-facility-enrich.ts fetchKaptBasicInfo + building_count upsert | DONE | f5c7882 |
| 3 | iqr.test.ts + phase9-ux.test.ts RED 스캐폴드 | DONE | a8abbd2 |
| 4 | supabase db push | CHECKPOINT — 사용자 실행 필요 | — |

## What Was Built

### Task 1: SQL 마이그레이션 2개

**20260514000001_phase9_building_count.sql** (8줄)
- `facility_kapt.building_count integer` 컬럼 추가 (`ADD COLUMN IF NOT EXISTS` — idempotent)
- 용도 주석: UX-03 엘리베이터 동당 계산용

**20260514000002_phase9_transactions_for_chart.sql** (30줄)
- `complex_transactions_for_chart(p_complex_id, p_deal_type, p_months, p_area_m2)` RPC
- 개별 거래 행 반환 (deal_date, year_month, price, area_m2)
- `cancel_date IS NULL AND superseded_by IS NULL` 필터 하드코딩 (T-9-01 완화)
- `round(area_m2) = round(p_area_m2)` — numeric(6,2) 정밀도 문제 처리 (Pitfall 3 방어)

### Task 2: kapt-facility-enrich.ts 패치

변경 4가지:
1. `import { fetchKaptBasicInfo, fetchKaptDetailInfo }` — fetchKaptBasicInfo 추가
2. DetailInfo 호출 후 `delay(50)` 추가 (레이트 리밋 방지)
3. BasicInfo 호출 블록: try/catch + warn + null 폴백
4. upsert payload에 `building_count: basicParsed?.kaptDongCnt ?? null` 추가
5. 로그 필드에 `동수=N` 추가

### Task 3: RED 테스트 스캐폴드

**src/__tests__/iqr.test.ts** (55줄, 4개 테스트)
- `computeIqrOutliers`: 정상/극단값/빈배열/단일 케이스
- RED 확인: `@/lib/utils/iqr` 모듈 미존재 → 모듈 resolve 오류

**src/__tests__/phase9-ux.test.ts** (130줄, 10개 테스트)
- `filterByPeriod` (UX-01): 1y/all/3y 기간 슬라이스
- `extractAreaGroups` (UX-02): round 그룹화, 거래량 정렬, 빈배열
- `formatParkingPerUnit` / `formatElevatorPerBuilding` (UX-03): 계산 + null 폴백
- `getSeasonalAverages` (UX-04): 하절기/동절기 혼재, null 시즌, null 세대수
- RED 확인: 4개 모듈 미존재 → 모듈 resolve 오류

```
Test Files  2 failed (2)      ← RED 상태 확인됨
      Tests  no tests
```

## Deviations from Plan

None — 계획대로 정확히 실행됨.

## Known Stubs

없음. Wave 1에서 실제 구현 파일 생성 시 GREEN 전환 예정:
- `src/lib/utils/iqr.ts`
- `src/lib/utils/period-filter.ts`
- `src/lib/utils/area-groups.ts`
- `src/lib/utils/facility-format.ts`
- `src/lib/data/management-cost.ts` (getSeasonalAverages 함수 추가)

## Threat Flags

없음 — 마이그레이션 파일은 supabase db push 경유만 사용. RPC 내부 cancel_date/superseded_by 필터 하드코딩 완료 (T-9-01).

## Awaiting (Task 4)

`supabase db push` 실행 필요 — Wave 1 시작 전 반드시 완료.

검증 명령:
```powershell
supabase db push
supabase db diff  # No changes found 확인
```

성공 신호: "db-pushed" 입력 후 대화 재개.

## Self-Check: PASSED

- [x] supabase/migrations/20260514000001_phase9_building_count.sql 존재
- [x] supabase/migrations/20260514000002_phase9_transactions_for_chart.sql 존재
- [x] scripts/kapt-facility-enrich.ts 수정 (fetchKaptBasicInfo, building_count 포함)
- [x] src/__tests__/iqr.test.ts 존재 (55줄)
- [x] src/__tests__/phase9-ux.test.ts 존재 (130줄)
- [x] Commit 6e35bcf: Task 1
- [x] Commit f5c7882: Task 2
- [x] Commit a8abbd2: Task 3
- [x] npm run lint 통과 (ESLint + tsc --noEmit 오류 없음)
- [x] npm run test -- iqr.test.ts phase9-ux.test.ts → RED (모듈 미존재) 확인
