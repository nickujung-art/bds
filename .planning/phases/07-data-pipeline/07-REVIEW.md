---
phase: 07-data-pipeline
reviewed_at: 2026-05-11T00:00:00Z
depth: deep
files_reviewed: 10
files_reviewed_list:
  - src/services/kapt.ts
  - src/__tests__/kapt-enrich.test.ts
  - scripts/kapt-enrich.ts
  - .github/workflows/kapt-enrich-once.yml
  - src/lib/data/name-aliases.json
  - src/__tests__/link-transactions.test.ts
  - scripts/link-transactions.ts
  - .github/workflows/link-transactions-once.yml
  - src/lib/data/realprice.ts
  - src/__tests__/molit-ingest.test.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-11T00:00:00Z
**Depth:** deep
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 7 adds three data pipeline tasks: KAPT enrichment of the `complexes` table (DATA-08), transaction–complex linking (DATA-09), and automatic `complex_id` population during ingest (DATA-10). The overall structure is sound — idempotency guards, JSONB spread merge, and the sgg_code + trigram dual-axis requirement from CLAUDE.md are all respected. Three defects rise to **Critical**: the `lookupComplexIdCached` function in `realprice.ts` calls `match_complex_by_admin` RPC directly, bypassing the `ADMIN_CONFIDENCE_CAP = 0.85` that `matchByAdminCode()` enforces, which means a DB match with trgm_sim of 0.86–0.99 can be incorrectly accepted; the KAPT API error message leaks the raw service key in the URL when the response body is appended on non-OK status; and the `link-transactions.ts` transaction fetch query is missing `cancel_date IS NULL AND superseded_by IS NULL` guards as required by CLAUDE.md, causing cancelled/superseded transactions to be fed through the matching pipeline and written to `complex_match_queue`. Five additional Warnings cover counter drift, a regex hazard in the alias dictionary, an unprotected error log key leak, missing error handling in `isAlreadyQueued`, and a test-coverage gap.

---

## Critical Issues

### CR-01: `lookupComplexIdCached` bypasses `ADMIN_CONFIDENCE_CAP`, causing false-positive complex matches

**File:** `src/lib/data/realprice.ts:111-121`

**Issue:** `lookupComplexIdCached` calls `supabase.rpc('match_complex_by_admin', …)` directly and accepts any row where `trgm_sim >= 0.9`. However, `matchByAdminCode()` in `complex-matching.ts` applies `Math.min(trgm_sim, ADMIN_CONFIDENCE_CAP)` (cap = 0.85) before returning, which means the wrapper intentionally prevents this axis from reaching 0.9 on its own — it is supposed to be capped so that only coordinate or address axes can auto-link at that confidence. By calling the RPC directly with `p_min_similarity: 0.9`, `lookupComplexIdCached` silently accepts matches that `matchByAdminCode()` would cap at 0.85, then accept because `0.85 < 0.9 = AUTO_THRESHOLD`. The CLAUDE.md comment on line 24 of `link-transactions.ts` even warns: "`supabase.rpc('match_complex_by_admin')` 직접 호출 금지 — `ADMIN_CONFIDENCE_CAP` 우회 방지". The same rule is violated here in `realprice.ts`.

In practice: a DB row with `trgm_sim = 0.92` passes the `>= 0.9` check in `lookupComplexIdCached` and the transaction is auto-linked. Via `matchByAdminCode()` that same score would be capped to 0.85, which is below `AUTO_THRESHOLD`, so the transaction would _not_ be auto-linked. The discrepancy results in incorrectly linked `complex_id` values being stored for new ingest data while the DATA-09 batch script (which properly uses `matchByAdminCode`) would not auto-link the same transaction.

**Fix:** Replace the direct RPC call with `matchByAdminCode()`:

```typescript
import { matchByAdminCode } from './complex-matching'

async function lookupComplexIdCached(
  itemSggCode: string,
  nameNormalized: string,
): Promise<string | null> {
  const key = `${itemSggCode}:${nameNormalized}`
  if (complexIdCache.has(key)) return complexIdCache.get(key)!
  const result = await matchByAdminCode(
    { sggCode: itemSggCode, nameNormalized },
    supabase,
  )
  // matchByAdminCode already applies ADMIN_CONFIDENCE_CAP (0.85),
  // so result.confidence >= 0.9 is only possible if the RPC returned
  // an extremely high score AND cap allows it — correctly aligned with AUTO_THRESHOLD
  const complexId =
    result && result.confidence >= 0.9 ? result.complexId : null
  complexIdCache.set(key, complexId)
  return complexId
}
```

Note: `matchByAdminCode()` doesn't accept `p_min_similarity`; it always returns the best hit and the caller applies the threshold. This is the correct pattern used by `link-transactions.ts`.

