# Phase 3: 카드뉴스·법적·운영 - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 15 new/modified files
**Analogs found:** 13 / 15

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/api/cardnews/generate/route.ts` | route (API) | request-response | `src/app/complexes/[id]/opengraph-image.tsx` | exact |
| `src/app/admin/cardnews/page.tsx` | component (Server) | request-response | `src/app/admin/ads/page.tsx` | exact |
| `src/app/admin/members/page.tsx` | component (Server) | CRUD | `src/app/admin/ads/page.tsx` | exact |
| `src/app/admin/reports/page.tsx` | component (Server) | CRUD | `src/app/admin/ads/page.tsx` | exact |
| `src/app/admin/status/page.tsx` | component (Server) | request-response | `src/app/admin/ads/page.tsx` | role-match |
| `src/app/consent/page.tsx` | component (Server) | request-response | `src/app/profile/page.tsx` | role-match |
| `src/app/reactivate/page.tsx` | component (Server) | request-response | `src/app/profile/page.tsx` | role-match |
| `src/app/legal/terms/page.tsx` | component (static RSC) | — | `src/app/profile/page.tsx` (layout only) | partial |
| `src/app/legal/privacy/page.tsx` | component (static RSC) | — | `src/app/profile/page.tsx` (layout only) | partial |
| `src/app/legal/ad-policy/page.tsx` | component (static RSC) | — | `src/app/profile/page.tsx` (layout only) | partial |
| `src/lib/auth/consent-actions.ts` | service (Server Action) | CRUD | `src/lib/auth/review-actions.ts` | exact |
| `src/lib/auth/admin-actions.ts` | service (Server Action) | CRUD | `src/lib/auth/review-actions.ts` + `src/app/admin/ads/page.tsx` | exact |
| `src/components/layout/Footer.tsx` | component (UI) | — | none | no analog |
| `src/app/auth/callback/route.ts` (modified) | route (API) | request-response | self (existing file) | self |
| `supabase/migrations/20260506000001_profiles_consent_delete.sql` | migration | — | `supabase/migrations/20260430000005_users.sql` | exact |
| `supabase/migrations/20260506000002_reports.sql` | migration | — | `supabase/migrations/20260430000007_ads.sql` + `supabase/migrations/20260430000009_rls.sql` | role-match |
| `e2e/accessibility.spec.ts` | test (E2E) | — | `e2e/landing.spec.ts` | role-match |

---

## Pattern Assignments

### `src/app/api/cardnews/generate/route.ts` (route, request-response)

**Analog:** `src/app/complexes/[id]/opengraph-image.tsx`

**Imports pattern** (lines 1-6):
```typescript
import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getRankingsByType } from '@/lib/data/rankings'
import { createSupabaseServerClient } from '@/lib/supabase/server'
```

**Runtime declaration** (line 8):
```typescript
// Edge runtime은 TTF 4MB 번들 한도 초과 → nodejs 필수
export const runtime = 'nodejs'
```

**Font + data pattern** (lines 21-32 from opengraph-image.tsx):
```typescript
// 한글 TTF 폰트 로드 (WOFF2는 Satori 미지원)
const fontData = readFileSync(
  join(process.cwd(), 'public/fonts/PretendardSubset.ttf'),
)

