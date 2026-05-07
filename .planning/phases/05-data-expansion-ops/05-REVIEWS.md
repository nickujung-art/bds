---
phase: 05-data-expansion-ops
generated: "2026-05-07"
reviewer: claude-cli (claude-sonnet-4-6, separate session)
plans_reviewed: ["05-00", "05-01", "05-02", "05-03", "05-04"]
verdict: PASS-WITH-WARNINGS
---

# Phase 5 Peer Review — 단지온도

*Cross-AI review via `claude -p`. Independent session — no shared context with planning session.*

---

## Executive Summary

The five plans are coherent, well-researched, and follow the project's architectural rules closely. The critical TDD structure, transaction invariants, and ISR/client-component separation are mostly handled correctly. However, two blocking issues must be resolved before Wave 1 can execute safely: an unresolved parallel write conflict on `complexes/[id]/page.tsx`, and an auth-ordering vulnerability in the Server Action pattern. Seven additional HIGH/MEDIUM findings should be addressed before autonomous execution.

---

## Critical Issues

### C-1 — Unresolved parallel write conflict on `complexes/[id]/page.tsx` (05-01 + 05-02)

Both plans list `src/app/complexes/[id]/page.tsx` as a modified file. The constraint in 05-01 ("do not add ValueQuadrantChart") only prevents one direction of the problem — it does not prevent a concurrent executor from overwriting the other's changes. The plan provides no merge strategy, branch isolation, or "last writer wins" ordering for this shared file. In practice, whichever agent commits second will silently clobber the first agent's additions to the page.

**Required fix**: Either (a) extract both integrations into a single sequential final-step that touches `page.tsx` after both library files are complete, or (b) make 05-02 depend on 05-01 specifically for the page integration step. Documenting "run 05-01 and 05-02 as parallel" without resolving `page.tsx` ownership is a guaranteed merge conflict.

---

## High Issues

### H-1 — `requireAdmin()` should precede zod validation (05-01, 05-03)

The plan states: "zod validation before requireAdmin()." This is a security anti-pattern for admin Server Actions. Executing zod first means:
- An unauthenticated attacker can probe the shape of valid admin payloads by inspecting validation errors.
- Server resources are spent parsing/validating input for unauthorized callers.

The "fast rejection" argument applies to zod filtering *clearly malformed* payloads — but that argument only holds when the caller is already authenticated. For admin actions, the invariant must be: **auth gate → then validate**. The caller has no right to know whether their payload is well-formed until they've proven identity.

**Required fix**: In both `redevelopment-actions.ts` and `listing-price-actions.ts`, call `requireAdmin()` (or `requireRole('admin')`) as the first line before any zod parsing.

### H-2 — Quadrant transaction query: flat `limit 10000` produces skewed per-complex averages (05-02)

`getQuadrantData` fetches up to 200 complexes and then up to 10,000 raw transaction rows. If a popular complex has 200 transactions and a small complex has 5, the 10,000-row ceiling means low-volume complexes are disproportionately cut when the pool fills. The per-complex average price will be computed from a non-representative sample.

**Required fix**: Aggregate in SQL — `SELECT complex_id, AVG(price) as avg_price FROM transactions WHERE ... GROUP BY complex_id` rather than fetching raw rows and computing averages client-side. This eliminates the limit distortion and is also much faster (avoids shipping up to 10,000 rows over the wire).

### H-3 — Missing `CHECK` constraint on `price_per_py` (05-03)

The migration schema shows `price_per_py INTEGER NOT NULL` with no range guard. An admin typo (e.g., entering `500000` instead of `5000`) would silently persist. The range was explicitly flagged as 100–99999.

**Required fix**: Add `CHECK (price_per_py BETWEEN 100 AND 99999)` to the migration DDL. Additionally confirm zod refinement `z.number().int().min(100).max(99999)` is present in `listing-price-actions.ts`.

### H-4 — `createSupabaseAdminClient()` usage not explicitly guaranteed in 05-03

`listing-price-actions.ts` is described as using object-arg signatures and zod validation, but the plan never states it calls `createSupabaseAdminClient()` for the write operations. CLAUDE.md mandates all admin writes go through this client exclusively. If the executor uses a standard server client that respects RLS, the RLS `WITH CHECK` policy on admin-only writes would block the action even for legitimate admins.

**Required fix**: Explicitly confirm that mutations in `listing-price-actions.ts` use `createSupabaseAdminClient()`. Mirror the same explicit requirement in 05-01 for `redevelopment-actions.ts`.

---

## Medium Issues

### M-1 — Classic PAT with `repo` scope is overly broad (05-04)

A classic PAT with `repo` scope grants read/write access to all repositories the user has access to, not just `danjiondo-backup`. If this token leaks from GitHub Secrets (e.g., via a compromised workflow), an attacker gains write access to the main `danjiondo` repo as well.

**Recommended fix**: Use a fine-grained PAT scoped to `nickujung-art/danjiondo-backup` with `contents: write` only.

### M-2 — `RedevelopmentTimeline.tsx` aria-current="step" needs prop-driven clarification (05-01)

`aria-current="step"` is a dynamic attribute that must reflect the *current* phase of the specific project being rendered. An RSC can receive this as a prop from the server (queried from the DB), which is fine — but the plan doesn't explicitly state this. If the executor interprets "RSC with aria-current" as a static value, the accessibility attribute will be wrong for all phases except the hardcoded one.