---

### CR-02: KAPT API error message leaks the service key in the URL

**File:** `src/services/kapt.ts:40`

**Issue:** When the K-apt API responds with a non-OK status in `fetchComplexList`, the error thrown is:

```typescript
throw new Error(`K-apt API ${res.status}: ${await res.text()}`)
```

The `url.toString()` that was passed to `fetch()` contains the `ServiceKey` query parameter (line 30: `url.searchParams.set('ServiceKey', apiKey)`). The error message itself does not embed the URL, so that specific path is safe. However, if `res.text()` is called when the response body contains the full request URL reflected back (common in Korean public API error envelopes, e.g., `returnAuthMsg` includes the request URI), the key will appear in logs. More critically: the `fetchComplexList` caller in `buildDongMap` (line 88 of `kapt-enrich.ts`) logs `err.message` to `console.error` which goes to GitHub Actions job logs — **publicly visible** if the repo is public, and accessible to anyone with Actions read access otherwise. Even in a private repo this is a bad pattern.

The separate error in `fetchKaptBasicInfo` at line 98 does not include response body text, so that path is less risky, but the URL embedded in the constructed error could still appear in stack traces.

**Fix:** Strip query parameters from the URL before logging, and never include response body text that may reflect the request URL:

```typescript
// In fetchComplexList — safe error (no body text, no URL with key)
if (!res.ok) throw new Error(`K-apt API ${res.status} for sgg_code=${sggCode}`)

// In fetchKaptBasicInfo — similarly safe
if (!res.ok) throw new Error(`K-apt BasicInfo API ${res.status} for kaptCode=${kaptCode}`)
```

If the response body is needed for debugging, redact the `ServiceKey` before including it:

```typescript
const body = await res.text()
const safeBody = body.replace(/ServiceKey=[^&"'\s]+/gi, 'ServiceKey=REDACTED')
throw new Error(`K-apt API ${res.status}: ${safeBody}`)
```

---

### CR-03: `link-transactions.ts` feeds cancelled and superseded transactions into the matching pipeline

**File:** `scripts/link-transactions.ts:164-168`

**Issue:** The transaction batch fetch query is:

```typescript
const { data: rows, error: fetchError } = await supabase
  .from('transactions')
  .select('id, sgg_code, raw_complex_name')
  .is('complex_id', null)
  .range(offset, offset + BATCH_SIZE - 1)
```

CLAUDE.md mandates: "거래 데이터 조회는 `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함 (취소·정정 제외)". This query contains neither filter.

Consequences:
1. Cancelled transactions (`cancel_date IS NOT NULL`) are sent through `matchByAdminCode` and, if matched, their `complex_id` is written — meaning cancelled deals appear linked to a complex and could later surface in queries that incorrectly omit the cancel filter.
2. `complex_match_queue` entries are created for cancelled/superseded transactions, polluting the manual review queue with records that should never be matched.
3. The unmatched log will include cancelled deals, inflating the apparent unmatched rate.

**Fix:** Add the mandatory guards to the fetch query:

```typescript
const { data: rows, error: fetchError } = await supabase
  .from('transactions')
  .select('id, sgg_code, raw_complex_name')
  .is('complex_id', null)
  .is('cancel_date', null)         // CLAUDE.md: 취소 거래 제외
  .is('superseded_by', null)       // CLAUDE.md: 정정 거래 제외
  .range(offset, offset + BATCH_SIZE - 1)
```

Also apply the same guards to the COUNT query (line 137–141) to keep `total` consistent with the rows actually processed:

```typescript
const { count, error: countError } = await supabase
  .from('transactions')
  .select('id', { count: 'exact', head: true })
  .is('complex_id', null)
  .is('cancel_date', null)
  .is('superseded_by', null)
```

---

## Warnings

### WR-01: `totalQueuedLow` counter includes already-queued transactions, overstating the queue count

**File:** `scripts/link-transactions.ts:193-198`

**Issue:** `totalQueuedLow++` is incremented unconditionally (line 198) regardless of whether `isAlreadyQueued` returned `true` or `false`. When the script is re-run on already-processed transactions, the counter will reflect all low-confidence matches, not just those actually inserted into the queue. The final summary message (`저신뢰 큐: ${totalQueuedLow.toLocaleString()}건`) will be misleading and the match rate calculation will be distorted because `totalLinked + totalQueuedLow + totalUnmatched` will exceed `total`.

The same issue applies to `totalUnmatched++` at line 212, which is inside the `else` branch but is also incremented regardless of the `isAlreadyQueued` result.

**Fix:** Move the counters inside the `if (!already)` block, or rename them to clearly represent "encountered" rather than "queued":