// 데이터 조회 — createReadonlyClient: cookies() 미호출, ISR 안전
const supabase = createReadonlyClient()
const rankings = await getRankingsByType(supabase, 'high_price', 5)
```

**ImageResponse core pattern** (lines 39-129 from opengraph-image.tsx — adapt size to 1080×1080):
```typescript
return new ImageResponse(
  (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        padding: '60px 72px',
        fontFamily: 'Pretendard',
      }}
    >
      {/* 브랜드 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <div style={{ width: 32, height: 32, background: '#ea580c', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontSize: 16, fontWeight: 700 }}>
          단
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#ea580c' }}>단지온도</span>
      </div>
      {/* 랭킹 CSS flex 리스트 (Recharts/grid 사용 금지 — Satori 미지원) */}
      {/* ... ranking rows ... */}
    </div>
  ),
  {
    width: 1080,   // 카드뉴스: 1080×1080 정사각형
    height: 1080,
    fonts: [{ name: 'Pretendard', data: fontData, style: 'normal', weight: 700 }],
  },
)
```

**Auth guard for Route Handler** (this file must add — NOT in opengraph-image.tsx):
```typescript
// Route Handler에서 user session으로 admin role 체크
export async function GET(request: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role)) {
    return new Response('Forbidden', { status: 403 })
  }
  // ... ImageResponse generation ...
}
```

**Content-Disposition header** (add after ImageResponse construction):
```typescript
const headers = new Headers(img.headers)
headers.set('Content-Disposition', 'attachment; filename="cardnews.png"')
return new Response(img.body, { status: img.status, headers })
```

**Anti-pattern:** Do NOT use `export default` (opengraph-image.tsx uses default export for Next.js OG — Route Handlers use named exports `GET`). Do NOT use `export const size` or `export const alt` — those are OG image metadata conventions, not Route Handler conventions.

---

### `src/app/admin/cardnews/page.tsx` (component, request-response)

**Analog:** `src/app/admin/ads/page.tsx`

**Imports pattern** (lines 1-7 from ads/page.tsx):
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
```

**Admin role guard** (lines 35-49 from ads/page.tsx — copy exactly):
```typescript
export const revalidate = 0

export default async function AdminCardnewsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/cardnews')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    redirect('/')
  }
  // ...
}
```

**Header pattern** (lines 62-85 from ads/page.tsx):
```typescript
<header
  style={{
    height: 60,
    background: '#fff',
    borderBottom: '1px solid var(--line-default)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    gap: 24,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  }}
>
  <Link href="/" className="dj-logo">
    <span className="mark">단</span>
    <span>단지온도</span>
  </Link>
  <span style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
    관리자 · 카드뉴스
  </span>
</header>
```

**Content area pattern** (lines 86-90 from ads/page.tsx):
```typescript
<div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px' }}>
```

**Client-side download button** — this page needs a `'use client'` child component for fetch+Blob:
```typescript
// src/components/admin/CardnewsDownloadButton.tsx  ('use client')
'use client'
async function handleDownload() {
  const res = await fetch('/api/cardnews/generate')
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cardnews.png'
  a.click()
  URL.revokeObjectURL(url)
}
```

---

### `src/app/admin/members/page.tsx` (component, CRUD)

**Analog:** `src/app/admin/ads/page.tsx`

**Admin guard:** Copy lines 35-49 from ads/page.tsx exactly, changing redirect path to `/admin/members`.

**Table pattern** (lines 110-184 from ads/page.tsx — adapt columns):
```typescript
// Columns: 닉네임, 이메일(user.email), 역할, 가입일, 정지 여부, 액션
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr style={{ borderBottom: '1px solid var(--line-default)', background: 'var(--bg-surface-2)' }}>
      {['닉네임', '이메일', '역할', '가입일', '상태', '액션'].map(h => (
        <th key={h} style={{ padding: '10px 16px', font: '600 12px/1 var(--font-sans)',
          color: 'var(--fg-sec)', textAlign: 'left', whiteSpace: 'nowrap' }}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
```

**Data source:** Use `createSupabaseAdminClient()` (RLS bypass) to query `profiles` with `id, nickname, cafe_nickname, role, created_at, suspended_at`. Pattern from ads/page.tsx lines 51-53.

---

### `src/app/admin/reports/page.tsx` (component, CRUD)

**Analog:** `src/app/admin/ads/page.tsx`

**Admin guard:** Copy lines 35-49 from ads/page.tsx exactly.

**Status label pattern** (lines 12-29 from ads/page.tsx — adapt for report_status):
```typescript
const STATUS_LABEL: Record<'pending' | 'accepted' | 'rejected', string> = {
  pending:  '대기 중',
  accepted: '처리 완료',
  rejected: '기각',
}

const STATUS_COLOR: Record<'pending' | 'accepted' | 'rejected', string> = {
  pending:  '#d97706',
  accepted: '#16a34a',
  rejected: '#dc2626',
}
```

