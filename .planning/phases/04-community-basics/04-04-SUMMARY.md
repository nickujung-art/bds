---
phase: 04-community-basics
plan: "04"
subsystem: api
tags: [kapt, facility, supabase, zod, cron, nextjs]

# Dependency graph
requires:
  - phase: 04-00
    provides: facility_kapt table schema with Wave 0 columns (elevator_count, heat_type, management_type, total_area)

provides:
  - fetchKaptBasicInfo function in src/services/kapt.ts (K-apt AptBasisInfoServiceV3 adapter)
  - KaptBasicInfo type export
  - 시설 tab in complex detail page fetching facility_kapt data
  - /api/cron/daily route with K-apt facility_kapt UPSERT (DATA-01 wiring)

affects:
  - 04-05 (daily cron route created here — 04-05 extends with MOLIT presale logic)
  - future plans requiring K-apt facility data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "K-apt API adapter pattern extended: Zod safeParse + AbortSignal.timeout(10_000) + null on parse failure"
    - "facility_kapt columns (Phase 4 Wave 0) pre-migration type cast via unknown for Supabase generated types"
    - "daily cron route: CRON_SECRET Bearer auth guard + admin client + per-complex loop with limit 50"

key-files:
  created:
    - src/app/api/cron/daily/route.ts
  modified:
    - src/services/kapt.ts
    - src/app/complexes/[id]/page.tsx

key-decisions:
  - "Cast new facility_kapt columns (heat_type, management_type, elevator_count) through unknown at call sites since Supabase generated types predate Phase 4 migration"
  - "Daily cron created in 04-04 (not 04-05) since 04-05 depends on this file existing; 04-05 extends with MOLIT presale logic"
  - "UPSERT conflict key is complex_id (one row per complex, updated monthly)"
  - "complexes.kapt_code confirmed present in 20260430000002_complexes.sql migration"

patterns-established:
  - "K-apt service adapter: environment variable guard → URL params → safeParse → null on failure"
  - "Cron route: CRON_SECRET auth → admin client → loop with try/catch → structured JSON response with error array"

requirements-completed:
  - DATA-01

# Metrics
duration: 20min
completed: 2026-05-07
---

# Phase 4 Plan 04: K-apt 부대시설 데이터 수집 및 시설 탭 Summary

**fetchKaptBasicInfo Zod adapter for K-apt AptBasisInfoServiceV3, 시설 tab on complex detail page with facility_kapt data, and /api/cron/daily route with daily UPSERT for up to 50 complexes**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-07T03:55:00Z
- **Completed:** 2026-05-07T04:15:00Z
- **Tasks:** 3
- **Files modified:** 3 (1 created)

## Accomplishments
- Extended kapt.ts with `fetchKaptBasicInfo` using K-apt `AptBasisInfoServiceV3` endpoint — Zod schema validation, 10s timeout, null-safe safeParse — all 3 RED tests now GREEN
- Added 시설 card to complex detail page with facility_kapt server query (maybeSingle), showing parking_count, management_cost_m2, heat_type, management_type, elevator_count — empty state handled
- Created `/api/cron/daily` route with CRON_SECRET guard that iterates complexes with kapt_code (limit 50/day) and UPSERTs facility_kapt data

## Task Commits

Each task was committed atomically:

1. **Task 1: fetchKaptBasicInfo 구현 (GREEN)** - `06947ba` (feat)
2. **Task 2: 단지 상세 페이지에 시설 탭 추가** - `1abdca5` (feat)
3. **Task 3: 일배치 cron fetchKaptBasicInfo → facility_kapt UPSERT** - `74408df` (feat)

## Files Created/Modified
- `src/services/kapt.ts` — Added KaptBasicInfoSchema, KaptBasicInfo type, fetchKaptBasicInfo function
- `src/app/complexes/[id]/page.tsx` — Added facility_kapt query in Promise.all and 시설 card section
- `src/app/api/cron/daily/route.ts` — Created daily cron route with K-apt UPSERT loop (new file)

## Decisions Made
- Cast `heat_type`, `management_type`, `elevator_count` through `unknown` in both page.tsx and route.ts since Supabase generated types don't yet include the Phase 4 Wave 0 migration columns. This is the minimal safe approach until types are regenerated.
- Created `/api/cron/daily` in this plan (04-04) rather than waiting for 04-05, because 04-05 reads and extends the same file. This prevents a conflict.
- `UPSERT ON CONFLICT complex_id` strategy: one facility_kapt row per complex, refreshed monthly. `data_month` set to first day of current month.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created /api/cron/daily/route.ts since it doesn't exist yet**
- **Found during:** Task 3
- **Issue:** Plan says to read and extend `src/app/api/cron/daily/route.ts` from 04-05, but 04-05 has not run. File did not exist.
- **Fix:** Created the daily cron route with K-apt UPSERT as the initial implementation. 04-05 will extend this file with MOLIT presale logic.
- **Files modified:** src/app/api/cron/daily/route.ts (created)
- **Verification:** Build passes, file appears in Next.js route list at /api/cron/daily
- **Committed in:** 74408df

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking — daily cron file missing)
**Impact on plan:** Necessary for task completion. 04-05 can extend the file as designed.

## Issues Encountered
- Supabase generated types for `facility_kapt` do not include Phase 4 Wave 0 columns (`heat_type`, `management_type`, `elevator_count`, `total_area`). Resolved by casting through `unknown` at call sites rather than regenerating types (which would require running `supabase gen types` against the remote DB).

## Known Stubs
None - facility_kapt query returns real DB data. Empty state shown when no data collected yet, which is accurate behavior.

## Threat Flags
None — all K-apt API calls remain in src/services/ adapter (T-04-04-01 mitigated). KAPT_API_KEY is server-only env var. Zod safeParse guards against malformed API responses (T-04-04-02 mitigated). AbortSignal.timeout(10_000) prevents hanging requests (T-04-04-03 mitigated).

## User Setup Required
None - KAPT_API_KEY should already be configured. The daily cron requires CRON_SECRET (pre-existing pattern).

## Next Phase Readiness
- `fetchKaptBasicInfo` ready for import anywhere in the codebase
- `/api/cron/daily` ready for 04-05 to extend with MOLIT presale UPSERT logic
- 시설 tab live on complex detail page; will populate once cron runs with real kapt_code values

## Self-Check: PASSED

- FOUND: src/services/kapt.ts
- FOUND: src/app/complexes/[id]/page.tsx
- FOUND: src/app/api/cron/daily/route.ts
- FOUND: .planning/phases/04-community-basics/04-04-SUMMARY.md
- FOUND: commit 06947ba (Task 1)
- FOUND: commit 1abdca5 (Task 2)
- FOUND: commit 74408df (Task 3)

---
*Phase: 04-community-basics*
*Completed: 2026-05-07*
