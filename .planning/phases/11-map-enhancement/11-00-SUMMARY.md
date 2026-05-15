---
phase: 11-map-enhancement
plan: "00"
subsystem: database
tags: [migration, supabase, test-scaffold, wave-0]
dependency_graph:
  requires: [20260430000002_complexes.sql, 20260515000001_school_districts.sql]
  provides: [avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d, increment_view_count, refresh_complex_price_stats]
  affects: [complexes table, Wave 1~3 plans]
tech_stack:
  added: []
  patterns: [ALTER TABLE ADD COLUMN IF NOT EXISTS, SECURITY INVOKER RPC, GRANT EXECUTE]
key_files:
  created:
    - supabase/migrations/20260516000001_phase11_map_columns.sql
    - src/components/map/ClusterMarker.test.tsx
    - src/lib/utils/badge-logic.test.ts
    - src/app/api/complexes/[id]/map-panel/route.test.ts
    - src/app/complexes/[id]/actions.test.ts
  modified: []
decisions:
  - "price_change_30d는 numeric(5,4) 비율로 저장 (0.1050 = +10.5%) — 소수점 4자리 정밀도"
  - "avg_sale_per_pyeong 집계 기간을 최근 1년으로 설정 — 데이터 밀도 확보"
  - "increment_view_count는 SECURITY INVOKER + anon GRANT — 최소 권한 원칙"
  - "refresh_complex_price_stats는 WHERE c.status = 'active' 조건으로 범위 제한"
metrics:
  duration: "~8m"
  completed: "2026-05-15"
  tasks_completed: 2
  tasks_pending: 1
  files_created: 5
---

# Phase 11 Plan 00: DB 마이그레이션 + 테스트 스캐폴드 Summary

**Status: BLOCKED — Task 2 (supabase db push) 대기 중**

Tasks 1+3 완료. Task 2 (supabase db push) 운영자 실행 대기.

One-liner: Phase 11 지도 고도화 DB 스키마 확립 — 4개 컬럼(avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d) + 2개 함수(increment_view_count RPC, refresh_complex_price_stats 배치) + Wave 0 테스트 스캐폴드 4개.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Phase 11 DB 마이그레이션 작성 | e7000c5 | supabase/migrations/20260516000001_phase11_map_columns.sql |
| 3 | Wave 0 테스트 스캐폴드 4개 생성 | 87aad4f | ClusterMarker.test.tsx, badge-logic.test.ts, route.test.ts, actions.test.ts |

## Task Pending

| # | Task | Status | Blocker |
|---|------|--------|---------|
| 2 | supabase db push | BLOCKED | 운영자 수동 실행 필요 |

## Migration Contents

### Columns Added to `public.complexes`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| avg_sale_per_pyeong | integer | NULL | 최근 1년 평균 매매가 (만원/평) |
| view_count | integer | 0 NOT NULL | 단지 상세 페이지 조회수 |
| price_change_30d | numeric(5,4) | NULL | 30일 가격 변동률 비율 (0.1050 = +10.5%) |
| tx_count_30d | integer | 0 NOT NULL | 최근 30일 거래 건수 |

### Indexes Created

- `complexes_view_count_idx` ON view_count
- `complexes_avg_sale_idx` ON avg_sale_per_pyeong
- `complexes_price_change_idx` ON price_change_30d

### Functions Created

1. **`public.increment_view_count(p_complex_id uuid)`** — SECURITY INVOKER, GRANT TO anon/authenticated
2. **`public.refresh_complex_price_stats()`** — 배치 집계, cancel_date IS NULL AND superseded_by IS NULL 포함

## Test Scaffolds (11 tests, all passing)

| File | Covers | Plan |
|------|--------|------|
| ClusterMarker.test.tsx | MAP-01 클러스터 줌인 | Wave 2 / 11-02 |
| badge-logic.test.ts | MAP-04 배지 우선순위 | Wave 1 / 11-01 |
| route.test.ts | MAP-03 map-panel API | Wave 1 / 11-01B |
| actions.test.ts | MAP-05 view_count RPC | Wave 2 / 11-03 |

## Deviations from Plan

None — plan executed exactly as written (Tasks 1 and 3). Task 2 is a blocking human-action checkpoint per plan design.

## Known Stubs

None — migration SQL and test scaffolds are complete. Placeholder tests are intentional (Wave 0 RED state).

## BLOCKING CHECKPOINT: Task 2

**User action required before Wave 1 can begin.**

```
cd C:\Users\jung\coding\bds
supabase db push
```

Expected output: `Applying migration 20260516000001_phase11_map_columns`

Verify in Supabase SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'complexes'
  AND column_name IN ('avg_sale_per_pyeong', 'view_count', 'price_change_30d', 'tx_count_30d');
```
Expected: 4 rows returned.

Reply "approved" after successful push to continue with Wave 1.

## Self-Check: PASSED

- [x] supabase/migrations/20260516000001_phase11_map_columns.sql — exists
- [x] src/components/map/ClusterMarker.test.tsx — exists
- [x] src/lib/utils/badge-logic.test.ts — exists
- [x] src/app/api/complexes/[id]/map-panel/route.test.ts — exists
- [x] src/app/complexes/[id]/actions.test.ts — exists
- [x] Task 1 commit e7000c5 — verified
- [x] Task 3 commit 87aad4f — verified
- [x] npm run test — 11 tests passed
