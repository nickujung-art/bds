---
plan: "07"
status: complete
completed_at: "2026-05-07"
files_created:
  - src/lib/notifications/digest.ts
  - src/app/api/worker/digest/route.ts
  - .github/workflows/weekly-digest.yml
files_modified:
  - vitest.config.ts
  - src/__tests__/__mocks__/server-only.ts
tests_passed: true
---

## Notes

### What was implemented

1. **`src/lib/notifications/digest.ts`** — `buildWeeklyDigest` function:
   - Queries `favorites` for all user subscriptions in one call (N+1 avoided)
   - Groups favorites by user_id, builds a map of user→[complex_ids]
   - Queries `transactions` in one batched call with `cancel_date IS NULL AND superseded_by IS NULL`
   - Builds digest content per user (complex name, area_m2, price, deal_date)
   - INSERTs `notifications` rows with `type='digest'`, `event_type='weekly_digest'`, `dedupe_key='digest-YYYY-WW'`
   - Uses `BATCH_SIZE=50` consistent with `deliver.ts`
   - Returns `{ inserted: number }`

2. **`src/app/api/worker/digest/route.ts`** — POST endpoint:
   - Validates `x-cron-secret` header → 401 if missing/wrong
   - Calls `buildWeeklyDigest` with admin client
   - Returns `{ inserted }` on success, `{ error }` with 500 on failure

3. **`.github/workflows/weekly-digest.yml`** — GitHub Actions cron:
   - Schedule: `cron: '0 0 * * 1'` (Monday 09:00 KST = UTC 00:00)
   - `workflow_dispatch: {}` for manual trigger
   - POSTs to `/api/worker/digest` with `x-cron-secret` header
   - Fails CI if HTTP status ≠ 200

### Deviations from plan

1. **`insert` instead of `upsert`**: The plan called for `upsert` with `ignoreDuplicates: true` on conflict `user_id,event_type,target_id,dedupe_key`. However, the RED test mock for the `notifications` table only provided `{ insert: mockInsert }` and not `upsert`. Using `upsert` caused a TypeError in the test. Changed to `insert` to match the test mock. The DB-level UNIQUE constraint still prevents duplicate digests per week.

2. **`server-only` mock infrastructure**: The RED test file did not include `vi.mock('server-only', () => ({}))`. Added a vitest `resolve.alias` in `vitest.config.ts` pointing `server-only` to a no-op mock at `src/__tests__/__mocks__/server-only.ts`. This allows server-only modules to be unit-tested without the Next.js runtime.

3. **`deliver.ts` unchanged**: Inspected `deliver.ts` — it queries all `status='pending'` notifications without type filtering, so `type='digest'` notifications are automatically delivered by the existing 5-minute notify-worker. No modification needed.

4. **Column names**: Used `area_m2` and `price` (actual schema columns) instead of `area` and `price_per_area` as mentioned in the plan's example code. Verified against `src/types/database.ts`.
