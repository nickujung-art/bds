# Phase 5: 데이터 확장·운영 안정성 - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 12
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260507000005_phase5_listing_prices.sql` | migration | CRUD | `supabase/migrations/20260430000009_rls.sql` | exact |
| `supabase/migrations/20260507000006_phase5_redevelopment_rls.sql` | migration | CRUD | `supabase/migrations/20260430000009_rls.sql` | exact |
| `src/components/complex/ValueQuadrantChart.tsx` | component | request-response | `src/components/complex/TransactionChart.tsx` | exact |
| `src/components/complex/RedevelopmentTimeline.tsx` | component | request-response | `src/components/complex/TransactionChart.tsx` | role-match |
| `src/lib/data/quadrant.ts` | service | CRUD | `src/lib/data/rankings.ts` | exact |
| `src/lib/actions/redevelopment-actions.ts` | service | CRUD | `src/lib/auth/admin-actions.ts` | exact |
| `src/lib/actions/listing-price-actions.ts` | service | CRUD | `src/lib/auth/ad-actions.ts` | exact |
| `src/app/admin/redevelopment/page.tsx` | controller | request-response | `src/app/admin/reports/page.tsx` | exact |
| `src/app/admin/listing-prices/page.tsx` | controller | request-response | `src/app/admin/ads/page.tsx` | exact |
| `src/app/complexes/[id]/page.tsx` (modified) | controller | request-response | `src/app/complexes/[id]/page.tsx` | self |
| `.github/workflows/db-backup.yml` | config | batch | `.github/workflows/rankings-cron.yml` | role-match |
| `.github/workflows/molit-backfill-once.yml` | config | batch | `.github/workflows/cafe-code-weekly.yml` | role-match |

---

## Pattern Assignments

### `supabase/migrations/20260507000005_phase5_listing_prices.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260430000009_rls.sql`

**Table creation pattern** (lines 42-55 of analog):
```sql
create table public.redevelopment_projects (
  id           uuid primary key default gen_random_uuid(),
  complex_id   uuid references public.complexes(id) on delete set null,
  project_name text not null,
  phase        public.redevelopment_phase not null default 'rumor',
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

**Admin-only write RLS pattern** (lines 71-78 of analog):
```sql
alter table public.complex_match_queue enable row level security;
create policy "complex_match_queue: admin only"
  on public.complex_match_queue for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
```

**Copy this exactly for `listing_prices`:**
```sql
-- listing_prices: public read + admin write
alter table public.listing_prices enable row level security;
create policy "listing_prices: public read"
  on public.listing_prices for select using (true);
create policy "listing_prices: admin write"
  on public.listing_prices for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
```

---

### `supabase/migrations/20260507000006_phase5_redevelopment_rls.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260430000009_rls.sql`

**Context:** `redevelopment_projects` already has public read. This migration adds only admin write. Use the same `admin only` pattern from lines 71-78, changing the table name and policy label.

```sql
-- redevelopment_projects: admin write (public read already exists in 20260430000009)
create policy "redevelopment_projects: admin write"
  on public.redevelopment_projects for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
```

**Note:** No `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` needed — already enabled in the original migration.

---

### `src/components/complex/ValueQuadrantChart.tsx` (component, request-response)

**Analog:** `src/components/complex/TransactionChart.tsx`

**Directive:** Copy the entire file structure. Replace `LineChart/Line` with `ScatterChart/Scatter/ReferenceLine`.

**'use client' + import block** (lines 1-11):
```typescript
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
```
For `ValueQuadrantChart.tsx`, replace with:
```typescript
'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
```

**Props interface pattern** (lines 14-17):
```typescript
interface Props {
  data:      MonthlyPriceSummary[]
  dealType:  'sale' | 'jeonse' | 'monthly'
}
```
For `ValueQuadrantChart.tsx`:
```typescript
export interface QuadrantPoint {
  complexId: string
  complexName: string
  x: number   // 평당가 (만원)
  y: number   // 학군점수 (0-100)
  isTarget: boolean
}

interface Props {
  points:  QuadrantPoint[]
  medianX: number   // 시·구 평당가 중앙값
  medianY: number   // 시·구 학군점수 중앙값
}
```

**Empty state guard + ResponsiveContainer** (lines 31-40):
```typescript
export function TransactionChart({ data, dealType }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        거래 데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
```
For `ValueQuadrantChart.tsx`, use `height={320}` (larger canvas for scatter).

**Core chart pattern** (lines 41-70):
```typescript
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis ... />
        <YAxis ... />
        <Tooltip ... />
        <Line ... />
      </LineChart>
```
For `ValueQuadrantChart.tsx`:
```typescript
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="x" name="평당가" type="number"
               tickFormatter={(v: number) => `${Math.round(v / 10000)}만`}
               tick={{ fontSize: 11 }} />
        <YAxis dataKey="y" name="학군점수" type="number"
               tick={{ fontSize: 11 }} width={36} />
        {/* 4분면 구분선 */}
        <ReferenceLine x={medianX} stroke="#d1d5db" strokeDasharray="4 2" />
        <ReferenceLine y={medianY} stroke="#d1d5db" strokeDasharray="4 2" />
        {/* 배경 단지: 미색 */}
        <Scatter
          data={points.filter(p => !p.isTarget)}
          fill="#d1d5db"
          opacity={0.6}
        />
        {/* 현재 단지: 주황 강조 (var(--dj-orange) = #ea580c) */}
        <Scatter
          data={points.filter(p => p.isTarget)}
          fill="#ea580c"
          r={6}
        />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(value, name) => [value, name === 'x' ? '평당가(만원)' : '학군점수']}
        />
      </ScatterChart>
```

**Quadrant label overlay:** Use absolute-positioned divs on top of the chart container (CSS position:relative wrapper), not Recharts SVG labels. This avoids SVG coordinate complexity.

---

### `src/components/complex/RedevelopmentTimeline.tsx` (component, request-response)

**Analog:** `src/components/complex/TransactionChart.tsx`

**Key difference:** This component renders purely server-side HTML (no Recharts, no DOM dependency). Do NOT add `'use client'` — it is an RSC.

**Pattern to copy:** The empty-state guard and card wrapper from `TransactionChart.tsx` lines 31-38. The Stepper UI uses inline styles matching the existing page style tokens.

**Phase enum order** (from `supabase/migrations/20260430000009_rls.sql` lines 36-40):
```typescript
// All 10 values of redevelopment_phase enum — exact DB order
const PHASE_ORDER: Record<string, number> = {
  rumor: 0, proposed: 1, committee_formed: 2, safety_eval: 3,
  designated: 4, business_approval: 5, construction_permit: 6,
  construction: 7, completed: 8, cancelled: 9,
}
```

**Style tokens to copy from `src/app/complexes/[id]/page.tsx`:**
- `var(--dj-orange)` — active/completed step fill
- `var(--bg-surface-2)` — future step fill
- `var(--line-subtle)` — connector lines
- `font: '500 10px/1 var(--font-sans)'` — step labels

**Props interface:**
```typescript
interface Props {
  phase: string   // redevelopment_phase enum value
  notes?: string | null
}
```

**Guard:** Only render when parent passes `complex.status === 'in_redevelopment'`. The component itself is unconditional; the guard is in the calling page.

---

### `src/lib/data/quadrant.ts` (service, CRUD)

**Analog:** `src/lib/data/rankings.ts`

**Import block** (lines 1-3):
```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```
Copy these three lines exactly.

**Function signature pattern** (lines 27-31):
```typescript
export async function getRankingsByType(
  supabase: SupabaseClient<Database>,
  rankType: RankType,
  limit = 10,
): Promise<RankingRow[]> {
```
For `quadrant.ts`:
```typescript
export async function getQuadrantData(
  targetComplexId: string,
  si: string,
  gu: string,
  supabase: SupabaseClient<Database>,
): Promise<QuadrantData> {
```

**Error throw pattern** (line 43):
```typescript
if (error) throw new Error(`getRankingsByType(${rankType}) failed: ${error.message}`)
```
Copy this pattern: `if (error) throw new Error(`getQuadrantData failed: ${error.message}`)`.

**transactions query pattern with cancel/superseded guard** (lines 76-86):
```typescript
  const { data, error } = await supabase
    .from('transactions')
    .select('complex_id, price, area_m2')
    .is('cancel_date', null)
    .is('superseded_by', null)
    .eq('deal_type', 'sale')
    .gte('deal_date', thirtyDaysAgo)
    .not('complex_id', 'is', null)
    .gt('area_m2', 0)
    .limit(5000)
```
This exact pattern (`.is('cancel_date', null).is('superseded_by', null)`) must appear in every transactions query in `quadrant.ts`.

**Price-per-pyeong calculation** (line 159):
```typescript
const pricePerPyeong = (r.price as number) / ((r.area_m2 as number) / 3.3058)
```
Copy this exact formula.

**Median calculation** — not in existing code; implement inline:
```typescript
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}
```

---

### `src/lib/actions/redevelopment-actions.ts` (service, CRUD)

**Analog:** `src/lib/auth/admin-actions.ts`

**Full file structure to copy** (lines 1-29 of analog):
```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

async function requireAdmin(): Promise<{
  error: string | null
  admin: AdminClient | null
  userId: string | null
}> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다', admin: null, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    return { error: '관리자 권한이 필요합니다', admin: null, userId: null }
  }

  return { error: null, admin: createSupabaseAdminClient(), userId: user.id }
}
```
Copy `requireAdmin()` verbatim — it is the shared auth guard pattern used across all admin actions.

**UPSERT action pattern** (lines 31-45 as model):
```typescript
export async function upsertRedevelopmentProject(
  complexId: string,
  phase: string,
  notes: string | null,
): Promise<{ error: string | null }> {
  const { error, admin, userId } = await requireAdmin()
  if (error || !admin || !userId) return { error: error! }

  const { error: dbErr } = await admin
    .from('redevelopment_projects')
    .upsert(
      { complex_id: complexId, phase, notes, created_by: userId },
      { onConflict: 'complex_id' },
    )

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/admin/redevelopment')
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}
```
Note: `revalidatePath` for both the admin page and the affected complex detail page.

**Input validation:** Add zod schema before the admin guard call (not present in existing analog but required by CLAUDE.md):
```typescript
import { z } from 'zod'
const schema = z.object({
  complexId: z.string().uuid(),
  phase: z.enum(['rumor','proposed','committee_formed','safety_eval',
                 'designated','business_approval','construction_permit',
                 'construction','completed','cancelled']),
  notes: z.string().max(500).nullable(),
})
```

---

### `src/lib/actions/listing-price-actions.ts` (service, CRUD)

**Analog:** `src/lib/auth/ad-actions.ts`

**Full import block** (lines 1-8 of analog):
```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
```

**requireAdmin pattern** (lines 10-26 of analog) — same as `admin-actions.ts`. This is the canonical admin auth guard; copy exactly.

**UPSERT action** — based on `updateStatus` pattern (lines 28-43):
```typescript
export async function upsertListingPrice(input: {
  complexId: string
  pricePerPy: number
  recordedDate: string
  source: string
}): Promise<{ error: string | null }> {
  const { error, admin } = await requireAdmin()
  if (error || !admin) return { error: error! }

  const { error: dbErr } = await admin
    .from('listing_prices')
    .insert({
      complex_id:    input.complexId,
      price_per_py:  input.pricePerPy,
      recorded_date: input.recordedDate,
      source:        input.source,
    })

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/admin/listing-prices')
  return { error: null }
}
```

**Validation:** Add before admin check:
```typescript
import { z } from 'zod'
const listingSchema = z.object({
  complexId:    z.string().uuid(),
  pricePerPy:   z.number().int().positive().max(100_000),  // 만원/평 단위
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source:       z.string().min(1).max(100),
})
```

---

### `src/app/admin/redevelopment/page.tsx` (controller, request-response)

**Analog:** `src/app/admin/reports/page.tsx`

**Auth guard pattern** (lines 58-72 of analog):
```typescript
export default async function AdminReportsPage() {
  // 관리자 권한 확인
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/reports')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    redirect('/')
  }

  const adminClient = createSupabaseAdminClient()
```
Copy this block verbatim, changing the `next` redirect path to `/admin/redevelopment`.

**Import block** (lines 1-7 of analog):
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ReportActions } from '@/components/admin/ReportActions'
```

**Page metadata pattern** (line 9):
```typescript
export const revalidate = 0
export const metadata: Metadata = { title: '관리자 · 재건축 단계 관리' }
```

**Layout pattern** (lines 86-119 of analog) — sticky header + max-width content container:
```typescript
<div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }}>
  <header style={{
    height: 60, background: '#fff',
    borderBottom: '1px solid var(--line-default)',
    display: 'flex', alignItems: 'center',
    padding: '0 32px', gap: 24,
    position: 'sticky', top: 0, zIndex: 50,
  }}>
    <Link href="/" className="dj-logo">
      <span className="mark">단</span><span>단지온도</span>
    </Link>
    <span style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
      관리자 · 재건축 단계 관리
    </span>
  </header>
  <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px' }}>