**Data source:** `createSupabaseAdminClient()` → `reports` table, `status='pending'` filter first.

---

### `src/app/admin/status/page.tsx` (component, request-response)

**Analog:** `src/app/admin/ads/page.tsx`

**Admin guard + revalidate=0:** Copy pattern from ads/page.tsx lines 9, 35-49.

**Parallel COUNT queries** — adapt pattern from profile/page.tsx lines 38-42:
```typescript
// profile/page.tsx에서 Promise.all 패턴 참조
const [favCount, reviewCount, isPushSubscribed] = await Promise.all([
  getFavoritesCount(user.id, supabase),
  getReviewsCount(user.id, supabase),
  hasPushSubscription(user.id, supabase),
])

// /admin/status에서 적용:
const adminClient = createSupabaseAdminClient()
const [
  { count: memberCount },
  { count: complexCount },
  { count: txCount },
  { count: activeAdCount },
  { data: recentRuns },
  { count: pendingReportCount },
  { count: pendingAdCount },
  { count: noConsentCount },
] = await Promise.all([
  adminClient.from('profiles').select('*', { count: 'exact', head: true }),
  adminClient.from('complexes').select('*', { count: 'exact', head: true }),
  adminClient.from('transactions').select('*', { count: 'exact', head: true }),
  adminClient.from('ad_campaigns').select('*', { count: 'exact', head: true })
    .eq('status', 'approved'),
  adminClient.from('ingest_runs').select('source, status, created_at')
    .order('created_at', { ascending: false }).limit(10),
  adminClient.from('reports').select('*', { count: 'exact', head: true })
    .eq('status', 'pending'),
  adminClient.from('ad_campaigns').select('*', { count: 'exact', head: true })
    .eq('status', 'pending'),
  adminClient.from('profiles').select('*', { count: 'exact', head: true })
    .is('terms_agreed_at', null),
])
```

---

### `src/app/consent/page.tsx` (component, request-response)

**Analog:** `src/app/profile/page.tsx`

**Auth guard without admin check** (lines 27-32 from profile/page.tsx):
```typescript
export const revalidate = 0

export default async function ConsentPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // ...
}
```

**Layout pattern** (lines 49-97 from profile/page.tsx — header + centered container):
```typescript
<div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }}>
  <header style={{ height: 60, background: '#fff', borderBottom: '1px solid var(--line-default)',
    display: 'flex', alignItems: 'center', padding: '0 32px', gap: 24,
    position: 'sticky', top: 0, zIndex: 50 }}>
    <Link href="/" className="dj-logo">
      <span className="mark">단</span>
      <span>단지온도</span>
    </Link>
  </header>
  <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px' }}>
    {/* 동의 폼 */}
  </div>
</div>
```

**Form with Server Action** (lines 221-234 from profile/page.tsx — signOut pattern):
```typescript
// consent page에서 agreeToTerms Server Action 연결
import { agreeToTerms } from '@/lib/auth/consent-actions'

<form action={agreeToTerms}>
  <input type="hidden" name="next" value={next} />
  {/* 필수 체크박스 2개 */}
  <label>
    <input type="checkbox" name="terms" required />
    <Link href="/legal/terms">이용약관</Link>(필수)
  </label>
  <label>
    <input type="checkbox" name="privacy" required />
    <Link href="/legal/privacy">개인정보처리방침</Link>(필수)
  </label>
  <button type="submit" className="btn btn-md btn-primary">동의하고 시작하기</button>
</form>
```

---

### `src/app/reactivate/page.tsx` (component, request-response)

**Analog:** `src/app/profile/page.tsx`

**Auth guard** (lines 27-32 from profile/page.tsx): Same pattern, but check `deleted_at IS NOT NULL` to confirm the user is in grace period.

**Layout pattern:** Same header + centered card layout from profile/page.tsx. Content: 재활성화 안내 메시지 + 재활성화 Server Action 버튼 + 탈퇴 확정 버튼.

---

### `src/app/legal/terms/page.tsx`, `src/app/legal/privacy/page.tsx`, `src/app/legal/ad-policy/page.tsx` (static RSC)

**Analog:** `src/app/profile/page.tsx` (layout reference only)