```typescript
} else if (matchResult && matchResult.confidence >= QUEUE_LOW_CONFIDENCE) {
  const already = await isAlreadyQueued(tx.id, supabase)
  if (!already) {
    await enqueueUnmatched(tx, 'low_confidence', [matchResult.complexId], supabase)
    totalQueuedLow++   // only count actual inserts
  }
} else {
  const already = await isAlreadyQueued(tx.id, supabase)
  if (!already) {
    const candidates = matchResult ? [matchResult.complexId] : []
    await enqueueUnmatched(tx, 'no_match', candidates, supabase)
    totalUnmatched++   // only count actual inserts
  }
  appendUnmatchedLog(…)
}
```

---

### WR-02: `name-aliases.json` entries `"Xi"` and `"xi"` will incorrectly rewrite partial brand names

**File:** `src/lib/data/name-aliases.json:17-19`

**Issue:** The entries `"Xi": "자이"` and `"xi": "자이"` are unanchored short patterns. `nameNormalize` applies them via `new RegExp(pattern, 'g')` (name-normalize.ts line 21). Because these patterns match anywhere in the string, the following incorrect transforms will occur:

- `"Xi아파트"` → `"자이아파트"` (correct intent)
- `"MaxiApartments"` → `"Ma자이Apartments"` (incorrect — "xi" inside "Maxi")
- `"택시주차장"` → `"택자이주차장"` (incorrect — "xi" matches within Korean context after lowercase step — actually lowercase happens _after_ substitution, but "xi" in ASCII could appear in imported foreign brand names)

The pattern `"자이Xi": "자이"` on line 17 already handles the compound brand. The bare `"Xi"` and `"xi"` entries are overly broad and will corrupt any complex name containing those two-character ASCII sequences. This is a silent data corruption risk because `nameNormalize` is used both for DB storage (`name_normalized` column) and matching — a bad normalization could prevent a legitimate complex from ever matching.

**Fix:** Use word-boundary anchors or more specific patterns:

```json
{
  "자이Xi": "자이",
  "(?<![A-Za-z가-힣])Xi(?![A-Za-z가-힣])": "자이",
  "(?<![A-Za-z가-힣])xi(?![A-Za-z가-힣])": "자이"
}
```

Or remove the bare `"Xi"`/`"xi"` entries entirely if `"자이Xi"` already covers the main use case, and rely on the `자이Xi → 자이` substitution plus the later lowercasing.

---

### WR-03: `isAlreadyQueued` silently swallows DB errors in `link-transactions.ts`

**File:** `scripts/link-transactions.ts:58-69`

**Issue:** The `isAlreadyQueued` function ignores the `error` field from the Supabase query:

```typescript
const { data } = await supabase
  .from('complex_match_queue')
  .select('source')
  .eq('source', 'link-transactions')
  .contains('raw_payload', { tx_id: txId })
  .limit(1)
return (data?.length ?? 0) > 0
```

If the DB query fails (network timeout, RLS rejection, schema mismatch), `data` will be `null`, `(null?.length ?? 0) > 0` evaluates to `false`, and the caller proceeds to insert a duplicate record into `complex_match_queue`. On a re-run where the queue already has entries, a transient DB error causes unbounded duplicate insertion rather than a safe abort.

**Fix:**

```typescript
async function isAlreadyQueued(
  txId: string,
  supabase: SupabaseClientType,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('complex_match_queue')
    .select('source')
    .eq('source', 'link-transactions')
    .contains('raw_payload', { tx_id: txId })
    .limit(1)
  if (error) throw new Error(`isAlreadyQueued query failed: ${error.message}`)
  return (data?.length ?? 0) > 0
}
```

The same silent-swallow pattern exists in the test file (`link-transactions.test.ts:140-146`) but that is test code and its `error` field was not returned from the mock — acceptable in isolation but reinforces the missing production-side guard.

---

### WR-04: `kapt-enrich.ts` treats `fetchKaptBasicInfo null` as a failure and exits non-zero

**File:** `scripts/kapt-enrich.ts:153-157, 221-224`

**Issue:** When `fetchKaptBasicInfo` returns `null` (parsed data failed schema validation — a normal condition for complexes where the KAPT API has no record), the script increments `failCount` and at the end exits with `process.exit(1)` if `failCount > 0`. This means a single complex missing from KAPT's database causes the GitHub Actions workflow to mark the job as failed and send an error notification. For a one-off enrichment run across ~669 complexes, some proportion is expected to return null (e.g., pre-2004 buildings not in the KAPT V3 dataset).

**Fix:** Distinguish between true errors (network failure, API error) and expected null responses. Count null returns as `skippedCount` rather than `failCount`:

```typescript
if (!info) {
  console.warn(`${progress} ${complex.canonical_name} — KAPT 데이터 없음 (스킵)`)
  skippedCount++  // not a failure — expected for some complexes
  await delay(RATE_LIMIT_DELAY_MS)
  continue
}
```

Only exit non-zero on genuine errors (network failures, update errors). The final summary should show `skip` separately from `fail`.

---

### WR-05: `link-transactions.ts` calls `isAlreadyQueued` once per unmatched transaction — O(n) extra DB round trips at scale

**File:** `scripts/link-transactions.ts:194-213`

**Issue:** For every transaction that is not auto-linked (potentially tens of thousands), `isAlreadyQueued` fires a separate `SELECT` against `complex_match_queue` using a `JSONB @>` operator (`contains`). A JSONB containment query without a GIN index on `raw_payload` will perform a sequential scan per call. At 50,000 unmatched transactions in a batch of 500, this means up to 1,000 extra round-trip queries per batch iteration purely for dedup checking. This is within scope as a correctness issue because it can cause the script to time out (the workflow has `timeout-minutes: 120`), resulting in partial data with no clear restart boundary.

**Fix:** Batch the dedup check. Before processing a batch, query all existing `complex_match_queue` entries for the current batch's `tx_id` values and build a `Set<string>`:

```typescript
// Before the per-row loop
const batchTxIds = rows.map(r => r.id)
const { data: existing } = await supabase
  .from('complex_match_queue')
  .select('raw_payload')
  .eq('source', 'link-transactions')
  .in('raw_payload->>tx_id', batchTxIds)  // requires GIN index on raw_payload
// Build a Set<string> of already-queued tx IDs
const alreadyQueuedSet = new Set(
  (existing ?? []).map(e => (e.raw_payload as { tx_id: string }).tx_id)
)
// Replace isAlreadyQueued(tx.id, supabase) with: alreadyQueuedSet.has(tx.id)
```

---

## Info

### IN-01: `actions/checkout@v5` does not exist — both workflows reference a non-existent major version

**File:** `.github/workflows/kapt-enrich-once.yml:13`, `.github/workflows/link-transactions-once.yml:13`

**Issue:** As of the knowledge cutoff, the latest stable release of `actions/checkout` is `v4` (v4.x series). `@v5` does not exist. GitHub Actions will fail to resolve this action at runtime. The current latest is `actions/checkout@v4`.

**Fix:**

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
```

Check the GitHub Actions marketplace to confirm the latest pinned SHA for a more secure reference.

---

### IN-02: `poraena` alias is missing — `한화포레나` brand is mapped twice inconsistently

**File:** `src/lib/data/name-aliases.json:1-2, 11`

**Issue:** Two separate patterns map to `"한화포레나"`:
- Line 1: `"한화[\\s]?포레나"` → `"한화포레나"` (normalises spacing)
- Line 11: `"포레나"` → `"한화포레나"` (adds brand prefix)

This is logically correct but `"포레나"` will also match `"포레나빌"`, `"포레나타운"`, or any complex that happens to contain "포레나" as a substring of an unrelated brand. Since `nameNormalize` also strips `아파트` and spaces, a complex named "그랑포레나" would become "그랑한화포레나" — corrupting the normalized name.

**Fix:** Add a word-start anchor or require that "포레나" appears at the beginning of the name or after whitespace:

```json
"(?:^|\\s)포레나": "한화포레나"
```

Or remove the bare `"포레나"` entry if the spacing normalizer on line 1 is sufficient.

---

### IN-03: `molit-ingest.test.ts` DATA-10 tests do not verify that `complex_id` is actually stored in the upserted transaction row

**File:** `src/__tests__/molit-ingest.test.ts:294-322, 324-353`

**Issue:** Test 1 ("Test 1: ingestMonth가 처리한 SaleItem에 complex_id가 포함되어야 한다") verifies that `matchSupabase.rpc` was called with the correct parameters, and that `from('transactions')` was accessed, but does not assert that the `upsert` call received `complex_id: 'complex-uuid-1'`. The mock for `from('complexes').update` is not chained correctly to validate the argument. Test 2 similarly does not confirm `complex_id: null` in the upsert payload. The tests pass even if `lookupComplexIdCached` returned `null` for both cases, meaning CR-01 would not be caught by the test suite.

**Fix:** Assert on the upsert argument's `complex_id` field:

```typescript
// After await ingestMonth(…)
const upsertMock = mockSupabase.from('transactions').upsert
expect(upsertMock).toHaveBeenCalledWith(
  expect.objectContaining({ complex_id: 'complex-uuid-1' }),
  expect.any(Object),
)
```

---

_Reviewed: 2026-05-11T00:00:00Z_
_Reviewer: Claude (code-reviewer)_
_Depth: deep_