```

**Form approach:** This page needs a complex-search input + phase select + notes textarea + submit button. The form submits to `upsertRedevelopmentProject` Server Action. Use `<form action={upsertRedevelopmentProject}>` pattern (no client component needed for a basic form).

---

### `src/app/admin/listing-prices/page.tsx` (controller, request-response)

**Analog:** `src/app/admin/ads/page.tsx`

**Auth guard pattern** (lines 35-53 of analog):
```typescript
export default async function AdminAdsPage() {
  // 관리자 권한 확인
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/ads')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    redirect('/')
  }

  const adminClient = createSupabaseAdminClient()
```
Copy, changing `next` path to `/admin/listing-prices`.

**Table display pattern** — copy the table structure from `reports/page.tsx` lines 134-255. Columns: 단지명, 평당가(만원/평), 기록일, 출처, 등록일시.

**Import block** (lines 1-8 of analog):
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'
```

**revalidate = 0** — same as all admin pages.

---

### `src/app/complexes/[id]/page.tsx` (modified — controller, request-response)

**Analog:** Self — modify existing file.

**Existing parallel fetch pattern** (lines 109-124):
```typescript
const [complex, saleData, jeonseData, monthlyData, sidebarAds, reviews, reviewStats, facilityKaptResult] = await Promise.all([
  getComplexById(id, supabase),
  getComplexTransactionSummary(id, 'sale', supabase),
  // ...
  supabase.from('facility_kapt').select('*').eq('complex_id', id)...
])
```
**Add** `getQuadrantData` and `getRedevelopmentProject` to this `Promise.all` array — do not issue sequential awaits.

