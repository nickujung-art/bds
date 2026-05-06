# Phase 2: 랭킹·랜딩·공유 — Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 11개 신규/수정 대상
**Analogs found:** 10 / 11 (OG image route는 No Analog)

---

## File Classification

| 신규/수정 파일 | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/YYYYMMDD_rankings.sql` | migration | batch | `supabase/migrations/20260430000013_complex_detail_functions.sql` | role-match |
| `src/lib/data/rankings.ts` | service (data) | CRUD | `src/lib/data/homepage.ts` | exact |
| `src/app/api/cron/rankings/route.ts` | route (cron) | batch | `src/app/api/ingest/molit-trade/route.ts` | exact |
| `.github/workflows/rankings-cron.yml` | config (CI) | batch | `.github/workflows/notify-worker.yml` | exact |
| `src/app/page.tsx` (수정) | page (RSC) | request-response | `src/app/page.tsx` (현재) | exact |
| `src/components/home/RankingTabs.tsx` | component (client) | event-driven | `src/components/complex/FavoriteButton.tsx` | role-match |
| `src/components/home/HighRecordCard.tsx` | component (RSC) | request-response | `src/app/page.tsx` 내 카드 JSX | role-match |
| `src/app/api/og/complex/route.tsx` | route (OG image) | request-response | — | no analog |
| `src/components/complex/ShareButton.tsx` | component (client) | event-driven | `src/components/complex/FavoriteButton.tsx` | role-match |
| `supabase/migrations/YYYYMMDD_rankings_rls.sql` | migration (RLS) | — | `supabase/migrations/20260430000009_rls.sql` | exact |
| `src/__tests__/rankings.test.ts` | test | CRUD | `src/__tests__/ads.test.ts` | exact |

---

## Pattern Assignments

---

### `supabase/migrations/YYYYMMDD_rankings.sql` (migration, batch)

**Analog:** `supabase/migrations/20260430000013_complex_detail_functions.sql`

**SQL 함수 선언 패턴** (lines 1–27):
```sql
-- cancel_date IS NULL AND superseded_by IS NULL 조건으로 유효 거래만 집계
create or replace function public.complex_monthly_prices(
  p_complex_id uuid,
  p_deal_type  text,
  p_months     int default 120
) returns table (
  year_month text,
  avg_price  numeric,
  count      bigint,
  avg_area   numeric
) language sql stable as $$
  select
    to_char(deal_date, 'YYYY-MM') as year_month,
    round(avg(price))             as avg_price,
    count(*)                      as count,
    round(avg(area_m2)::numeric, 2) as avg_area
  from public.transactions
  where
    complex_id    = p_complex_id
    and deal_type = p_deal_type::public.deal_type
    and deal_date >= (now() - (p_months || ' months')::interval)::date
    and cancel_date   is null
    and superseded_by is null
  group by to_char(deal_date, 'YYYY-MM')
  order by year_month asc
$$;
```

**rankings 테이블 DDL 패턴 (신규):**
```sql
create table public.complex_rankings (
  id           uuid primary key default gen_random_uuid(),
  complex_id   uuid not null references public.complexes(id) on delete cascade,
  rank_type    text not null,  -- 'high_price' | 'volume' | 'price_per_pyeong' | 'interest'
  score        numeric not null,
  rank         int not null,
  computed_at  timestamptz not null default now()
);

create index complex_rankings_type_rank_idx
  on public.complex_rankings(rank_type, rank);
```

**적용 규칙:**
- CRITICAL: `cancel_date is null and superseded_by is null` 조건 모든 집계 쿼리에 포함
- 지역 필터: `sgg_code in ('48121','48123','48125','48127','48129','48250')` (CLAUDE.md: 창원·김해)
- SQL 집계 함수는 `language sql stable` 선언 (읽기 전용)
- RLS는 별도 migration 파일로 분리 (기존 패턴 준수: `0009_rls.sql` 참조)
- `transactions` 테이블 참조 컬럼: `complex_id uuid`, `deal_type`, `deal_date date`, `price bigint(만원)`, `area_m2 numeric(6,2)`, `cancel_date`, `superseded_by`
- 유효 거래 partial index `transactions_valid_complex_date_idx` 활용

**favorites 테이블 (관심도 산식용, `20260430000005_users.sql`):**
- `complex_id uuid`, `user_id uuid` — `COUNT(*)` 집계로 관심도 계산

---

### `src/lib/data/rankings.ts` (service, CRUD)

**Analog:** `src/lib/data/homepage.ts`

**임포트 패턴** (homepage.ts lines 1–3):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```

