# Phase 7: 데이터 파이프라인 수리 - Research

**Researched:** 2026-05-11
**Domain:** Data pipeline — KAPT API enrichment, MOLIT transaction matching, ingestMonth refactor
**Confidence:** HIGH (codebase verified) / MEDIUM (KAPT API field names from community sources)

---

## Summary

Phase 7 fixes the data gap that makes the entire service hollow: 669 complexes have no address/built-year/household details, and 186,765 transactions are unlinked to any complex. Three scripts and one function modification close this gap.

**DATA-08** enriches `complexes` rows by calling `fetchKaptBasicInfo(kaptCode)` for each of the 669 rows that have a `kapt_code`. The existing `KaptBasicInfoSchema` already captures `heatType` and `kaptdaCnt`. It is missing `kaptUsedate` (built year from `사용승인일`) and `doroJuso` (road address) — these fields exist in the API response but are not yet in the zod schema. The `fetchComplexList` response already returns `as1` (시도), `as2` (시군구), `as3` (읍면동), and `bjdCode`. For the 6 sgg_codes in the project, the `regions` table already stores `si` and `gu` — so `si` and `gu` can be derived from `sgg_code` without an API call; only `dong` requires the KAPT list response's `as3` field.

**DATA-09** back-fills `transactions.complex_id` using the `match_complex_by_admin` Postgres RPC that already exists. The function performs trigram similarity within the same `sgg_code` and is the architecturally approved Axis 3 fallback when coordinates are unavailable (transactions have no coordinates). Confidence cap is 0.85 per ADR-034. Rows with similarity < 0.5 go to `complex_match_queue` as `no_match`; rows 0.5–0.9 as `low_confidence`.

**DATA-10** modifies `ingestMonth` in `src/lib/data/realprice.ts` to: (1) store `aptSeq` as `molit_complex_code` on the matching `complexes` row (one-time upsert); (2) lookup `complex_id` via `match_complex_by_admin` at write time so future transactions are pre-linked.

**Primary recommendation:** Implement as three independent `scripts/` batch files (kapt-enrich.ts, link-transactions.ts) plus a modification to `ingestMonth`. Run scripts via `workflow_dispatch` GitHub Actions following the `embed-complexes-once.yml` pattern.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| KAPT API call | scripts/ (batch) | src/services/kapt.ts | One-time enrichment; adapter already exists |
| complexes row update | scripts/ (batch) | Supabase Postgres | Batch upsert via service-role client |
| transaction→complex matching | scripts/ (batch) → DB RPC | src/lib/data/complex-matching.ts | `match_complex_by_admin` RPC already in DB |
| ingestMonth complex_id lookup | src/lib/data/realprice.ts | DB RPC | Inline at write time per DATA-10 |
| molit_complex_code storage | src/lib/data/realprice.ts | complexes table | aptSeq from MOLIT response → complexes.molit_complex_code |
| Unmatched logging | scripts/ + complex_match_queue | DB | Existing queue table and enqueue logic |
| GitHub Actions trigger | .github/workflows/ | — | workflow_dispatch; same pattern as backfill/embed |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-08 | KAPT API로 complexes 상세정보 채우기 (si, gu, dong, road_address, household_count, built_year, heat_type) | `fetchKaptBasicInfo` exists; schema needs `kaptUsedate` + `doroJuso` fields; `si`/`gu` derivable from `regions` table; `dong` from `fetchComplexList.as3` |
| DATA-09 | transactions.complex_id 일괄 연결 (sgg_code + 이름 매칭 → 불확실 건은 unmatched 로그) | `match_complex_by_admin` RPC exists with trigram; `complex_match_queue` table exists; `matchByAdminCode` function exists in complex-matching.ts |
| DATA-10 | ingestMonth 수정 — aptSeq → molit_complex_code 저장 + complex_id 자동 lookup | `aptSeq` already parsed in `MolitSaleItemSchema`/`MolitRentItemSchema`; `complexes.molit_complex_code` column exists (UNIQUE); `matchByAdminCode` ready to call |

</phase_requirements>

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.105.1 | Supabase client for batch scripts | Already used in all scripts |
| `tsx` | ^4.21.0 | Run TypeScript scripts | Already used in all scripts |
| `@next/env` | (bundled) | Load `.env.local` in scripts | Already used in all scripts |
| `zod` v4 | ^4.4.1 | Schema validation for API responses | Already used in kapt.ts and molit.ts |

[VERIFIED: package.json in repo]

### No new dependencies needed

All infrastructure (Supabase client, retry logic, KAPT adapter, name normalization, matching RPC functions) already exists. Phase 7 is purely about wiring existing components.