**Existing import block** (lines 1-14):
```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getComplexById, getComplexTransactionSummary } from '@/lib/data/complex-detail'
// ...
```
Add:
```typescript
import { getQuadrantData } from '@/lib/data/quadrant'
import { getRedevelopmentProject } from '@/lib/data/redevelopment'
import { ValueQuadrantChart } from '@/components/complex/ValueQuadrantChart'
import { RedevelopmentTimeline } from '@/components/complex/RedevelopmentTimeline'
```

**Conditional render pattern** — existing pattern from `facilityKapt` null check (lines 425-506):
```typescript
{facilityKapt ? (
  <div>...</div>
) : (
  <p style={{ ... }}>시설 정보가 아직 수집되지 않았습니다.</p>
)}
```
Copy this pattern for `RedevelopmentTimeline`:
```typescript
{complex.status === 'in_redevelopment' && redevelopmentProject && (
  <div className="card" style={{ padding: 20 }}>
    <h3 style={{ font: '700 15px/1.4 var(--font-sans)', margin: '0 0 12px' }}>
      재건축 진행 현황
    </h3>
    <RedevelopmentTimeline phase={redevelopmentProject.phase} notes={redevelopmentProject.notes} />
  </div>
)}
```

**ISR revalidate** (line 15):
```typescript
export const revalidate = 86400
```
Keep unchanged — both new data fetches are read-only and ISR-compatible.