**인터페이스 정의 패턴** (homepage.ts lines 4–25):
```typescript
export interface RecentHighRecord {
  price: number
  area_m2: number
  floor: number | null
  deal_date: string
  complex: {
    id: string
    canonical_name: string
    si: string | null
    gu: string | null
    dong: string | null
  }
}

export interface ComplexRanking {
  id: string
  canonical_name: string
  si: string | null
  gu: string | null
  maxPrice: number
  rank: number
}
```

**Supabase 조인 쿼리 패턴** (homepage.ts lines 27–68):
```typescript
export async function getRecentHighRecords(
  supabase: SupabaseClient<Database>,
  limit = 4,
): Promise<RecentHighRecord[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!

  const { data } = await supabase
    .from('transactions')
    .select(
      `price, area_m2, floor, deal_date, deal_type,
       complexes!inner (id, canonical_name, si, gu, dong)`,
    )
    .is('cancel_date', null)
    .is('superseded_by', null)
    .gte('deal_date', thirtyDaysAgo)
    .eq('deal_type', 'sale')
    .order('price', { ascending: false })
    .limit(limit)

  const records: RecentHighRecord[] = []
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const c = Array.isArray(r.complexes) ? r.complexes[0] : r.complexes
    if (!c || r.price == null) continue
    records.push({ ... })
  }
  return records
}
```

**중요 패턴 규칙:**
- `complexes!inner` 조인 후 `Array.isArray(r.complexes) ? r.complexes[0] : r.complexes` — Supabase 조인 응답이 배열/객체 모두 올 수 있음
- `.is('cancel_date', null).is('superseded_by', null)` — CRITICAL 필수 (CLAUDE.md)
- 함수 시그니처: `supabase: SupabaseClient<Database>` — 호출부에서 `createReadonlyClient()` 인스턴스 전달
- `rankings.ts`에서 `complex_rankings` 테이블 읽기는 단순 `from('complex_rankings').select(...)` 형태로 단순화 가능

**4종 랭킹 함수 시그니처 패턴 (신규):**
```typescript
export type RankType = 'high_price' | 'volume' | 'price_per_pyeong' | 'interest'

export interface RankingRow {
  id: string
  canonical_name: string
  si: string | null
  gu: string | null
  score: number
  rank: number
}

export async function getRankingsByType(
  supabase: SupabaseClient<Database>,
  rankType: RankType,
  limit = 10,
): Promise<RankingRow[]>

export async function computeAndUpsertRankings(
  supabase: SupabaseClient,  // admin client
): Promise<{ upserted: number }>
```

---

### `src/app/api/cron/rankings/route.ts` (route, cron — batch)

**Analog:** `src/app/api/ingest/molit-trade/route.ts`

**CRON_SECRET 검증 패턴 (Authorization: Bearer)** (molit-trade lines 13–18):
```typescript
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  // ...
}
```

> **헤더 방식 선택:** `molit-trade`는 GET + `authorization: Bearer`. `notify-worker`는 POST + `x-cron-secret`. rankings cron은 **GET + authorization Bearer** 패턴을 따른다 (Vercel Cron 표준 호환).

**결과 요약 응답 패턴** (molit-trade lines 53–61):
```typescript
const summary = {
  yearMonth,
  regions:      total.length,
  rowsUpserted: total.reduce((s, r) => s + r.rowsUpserted, 0),
  failed:       total.filter(r => r.status === 'failed').length,
}

return Response.json({ summary, results })
```

**임포트 패턴** (molit-trade lines 1–3):
```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ingestMonth } from '@/lib/data/realprice'
// CRITICAL: createSupabaseAdminClient() 단일 경유 필수 (SEC-02, CLAUDE.md)
```

---

### `.github/workflows/rankings-cron.yml` (config, CI)

**Analog:** `.github/workflows/notify-worker.yml` (전체 파일)