**Required clarification**: Confirm that `current_phase` from the DB is passed as a prop to `RedevelopmentTimeline` and used to set `aria-current` dynamically.

### M-3 — No unique constraint on `listing_prices(complex_id, recorded_date)` (05-03)

The schema allows multiple rows for the same complex on the same date. The `upsertListingPrice` action name implies conflict-resolution semantics, but without a unique constraint and `ON CONFLICT DO UPDATE`, it will INSERT a new row on every call.

**Required fix**: Add a unique constraint (at minimum `UNIQUE(complex_id, recorded_date, source)`) and implement true upsert logic with `ON CONFLICT (complex_id, recorded_date, source) DO UPDATE SET price_per_py = EXCLUDED.price_per_py`.

### M-4 — Quadrant empty-state and single-point edge cases not covered (05-02)

No documented behavior for:
- Zero transactions in the last 12 months for all complexes → empty chart
- All complexes falling in one quadrant → median lines appear at the edge
- `targetComplexId` not found in the dataset (e.g., inactive complex)

These will hit regularly in newer neighborhoods with sparse data. The TDD spec should include them.

### M-5 — Backfill `--resume` flag state storage undefined (05-00)

`molit-backfill-once.yml` includes a `--resume` flag but the plan doesn't specify where resume state is persisted. If the workflow is cancelled mid-run and restarted, the executor has no way to implement `--resume` without knowing where to look.

**Required clarification**: Define the resume state mechanism. A `backfill_progress` table in Supabase keyed on `(sgg_code, year)` is the most robust option.

### M-6 — No pg_dump integrity verification in backup workflow (05-04)

The workflow runs `pg_dump → git add → git commit` with no check that the dump file is non-empty and valid. `set -e` won't catch a pg_dump that partially succeeds and exits 0 with a too-small file.

**Required fix**: Add a file-size check after pg_dump:
```bash
DUMP_SIZE=$(wc -c < "/tmp/$FILENAME")
if [ "$DUMP_SIZE" -lt 1000 ]; then
  echo "ERROR: dump file suspiciously small ($DUMP_SIZE bytes)" >&2
  exit 1
fi
```

---

## Low Issues / Suggestions

### L-1 — `limit 200` complexes may miss outer areas of 창원+김해 (05-02)

창원+김해 has approximately 300–450 apartment complexes depending on `status='active'` definition. Consider `limit 400` or ordering by `transaction_count DESC` to ensure the most data-rich complexes are included.

### L-2 — Cancelled redevelopment test label is ambiguous (05-01)

The test label "cancelled returned unfiltered" is ambiguous. Rename to `returns cancelled project with phase=cancelled` and assert `result?.phase === 'cancelled'` explicitly for future maintainability.

### L-3 — School score zero vs. null distinction should be documented (05-02)

The formula `max(0, min(100, 100 - distance_m/10))` assigns score `0` to schools ≥1km away. These are NOT excluded — only complexes with no `is_assignment=true` school record are excluded. A complex 1.5km from its assigned school scores 0 and appears at the far left of the chart. This is intentional but should be documented to prevent future confusion.

### L-4 — No workflow failure notification in db-backup (05-04)

If `db-backup.yml` fails silently, the team won't know until they check the backup repo manually. GitHub Actions sends email on workflow failures by default — document this assumption or add a notification step.

### L-5 — Cron expression and negative check are correct (05-04) ✓

`'0 19 * * 6'` = Saturday 19:00 UTC = Sunday 04:00 KST ✓. The acceptance criteria grep for the wrong pattern (`* * 0`) is a well-designed defensive QA step — keep it.

---

## Plan-Specific Notes

**05-00**: Solid blocking checkpoint. School formula, MOLIT chunking strategy (3–5 regions/day), and `--resume` flag intent are correct. Gap: unspecified resume-state mechanism (M-5). Human-action gating is appropriate.

**05-01**: Architecturally sound. RSC for the timeline is correct. The `aria-current` concern (M-2) needs one-line clarification. Auth ordering (H-1) and `createSupabaseAdminClient()` callout (H-4) need fixes before autonomous execution.

**05-02**: ISR preservation pattern (`dynamic` + `ssr:false`) is correct. `height={280}` fix for ResponsiveContainer correctly documented. 4-quadrant label approach (absolute-positioned divs, not SVG) avoids SVG coordinate system complexity — good call. Main issues: H-2 (SQL aggregation), M-4 (empty state), C-1 (page.tsx conflict).

**05-03**: FormData-wrapper → object-arg bridge pattern is idiomatic and clean. Gap-label deferral to Phase 6 is a reasonable scope decision. Needs: H-3 (CHECK constraint), H-4 (admin client), H-1 (auth order), M-3 (unique constraint).

**05-04**: Direct Connection (not Transaction Pooler) for pg_dump is correct and critical. `set -e` is present. 90-day cleanup logic is sound. PAT scope (M-1) and dump verification (M-6) are the primary gaps. Negative-check acceptance criterion for cron expression is exemplary QA practice.

---

## Verdict

**PASS-WITH-WARNINGS**

C-1 (parallel `page.tsx` conflict) must be resolved with an explicit ownership/sequencing strategy before Wave 1 autonomous execution begins; H-1 through H-4 should be patched in the plans before handoff to the executor to prevent security regressions and silent data quality failures. The overall architecture, TDD structure, and Supabase/RLS patterns are solid.

---

*Feed back into planning via: `/gsd-plan-phase 5 --reviews`*