---

### `.github/workflows/db-backup.yml` (config, batch)

**Analog:** `.github/workflows/rankings-cron.yml`

**Schedule + workflow_dispatch pattern** (lines 3-6 of analog):
```yaml
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch: {}
```
For `db-backup.yml`:
```yaml
on:
  schedule:
    - cron: '0 19 * * 0'   # 일요일 19:00 UTC = 월요일 04:00 KST
  workflow_dispatch: {}
```

**Job metadata pattern** (lines 8-11):
```yaml
jobs:
  compute-rankings:
    name: Compute & store rankings
    runs-on: ubuntu-latest
    timeout-minutes: 3
```
For backup: `timeout-minutes: 15`.

**Secrets access pattern** (lines 17-21):
```yaml
        -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
        "${{ secrets.SITE_URL }}/api/cron/rankings")
```
For `db-backup.yml`, use `${{ secrets.SUPABASE_DB_URL }}` and `${{ secrets.BACKUP_PAT }}`.

**Error checking pattern** (lines 23-27):
```yaml
          if [ "$STATUS" != "200" ]; then
            echo "Rankings cron returned $STATUS"
            exit 1
          fi
```
For backup, use `set -e` or explicit exit-on-failure guards in each step.

---

### `.github/workflows/molit-backfill-once.yml` (config, batch)

**Analog:** `.github/workflows/cafe-code-weekly.yml`

**workflow_dispatch with inputs** — `cafe-code-weekly.yml` uses no inputs, but `rankings-cron.yml` provides the structural baseline. The backfill workflow needs `workflow_dispatch.inputs` for `sgg_codes`:
```yaml
on:
  workflow_dispatch:
    inputs:
      sgg_codes:
        description: 'SGG 코드 (쉼표 구분, 예: 48121,48123)'
        required: true
        default: '48121,48123'
```

**Node.js setup + npm ci pattern** — not in cron workflows (they call HTTP); use `actions/setup-node`:
```yaml
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
```