**No revalidate needed** — omit `export const revalidate` (Next.js defaults to static for pages without dynamic data).

**No auth guard** — public pages.

**Layout pattern** — header + constrained content container from profile/page.tsx:
```typescript
export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }}>
      <header style={{ height: 60, background: '#fff', borderBottom: '1px solid var(--line-default)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: 24,
        position: 'sticky', top: 0, zIndex: 50 }}>
        <Link href="/" className="dj-logo">
          <span className="mark">단</span>
          <span>단지온도</span>
        </Link>
      </header>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <article>
          <h1 style={{ font: '700 24px/1.3 var(--font-sans)', letterSpacing: '-0.02em', marginBottom: 24 }}>
            이용약관
          </h1>
          {/* 마크다운 콘텐츠를 JSX로 인라인 — CMS 불필요 */}
        </article>
      </div>
    </div>
  )
}
```

**No analog for content** — legal page content is raw JSX with Korean text. RESEARCH.md §법적 요건 분석 provides the required section headings.

---

### `src/lib/auth/consent-actions.ts` (service, CRUD)

**Analog:** `src/lib/auth/review-actions.ts`

**'use server' directive + imports** (lines 1-4 from review-actions.ts):
```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
```

**Auth check pattern** (lines 24-26 from review-actions.ts):
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: '로그인이 필요합니다.' }
```

**Return type pattern** (lines 14, 35-37 from review-actions.ts):
```typescript
export async function agreeToTerms(
  formData: FormData,
): Promise<{ error: string | null }> {
  // ...
  if (error) return { error: error.message }
  // revalidatePath 후 redirect
  return { error: null }
}
```

**CRITICAL — RLS workaround:** The existing `profiles: owner update` RLS policy (20260430000009_rls.sql line 103-105) has `with check (auth.uid() = id and role in ('user'))`. This means admin-role users cannot update their own profile via standard client. Use `createSupabaseAdminClient()` for `terms_agreed_at` and `deleted_at` updates:

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// agreeToTerms: admin client으로 RLS 우회
const adminClient = createSupabaseAdminClient()
const { error } = await adminClient
  .from('profiles')
  .update({ terms_agreed_at: new Date().toISOString() })
  .eq('id', user.id)
```

**redirect after action** (see actions.ts line 38-40 — signOut pattern):
```typescript
// consent-actions.ts: 동의 후 next 파라미터로 redirect
import { redirect } from 'next/navigation'
// ...
redirect(next)  // Server Action에서 redirect() 직접 호출
```

---

### `src/lib/auth/admin-actions.ts` (service, CRUD)

**Analog:** `src/lib/auth/review-actions.ts` + admin role check from `src/app/admin/ads/page.tsx`

**'use server' + imports** (from review-actions.ts lines 1-4):
```typescript
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
```

**Admin verifier helper** — extracted from ads/page.tsx lines 37-49 into a reusable function:
```typescript
async function verifyAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role)) {
    throw new Error('Unauthorized')
  }
  return user
}
```

**revalidatePath pattern** (review-actions.ts lines 36-37):
```typescript
revalidatePath('/admin/reports')
return { error: null }
```

---

### `src/app/auth/callback/route.ts` (modified — route, request-response)

**Existing file** (C:\Users\jung\coding\bds\src\app\auth\callback\route.ts, all 16 lines):
```typescript
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request): Promise<never> {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'

  if (!code) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) redirect('/login?error=auth')
  redirect(next)
}
```

**Insertion point:** After `if (error) redirect('/login?error=auth')` and before `redirect(next)`:
```typescript
// 삽입: exchangeCodeForSession 성공 후 profiles 상태 확인
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('terms_agreed_at, deleted_at')
    .eq('id', user.id)
    .single()

  if (profile?.deleted_at) {
    redirect('/reactivate')
  }
  if (!profile?.terms_agreed_at) {
    redirect(`/consent?next=${encodeURIComponent(next)}`)
  }
}
redirect(next)
```

---

### `supabase/migrations/20260506000001_profiles_consent_delete.sql` (migration)

**Analog:** `supabase/migrations/20260430000005_users.sql`