**Installation:** none

---

## Architecture Patterns

### System Architecture Diagram

```
KAPT API (data.go.kr)
    │ fetchComplexList(sggCode) → as3=dong
    │ fetchKaptBasicInfo(kaptCode) → kaptdaCnt, heatType, kaptUsedate, doroJuso
    ▼
scripts/kapt-enrich.ts
    │ for each complex WHERE kapt_code IS NOT NULL (669 rows)
    │   → extend KaptBasicInfoSchema with kaptUsedate, doroJuso
    │   → derive si/gu from regions table (sgg_code lookup)
    │   → fetch dong from fetchComplexList result (as3)
    │   → UPDATE complexes SET si, gu, dong, road_address, household_count, built_year, heat_type
    ▼
complexes table (669 rows enriched)
    │
    ▼
scripts/link-transactions.ts
    │ for each transaction WHERE complex_id IS NULL (186,765 rows)
    │   → nameNormalize(raw_complex_name)
    │   → call match_complex_by_admin(sgg_code, name_normalized, 0.5)
    │   → if trgm_sim >= 0.9  → UPDATE transactions SET complex_id
    │   → if 0.5–0.9          → INSERT complex_match_queue (low_confidence)
    │   → if < 0.5            → INSERT complex_match_queue (no_match)
    ▼
transactions table (complex_id filled)
    │
    ▼
src/lib/data/realprice.ts (ingestMonth — DATA-10)
    │ for each new transaction item:
    │   aptSeq ("48121-792") present?
    │     → UPDATE complexes SET molit_complex_code = aptSeq WHERE kapt_code matches
    │     → OR: look up complex_id by matchByAdminCode, then link
    │   → upsertTransaction with complex_id populated
    ▼
future transactions auto-linked at ingest time
```

### Recommended Project Structure (new files only)

```
scripts/
├── kapt-enrich.ts          # DATA-08: KAPT API → complexes enrichment
├── link-transactions.ts    # DATA-09: batch complex_id linkage
└── (existing: backfill-realprice.ts, embed-complexes.ts)

src/services/
└── kapt.ts                 # MODIFY: extend KaptBasicInfoSchema (add kaptUsedate, doroJuso)

src/lib/data/
└── realprice.ts            # MODIFY: DATA-10 ingestMonth → store molit_complex_code + lookup complex_id

.github/workflows/
├── kapt-enrich-once.yml    # workflow_dispatch; mirrors embed-complexes-once.yml pattern
└── link-transactions-once.yml
```

### Pattern 1: KAPT BasicInfo Schema Extension

**What:** Add missing fields to `KaptBasicInfoSchema` in `src/services/kapt.ts`

The existing schema captures `kaptdaCnt` (세대수), `heatType` (난방방식), `kaptDongCnt`, `managementType`, `totalArea`. Community documentation confirms the API also returns:

- `kaptUsedate` — 사용승인일 (format: `YYYYMMDD` or `YYYY-MM-DD`; equivalent to built year source) [CITED: github.com/luritas/open-data-api wiki]
- `doroJuso` — 도로명주소 (road address string) [CITED: github.com/luritas/open-data-api wiki]
- `codeHeatNm` — 난방방식 명칭 (heating type name; current schema uses `heatType` which may be the same field) [ASSUMED — field name in V3 API may differ from V1]
- `kaptAddr` — 법정동주소 (legal address; separate from road address)

**Current schema gap:** `kaptUseApproveYmd` referenced in `seed-complexes.ts` is NOT a field from `fetchKaptBasicInfo` — it was used in bootstrap test data only. The real built-year field from the API is `kaptUsedate`. [VERIFIED: seed-complexes.ts line 39 uses the field for bootstrap fake data, not from API]

```typescript
// Source: verified in src/services/kapt.ts + community API docs
// ADD to KaptBasicInfoSchema:
const KaptBasicInfoSchema = z.object({
  kaptCode:       z.string(),
  kaptName:       z.string(),
  kaptdaCnt:      z.coerce.number().optional(),   // 세대수
  kaptDongCnt:    z.coerce.number().optional(),   // 동수
  heatType:       z.string().optional(),          // 난방방식 (or codeHeatNm — verify on first run)
  codeHeatNm:     z.string().optional(),          // 난방방식 명칭 (fallback)
  managementType: z.string().optional(),
  totalArea:      z.coerce.number().optional(),
  // NEW FIELDS:
  kaptUsedate:    z.string().optional(),          // 사용승인일 YYYYMMDD
  doroJuso:       z.string().optional(),          // 도로명주소
  kaptAddr:       z.string().optional(),          // 법정동주소
})
```