**Script execution with env vars:**
```yaml
      - name: Run MOLIT backfill
        env:
          MOLIT_API_KEY:              ${{ secrets.MOLIT_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL:   ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY:  ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          npx tsx scripts/backfill-realprice.ts \
            --resume \
            --sgg=${{ inputs.sgg_codes }}
```

**timeout-minutes:** 300 (5 hours — MOLIT daily API limit means this may need multiple days).

---

## Shared Patterns

### Admin Auth Guard (`requireAdmin`)

**Source:** `src/lib/auth/admin-actions.ts` lines 9-29
**Apply to:** `src/lib/actions/redevelopment-actions.ts`, `src/lib/actions/listing-price-actions.ts`

```typescript
async function requireAdmin(): Promise<{
  error: string | null
  admin: AdminClient | null
  userId: string | null
}> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다', admin: null, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    return { error: '관리자 권한이 필요합니다', admin: null, userId: null }
  }

  return { error: null, admin: createSupabaseAdminClient(), userId: user.id }
}
```

### Admin Page Auth Guard (RSC)

**Source:** `src/app/admin/reports/page.tsx` lines 58-74
**Apply to:** `src/app/admin/redevelopment/page.tsx`, `src/app/admin/listing-prices/page.tsx`

```typescript
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/PAGENAME')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    redirect('/')
  }
  const adminClient = createSupabaseAdminClient()
```

### Admin Page Layout Shell

**Source:** `src/app/admin/reports/page.tsx` lines 86-119
**Apply to:** `src/app/admin/redevelopment/page.tsx`, `src/app/admin/listing-prices/page.tsx`

```typescript
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }}>
      <header style={{
        height: 60, background: '#fff',
        borderBottom: '1px solid var(--line-default)',
        display: 'flex', alignItems: 'center',
        padding: '0 32px', gap: 24,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" className="dj-logo">
          <span className="mark">단</span><span>단지온도</span>
        </Link>
        <span style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
          관리자 · [PAGE TITLE]
        </span>
      </header>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px' }}>
```

### Transactions Query Guard

**Source:** `src/lib/data/rankings.ts` lines 76-86
**Apply to:** `src/lib/data/quadrant.ts` (all `transactions` table queries)

```typescript
    .is('cancel_date', null)
    .is('superseded_by', null)
```
These two `.is()` clauses are mandatory on every `transactions` query per CLAUDE.md.

### RLS Admin Write Policy

**Source:** `supabase/migrations/20260430000009_rls.sql` lines 71-78
**Apply to:** `listing_prices` table (in `20260507000005_phase5_listing_prices.sql`), `redevelopment_projects` (in `20260507000006_phase5_redevelopment_rls.sql`)

```sql
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
```

### Error Return Convention

**Source:** `src/lib/auth/admin-actions.ts` lines 32-33, 41-43
**Apply to:** `redevelopment-actions.ts`, `listing-price-actions.ts`

```typescript
export async function actionName(...): Promise<{ error: string | null }> {
  const { error, admin } = await requireAdmin()
  if (error || !admin) return { error: error! }
  // ...
  if (dbErr) return { error: dbErr.message }
  return { error: null }
}
```
All Server Actions return `{ error: string | null }`. Never throw from a Server Action — return the error string.

### 'use client' Chart Isolation

**Source:** `src/components/complex/TransactionChart.tsx` line 1
**Apply to:** `src/components/complex/ValueQuadrantChart.tsx` only

`RedevelopmentTimeline.tsx` must NOT have `'use client'` (pure HTML, RSC-compatible). `ValueQuadrantChart.tsx` MUST have `'use client'` (Recharts DOM dependency).

### Style Tokens (No AI Slop)

**Source:** `src/app/complexes/[id]/page.tsx` throughout
**Apply to:** All new UI components

- Accent color: `#ea580c` or `var(--dj-orange)` only (not purple/indigo)
- Background: `var(--bg-canvas)`, `var(--bg-surface-2)`
- Border: `var(--line-default)`, `var(--line-subtle)`
- Text: `var(--fg-pri)`, `var(--fg-sec)`, `var(--fg-tertiary)`
- Font shorthand: `font: '700 15px/1.4 var(--font-sans)'`
- NO: `backdrop-blur`, gradient text, glow animations

---

## No Analog Found

All 12 files have analogs in the codebase. No files require fallback to RESEARCH.md patterns alone.

---

## Metadata

**Analog search scope:** `src/components/complex/`, `src/lib/data/`, `src/lib/auth/`, `src/app/admin/`, `src/app/complexes/[id]/`, `supabase/migrations/`, `.github/workflows/`
**Files scanned:** 14 source files read directly
**Pattern extraction date:** 2026-05-07
