---
phase: "10"
plan: "01"
subsystem: "data-pipeline"
tags: ["school-district", "shp", "shapefile", "import", "supabase", "postgis"]
dependency_graph:
  requires: ["10-00"]
  provides: ["school_districts data", "school_district_schools data"]
  affects: ["school district scoring", "complex detail page"]
tech_stack:
  added: []
  patterns: ["SHP/DBF binary parsing with Node.js Buffer API", "EPSG 5186 to 4326 ST_Transform", "batch flush pattern (50 records)"]
key_files:
  created:
    - scripts/import-school-districts.ts
  modified: []
decisions:
  - "WHERE NOT EXISTS pattern instead of ON CONFLICT — school_districts table lacks unique constraint on (hakgudo_id, school_level)"
  - "High school filter uses EDU_NM LIKE '%창원%' OR '%김해%' — no SGG_CD column in 고등학교학교군.dbf"
  - "Elementary/middle filter: SD_CD='48' AND SGG_CD IN ('121','250')"
metrics:
  duration: "~2 minutes (import run)"
  completed_date: "2026-05-15"
---

# Phase 10 Plan 01: 통학구역 SHP/DBF Import Summary

One-liner: Node.js Buffer-based SHP/DBF parser that imports 창원+김해 school district polygons (EPSG 5186→4326) into PostGIS with CSV school-linkage data.

## What Was Built

`scripts/import-school-districts.ts` — a standalone TypeScript script that:

1. Parses SHP (polygon geometry) and DBF (attributes) files using Node.js `Buffer` API only — no GDAL dependency
2. Filters records to 경남(SD_CD=48) + 창원(SGG_CD=121) + 김해(SGG_CD=250) for elementary/middle; uses EDU_NM for high school filtering
3. Reads SHX file for fast random-access to SHP records
4. Transforms coordinates from EPSG 5186 (Korean national) to EPSG 4326 (WGS84) via PostGIS `ST_Transform`
5. Batch-inserts in groups of 50 to stay within SQL size limits
6. Links districts to school names via CSV `학구ID` → `HAKGUDO_ID` join
7. Supports `--dry-run` flag (SQL preview only, DB not written)

## Import Results

| Table | Level | Count |
|-------|-------|-------|
| school_districts | elementary | 102 |
| school_districts | middle | 17 |
| school_districts | high | 3 |
| school_districts | **total** | **122** |
| school_district_schools | all | **302** |

Geometry spot check: centroids land at ~128.6°E, 35.2°N (Changwon/Gimhae area) — ST_Transform confirmed correct.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ON CONFLICT clause failed — no unique constraint on (hakgudo_id, school_level)**
- **Found during:** First actual import run (after successful dry-run)
- **Issue:** `school_districts` table only has PK on `id` (UUID). No unique index on `(hakgudo_id, school_level)`. `ON CONFLICT (hakgudo_id, school_level) DO NOTHING` raised error 42P10.
- **Fix:** Replaced with `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM school_districts WHERE hakgudo_id=... AND school_level=...)` pattern.
- **Files modified:** `scripts/import-school-districts.ts`
- **Commit:** 25a3cee

**2. [Rule 2 - Info] school_name mismatch rate note**
- **Found during:** DRY_RUN facility_school comparison
- **Issue:** 42.6% mismatch between CSV district school names and `facility_school` DB entries — exceeds the plan's 20% threshold warning.
- **Explanation:** This is expected and not a data quality issue. CSV covers all schools in each district region-wide; `facility_school` captures only schools within 1,500m radius of residential complexes (Kakao Local API). The datasets are fundamentally different in scope. Import proceeded correctly.

## Known Stubs

None — all data is real (from official MOIS shapefile and 학교학구도연계정보 CSV).

## Threat Flags

None — script runs locally only, reads local files, writes to DB via Supabase CLI. No new network endpoints added.

## Self-Check: PASSED

- `scripts/import-school-districts.ts` exists: FOUND
- Commit 25a3cee exists in git log: FOUND
- DB verification:
  - `school_districts`: 122 rows (elementary=102, middle=17, high=3)
  - `school_district_schools`: 302 rows
  - Geometry centroid: POINT(128.644°E 35.250°N) — correct Changwon location