**built_year extraction:** `parseInt(kaptUsedate.slice(0, 4), 10)` — same pattern already used in `seedComplex` for `kaptUseApproveYmd`.

### Pattern 2: si/gu/dong Derivation Strategy

**What:** complexes needs si, gu, dong. Three sources available:

| Field | Source | Availability |
|-------|--------|-------------|
| si | `regions` table (sgg_code lookup) | 100% — every complex has sgg_code |
| gu | `regions` table (sgg_code lookup) | 100% — every complex has sgg_code (null for 김해시) |
| dong | `fetchComplexList` response → `as3` field | Available if we fetch the list per sgg_code |

**Recommended approach for si/gu (DATA-08):**

```typescript
// Source: VERIFIED — seed.ts and regions.sql confirm this mapping exists
// In kapt-enrich.ts: one-time fetch from regions table
const { data: regionsData } = await supabase.from('regions').select('sgg_code, si, gu')
const regionMap = new Map(regionsData.map(r => [r.sgg_code, { si: r.si, gu: r.gu }]))
// Then for each complex: regionMap.get(complex.sgg_code)
```

**Recommended approach for dong:**

Option A (preferred): Call `fetchComplexList(sggCode)` once per sgg_code, build a `kaptCode → as3` lookup map, then use it during enrichment. This adds 6 API calls total (one per sgg_code in `regions`).

