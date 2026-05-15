---
phase: 11-map-enhancement
plan: "02"
subsystem: map-panel-api
tags: [api-route, data-layer, supabase, vitest]
dependency_graph:
  requires: ["11-00"]
  provides: ["GET /api/complexes/[id]/map-panel", "getMapPanelData"]
  affects: ["Wave 2 MapSidePanel component"]
tech_stack:
  added: []
  patterns: [readonly-client, maybeSingle, uuid-validation, vitest-mocks]
key_files:
  created:
    - src/lib/data/map-panel.ts
    - src/app/api/complexes/[id]/map-panel/route.ts
  modified:
    - src/app/api/complexes/[id]/map-panel/route.test.ts
decisions:
  - "scoreToGradeInline defined inline in map-panel.ts — no import needed, facility_edu table does not exist"
  - "createReadonlyClient used (not admin client) — public read-only data, anon RLS sufficient"
  - "UUID_RE regex validation gates all requests before DB access"
metrics:
  duration: "~5m"
  completed: "2026-05-15"
  tasks_completed: 2
  files_created: 3
---

# Phase 11 Plan 02: map-panel Data Layer + API Route Summary

## One-liner

GET /api/complexes/[id]/map-panel route with UUID validation, readonly Supabase client, inline hagwon grade conversion from complexes.hagwon_score, and 4/4 tests GREEN.

## Tasks Completed

| Task | Name | Status | Files |
|------|------|--------|-------|
| 1 | getMapPanelData data layer | Done | src/lib/data/map-panel.ts (created) |
| 2 | API Route + tests GREEN | Done | route.ts (created), route.test.ts (updated) |

## What Was Built

### Task 1: getMapPanelData (src/lib/data/map-panel.ts)

- `MapPanelData` interface exported — consumed by Wave 2 `MapSidePanel`
- `getMapPanelData(complexId, supabase)` queries `complexes` table (id, canonical_name, si, gu, avg_sale_per_pyeong, household_count, built_year, hagwon_score) via `.maybeSingle()`
- Queries `transactions` with `.eq('deal_type', 'sale').is('cancel_date', null).is('superseded_by', null).order('deal_date', { ascending: false }).limit(3)` — CLAUDE.md cancel/superseded filter enforced
- `scoreToGradeInline()` defined inline — maps 0–1 score to A+/A/A-/B+/B/B-/C+/C/C-/D grades; returns null if score is null
- No `facility_edu` table reference — uses `complexes.hagwon_score` directly
- Returns `null` if complex not found; throws on DB error

### Task 2: API Route + Tests (src/app/api/complexes/[id]/map-panel/)

- `route.ts`: GET handler with `UUID_RE` regex validation → 400 on bad UUID; calls `getMapPanelData`; 404 on null; 200+JSON on success; 500 on thrown error
- Uses `createReadonlyClient()` — no admin client
- `route.test.ts`: 4 tests all GREEN (200 with data, 400 invalid UUID, 404 not found, 500 on throw)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data wired from real Supabase queries.

## Threat Flags

None beyond what was already in the plan threat model (T-11-04 mitigated by UUID_RE, T-11-05 accepted via anon RLS).

## Self-Check

- [x] src/lib/data/map-panel.ts exists and exports MapPanelData + getMapPanelData
- [x] src/app/api/complexes/[id]/map-panel/route.ts exists and uses createReadonlyClient
- [x] route.test.ts: 4/4 tests GREEN
- [x] TypeScript: zero map-panel errors from tsc --noEmit
- [x] cancel_date + superseded_by IS NULL filters present in transactions query
- [x] No facility_edu table reference anywhere in the implementation

## Self-Check: PASSED