**Column addition pattern** — the analog file shows profiles table creation. Migration uses ALTER TABLE:
```sql
-- supabase/migrations/20260430000005_users.sql lines 1-11 (table structure reference)
-- profiles テーブル: id, nickname, avatar_url, cafe_nickname, signup_source, role, created_at, updated_at

-- New migration: add Phase 3 columns
alter table public.profiles
  add column if not exists deleted_at     timestamptz,
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists suspended_at   timestamptz;
```

**Index pattern** from existing migrations (partial index pattern in 20260430000007_ads.sql line 25):
```sql
create index ad_campaigns_active_idx
  on public.ad_campaigns(placement, starts_at, ends_at)
  where status = 'approved';

-- Phase 3 analog:
create index profiles_deleted_at_idx
  on public.profiles(deleted_at)
  where deleted_at is not null;

create index profiles_terms_not_agreed_idx
  on public.profiles(id)
  where terms_agreed_at is null;
```

**RLS note:** The existing `profiles: owner update` policy (20260430000009_rls.sql lines 102-105) has `with check (auth.uid() = id and role in ('user'))`. This blocks admin-role users from self-updating. Decision: use `createSupabaseAdminClient()` in Server Actions (see consent-actions.ts pattern above). Migration does NOT need to alter the RLS policy.

---

### `supabase/migrations/20260506000002_reports.sql` (migration)

**Analog:** `supabase/migrations/20260430000007_ads.sql` (enum + table + index) + `supabase/migrations/20260430000009_rls.sql` (RLS policies)

**Enum pattern** (20260430000007_ads.sql line 1):
```sql
create type public.ad_status as enum ('draft', 'pending', 'approved', 'ended', 'rejected', 'paused');

-- Phase 3 analog:
create type public.report_target_type as enum ('review', 'user', 'ad');
create type public.report_status as enum ('pending', 'accepted', 'rejected');
```

**Table creation pattern** (20260430000007_ads.sql lines 6-21):
```sql
create table public.ad_campaigns (
  id               uuid primary key default gen_random_uuid(),
  advertiser_id    uuid references public.profiles(id) on delete set null,
  -- ...
  status           public.ad_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint ad_campaigns_dates_check check (ends_at > starts_at)
);
```

**RLS policy pattern** (20260430000009_rls.sql lines 70-78 — admin-only table):
```sql
-- complex_match_queue: admin only pattern
create policy "complex_match_queue: admin only"
  on public.complex_match_queue for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- Split read/write + add authenticated insert:
create policy "reports: auth insert"
  on public.reports for insert
  with check (auth.uid() is not null and reporter_id = auth.uid());

create policy "reports: admin read"
  on public.reports for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));

create policy "reports: admin update"
  on public.reports for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));
```

---

### `e2e/accessibility.spec.ts` (test, E2E)

**Analog:** `e2e/landing.spec.ts`

**Test structure pattern** (landing.spec.ts lines 1-3):
```typescript
import { test, expect } from '@playwright/test'
// No storageState needed — public pages only for axe checks
```

**Page goto + waitForLoadState pattern** (landing.spec.ts lines 5-6):
```typescript
await page.goto(path)
await page.waitForLoadState('domcontentloaded')
```

**@axe-core/playwright integration** — new import:
```typescript
import AxeBuilder from '@axe-core/playwright'

const PAGES_TO_CHECK = ['/', '/map', '/legal/terms', '/legal/privacy', '/login', '/consent']

for (const path of PAGES_TO_CHECK) {
  test(`접근성: ${path} — critical 위반 0건`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(
      critical,
      `Critical violations on ${path}: ${JSON.stringify(critical.map(v => v.id))}`,
    ).toHaveLength(0)
  })
}
```

**Keyboard nav pattern** — from review.spec.ts lines 45-55 (locator + interaction):
```typescript
// 키보드 탐색 — Tab 순서 검증
test('랜딩 헤더 nav — Tab 키로 포커스 이동', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})
```

---

## Shared Patterns

