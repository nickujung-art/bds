---
phase: 03-cardnews-legal-ops
plan: "03"
subsystem: cardnews
tags: [imageresponse, satori, cardnews, admin, share-03, share-04]
dependency_graph:
  requires: ["03-01"]
  provides: [cardnews-api, admin-cardnews-page, download-button]
  affects: [admin-pages]
tech_stack:
  added: []
  patterns: ["ImageResponse nodejs runtime", "fetch+blob download", "JSX extracted to .tsx for Vitest esbuild compat"]
key_files:
  created:
    - src/app/api/cardnews/generate/route.ts
    - src/app/api/cardnews/generate/CardnewsLayout.tsx
    - src/app/admin/cardnews/page.tsx
    - src/components/admin/CardnewsDownloadButton.tsx
  modified:
    - src/__tests__/cardnews.test.ts
    - src/__tests__/helpers/db.ts
decisions:
  - "JSX extracted from route.ts to CardnewsLayout.tsx (.tsx) so Vitest esbuild does not choke on JSX in .ts files"
  - "Added vi.mock for @/lib/supabase/server in cardnews.test.ts (same pattern as consent-actions.test.ts)"
  - "Fixed helpers/db.ts admin client to use placeholder key when SKEY is empty (prevents throw on module load)"
metrics:
  tasks_completed: 2
  tasks_total: 2
  duration: "~30min"
  completed_date: "2026-05-07"
---

# Phase 3 Plan 03: Cardnews ImageResponse API + Admin 1-Click Download Summary

Implemented SHARE-03 (cardnews auto-generation via ImageResponse) and SHARE-04 (admin 1-click download UI). The route returns a 1080x1080 PNG with Satori-compatible CSS-flex layout. Admin page provides a single button that fetches, converts to blob, and triggers browser download.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/api/cardnews/generate/route.ts` | 52 | Route Handler: auth guard + rankings fetch + ImageResponse |
| `src/app/api/cardnews/generate/CardnewsLayout.tsx` | 126 | JSX layout for Satori (extracted from route.ts for Vitest compat) |
| `src/app/admin/cardnews/page.tsx` | 107 | Admin page with guard + CardnewsDownloadButton |
| `src/components/admin/CardnewsDownloadButton.tsx` | 55 | Client component: fetch + blob + `<a download>` |

## /api/cardnews/generate Response Matrix

| Condition | Status | Body |
|-----------|--------|------|
| No session | 401 | `Unauthorized` |
| Logged in, role not admin/superadmin | 403 | `Forbidden` |
| Logged in, admin or superadmin | 200 | 1080x1080 PNG, `Content-Disposition: attachment` |

## Admin Download Flow

```
Browser (/admin/cardnews)
  └─ <button> click
       └─ fetch('/api/cardnews/generate', { cache: 'no-store' })
            └─ 200 PNG response
                 └─ res.blob()
                      └─ URL.createObjectURL(blob)
                           └─ <a download="cardnews_2026-05-07.png"> click + cleanup
```

## Test Results

```
src/__tests__/cardnews.test.ts (2 tests)
  ✓ 비로그인 호출 → 401 Unauthorized
  ✓ runtime은 nodejs (Edge runtime은 TTF 4MB 한도 초과)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX in route.ts fails Vitest esbuild transform**
- **Found during:** Task 1 (test run)
- **Issue:** Vitest uses esbuild which rejects JSX in `.ts` files. Route Handlers use `.ts` by convention, not `.tsx`.
- **Fix:** Extracted JSX markup into `CardnewsLayout.tsx` and called it via `React.createElement()` from `route.ts` (no JSX in `.ts`).
- **Files modified:** `src/app/api/cardnews/generate/CardnewsLayout.tsx` (new), `src/app/api/cardnews/generate/route.ts` (updated)
- **Commit:** 58811c1

**2. [Rule 1 - Bug] helpers/db.ts throws on module load when SKEY is empty**
- **Found during:** Task 1 (test run)
- **Issue:** `createClient(URL_, '')` throws "supabaseKey is required" at module evaluation time, before `vi.stubEnv` in `beforeAll` can run. This broke all tests that import from `helpers/db`.
- **Fix:** Added placeholder fallback `const _skey = SKEY || 'placeholder-key-for-module-load'` so `createClient` constructs without throwing in non-Supabase environments.
- **Files modified:** `src/__tests__/helpers/db.ts`
- **Commit:** 58811c1

**3. [Rule 2 - Missing] cardnews.test.ts needs vi.mock for @/lib/supabase/server**
- **Found during:** Task 1 (test run)
- **Issue:** Test called real `createSupabaseServerClient` which throws with empty ANON_KEY. Wave 0 RED test was written assuming local Supabase would be running; needed same mock pattern as consent-actions.test.ts.
- **Fix:** Added `vi.mock('@/lib/supabase/server', ...)` returning unauthenticated mock, making 401 test deterministic without local Supabase.
- **Files modified:** `src/__tests__/cardnews.test.ts`
- **Commit:** 58811c1

## Known Stubs

None — rankings data is fetched live from Supabase. Empty state renders "데이터 없음" in the PNG.

## Threat Flags

None — `/api/cardnews/generate` adds a new authenticated endpoint but auth + admin role guard is present (401/403). No new trust boundary introduced.

## Self-Check: PASSED

- `src/app/api/cardnews/generate/route.ts` — FOUND
- `src/app/api/cardnews/generate/CardnewsLayout.tsx` — FOUND
- `src/app/admin/cardnews/page.tsx` — FOUND
- `src/components/admin/CardnewsDownloadButton.tsx` — FOUND
- Commit 58811c1 — FOUND
- Commit 6b8747b — FOUND
- Tests: 2/2 GREEN
- Build: PASSED
