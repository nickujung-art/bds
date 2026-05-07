---
phase: 03-cardnews-legal-ops
plan: "04"
subsystem: admin-ops
tags: [admin, server-actions, members, reports, status, admin-01, admin-02, admin-03, admin-04]
dependency_graph:
  requires: ["03-01"]
  provides: [admin-actions, admin-members-page, admin-reports-page, admin-status-page]
  affects: [admin-pages]
tech_stack:
  patterns: ["requireAdmin guard", "useTransition client actions", "Promise.all parallel COUNT queries"]
key_files:
  created:
    - src/lib/auth/admin-actions.ts
    - src/app/admin/members/page.tsx
    - src/app/admin/reports/page.tsx
    - src/app/admin/status/page.tsx
    - src/components/admin/MemberActions.tsx
    - src/components/admin/ReportActions.tsx
    - src/__tests__/admin-actions.test.ts
    - src/__tests__/admin-status.test.ts
    - src/__tests__/setup.env.ts
  modified:
    - src/types/database.ts
    - src/__tests__/helpers/db.ts
    - vitest.config.ts
decisions:
  - "Used actual ingest_runs schema (source_id + started_at) instead of planned (source + created_at)"
  - "Added setup.env.ts setupFile to load .env.test.local before module evaluation in vitest"
  - "Copied database.ts from main repo to include reports table + new profile columns"
metrics:
  tasks_completed: 3
  tasks_total: 3
  completed_date: "2026-05-07"
---

# Phase 3 Plan 04: Admin ADMIN-01~04 Expansion Summary

Admin management pages + Server Actions for member suspension, report resolution, and system monitoring.

## What Was Built

### 3 Server Actions (`src/lib/auth/admin-actions.ts`)

```typescript
suspendMember(memberId: string): Promise<{ error: string | null }>
reactivateMember(memberId: string): Promise<{ error: string | null }>
resolveReport(reportId: string, action: 'accepted' | 'rejected'): Promise<{ error: string | null }>
```

All use `requireAdmin()` guard (same pattern as ad-actions.ts), extended to return `userId` for `resolveReport`.

### 4 Admin Pages

| URL | Title | Access | Requirement |
|-----|-------|--------|-------------|
| `/admin/members` | 회원 관리 | admin/superadmin | ADMIN-01 |
| `/admin/ads` | 광고 캠페인 | admin/superadmin | ADMIN-02 (pre-existing) |
| `/admin/reports` | 신고 큐 | admin/superadmin | ADMIN-03 |
| `/admin/status` | 시스템 상태 | admin/superadmin | ADMIN-04 |

All pages: `revalidate = 0`, admin guard (redirect to `/login?next=...` or `/`), `createSupabaseAdminClient()` for data.

### 2 Client Components

- `MemberActions`: suspend/reactivate buttons with `useTransition`
- `ReportActions`: accept/reject buttons for pending reports; shows `—` for resolved

### Status Page (ADMIN-04): 8 COUNT Queries via `Promise.all`

1. Total member count (profiles)
2. Total complex count (complexes)
3. Valid transaction count (cancel_date IS NULL AND superseded_by IS NULL)
4. Active ad count (status = 'approved')
5. Pending report count (reports.status = 'pending')
6. Pending ad review count (ad_campaigns.status = 'pending')
7. No-consent member count (terms_agreed_at IS NULL)
8. Cron run history (ingest_runs, last 10 by started_at desc)

## ADMIN-02 Regression Verification

- `ads.test.ts > approveAdCampaign (no auth) > 비로그인 → error 반환`: PASS
- `ads.test.ts > rejectAdCampaign (no auth) > 비로그인 → error 반환`: PASS
- `ads.test.ts > pauseAdCampaign (no auth) > 비로그인 → error 반환`: PASS

Ad review page (`/admin/ads`) was untouched. ADMIN-02 is unbroken.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vitest env loading in worktree**
- **Found during:** Task 1 test run
- **Issue:** Vitest's `.env.test.local` auto-loading wasn't populating `TEST_SUPABASE_*` vars before db.ts module evaluation; `AKEY` resolved to `''` causing `supabaseKey is required` error
- **Fix:** Added `src/__tests__/setup.env.ts` (dotenv config loader) + `setupFiles` in `vitest.config.ts`. Also added `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` to `.env.test.local` for worktree
- **Files modified:** `vitest.config.ts`, `src/__tests__/setup.env.ts`
- **Commit:** 8c5a67f

**2. [Rule 3 - Blocking] Updated database.ts from main repo**
- **Found during:** Task 2 lint
- **Issue:** Worktree had old `database.ts` missing `reports` table, `suspended_at`, `terms_agreed_at` columns — TypeScript compilation failed
- **Fix:** Copied updated `database.ts` from main repo
- **Files modified:** `src/types/database.ts`
- **Commit:** 6f9f28a

**3. [Rule 1 - Bug] Fixed ingest_runs schema mismatch**
- **Found during:** Task 3 build
- **Issue:** Plan specified `ingest_runs` columns as `source, status, created_at` but actual DB schema has `source_id, status, started_at`
- **Fix:** Updated RunRow interface and query to use `source_id, started_at`
- **Files modified:** `src/app/admin/status/page.tsx`
- **Commit:** ba1b3d8

**4. [Rule 2 - Missing] db.ts helper placeholder key**
- **Found during:** Task 1 test infrastructure analysis
- **Issue:** `db.ts` created admin Supabase client at module load time with `SKEY` which was `''`, causing immediate throw
- **Fix:** Copied updated `db.ts` from main repo (uses placeholder key for module-load safety)
- **Files modified:** `src/__tests__/helpers/db.ts`
- **Commit:** 8c5a67f

## Infrastructure Notes

- `admin-status.test.ts` tests require local Supabase running (real DB queries) — fail with `ECONNREFUSED 127.0.0.1:54321` when Supabase is not running. This is expected behavior per the test comment: "마이그레이션이 적용되어야 통과"
- `ads.test.ts` DB/E2E tests similarly require Supabase + dev server

## Self-Check: PASSED

- `src/lib/auth/admin-actions.ts` — exists, 3 exports confirmed
- `src/app/admin/members/page.tsx` — exists, in build output
- `src/app/admin/reports/page.tsx` — exists, in build output
- `src/app/admin/status/page.tsx` — exists, in build output
- `src/components/admin/MemberActions.tsx` — exists
- `src/components/admin/ReportActions.tsx` — exists
- Commits: 8c5a67f, 6f9f28a, ba1b3d8 — all in git log
- Build: PASSED (all 3 admin pages appear in route table)
- admin-actions.test.ts: 5/5 GREEN