```yaml
name: Notify Worker

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch: {}

jobs:
  notify:
    name: Poll & deliver notifications
    runs-on: ubuntu-latest
    timeout-minutes: 4

    steps:
      - name: Call notify worker
        run: |
          STATUS=$(curl -sSf -o /tmp/notify_response.json -w "%{http_code}" \
            -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/worker/notify")

          echo "HTTP status: $STATUS"
          cat /tmp/notify_response.json

          if [ "$STATUS" != "200" ]; then
            echo "Notify worker returned $STATUS"
            exit 1
          fi
```

**rankings-cron에 적용 시 변경점:**
- `schedule.cron`: `'0 * * * *'` (매시간 정각)
- HTTP 메서드: `-X GET`
- 헤더: `-H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"`
- 엔드포인트: `${{ secrets.SITE_URL }}/api/cron/rankings`
- `timeout-minutes: 3`

---

### `src/app/page.tsx` 수정 (page RSC, ISR)

**Analog:** `src/app/page.tsx` (현재 파일)

**ISR 설정 변경** (현재 line 8):
```typescript
// 현재
export const revalidate = 0

// 변경
export const revalidate = 60  // 60초 ISR
```

> `createReadonlyClient()`는 cookies()를 호출하지 않아 revalidate가 정상 동작함 (`src/lib/supabase/readonly.ts` 주석).

**현재 데이터 페칭 패턴** (lines 111–117):
```typescript
export default async function HomePage() {
  const supabase = createReadonlyClient()

  const [highRecords, rankings] = await Promise.all([
    getRecentHighRecords(supabase, 4),
    getTopComplexRankings(supabase, 8),
  ])
```

**4종 랭킹으로 확장 시 패턴 (Promise.all 유지):**
```typescript
const [highRecords, rankHighPrice, rankVolume, rankPricePerPyeong, rankInterest] = await Promise.all([
  getRecentHighRecords(supabase, 4),
  getRankingsByType(supabase, 'high_price', 10),
  getRankingsByType(supabase, 'volume', 10),
  getRankingsByType(supabase, 'price_per_pyeong', 10),
  getRankingsByType(supabase, 'interest', 10),
])
```

**metadata + openGraph 패턴** (lines 12–26):
```typescript
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://danjiondo.kr'

export const metadata: Metadata = {
  title: '단지온도 — 창원·김해 아파트 실거래가',
  description: '...',
  openGraph: {
    title:       '단지온도 — 창원·김해 아파트 실거래가',
    description: '...',
    url:         `${SITE}/`,
    siteName:    '단지온도',
    locale:      'ko_KR',
    type:        'website',
  },
  alternates: { canonical: `${SITE}/` },
}
```

**현재 정적 탭 HTML** (lines 347–358):
```typescript
<div className="tabs" style={{ border: 'none' }}>
  <button className="tab" data-orange-active="true" style={{ background: 'none' }}>
    가격 TOP
  </button>
  <button className="tab" style={{ background: 'none' }}>
    거래량
  </button>
  <button className="tab" style={{ background: 'none' }}>
    조회수
  </button>
</div>
```
→ `<RankingTabs initialData={{ high_price, volume, price_per_pyeong, interest }} />`로 교체.

---

### `src/components/home/RankingTabs.tsx` (component, client)

**Analog:** `src/components/complex/FavoriteButton.tsx`

**'use client' 선언 패턴** (FavoriteButton.tsx line 1):
```typescript
'use client'
```

**useState 상태 패턴** (FavoriteButton.tsx lines 19–22):
```typescript
export function FavoriteButton({ complexId, initialFavorited = false }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()
```

**RankingTabs 적용 패턴:**
```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'

export type RankType = 'high_price' | 'volume' | 'price_per_pyeong' | 'interest'

interface RankingRow {
  id: string
  canonical_name: string
  si: string | null
  gu: string | null
  score: number
  rank: number
}

interface Props {
  initialData: Record<RankType, RankingRow[]>
}

export function RankingTabs({ initialData }: Props) {
  const [activeTab, setActiveTab] = useState<RankType>('high_price')
  const rows = initialData[activeTab]
  // ...
}
```

**탭 버튼 스타일 참조** (`src/app/page.tsx` lines 347–357):
- `className="tabs"` + `className="tab"` — `globals.css`에 정의된 클래스
- 활성 탭: `data-orange-active="true"` 또는 조건부 className 추가