Option B: Store `as3` from `fetchComplexList` response when it was first called in `seed-complexes.ts` (not done — `KaptComplex` doesn't map `as3` to `dong` in `seedComplex`). This would require re-running seed, which risks conflicts.

**Verdict: Option A.** Add a `buildDongMap(sggCodes, supabase)` step at the start of `kapt-enrich.ts`. [ASSUMED — verify as3 is populated for all 669 complexes in the API response]

### Pattern 3: Batch Transaction Matching (DATA-09)

**What:** Use existing `match_complex_by_admin` RPC to link 186,765 rows

```typescript
// Source: VERIFIED — src/lib/data/complex-matching.ts + migration 0012
// match_complex_by_admin(sgg_code, name_normalized, min_similarity=0.5)
// Returns: { id, canonical_name, trgm_sim }

const BATCH_SIZE = 500   // tune to avoid Supabase timeout
const AUTO_THRESHOLD = 0.9   // same as matchByAdminCode in complex-matching.ts
const QUEUE_THRESHOLD = 0.5  // same as p_min_similarity in match_complex_by_admin

// For each batch of transactions WHERE complex_id IS NULL:
for (const tx of batch) {
  const normalized = nameNormalize(tx.raw_complex_name)
  const { data } = await supabase.rpc('match_complex_by_admin', {
    p_sgg_code: tx.sgg_code,
    p_name_normalized: normalized,
    p_min_similarity: QUEUE_THRESHOLD,
  })
  if (data?.length > 0) {
    const row = data[0]
    const confidence = Math.min(row.trgm_sim, 0.85)  // ADMIN_CONFIDENCE_CAP
    if (confidence >= AUTO_THRESHOLD) {
      // UPDATE transactions SET complex_id = row.id WHERE id = tx.id
    } else {
      // INSERT complex_match_queue (low_confidence)
    }
  } else {
    // INSERT complex_match_queue (no_match)
  }
}
```

**Performance:** 186,765 rows / 500 per batch = ~374 batches. Each batch is one RPC call per transaction row. Use bulk UPDATE after accumulating matched IDs per batch. Rate: ~200ms between batches = ~75 seconds total for matching phase + ~30 minutes for 186K individual RPC calls → MUST batch the RPC calls or use a Postgres function for bulk matching.

**Critical optimization:** Write a one-time SQL migration function for bulk DATA-09 to avoid 186K individual RPC calls:

```sql
-- One-shot bulk link (run as migration or via supabase.rpc)
UPDATE public.transactions t
SET complex_id = (
  SELECT c.id
  FROM public.complexes c
  WHERE c.sgg_code = t.sgg_code
    AND c.status != 'demolished'
    AND similarity(c.name_normalized, public.name_normalize_fn(t.raw_complex_name)) >= 0.9
  ORDER BY similarity(c.name_normalized, public.name_normalize_fn(t.raw_complex_name)) DESC
  LIMIT 1
)
WHERE t.complex_id IS NULL
  AND t.cancel_date IS NULL
  AND t.superseded_by IS NULL;
```

However, `nameNormalize` is a TypeScript function with an alias JSON dictionary. A Postgres equivalent would need to replicate the normalization logic. The simpler path: batched TypeScript script with bulk UPDATE per batch. [ASSUMED — Postgres pg_trgm similarity on pre-normalized `name_normalized` column in complexes vs raw_complex_name in transactions is the bottleneck]

**Correct approach:** normalize `raw_complex_name` in TypeScript, then use the DB RPC. Accumulate (tx_id, complex_id) pairs per batch, then bulk UPDATE. This is 374 batch iterations with 500 individual RPC calls each = still 186K RPC calls. Use a `supabase.rpc()` that accepts an array, or write a Postgres helper.

**Recommended: Write `link_transactions_bulk` Postgres function** in a migration that does the join internally using pg_trgm, accepting a normalized name from TypeScript. Or run directly as a SQL query in a migration file with a `DO $$` block. The planner should decide between script-based and migration-based approaches.

### Pattern 4: ingestMonth DATA-10 Modification

**What:** After upserting a transaction, lookup and set `complex_id`

Current flow in `ingestMonth` → `processSaleItem`:
1. Parse item (aptSeq available as `item.aptSeq`)
2. Call `upsertTransaction(row, supabase)` — row has no `complex_id`

**Required additions:**

```typescript
// Source: VERIFIED — src/lib/data/realprice.ts + molit.ts
// aptSeq is already parsed: item.aptSeq = "48121-792"

// Step A: Store molit_complex_code on complexes if aptSeq present
if (item.aptSeq) {
  await supabase
    .from('complexes')
    .update({ molit_complex_code: item.aptSeq })
    .eq('sgg_code', sggCode)
    .eq('name_normalized', nameNormalize(item.aptNm))
    .is('molit_complex_code', null)  // only set if not already set
  // OR: look up by matchByAdminCode first, then update by id
}

// Step B: Lookup complex_id
const normalized = nameNormalize(item.aptNm)
const complexId = await lookupComplexId(sggCode, normalized, supabase)

// Step C: Pass complex_id to upsertTransaction
await upsertTransaction({
  ...row,
  complex_id: complexId ?? null,
}, supabase)
```

**lookupComplexId helper** (new function in `src/lib/data/realprice.ts` or `complex-matching.ts`):

```typescript
async function lookupComplexId(
  sggCode: string,
  nameNormalized: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase.rpc('match_complex_by_admin', {
    p_sgg_code: sggCode,
    p_name_normalized: nameNormalized,
    p_min_similarity: 0.9,  // only auto-link high confidence
  })
  if (!data || data.length === 0) return null
  return (data[0] as { id: string }).id
}
```

**Important:** `molit_complex_code` column already exists on `complexes` (UNIQUE constraint). The column is the `aptSeq` string (`"48121-792"` format). The update path should be: if aptSeq is known, try to find the complex by admin code match first, then set `molit_complex_code` on the matched complex. Do NOT set `molit_complex_code` blindly — only after a confident match (≥ 0.9 similarity). [VERIFIED: migration 20260430000002_complexes.sql — `molit_complex_code text unique`]

### Anti-Patterns to Avoid

- **Name-only matching:** CLAUDE.md mandates "단지명 단독 매칭 절대 금지." Axis 3 (sgg_code + trigram) is the architecturally approved fallback — never skip the sgg_code filter.
- **Overwriting existing complex_id:** DATA-09 script must have `WHERE complex_id IS NULL` guard.
- **Setting molit_complex_code without a confident match:** could corrupt the UNIQUE index if two transactions from different complexes have `aptSeq` that hash to the same complex row.
- **Running kapt-enrich without rate limiting:** KAPT API is `일 100,000회`. 669 complexes × 1 call each = safe, but add `await new Promise(r => setTimeout(r, 100))` between calls as defensive measure.
- **Forgetting to update `data_completeness` JSONB:** After enrichment, set `data_completeness = '{"transactions":true,"school":false,"kapt":true,"poi":false}'` for enriched rows. The embed script reads `si/gu/dong/built_year/household_count` — they must be populated before re-embedding.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trigram string similarity | Custom Levenshtein/Jaro-Winkler | `pg_trgm` via `match_complex_by_admin` RPC | Already in DB, indexed, handles Korean characters |
| Korean name normalization | New normalization code | `nameNormalize()` in `src/lib/data/name-normalize.ts` | NFC, alias JSON, 아파트 suffix removal, han-num conversion already done |
| Low-confidence match queue | New table | `complex_match_queue` (exists) + `enqueueMatch()` in complex-matching.ts | Table + logic already exist per ADR-039 |
| Batch script pattern | New scaffolding | Mirror `scripts/backfill-realprice.ts` | `loadEnvConfig`, `createClient`, arg parsing, progress reporting all there |
| GitHub Actions workflow | New CI structure | Mirror `.github/workflows/embed-complexes-once.yml` | `workflow_dispatch`, Node 22, `npm ci`, env var pattern established |
| sgg_code → si/gu mapping | Hardcoded map | `regions` table query | Table exists, all 6 sgg_codes seeded |

**Key insight:** The matching, queueing, and normalization infrastructure was built in earlier phases specifically for this use case. Phase 7 is primarily about calling existing functions in batch scripts, not building new logic.

---

## Common Pitfalls

### Pitfall 1: KaptBasicInfo field names differ between API versions

**What goes wrong:** The existing `KaptBasicInfoSchema` uses `heatType` but community docs suggest the V3 API may return `codeHeatNm`. Similarly, `kaptUsedate` (V1 name) vs a different field name in V3.

**Why it happens:** The API endpoint is `AptBasisInfoServiceV3/getAphusBassInfoV3` (V3) but the wiki page documents the older V1 `AptBasisInfoService/getAphusBassInfo`.

**How to avoid:** On first run of `kapt-enrich.ts`, print the raw JSON response for one `kaptCode` to inspect actual field names before committing. Add both field variants to the zod schema with `.optional()`. [ASSUMED — field names must be verified on first live API call]

**Warning signs:** `kaptUsedate` is null for all rows after enrichment despite API call succeeding → field name mismatch; check raw response.

### Pitfall 2: aptSeq format varies ("48121-792" vs "K48121792")

**What goes wrong:** `molit_complex_code` UNIQUE constraint rejects duplicate inserts if the same aptSeq arrives from multiple months.

**Why it happens:** `molit_complex_code` is UNIQUE on `complexes`. Multiple transactions for the same complex will try to `UPDATE complexes SET molit_complex_code = aptSeq` — this is idempotent only if the value is the same each time.

**How to avoid:** Use `.update(...).is('molit_complex_code', null)` to only set it once, or use upsert on `molit_complex_code` conflict. [VERIFIED: UNIQUE constraint in migration 20260430000002]

### Pitfall 3: Batch DATA-09 creates duplicate `complex_match_queue` entries

**What goes wrong:** If `link-transactions.ts` is run twice, rows with `complex_id IS NULL` (unmatched) are re-queued.

**How to avoid:** Check for existing queue entry before inserting: `complex_match_queue` has no UNIQUE constraint on `raw_payload`. Add a guard: only enqueue if no existing pending entry for the same transaction. Or truncate queue before re-run. Better: add a `source_transaction_id` column reference (migration needed).

**Warning signs:** `complex_match_queue` grows larger than 186K rows after second run.

### Pitfall 4: nameNormalize alias JSON is empty `{}`

**What goes wrong:** `src/lib/data/name-aliases.json` currently contains `{}` (empty). This means alias substitution (e.g., "래미안" → consistent form) is not applied. Trigram similarity may fail for edge cases.

**Why it happens:** Alias dictionary was scaffolded but not populated. [VERIFIED: name-aliases.json reads `{}`]

**How to avoid:** Populate aliases for common variants before running DATA-09 (e.g., abbreviations like "e편한세상" → "이편한세상", "힐스테이트" variants). This is a low-effort high-impact improvement for match rate. The planner should include a Wave 0 task to audit and populate `name-aliases.json`.

**Warning signs:** Match rate below 70% on first DATA-09 run → inspect unmatched queue for patterns, add aliases.

### Pitfall 5: ingestMonth performance degradation with complex_id lookup

**What goes wrong:** Adding one RPC call per transaction in `processSaleItem` + `processRentItem` doubles the DB round-trips. With hundreds of items per month, this slows the daily cron significantly.

**How to avoid:** Cache the `sggCode → nameNormalized → complexId` lookups in a Map per `ingestMonth` call. Most months have many transactions per complex, so cache hit rate will be high.

```typescript
// In ingestMonth: add a cache at top
const complexIdCache = new Map<string, string | null>()

async function lookupComplexIdCached(sggCode: string, nameNormalized: string): Promise<string | null> {
  const key = `${sggCode}:${nameNormalized}`
  if (complexIdCache.has(key)) return complexIdCache.get(key)!
  const result = await lookupComplexId(sggCode, nameNormalized, supabase)
  complexIdCache.set(key, result)
  return result
}
```

### Pitfall 6: DATA-09 uses `cancel_date IS NULL AND superseded_by IS NULL` but links cancelled rows

**What goes wrong:** The batch script might update `complex_id` for cancelled transactions (where `cancel_date IS NOT NULL`). These should still get `complex_id` for historical analysis, but the constraint is important for display queries.

**How to avoid:** The DATA-09 script should link ALL transactions regardless of cancel status — `complex_id` is needed even for cancelled deals for completeness. The display queries already filter `WHERE cancel_date IS NULL AND superseded_by IS NULL`. [VERIFIED: transactions table schema — cancel_date and complex_id are independent columns]

---

## Code Examples

### Batch Script Skeleton (mirrors backfill-realprice.ts)

```typescript
// Source: VERIFIED — scripts/backfill-realprice.ts pattern
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  if (!process.env.KAPT_API_KEY) {
    console.error('KAPT_API_KEY 환경변수 필요')
    process.exit(1)
  }
  // ... batch logic
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
```

### GitHub Actions Workflow Skeleton (mirrors embed-complexes-once.yml)

```yaml
# Source: VERIFIED — .github/workflows/embed-complexes-once.yml pattern
name: KAPT 단지 정보 적재 (1회성)

on:
  workflow_dispatch: {}

jobs:
  enrich:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Run KAPT enrich
        env:
          KAPT_API_KEY: ${{ secrets.KAPT_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npx tsx scripts/kapt-enrich.ts
```

### Existing match_complex_by_admin RPC call (Axis 3 — approved pattern)

```typescript
// Source: VERIFIED — src/lib/data/complex-matching.ts matchByAdminCode()
const { data, error } = await supabase.rpc('match_complex_by_admin', {
  p_sgg_code:        sggCode,
  p_name_normalized: nameNormalize(rawName),
  p_min_similarity:  0.5,   // returns candidates; filter ≥ 0.9 for auto-link
})
// data[0].trgm_sim: number, data[0].id: uuid
```

### data_completeness JSONB update after KAPT enrichment

```typescript
// Source: VERIFIED — src/lib/data/complex-matching.ts INITIAL_DATA_COMPLETENESS pattern
await supabase
  .from('complexes')
  .update({
    si, gu, dong,
    road_address: doroJuso,
    household_count: kaptdaCnt,
    built_year: kaptUsedate ? parseInt(kaptUsedate.slice(0, 4), 10) : null,
    heat_type: heatType ?? codeHeatNm ?? null,
    data_completeness: { transactions: false, school: false, kapt: true, poi: false },
  })
  .eq('kapt_code', kaptCode)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One-by-one DB calls | Bulk batch with progress tracking | Already standard in this project | backfill-realprice.ts pattern applies |
| Axis 1/2 matching (coord + address) | Axis 3 (sgg_code + trigram) as fallback for no-coord data | Phase 1 design | Transactions have no coordinates — Axis 3 is the only viable path |
| Empty aliases JSON | Populated aliases JSON | Needs to happen in Phase 7 | Directly affects match rate |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `kaptUsedate` is the V3 API field name for 사용승인일 (built year) | Standard Stack / Pattern 1 | built_year remains null; need to inspect raw response and rename field |
| A2 | `heatType` in existing schema matches the actual V3 API field (not `codeHeatNm`) | Pattern 1 | heat_type remains null; add `codeHeatNm` to schema as fallback |
| A3 | `as3` field from `fetchComplexList` is populated for all 669 complexes (not empty for some dong values) | Pattern 2 | dong field remains null for some complexes; acceptable as partial success |
| A4 | Bulk DATA-09 via 186K individual RPC calls completes within GitHub Actions 60-minute timeout | Pattern 3 | Need to implement Postgres-side bulk function or increase timeout-minutes |
| A5 | Match rate ≥ 80% is achievable with current `name_normalized` + pg_trgm (Axis 3 only) | Success criteria | May need to populate `name-aliases.json` and/or lower threshold + manual review |
| A6 | `molit_complex_code` update path: setting it via `matchByAdminCode` is safe when confidence ≥ 0.9 | Pattern 4 | Could set wrong aptSeq on complex if match is incorrect at 0.9 threshold |

---

## Open Questions

1. **DATA-09 performance: script vs SQL migration**
   - What we know: 186K rows, existing RPC works per-row, no bulk RPC exists
   - What's unclear: Can a pure SQL UPDATE using pg_trgm similarity on `raw_complex_name` vs `name_normalized` achieve equivalent results without TypeScript normalization?
   - Recommendation: Planner should decide between (a) TypeScript batch script with in-process normalization calling the RPC, vs (b) a one-shot SQL migration that uses pg_trgm directly on the already-normalized `complexes.name_normalized` column. Option (b) is faster but cannot apply the alias JSON dictionary.

2. **DATA-08 dong population: fetchComplexList returns as3 for all sgg_codes?**
   - What we know: `KaptComplexSchema` declares `as3` as optional. `fetchComplexList(sggCode)` returns the list for a sgg_code.
   - What's unclear: Whether as3 is populated for every complex in the list, or only some.
   - Recommendation: On first run, log the percentage of complexes with as3 populated.

3. **Alias JSON population scope**
   - What we know: `name-aliases.json` is currently `{}`. Trigram similarity alone at 0.5+ threshold handles most variations.
   - What's unclear: How many of the ~186K transactions have names that would fail 0.5 threshold after normalization.
   - Recommendation: Run DATA-09 first without aliases, inspect the `no_match` queue (< 0.5 cases), then populate aliases for common failure patterns before a second pass.

4. **Should DATA-10 lookup be synchronous per transaction or cached?**
   - What we know: `ingestMonth` processes items in sequence with `for (const item of items) await processItem(item)`.
   - What's unclear: Acceptable latency impact on the daily cron with ~200 extra RPC calls per month.
   - Recommendation: Implement the cache Map pattern (see Pitfall 5) to limit RPC calls to unique complex names per ingest run.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| KAPT_API_KEY | DATA-08 kapt-enrich.ts | [ASSUMED] | — | None — script will exit(1) |
| MOLIT_API_KEY | DATA-10 ingestMonth | [ASSUMED] | — | None — already required |
| NEXT_PUBLIC_SUPABASE_URL | All scripts | [ASSUMED] | — | None |
| SUPABASE_SERVICE_ROLE_KEY | All scripts | [ASSUMED] | — | None |
| pg_trgm extension | DATA-09 match_complex_by_admin | Verified via migration 20260430000001 | — | None — extension installed in migration |
| tsx | Script runner | Verified | 4.21.0 | — |
| Node.js | Script runner | Verified | 24.14.0 (local) / 22 (CI) | — |

[VERIFIED: package.json, backfill-realprice.ts env validation pattern, migration 20260430000001_extensions.sql for pg_trgm]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | vitest.config.ts (inferred from package.json) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-08 | `fetchKaptBasicInfo` schema includes kaptUsedate + doroJuso | unit | `npm run test -- kapt` | ❌ Wave 0 |
| DATA-08 | Enrichment script updates si/gu/dong/built_year/household_count/heat_type | integration | `npm run test -- kapt-enrich` | ❌ Wave 0 |
| DATA-09 | `link-transactions` produces complex_id for high-confidence matches | integration | `npm run test -- link-transactions` | ❌ Wave 0 |
| DATA-09 | Low-confidence matches go to complex_match_queue | integration | `npm run test -- link-transactions` | ❌ Wave 0 |
| DATA-10 | `ingestMonth` with aptSeq → complex_id populated on transaction | unit/integration | `npm run test -- molit-ingest` | ✅ (extend existing) |
| DATA-10 | `ingestMonth` with aptSeq → molit_complex_code set on complexes | integration | `npm run test -- molit-ingest` | ✅ (extend existing) |

### Sampling Rate

- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run build`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/kapt-enrich.test.ts` — unit tests for schema extension + mock API response parsing
- [ ] `src/__tests__/link-transactions.test.ts` — integration tests for batch linkage logic
- [ ] Extend `src/__tests__/molit-ingest.test.ts` — add DATA-10 assertions for `complex_id` and `molit_complex_code`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Batch scripts use service-role key (server-only) |
| V3 Session Management | no | No user sessions in batch scripts |
| V4 Access Control | yes | Scripts must use `SUPABASE_SERVICE_ROLE_KEY` — never `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| V5 Input Validation | yes | All KAPT API responses validated via Zod schemas before DB write |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns for Batch Scripts

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key in logs | Information Disclosure | Never `console.log(process.env.KAPT_API_KEY)`; existing pattern in backfill script complies |
| Mass UPDATE without WHERE guard | Tampering | Always include `WHERE kapt_code IS NOT NULL` / `WHERE complex_id IS NULL` guards |
| GitHub Actions secret exposure | Information Disclosure | Use `${{ secrets.* }}` pattern (already established in molit-backfill-once.yml) |

---

## Sources

### Primary (HIGH confidence)

- `src/services/kapt.ts` — VERIFIED: current KaptBasicInfoSchema fields (kaptdaCnt, heatType, kaptDongCnt, managementType, totalArea); `fetchComplexList` returns as1/as2/as3/bjdCode
- `src/lib/data/complex-matching.ts` — VERIFIED: 3-axis matching, confidence thresholds (0.9/0.7/0.5), `matchByAdminCode` using `match_complex_by_admin` RPC
- `src/lib/data/realprice.ts` — VERIFIED: `ingestMonth` flow, `aptSeq` parsed but not stored/used for complex_id
- `src/lib/data/name-normalize.ts` — VERIFIED: normalization logic (NFC, alias JSON, 아파트 suffix, spaces, lowercase)
- `supabase/migrations/20260430000002_complexes.sql` — VERIFIED: schema columns (molit_complex_code UNIQUE, kapt_code, si, gu, dong, road_address, household_count, built_year, heat_type, data_completeness)
- `supabase/migrations/20260430000012_match_functions.sql` — VERIFIED: `match_complex_by_admin(sgg_code, name_normalized, min_similarity)` function
- `scripts/backfill-realprice.ts` — VERIFIED: batch script pattern
- `.github/workflows/embed-complexes-once.yml` — VERIFIED: workflow_dispatch pattern
- `supabase/seed/regions.sql` — VERIFIED: 6 sgg_codes with si/gu mapping

### Secondary (MEDIUM confidence)

- [github.com/luritas/open-data-api wiki — 공동주택 기본정보](https://github.com/luritas/open-data-api/wiki/%EA%B3%B5%EB%8F%99%EC%A3%BC%ED%83%9D-%EA%B8%B0%EB%B3%B8%EC%A0%95%EB%B3%B4): confirms `kaptUsedate` (사용승인일), `doroJuso` (도로명주소), `codeHeatNm` (난방방식), `kaptdaCnt` (세대수) field names — NOTE: documents V1 API, V3 field names may differ
- Web search results: confirmed `doroJuso`, `codeHeatNm`, `kaptUsedate`, `kaptAddr` are real API response fields

### Tertiary (LOW confidence — needs validation on first run)

- A1–A6 in Assumptions Log above: KAPT V3 API exact field names must be validated on first live call

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — 3-axis matching RPC, queue table, normalization all verified in codebase
- KAPT API field names: MEDIUM — community wiki confirms V1 fields; V3 mapping assumed equivalent
- Match rate achievability (≥80%): LOW — depends on name normalization quality and alias JSON completeness

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (stable Korean government API; may be affected if data.go.kr updates field names)

---

## Open Questions (RESOLVED)

**Q1: DATA-09 performance — TypeScript script vs SQL migration?**

**Resolution: TypeScript batch script approach accepted.**

- 186K individual RPC calls in 500-item batches (~374 iterations) is accepted risk within the GitHub Actions 120-minute timeout.
- Estimated runtime: 374 batches × ~5s per batch (500 RPC calls + bulk UPDATE) = ~30 minutes. Well within 120-min timeout.
- The TypeScript approach is required because `nameNormalize()` applies the alias JSON dictionary which cannot be replicated in pure SQL without duplicating the normalization logic.
- **Idempotency guarantee:** The script uses `WHERE complex_id IS NULL` guard, so if a run times out at 80% completion, re-running picks up exactly where it left off with no duplicates.
- **80% match rate:** Not guaranteed in a single run. If not achieved, the script is idempotent and can be re-run after populating `name-aliases.json` with additional aliases from the `no_match` queue.
- Assumption A4 risk accepted: if 120 minutes is insufficient, increase `timeout-minutes` to 180 in the workflow.

**Q2: DATA-08 dong population — does fetchComplexList return as3 for all sgg_codes?**

**Resolution: Proceed with Option A (buildDongMap at script start); treat partial coverage as acceptable.**

- `KaptComplexSchema` declares `as3` as optional, so partial population is expected.
- The script logs the percentage of complexes with `as3` populated on first run (A3 assumption logged).
- Complexes with no `as3` from the API will have `dong = null`; this is acceptable as partial success — the critical fields are `si`, `gu`, `household_count`, and `built_year`.

**Q3: Alias JSON population scope — run with or without aliases first?**

**Resolution: Populate a minimal alias set (>10 entries) before first DATA-09 run.**

- `name-aliases.json` will be populated in 07-02 Task 1 with common Korean apartment brand variants (e편한세상, 힐스테잇, etc.) before running `link-transactions.ts`.
- After the first run, inspect `no_match` queue entries for additional alias patterns and add a second pass if match rate < 80%.
- The alias JSON is small enough to populate manually before execution — no automated alias discovery needed.

**Q4: Should DATA-10 lookup be synchronous per transaction or cached?**

**Resolution: Use cache Map pattern (Pitfall 5 strategy).**

- `lookupComplexIdCached()` defined inside `ingestMonth` scope with a `Map<string, string | null>` cache.
- Cache key: `"${sggCode}:${nameNormalized}"`.
- Effectively reduces RPC calls to the number of unique complex names per ingest batch (typically 20-100 per month per sgg_code), not one per transaction.
- Acceptable latency impact: negligible with cache in place.