### Admin Role Guard
**Source:** `src/app/admin/ads/page.tsx` lines 35-49
**Apply to:** All `src/app/admin/*/page.tsx` files (cardnews, members, reports, status)
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
```

### revalidate = 0
**Source:** `src/app/admin/ads/page.tsx` line 9
**Apply to:** All admin pages and `/consent/page.tsx`, `/reactivate/page.tsx` — any page with user-specific or real-time data
```typescript
export const revalidate = 0
```

### Server Action Return Type
**Source:** `src/lib/auth/review-actions.ts` lines 13-14, 35-37
**Apply to:** `consent-actions.ts`, `admin-actions.ts`
```typescript
// Return { error: string | null } — never throw from Server Action
if (error) return { error: error.message }
return { error: null }
```

### Admin Client for RLS Bypass
**Source:** `src/app/admin/ads/page.tsx` lines 51-53
**Apply to:** All admin data queries (members, reports, status) + consent-actions.ts (profiles update)
```typescript
const adminClient = createSupabaseAdminClient()
// Use adminClient for queries that need to bypass RLS
```

### Sticky Header Pattern
**Source:** `src/app/admin/ads/page.tsx` lines 62-85, `src/app/profile/page.tsx` lines 57-96
**Apply to:** All new page files (`consent`, `reactivate`, `legal/*`, `admin/*`)
```typescript
<header
  style={{
    height: 60, background: '#fff',
    borderBottom: '1px solid var(--line-default)',
    display: 'flex', alignItems: 'center',
    padding: '0 32px', gap: 24,
    position: 'sticky', top: 0, zIndex: 50,
  }}
>
  <Link href="/" className="dj-logo">
    <span className="mark">단</span>
    <span>단지온도</span>
  </Link>
</header>
```

### CRON_SECRET Verification
**Source:** `src/app/api/ingest/molit-trade/route.ts` lines 14-17
**Apply to:** Any server-side cron route modification (NOT cardnews/generate — that uses user session auth)
```typescript
const authHeader = request.headers.get('authorization')
if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

### Transaction Query Safety
**Source:** `src/lib/data/rankings.ts` lines 77-83
**Apply to:** Any query on `transactions` table
```typescript
.is('cancel_date', null)
.is('superseded_by', null)
// Always include both filters — CLAUDE.md CRITICAL rule
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/layout/Footer.tsx` | component (UI) | — | No global Footer component exists in the codebase. `src/app/layout.tsx` has no footer slot. New component, use semantic `<footer>` HTML + existing CSS tokens (`var(--font-sans)`, `var(--fg-sec)`, `var(--line-subtle)`) and Link components per CLAUDE.md AI-slop-free style. |

**Footer implementation guidance (no analog — derive from conventions):**
- Use `<footer>` semantic element
- CSS tokens only: `var(--bg-canvas)`, `var(--fg-sec)`, `var(--line-subtle)`, `var(--font-sans)`
- Links: `<Link href="/legal/terms">이용약관</Link>`, `<Link href="/legal/privacy">개인정보처리방침</Link>`, `<Link href="/legal/ad-policy">광고 정책</Link>`
- Support email: `<a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@danjiondo.com'}`}>`
- No backdrop-blur, gradient, glow (CLAUDE.md AI slop prohibition)
- Conditionally render in `src/app/layout.tsx` — exclude admin routes (`pathname.startsWith('/admin')`)

---

## Metadata

**Analog search scope:** `src/app/`, `src/lib/`, `src/components/`, `supabase/migrations/`, `e2e/`
**Files scanned:** 16 source files read
**Key findings:**
- `src/app/auth/callback/route.ts` is minimal (16 lines) — insertion is clean
- `profiles: owner update` RLS `with check (role in ('user'))` blocks admin self-update → use `createSupabaseAdminClient()` in consent-actions.ts
- `complex_reviews.user_id FK ON DELETE SET NULL` already set in 20260430000016_reviews.sql — D-08 migration not needed
- `@axe-core/playwright` must be installed (`npm install --save-dev @axe-core/playwright`) before e2e/accessibility.spec.ts can run
- No Recharts allowed in ImageResponse JSX — Satori renders pure CSS flex only
**Pattern extraction date:** 2026-05-06