---

### `src/components/home/HighRecordCard.tsx` (component, RSC)

**Analog:** `src/app/page.tsx` 신고가 카드 JSX (lines 249–319)

**카드 구조 패턴:**
```typescript
// 'use client' 없음 — RSC
import Link from 'next/link'
import type { RecentHighRecord } from '@/lib/data/rankings'

interface Props {
  record: RecentHighRecord
}

export function HighRecordCard({ record }: Props) {
  // page.tsx에서 추출한 JSX 그대로 사용
}
```

**카드 내부 JSX 패턴** (page.tsx lines 252–319):
```typescript
<Link
  key={rec.complex.id + rec.deal_date}
  href={`/complexes/${rec.complex.id}`}
  style={{ textDecoration: 'none', color: 'inherit' }}
>
  <div className="card" style={{ padding: 20, cursor: 'pointer', height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span className="badge orange">
        <FireIcon />
        신고가
      </span>
      <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginLeft: 'auto' }}>
        {formatDealDate(rec.deal_date)}
      </span>
    </div>
    <div style={{ font: '700 16px/1.35 var(--font-sans)', letterSpacing: '-0.012em', marginBottom: 2 }}>
      {rec.complex.canonical_name}
    </div>
    <div style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-sec)', marginBottom: 14 }}>
      {loc} · {formatPyeong(rec.area_m2)}
    </div>
    <div className="tnum" style={{ font: '700 22px/1 var(--font-sans)', letterSpacing: '-0.02em' }}>
      {formatPrice(rec.price)}
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-sec)', marginLeft: 2 }}>만원</span>
    </div>
  </div>
</Link>
```

**포맷 유틸 (page.tsx에서 추출, `src/lib/format.ts`로 이동 권장):**
```typescript
export function formatPrice(price: number): string {
  const uk = Math.floor(price / 10000)
  const man = price % 10000
  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}`
  if (uk > 0) return `${uk}억`
  return `${price.toLocaleString()}만`
}

export function formatPyeong(area_m2: number): string {
  return `${Math.round(area_m2 / 3.3058)}평`
}

export function formatDealDate(dealDate: string): string {
  const today = new Date().toISOString().split('T')[0]!
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!
  if (dealDate === today) return '오늘'
  if (dealDate === yesterday) return '어제'
  const d = new Date(dealDate)
  return `${d.getMonth() + 1}.${d.getDate()}`
}
```

---

### `src/app/api/og/complex/route.tsx` (route, OG image)

**Analog:** 없음 — 코드베이스에 `/api/og` 라우트 미존재.

참조할 기존 패턴:

**1. 단지 ID 조회 패턴** (`src/app/complexes/[id]/page.tsx` lines 112–126):
```typescript
const supabase = createReadonlyClient()
const complex = await getComplexById(id, supabase)
if (!complex) notFound()
```

**2. generateMetadata openGraph 패턴** (`src/app/complexes/[id]/page.tsx` lines 21–43):
```typescript
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://danjiondo.kr'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createReadonlyClient()
  const complex = await getComplexById(id, supabase)
  if (!complex) return { title: '단지를 찾을 수 없습니다' }
  return {
    openGraph: {
      title,
      description,
      url:      `${SITE}/complexes/${id}`,
      siteName: '단지온도',
      locale:   'ko_KR',
      type:     'website',
      // images: [`${SITE}/api/og/complex?id=${id}`]  ← SHARE-01에서 추가
    },
  }
}
```

**신규 파일 시그니처 (RESEARCH.md 패턴 사용):**
```typescript
// src/app/api/og/complex/route.tsx
import { ImageResponse } from 'next/og'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getComplexById } from '@/lib/data/complex-detail'

export const runtime = 'edge'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return new Response('id required', { status: 400 })

  const supabase = createReadonlyClient()
  const complex = await getComplexById(id, supabase)
  if (!complex) return new Response('Not Found', { status: 404 })

  return new ImageResponse(
    (<div>...</div>),  // 단지명·위치·가격 표시
    { width: 1200, height: 630 },
  )
}
```

**UI 금지 규칙 (CLAUDE.md):**
- backdrop-blur, gradient-text, glow 애니메이션 금지
- 보라/인디고 브랜드색 금지
- 배경 gradient orb 금지

---

### `src/components/complex/ShareButton.tsx` (component, client)

**Analog:** `src/components/complex/FavoriteButton.tsx`

**'use client' + 버튼 onClick 패턴** (FavoriteButton.tsx lines 1–50):
```typescript
'use client'

