---
phase: 09-complex-detail-ux
reviewed: 2026-05-14T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - supabase/migrations/20260514000001_phase9_building_count.sql
  - supabase/migrations/20260514000002_phase9_transactions_for_chart.sql
  - scripts/kapt-facility-enrich.ts
  - src/lib/utils/iqr.ts
  - src/lib/utils/period-filter.ts
  - src/lib/utils/area-groups.ts
  - src/lib/utils/facility-format.ts
  - src/lib/data/complex-detail.ts
  - src/lib/data/management-cost.ts
  - src/app/complexes/[id]/page.tsx
  - src/components/complex/DealTypeTabs.tsx
  - src/components/complex/TransactionChart.tsx
  - src/components/complex/ManagementCostCard.tsx
  - .eslintrc.json
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-14
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 9 implements UX improvements to the complex detail page: individual transaction fetching for IQR outlier visualization, seasonal management cost comparison, and facility data enrichment (parking-per-unit, elevator-per-building). The transaction filter invariant (`cancel_date IS NULL AND superseded_by IS NULL`) is correctly applied in the new RPC. The ISR `revalidate = 86400` is maintained and no `searchParams` are read in `page.tsx`. No hardcoded secrets were found. No `console.log` exists in `src/` code.

One blocker was found: the `--limit` flag in the enrichment script silently does nothing due to a discarded query builder return value, causing the operator to believe only N complexes are being processed when in fact all are processed — risking API rate-limit exhaustion on the K-apt free tier.

---

## Critical Issues

### CR-01: `--limit` flag silently ignored in kapt-facility-enrich.ts — all complexes processed unconditionally

**File:** `scripts/kapt-facility-enrich.ts:62`

**Issue:** The Supabase query builder is fluent and immutable — each chained method returns a *new* instance. On line 62, `query.limit(LIMIT)` returns a new builder with the limit applied, but that return value is discarded. The original `query` reference used on line 64 (`await query`) has no limit. As a result, invoking the script with `--limit 50` processes every complex in the database regardless. Since the K-apt API free tier caps at a finite daily call budget and the script calls two API endpoints per complex (DetailInfo + BasicInfo), running against a large production dataset while believing only N complexes are targeted can exhaust the daily limit silently.

**Fix:**
```typescript
// Line 62 — assign the new builder instance back
if (LIMIT !== null) {
  const { data, error } = await supabase
    .from('complexes')
    .select('id, kapt_code, canonical_name')
    .not('kapt_code', 'is', null)
    .order('canonical_name')
    .limit(LIMIT)
  // ... handle data/error
}
```

Or restructure to build the full chain conditionally:

```typescript
let builder = supabase
  .from('complexes')
  .select('id, kapt_code, canonical_name')
  .not('kapt_code', 'is', null)
  .order('canonical_name')

if (LIMIT !== null) builder = builder.limit(LIMIT)

const { data, error } = await builder
```

---

## Warnings

### WR-01: `_jeonseData` fetched but never used — wasted RSC database round-trip

**File:** `src/app/complexes/[id]/page.tsx:128,143`

**Issue:** `getComplexTransactionSummary(id, 'jeonse', supabase)` is fetched in `Promise.all` and destructured as `_jeonseData`, but it is never referenced anywhere in the component. After Phase 9, the chart uses `rawJeonseData` (from `getComplexRawTransactions`) instead. The aggregated jeonse summary is now dead code. Every page render executes an extra RPC call (`complex_monthly_prices` for jeonse) that contributes to Supabase DB quota consumption and increases overall page latency.

**Fix:**
```typescript
// Remove the second getComplexTransactionSummary call from Promise.all
const [
  saleData,
  // _jeonseData,  ← delete this line
  sidebarAds,
  ...
] = await Promise.all([
  getComplexTransactionSummary(id, 'sale', supabase),
  // getComplexTransactionSummary(id, 'jeonse', supabase),  ← delete
  getActiveAds('sidebar', supabase),
  ...
])
```

---

### WR-02: YAxis `dataKey="price"` domain excludes the average line series in TransactionChart

**File:** `src/components/complex/TransactionChart.tsx:92-97`

**Issue:** The `ComposedChart` has no top-level `data` prop. Each child (`Scatter`, `Line`) carries its own `data`. Recharts computes the Y-axis domain by scanning the `dataKey` on each series. The `YAxis` declares `dataKey="price"`, which matches the two `Scatter` series (fields named `price`), but the `Line` series uses `dataKey="avgPrice"`. The average line's data points — monthly averages, which can exceed any individual scatter point if outliers have been stripped — are not considered when auto-computing the Y-axis domain. When the average exceeds the highest normal scatter point the line will be clipped or overflow the chart area with no visual indication to the user.

**Fix:** Remove `dataKey` from `YAxis` (let Recharts use all series) and add an explicit `domain` that spans both datasets, or add `allowDataOverflow={false}` with a computed domain:

```tsx
// Option A: omit dataKey from YAxis and let Recharts auto-compute
<YAxis
  tick={{ fontSize: 11 }}
  tickFormatter={formatPrice}
  width={56}
/>

// Option B: explicit domain computed from all values
const allPrices = [
  ...normalDots.map(p => p.price),
  ...outlierDots.map(p => p.price),
  ...avgSeries.map(p => p.avgPrice),
]
const yMin = Math.min(...allPrices) * 0.95
const yMax = Math.max(...allPrices) * 1.05
<YAxis domain={[yMin, yMax]} ... />
```

---

### WR-03: `getManagementCostMonthly` silently swallows errors — doubles up with page-level catch

**File:** `src/lib/data/management-cost.ts:38`

**Issue:** `if (error || !data) return []` discards the Supabase error entirely. The calling code in `page.tsx` also wraps this in `.catch(() => [])`. Any database error (misconfigured table, network timeout, schema mismatch) produces an empty card with no logging and no way to distinguish "no data" from "query failed". This violates the project coding style: "Never silently swallow errors".

**Fix:**
```typescript
export async function getManagementCostMonthly(
  complexId: string,
  supabase: SupabaseClient,
): Promise<ManagementCostRow[]> {
  const { data, error } = await supabase
    .from('management_cost_monthly')
    .select(/* ... */)
    .eq('complex_id', complexId)
    .order('year_month', { ascending: false })
    .limit(6)

  if (error) throw new Error(`getManagementCostMonthly failed: ${error.message}`)
  return (data ?? []) as ManagementCostRow[]
}
```

The page-level `.catch(() => [])` is the appropriate silent fallback boundary — the data layer should not suppress errors before they reach it.

---

### WR-04: IQR quantile index calculation produces wrong Q1/Q3 for small datasets (n < 4)

**File:** `src/lib/utils/iqr.ts:24-27`

**Issue:** The quantile computation uses `Math.floor(n * 0.25)` and `Math.floor(n * 0.75)` as direct array indices. For `n = 2` the indices are 0 and 1 — the minimum and maximum — yielding `IQR = max - min`. With this wide IQR, the fence `[min - 1.5*(max-min), max + 1.5*(max-min)]` always encompasses both values, so no point is ever flagged as an outlier regardless of how extreme the values are. For `n = 3`, `q3Idx = Math.floor(2.25) = 2` (the maximum again), same problem. The guard at line 19 (`< 2`) only skips zero-or-one-point inputs. In practice, a complex with only 2 or 3 transactions per quarter will never have outliers detected.

This is a statistical accuracy issue, not a crash, but it means the IQR feature is silently ineffective for low-volume complexes, which are common in the covered region (창원·김해 secondary market).

**Fix:** Raise the minimum threshold or use a standard interpolated quantile:
```typescript
// Guard: IQR requires at least 4 points to be meaningful
if (points.length < 4) {
  return { normal: [...points], outliers: [] }
}

// Standard linear interpolation for Q1 and Q3
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const lo = sorted[base] ?? 0
  const hi = sorted[base + 1] ?? lo
  return lo + rest * (hi - lo)
}
const q1 = quantile(sorted, 0.25)
const q3 = quantile(sorted, 0.75)
```

---

## Info

### IN-01: `getComplexTransactionSummary` type signature still accepts `'monthly'` deal type

**File:** `src/lib/data/complex-detail.ts:49`

**Issue:** Per Decision D-01, the monthly deal type is removed from the UI. However `getComplexTransactionSummary` still accepts `dealType: 'sale' | 'jeonse' | 'monthly'`. The type allows callers to pass `'monthly'` to `complex_monthly_prices` RPC, which in turn casts it to `public.deal_type` enum. If the enum does not include `'monthly'`, this will produce a runtime error at query execution. The type should match the restricted set to catch misuse at compile time.

**Fix:**
```typescript
export async function getComplexTransactionSummary(
  complexId: string,
  dealType: 'sale' | 'jeonse',  // remove 'monthly' — D-01
  supabase: SupabaseClient,
  months = 120,
): Promise<MonthlyPriceSummary[]>
```

---

### IN-02: `facilityKapt` accessed with repeated `as unknown as { field }` casts instead of typed interface

**File:** `src/app/complexes/[id]/page.tsx:195,198-199,527,541,550`

**Issue:** The result of `supabase.from('facility_kapt').select('*')` is cast with `facilityKapt as { parking_count?: number | null } | null` and `(facilityKapt as unknown) as { management_type?: string | null }` at multiple call sites. This pattern is fragile: the actual shape is inferred from a wildcard `select('*')` and manually cast at each use. If `facility_kapt` schema changes (e.g., a column is renamed), TypeScript will not catch the error since `as unknown as T` bypasses type checking entirely.

**Fix:** Define a typed interface and apply it once at the destructuring point:

```typescript
interface FacilityKaptRow {
  parking_count:     number | null
  elevator_count:    number | null
  building_count:    number | null
  management_cost_m2: number | null
  management_type:   string | null
}

const facilityKapt = facilityKaptResult?.data as FacilityKaptRow | null
```

Then use `facilityKapt.parking_count` directly without repeated casts.

---

_Reviewed: 2026-05-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