import { useState, useTransition } from 'react'

interface Props {
  complexId:        string
  initialFavorited?: boolean
}

export function FavoriteButton({ complexId, initialFavorited = false }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      // async 처리
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`btn btn-md ${favorited ? 'btn-orange' : 'btn-secondary'}`}
      style={{ gap: 6, opacity: isPending ? 0.7 : 1 }}
    >
      ...
    </button>
  )
}
```

**ShareButton 적용 패턴:**
```typescript
'use client'

interface Props {
  complexId:    string
  complexName:  string
  price?:       number
}

export function ShareButton({ complexId, complexName, price }: Props) {
  const handleKakaoShare = () => {
    // window.Kakao.Share.sendDefault(...)
  }
  const handleNaverShare = () => {
    const url = encodeURIComponent(`${window.location.origin}/complexes/${complexId}`)
    const text = encodeURIComponent(complexName)
    window.open(`https://share.naver.com/web/shareView?url=${url}&title=${text}`)
  }
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/complexes/${complexId}`)
  }

  return (
    <div>
      <button className="btn btn-md btn-secondary" onClick={handleKakaoShare}>카카오톡 공유</button>
      <button className="btn btn-md btn-secondary" onClick={handleNaverShare}>네이버 공유</button>
      <button className="btn btn-md btn-ghost" onClick={handleCopyLink}>링크 복사</button>
    </div>
  )
}
```

**현재 공유 버튼 플레이스홀더** (`src/app/complexes/[id]/page.tsx` lines 188–196):
```typescript
<button
  className="btn btn-md btn-ghost"
  style={{ color: 'var(--fg-sec)' }}
  aria-label="공유"
>
  <ShareIcon />
</button>
```
→ 이 정적 버튼을 `<ShareButton complexId={id} complexName={complex.canonical_name} />`으로 교체.

---

### `supabase/migrations/YYYYMMDD_rankings_rls.sql` (migration, RLS)

**Analog:** `supabase/migrations/20260430000009_rls.sql`

**public read + service_role write 패턴** (rls.sql lines 61–66):
```sql
-- complexes: 전체 읽기, 쓰기는 service_role 전용 (데이터 파이프라인)
alter table public.complexes enable row level security;
create policy "complexes: public read"
  on public.complexes for select using (true);
```

**rankings에 동일 패턴 적용:**
```sql
-- complex_rankings: 전체 읽기, 쓰기는 service_role 전용 (rankings cron 파이프라인)
alter table public.complex_rankings enable row level security;
create policy "complex_rankings: public read"
  on public.complex_rankings for select using (true);
```

---

### `src/__tests__/rankings.test.ts` (test, CRUD)

**Analog:** `src/__tests__/ads.test.ts`

**테스트 파일 구조 패턴** (ads.test.ts lines 1–22):
```typescript
/**
 * Step XX 수용 기준 테스트 — [기능명]
 *
 * - [함수1]: [테스트 케이스 요약]
 * - [함수2]: [테스트 케이스 요약]
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, AKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})
```

**픽스처 생성 + afterAll 정리 패턴** (ads.test.ts lines 23–47):
```typescript
const insertedIds: string[] = []

function makeAd(overrides = {}) {
  // 기본값 + overrides
  return { ...defaults, ...overrides }
}

afterAll(async () => {
  if (insertedIds.length) {
    await admin.from('ad_campaigns').delete().in('id', insertedIds)
  }
})
```

**단위 테스트 AAA 패턴** (ads.test.ts lines 52–59):
```typescript
describe('getActiveAds', () => {
  it('approved + 활성 기간 → 반환', async () => {
    // Arrange
    const { data } = await admin.from('ad_campaigns').insert(makeAd()).select('id').single()
    insertedIds.push((data as { id: string }).id)

    // Act
    const result = await getActiveAds('sidebar', admin)

    // Assert
    expect(result.some(a => a.id === (data as { id: string }).id)).toBe(true)
  })
})
```

**API Route 테스트 패턴** (ads.test.ts lines 139–157):
```typescript
describe('GET /api/cron/rankings', () => {
  it('CRON_SECRET 없음 → 401', async () => {
    const { GET } = await import('@/app/api/cron/rankings/route')
    const req = new Request('http://localhost/api/cron/rankings')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('잘못된 secret → 401', async () => {
    const { GET } = await import('@/app/api/cron/rankings/route')
    const req = new Request('http://localhost/api/cron/rankings', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
```

---

## Shared Patterns

### CRON_SECRET 인증
**Source:** `src/app/api/ingest/molit-trade/route.ts` (lines 13–18)
**적용 대상:** `src/app/api/cron/rankings/route.ts`

```typescript
const authHeader = request.headers.get('authorization')
if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

### createSupabaseAdminClient() 단일 경유
**Source:** `src/lib/supabase/admin.ts`
**적용 대상:** 모든 cron route, 모든 mutation API route

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
// CRITICAL: service_role 클라이언트는 이 함수로만 생성 (SEC-02, CLAUDE.md)
```

### createReadonlyClient() — ISR 페이지
**Source:** `src/lib/supabase/readonly.ts`
**적용 대상:** `src/app/page.tsx`, `src/app/api/og/complex/route.tsx`

```typescript
import { createReadonlyClient } from '@/lib/supabase/readonly'
// cookies()를 호출하지 않아 revalidate가 정상 동작함
```

### 유효 거래 필터 (CRITICAL)
**Source:** `src/lib/data/homepage.ts` (lines 41–42)
**적용 대상:** `src/lib/data/rankings.ts`의 모든 집계 함수, SQL migration 함수

```typescript
.is('cancel_date', null)
.is('superseded_by', null)
// SQL: and cancel_date is null and superseded_by is null
```

### RLS 패턴 — 공개 읽기 + 서비스롤 쓰기
**Source:** `supabase/migrations/20260430000009_rls.sql` (lines 61–66)
**적용 대상:** `complex_rankings` 테이블

```sql
alter table public.[TABLE] enable row level security;
create policy "[TABLE]: public read"
  on public.[TABLE] for select using (true);
-- 쓰기는 service_role만 (RLS가 service_role 우회하므로 정책 불필요)
```

### Supabase 조인 응답 정규화
**Source:** `src/lib/data/homepage.ts` (lines 50–52)
**적용 대상:** `src/lib/data/rankings.ts`의 모든 조인 쿼리

```typescript
const r = row as any
const c = Array.isArray(r.complexes) ? r.complexes[0] : r.complexes
if (!c) continue
```

### Response.json 응답 형식
**Source:** `src/app/api/ingest/molit-trade/route.ts` (lines 57–61)
**적용 대상:** `src/app/api/cron/rankings/route.ts`

```typescript
return Response.json({ summary, results })
// 오류: Response.json({ error: message }, { status: 500 })
```

### GitHub Actions curl + 상태코드 검증
**Source:** `.github/workflows/notify-worker.yml` (lines 15–29)
**적용 대상:** `.github/workflows/rankings-cron.yml`

```yaml
STATUS=$(curl -sSf -o /tmp/response.json -w "%{http_code}" ...)
if [ "$STATUS" != "200" ]; then exit 1; fi
```

---

## No Analog Found

| 파일 | Role | Data Flow | 이유 |
|---|---|---|---|
| `src/app/api/og/complex/route.tsx` | route | request-response | `@vercel/og` / `next/og` 사용 사례가 코드베이스에 없음. `runtime = 'edge'`, `ImageResponse` JSX 패턴은 RESEARCH.md 참조 |

**OG image route 구현 시 참조할 공식 문서:**
- `next/og` ImageResponse API: https://nextjs.org/docs/app/api-reference/functions/image-response
- 카카오 공유 SDK: `window.Kakao.Share.sendDefault()` — `NEXT_PUBLIC_KAKAO_JS_KEY` 이미 CI env에 존재 (`.github/workflows/ci.yml` line 24)

---

## Metadata

**Analog 탐색 범위:** `src/app/`, `src/lib/data/`, `src/components/`, `src/app/api/`, `.github/workflows/`, `supabase/migrations/`
**파일 스캔 수:** 31개
**패턴 추출 완료:** 2026-05-06
