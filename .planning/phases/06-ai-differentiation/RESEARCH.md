# Phase 6: AI·차별화기술 — Research

**Researched:** 2026-05-08
**Domain:** Claude API RAG, pgvector, SGIS OpenAPI, Upstash Redis anomaly detection, GPS badge auth
**Confidence:** HIGH (stack/patterns), MEDIUM (SGIS adm_cd values), LOW (embedding cost projection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AD-01:**
- D-01: "전환" = 광고 클릭 후 연락처 클릭. `ad_events.event_type`에 `'conversion'` 추가.
- D-02: ROI 대시보드 = 어드민 전용 `/admin/ads`. 광고주 별도 로그인 없음.
- D-03: 이상 트래픽 = 동일 IP(ip_hash) 하루 클릭 10회 초과 → `anomaly` 플래그. Upstash Redis 일별 sliding window.
- D-04: ROI = `(전환 수 / 클릭 수) × 100`. 전환율만 표시.

**DATA-06:**
- D-05: 수집 단위 = 시군구 (의창구·성산구·마산합포구·마산회원구·진해구, 김해시).
- D-06: 단지 상세 '지역 통계' 탭 추가.
- D-07: 분기 적재 = GitHub Actions. `src/services/sgis.ts` 어댑터.

**AD-02:**
- D-08: 어드민 광고 등록/수정 UI에서만 사용. 광고주 전용 UI 없음.
- D-09: 응답 포맷 `{ violations: string[], suggestions: string[] }`.
- D-10: 모델 `claude-haiku-4-5-20251001`. 실패 시 차단 안 함 — 경고만.

**DATA-05 defer 해소:**
- D-11: "시세보다 {N}만원 높음/낮음". `listing_prices.price_per_py` vs `transactions` avg.
- D-12: 데이터 없으면 숨김.
- D-13: 단지 상세 가격 섹션 상단.

### Claude's Discretion

- DIFF-03 RAG 봇: pgvector (Supabase), `complexes` + `transactions` + `complex_reviews` 임베딩. 단지 상세 사이드 채팅 패널.
- AUTH-01: `gps_visits` 신규 테이블, L2 = 30일 3회, L3 = 서류 업로드 + 어드민 승인. 배지 단계 L1/L2/L3.

### Deferred Ideas (OUT OF SCOPE)

- DATA-07: 재개발 행정 데이터 자동 적재 → Phase 7.
- RAG 봇 별도 /chat 페이지 → 사이드 패널로 구현.
- 광고주 셀프서비스 대시보드 → 추후.
- SGIS 읍면동 단위 → Phase 7 이후.
</user_constraints>

---

## Summary

Phase 6는 Claude API 통합(RAG 봇 + 광고 카피 검토), 벡터 검색(pgvector + Voyage AI 임베딩), SGIS 통계 데이터 적재, 광고 이상 트래픽 감지 고도화, 갭 라벨 UI, GPS L2/L3 인증 확장의 6개 독립 기능으로 구성된다.

**핵심 발견 사항:** Anthropic은 자체 임베딩 모델을 제공하지 않는다. CONTEXT.md의 "Claude API 텍스트 임베딩" 언급은 잘못된 전제다. Anthropic 공식 문서는 Voyage AI (`voyage-4-lite`, 1024 dim)를 권장한다. 임베딩에는 별도 API key(`VOYAGE_API_KEY`)와 `voyageai` npm 패키지가 필요하다. 이 결정은 `Claude's Discretion` 영역이므로 Voyage AI로 진행한다.

**Secondary finding:** SGIS API는 `consumer_key` + `consumer_secret` → 4시간 TTL `accessToken` 교환 방식이다. 인구(`searchpopulation.json`) + 세대(`household.json`) 두 엔드포인트가 분리되어 있다.

**Primary recommendation:** 기능 독립성이 높으므로 다음 순서로 구현한다: (1) 갭 라벨 — 기존 데이터 활용, 위험 없음. (2) AD-01 전환 이벤트 + 이상 감지. (3) SGIS 적재. (4) AD-02 AI 카피 검토. (5) RAG 봇. (6) GPS L2/L3.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 갭 라벨 계산 | API / Backend (서버 컴포넌트) | — | DB 쿼리 필요. ISR 패턴으로 서버에서 fetch |
| 지역 통계 탭 | API / Backend (서버 컴포넌트) | — | SGIS 데이터는 DB에서 읽음. ISR 가능 |
| RAG 봇 채팅 | API Route Handler | Browser / Client | 스트리밍 응답 → Route Handler. UI 상태 → 클라이언트 |
| AD-02 카피 검토 | API Route Handler | Browser / Client | Claude API 호출은 서버. 결과 표시는 클라이언트 |
| ROI 대시보드 | API / Backend (서버 컴포넌트) | — | 어드민 페이지, `revalidate = 0` |
| 이상 트래픽 감지 | API Route Handler | — | 기존 `/api/ads/events`에 Redis 로직 추가 |
| GPS 배지 업그레이드 | API / Backend (Server Action) | — | DB 쓰기는 Server Action 패턴 |
| SGIS 데이터 적재 | GitHub Actions (외부 cron) | — | 분기 1회 실행. Vercel에서 실행 불가 |
| 임베딩 생성 (RAG) | GitHub Actions / 서버 스크립트 | — | 배치 작업. Voyage AI API 호출 |

---

## Feature: 갭 라벨 UI (DATA-05)

### Technical Approach

기존 `listing_prices` 테이블(Phase 5 완성)과 `transactions` 테이블의 집계만으로 구현. 신규 마이그레이션 불필요.

### Key Implementation Details

**서버 쿼리 (complexes/[id]/page.tsx `Promise.all()` 추가):**

```typescript
// src/lib/data/gap-label.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface GapLabelData {
  listingPricePerPy: number | null
  avgTransactionPricePerPy: number | null
}

export async function getGapLabelData(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<GapLabelData> {
  const [listingResult, transactionResult] = await Promise.all([
    // 최근 매물가 (recorded_date 내림차순 1건)
    supabase
      .from('listing_prices')
      .select('price_per_py')
      .eq('complex_id', complexId)
      .order('recorded_date', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 최근 12개월 실거래 평균 price_per_py (매매만, 취소·정정 제외)
    supabase
      .from('transactions')
      .select('price_per_py')
      .eq('complex_id', complexId)
      .eq('deal_type', 'sale')
      .is('cancel_date', null)
      .is('superseded_by', null)
      .not('price_per_py', 'is', null)
      .gte('deal_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10)),
  ])

  const listingPricePerPy = listingResult.data?.price_per_py ?? null

  const rows = transactionResult.data ?? []
  const avgTransactionPricePerPy =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (r.price_per_py ?? 0), 0) / rows.length)
      : null

  return { listingPricePerPy, avgTransactionPricePerPy }
}
```

**갭 계산 및 null 처리:**

```typescript
// page.tsx Promise.all() 배열에 추가
getGapLabelData(id, supabase).catch(() => ({ listingPricePerPy: null, avgTransactionPricePerPy: null }))

// 컴포넌트에서:
const gap =
  gapData.listingPricePerPy !== null && gapData.avgTransactionPricePerPy !== null
    ? gapData.listingPricePerPy - gapData.avgTransactionPricePerPy
    : null
// gap === 0 또는 null이면 컴포넌트 렌더링 안 함
```

**`<GapLabel>` 컴포넌트:** 순수 presentational. `gap: number | null` prop 수신. UI 스펙에 따라 `.badge.neg`/`.badge.pos` 렌더링.

**formatPrice 재사용:** `complexes/[id]/page.tsx`에 이미 존재하는 `formatPrice()` 함수를 `src/lib/format.ts`로 이동하고 공유. 천만원 단위 처리: `gap >= 10000` → "1억 {n}만원" 형식.

### Migration/Schema Changes

없음. `listing_prices` 테이블은 Phase 5에서 완성.

`transactions` 테이블에 `price_per_py` 컬럼이 있는지 확인 필요. [ASSUMED: 기존 schema에 존재]

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `transactions.price_per_py` 컬럼 미존재 | `transactions` 테이블 schema 확인 후 없으면 계산 추가 |
| 매물가 데이터 희소 (대부분 null) | null 시 렌더링 안 함 (D-12) — UX에 영향 없음 |
| 거래 데이터 평균 왜곡 (평수 혼합) | MVP에서는 단지 전체 평균. Phase 7에서 타입별 분리 고려 |

### Recommended Implementation Order

1. `src/lib/format.ts` — `formatPrice` 이동 + 내보내기
2. `src/lib/data/gap-label.ts` — 쿼리 함수
3. `src/components/complex/GapLabel.tsx` — 배지 컴포넌트
4. `complexes/[id]/page.tsx` — Promise.all에 추가, 카드 헤더에 삽입

---

## Feature: SGIS 통계 적재 (DATA-06)

### Technical Approach

SGIS OpenAPI 두 엔드포인트(인구/세대수)를 `src/services/sgis.ts` 어댑터로 래핑. GitHub Actions 분기 cron으로 `district_stats` 테이블에 upsert. 단지 상세 페이지에서 `si + gu`로 조회.

### SGIS API Authentication

```
인증 엔드포인트: GET https://sgisapi.kostat.go.kr/OpenAPI3/auth/authentication.json
  ?consumer_key={SGIS_CONSUMER_KEY}
  &consumer_secret={SGIS_CONSUMER_SECRET}

응답: { result: { accessToken: "...", accessTimeout: <epoch_seconds> } }
```

- 토큰 TTL: 4시간. GitHub Actions job 시작 시 한 번 발급해서 재사용.
- 환경변수: `SGIS_CONSUMER_KEY`, `SGIS_CONSUMER_SECRET`
- [VERIFIED: sgis.mods.go.kr 공식 문서]

### SGIS Data Endpoints

```
인구: GET https://sgisapi.mods.go.kr/OpenAPI3/stats/searchpopulation.json
  ?accessToken={token}&year={year}&adm_cd={5자리코드}

응답: { result: [{ adm_cd, adm_nm, population: "123456" }], errMsg, errCd }

세대: GET https://sgisapi.mods.go.kr/OpenAPI3/stats/household.json
  ?accessToken={token}&year={year}&adm_cd={5자리코드}

응답: { result: [{ adm_cd, adm_nm, household_cnt: "56789" }], errMsg, errCd }
```

- `year` 파라미터: 가장 최근 확정 연도 (2024). 분기 표시는 적재 분기로 계산.
- [VERIFIED: sgis.mods.go.kr census API docs]

### 시군구 adm_cd 코드

| 지역 | adm_cd (5자리) | 비고 |
|------|---------------|------|
| 창원시 의창구 | 48121 | [ASSUMED: 국토부 sgg_code와 일치 가능성 높음] |
| 창원시 성산구 | 48123 | [ASSUMED] |
| 창원시 마산합포구 | 48125 | [ASSUMED] |
| 창원시 마산회원구 | 48127 | [ASSUMED] |
| 창원시 진해구 | 48129 | [ASSUMED] |
| 김해시 | 48250 | [ASSUMED] |

**중요:** 위 코드는 ASSUMED. 구현 전 `https://sgisapi.kostat.go.kr/OpenAPI3/addr/stage.json?accessToken=...&cd=48&pg_yn=1` 호출로 확인 필수. 창원시 SGG 코드(`sgg_code`)는 기존 `complexes` 테이블에 있음 — `SELECT DISTINCT sgg_code FROM complexes WHERE si = '창원시'`로 검증.

### district_stats Table Schema

```sql
-- supabase/migrations/20260508000001_district_stats.sql
create table public.district_stats (
  id           uuid primary key default gen_random_uuid(),
  adm_cd       text not null,                       -- SGIS 5자리 adm_cd
  adm_nm       text not null,                       -- 지역명 (의창구, 김해시 등)
  si           text not null,                       -- complexes.si 매칭용
  gu           text not null,                       -- complexes.gu 매칭용
  data_year    smallint not null,
  data_quarter smallint not null check (data_quarter between 1 and 4),
  population   integer,
  households   integer,
  fetched_at   timestamptz not null default now(),
  unique (adm_cd, data_year, data_quarter)
);

create index district_stats_si_gu_idx on public.district_stats(si, gu);
create index district_stats_year_quarter_idx
  on public.district_stats(data_year desc, data_quarter desc);

alter table public.district_stats enable row level security;

-- public read
create policy "district_stats: public read"
  on public.district_stats for select using (true);

-- service role only write (GitHub Actions uses service key)
create policy "district_stats: service role write"
  on public.district_stats for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

### Service Adapter Pattern (src/services/sgis.ts)

```typescript
import { z } from 'zod/v4'

const BASE = 'https://sgisapi.kostat.go.kr/OpenAPI3'

const TokenResponseSchema = z.object({
  result: z.object({
    accessToken:   z.string(),
    accessTimeout: z.number(),   // epoch seconds
  }),
  errMsg: z.string(),
  errCd:  z.number(),
})

export async function fetchSgisToken(): Promise<string> {
  const key    = process.env.SGIS_CONSUMER_KEY
  const secret = process.env.SGIS_CONSUMER_SECRET
  if (!key || !secret) throw new Error('SGIS credentials not set')

  const url = new URL(`${BASE}/auth/authentication.json`)
  url.searchParams.set('consumer_key',    key)
  url.searchParams.set('consumer_secret', secret)

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  const json = TokenResponseSchema.parse(await res.json())
  if (json.errCd !== 0) throw new Error(`SGIS auth error: ${json.errMsg}`)
  return json.result.accessToken
}

// --- 인구 ---
const PopulationItemSchema = z.object({
  adm_cd:     z.string(),
  adm_nm:     z.string(),
  population: z.coerce.number(),
})

export async function fetchPopulation(
  accessToken: string,
  adm_cd: string,
  year: number,
): Promise<{ population: number; adm_nm: string }> {
  const url = new URL(`${BASE}/stats/searchpopulation.json`)
  url.searchParams.set('accessToken', accessToken)
  url.searchParams.set('year',        String(year))
  url.searchParams.set('adm_cd',      adm_cd)

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  const json = await res.json() as { result?: unknown[]; errMsg?: string; errCd?: number }
  if ((json.errCd ?? -1) !== 0) throw new Error(`SGIS population error: ${json.errMsg}`)

  const item = PopulationItemSchema.parse((json.result ?? [])[0])
  return { population: item.population, adm_nm: item.adm_nm }
}

// --- 세대수 ---
const HouseholdItemSchema = z.object({
  adm_cd:        z.string(),
  adm_nm:        z.string(),
  household_cnt: z.coerce.number(),
})

export async function fetchHouseholds(
  accessToken: string,
  adm_cd: string,
  year: number,
): Promise<{ households: number }> {
  const url = new URL(`${BASE}/stats/household.json`)
  url.searchParams.set('accessToken', accessToken)
  url.searchParams.set('year',        String(year))
  url.searchParams.set('adm_cd',      adm_cd)

  const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  const json = await res.json() as { result?: unknown[]; errMsg?: string; errCd?: number }
  if ((json.errCd ?? -1) !== 0) throw new Error(`SGIS household error: ${json.errMsg}`)

  const item = HouseholdItemSchema.parse((json.result ?? [])[0])
  return { households: item.household_cnt }
}
```

### GitHub Actions Quarterly Cron

```yaml
# .github/workflows/sgis-stats.yml
name: SGIS 분기 통계 적재

on:
  schedule:
    - cron: '0 3 15 1,4,7,10 *'  # 1·4·7·10월 15일 03:00 UTC
  workflow_dispatch: {}

jobs:
  ingest:
    name: SGIS 인구·세대 적재
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run SGIS ingestion script
        env:
          SGIS_CONSUMER_KEY:    ${{ secrets.SGIS_CONSUMER_KEY }}
          SGIS_CONSUMER_SECRET: ${{ secrets.SGIS_CONSUMER_SECRET }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NEXT_PUBLIC_SUPABASE_URL:  ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
        run: npx tsx scripts/ingest-sgis.ts
```

`scripts/ingest-sgis.ts`는 `molit-backfill` 스크립트 패턴 준수 (`tsx` 실행, `createSupabaseAdminClient()` 사용, upsert on conflict).

### Page Integration

`complexes/[id]/page.tsx`의 `Promise.all()`에 추가:

```typescript
// complex.si + complex.gu로 조회
complex.si && complex.gu
  ? supabase
      .from('district_stats')
      .select('adm_nm, population, households, data_year, data_quarter')
      .eq('si', complex.si)
      .eq('gu', complex.gu)
      .order('data_year', { ascending: false })
      .order('data_quarter', { ascending: false })
      .limit(1)
      .maybeSingle()
      .catch(() => ({ data: null }))
  : Promise.resolve({ data: null })
```

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| adm_cd 코드 불일치 | 첫 실행 전 stage API로 코드 검증 |
| 연도별 데이터 지연 (최신년도 미확정) | 적재 스크립트에서 현재연도 → 전년도 fallback |
| SGIS API 서비스 중단 | workflow_dispatch로 수동 재실행 가능 |

---

## Feature: 광고 통계 고도화 (AD-01)

### Technical Approach

1. `ad_events.event_type` CHECK constraint에 `'conversion'` 추가 (DDL migration).
2. `ad_events` 테이블에 `is_anomaly boolean` 컬럼 추가.
3. Upstash Redis에 IP별 일별 클릭 sliding window 추가.
4. `/api/ads/events` route에 anomaly 감지 + 플래그 로직 삽입.
5. `/admin/ads` ROI 집계 쿼리 + 테이블 컴포넌트 추가.

### Migration: ad_events 업데이트

```sql
-- supabase/migrations/20260508000002_ad_events_conversion.sql

-- 1. event_type CHECK 수정: 기존 constraint 삭제 후 재생성
alter table public.ad_events
  drop constraint if exists ad_events_event_type_check;

alter table public.ad_events
  add constraint ad_events_event_type_check
    check (event_type in ('impression', 'click', 'conversion'));

-- 2. anomaly 플래그 컬럼 추가
alter table public.ad_events
  add column if not exists is_anomaly boolean not null default false;

-- 3. anomaly 인덱스 (어드민 조회용)
create index if not exists ad_events_anomaly_idx
  on public.ad_events(campaign_id, is_anomaly)
  where is_anomaly = true;
```

### Anomaly Detection (Upstash Redis)

`src/lib/ratelimit.ts`에 일별 sliding window 추가:

```typescript
// 기존 adEventRatelimit (분당 100회) 유지
export const adEventRatelimit = new Ratelimit({ ... })  // 변경 없음

// 신규: IP별 일별 클릭 10회 초과 감지
export const adClickDailyLimit = new Ratelimit({
  redis: new Redis({
    url:   process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  }),
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  analytics: false,
  prefix: 'danji:ad:daily-click',
})
```

`/api/ads/events/route.ts` 수정 포인트:

```typescript
// event_type 검증 확장
if (!['impression', 'click', 'conversion'].includes(b.event_type as string)) {
  return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
}

// click 이벤트에만 일별 anomaly 감지
let isAnomaly = false
if (b.event_type === 'click') {
  const { success: withinDaily } = await adClickDailyLimit.limit(ip_hash)
  isAnomaly = !withinDaily  // 10회 초과 시 true
}

// INSERT에 is_anomaly 포함
await supabase.from('ad_events').insert({
  campaign_id: b.campaign_id,
  event_type:  b.event_type as string,
  ip_hash,
  is_anomaly:  isAnomaly,
})
```

### ROI Aggregate Query

```typescript
// src/lib/data/ads.ts에 추가
export interface AdRoiRow {
  campaignId:  string
  title:       string
  impressions: number
  clicks:      number
  conversions: number
  ctr:         number | null   // null when clicks === 0
  anomaly:     boolean
}

export async function getAdRoiStats(
  adminClient: SupabaseClient<Database>,
): Promise<AdRoiRow[]> {
  // ad_events를 campaign_id + event_type별로 집계
  const { data: campaigns } = await adminClient
    .from('ad_campaigns')
    .select('id, title')
    .order('created_at', { ascending: false })

  if (!campaigns) return []

  const roiRows: AdRoiRow[] = []
  for (const c of campaigns) {
    const { data: events } = await adminClient
      .from('ad_events')
      .select('event_type, is_anomaly')
      .eq('campaign_id', c.id)

    const impressions = events?.filter(e => e.event_type === 'impression').length ?? 0
    const clicks      = events?.filter(e => e.event_type === 'click').length ?? 0
    const conversions = events?.filter(e => e.event_type === 'conversion').length ?? 0
    const anomaly     = events?.some(e => e.is_anomaly) ?? false
    const ctr         = clicks > 0 ? (conversions / clicks) * 100 : null

    roiRows.push({ campaignId: c.id, title: c.title, impressions, clicks, conversions, ctr, anomaly })
  }
  return roiRows
}
```

**성능 주의:** 캠페인 수가 많아지면 N+1 문제. MVP 규모(< 50 캠페인)에서는 허용. 필요 시 단일 SQL로 대체:

```sql
SELECT
  c.id          AS campaign_id,
  c.title,
  COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE e.event_type = 'click')      AS clicks,
  COUNT(*) FILTER (WHERE e.event_type = 'conversion') AS conversions,
  BOOL_OR(e.is_anomaly)                               AS anomaly
FROM ad_campaigns c
LEFT JOIN ad_events e ON e.campaign_id = c.id
GROUP BY c.id, c.title
ORDER BY c.created_at DESC;
```

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CHECK constraint 변경이 기존 row 영향 | 새 constraint는 INSERT/UPDATE에만 적용. 기존 row는 영향 없음 |
| Redis quota 증가 | Upstash 무료 티어는 10,000 req/day. 두 limiter 사용 시 소진 가능. Analytics = false 유지 |
| anomaly 감지 후 정상 IP 차단 | `is_anomaly = true`는 DB 플래그만. 요청은 계속 허용. 어드민이 판단 |

---

## Feature: 광고주 AI 어시스트 (AD-02)

### Technical Approach

어드민 광고 등록/수정 폼에서 버튼 클릭 → `POST /api/admin/ad-copy-review` → Claude API → JSON 응답. 스트리밍 불필요 (짧은 분류 응답).

### Anthropic SDK Installation

```bash
npm install @anthropic-ai/sdk
```

현재 버전: `0.95.1` [VERIFIED: npm registry]
환경변수: `ANTHROPIC_API_KEY`

### Route Handler Pattern

```typescript
// src/app/api/admin/ad-copy-review/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Admin auth guard
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'superadmin'].includes((profile as { role: string })?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse body
  const body = await request.json().catch(() => null)
  const copy = typeof body?.copy === 'string' ? body.copy.trim() : ''
  if (!copy) return NextResponse.json({ error: 'copy required' }, { status: 400 })

  // 3. Claude API call (non-streaming, haiku)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `다음 부동산 광고 카피를 검토해주세요:\n\n"${copy}"\n\n반드시 JSON만 반환하세요 (설명 금지):\n{"violations": ["위반 표현1", ...], "suggestions": ["개선 제안1", ...]}`,
      }],
      system: `당신은 한국 표시광고법 전문가입니다. 부동산 광고 카피를 검토하여 다음을 찾아냅니다:
1. 표시광고법 위반 가능 표현 (최저가 보장, 100% 확실, 투자 원금 보장 등 과장·허위 표현)
2. 과장 표현, 근거 없는 수익률 주장
응답은 반드시 JSON 형식: {"violations": [...], "suggestions": [...]}
위반·제안이 없으면 빈 배열 반환. 절대 JSON 외의 텍스트 포함 금지.`,
    })

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    // JSON 파싱 — Claude가 마크다운 블록을 감쌀 경우 제거
    const jsonText = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const result = JSON.parse(jsonText) as { violations?: string[]; suggestions?: string[] }

    return NextResponse.json({
      violations:  Array.isArray(result.violations) ? result.violations : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    })
  } catch (err) {
    // D-10: 실패 시 차단 안 함 — 빈 결과 + error 플래그
    console.error('Claude API error:', err)
    return NextResponse.json(
      { violations: [], suggestions: [], error: true },
      { status: 200 },  // 200으로 반환하여 클라이언트가 경고 표시
    )
  }
}
```

### Client Component Pattern

어드민 폼에서 `useState`로 상태 관리:

```typescript
type ReviewState = 'idle' | 'loading' | 'result' | 'error'

const [reviewState, setReviewState] = useState<ReviewState>('idle')
const [reviewResult, setReviewResult] = useState<{ violations: string[]; suggestions: string[] } | null>(null)

async function handleReview() {
  setReviewState('loading')
  try {
    const res = await fetch('/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: copyText }),
    })
    const data = await res.json()
    if (data.error) {
      setReviewState('error')
    } else {
      setReviewResult(data)
      setReviewState('result')
    }
  } catch {
    setReviewState('error')
  }
}
```

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude가 JSON 외 텍스트 반환 | 마크다운 블록 제거 후 parse. parse 실패 시 `error: true` 반환 |
| API key 미설정 | 서버 시작 시 `if (!process.env.ANTHROPIC_API_KEY)` 경고 로그 |
| Haiku 모델명 deprecated | 현재 `claude-haiku-4-5-20251001` [VERIFIED: Anthropic models overview] |

---

## Feature: Claude API RAG 단지 상담 봇 (DIFF-03)

### Technical Approach

**핵심 결정:** Anthropic은 임베딩 모델을 제공하지 않는다. Voyage AI (`voyage-4-lite`, 1024 dim)를 사용한다. 임베딩은 배치 스크립트(`scripts/embed-complexes.ts`)로 생성하여 DB에 저장. 사용자 쿼리 임베딩도 Voyage AI.

Claude API는 채팅 완성(RAG 응답 생성)에만 사용. 임베딩에는 사용하지 않는다.

### Stack

| 역할 | 라이브러리 | 버전 | 비고 |
|------|-----------|------|------|
| 채팅 완성 | `@anthropic-ai/sdk` | 0.95.1 | 설치 필요 |
| 임베딩 | `voyageai` npm (HTTP API 직접 사용 가능) | 0.2.1 | 설치 필요 |
| 벡터 저장/검색 | pgvector (Supabase extension) | 내장 | migration으로 활성화 |

### pgvector Migration

```sql
-- supabase/migrations/20260508000003_pgvector.sql

-- pgvector extension 활성화 (Supabase에 기본 포함)
create extension if not exists vector with schema extensions;

-- complex_embeddings: 단지별 임베딩 저장
create table public.complex_embeddings (
  id          uuid primary key default gen_random_uuid(),
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  content     text not null,           -- 임베딩된 원문 텍스트 (디버깅용)
  chunk_type  text not null            -- 'summary' | 'transactions' | 'reviews'
    check (chunk_type in ('summary', 'transactions', 'reviews')),
  embedding   extensions.vector(1024), -- voyage-4-lite 기본 차원
  updated_at  timestamptz not null default now(),
  unique (complex_id, chunk_type)
);

create index complex_embeddings_hnsw_idx
  on public.complex_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.complex_embeddings enable row level security;

-- public read (RAG 검색 시 service role 또는 anon 사용)
create policy "complex_embeddings: public read"
  on public.complex_embeddings for select using (true);

create policy "complex_embeddings: service role write"
  on public.complex_embeddings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 코사인 유사도 검색 함수 (RPC로 호출)
create or replace function match_complex_embeddings(
  query_embedding extensions.vector(1024),
  target_complex_id uuid,
  match_count int default 3
)
returns table (
  chunk_type text,
  content    text,
  similarity float
)
language sql stable
as $$
  select
    chunk_type,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.complex_embeddings
  where complex_id = target_complex_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### Embedding Strategy

각 단지별 3개 chunk 임베딩:

| chunk_type | 소스 | 내용 예시 |
|------------|------|-----------|
| `summary` | `complexes` | "창원시 성산구 팔용동 {단지명}. 2010년 준공. 485세대. 최근 실거래가 3억 5천만원 (2024-12)." |
| `transactions` | `transactions` (최근 24개월) | "2024년 1월 84㎡ 3억 2천만원 외 12건. 평균 3억 3천만원." |
| `reviews` | `complex_reviews` (최근 20건) | "주민 의견: 학군 좋음, 주차 불편, 관리 잘됨 ..." |

**임베딩 스크립트 (`scripts/embed-complexes.ts`):**

```typescript
import { createClient } from '@supabase/supabase-js'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function embedText(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: 'voyage-4-lite', input_type: 'document' }),
  })
  const json = await res.json() as { data: Array<{ embedding: number[] }> }
  return json.data.map(d => d.embedding)
}
```

Voyage AI 무료 티어: 10M tokens/월. 단지 3000개 × 3 chunk × 평균 200 tokens = 1.8M tokens/1회 → 무료 티어 1회 전체 적재 가능.

### Chat API Route (Streaming)

```typescript
// src/app/api/chat/complex/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null)
  const complexId = body?.complexId as string | undefined
  const messages  = body?.messages  as Array<{ role: string; content: string }> | undefined

  if (!complexId || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }

  // Rate limit: 유저당 분당 10회 (기존 adEventRatelimit 패턴 참조)
  // TODO: IP 기반 ratelimit 추가

  // 1. 마지막 유저 메시지를 Voyage AI로 임베딩
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  const queryEmbedding = await embedQuery(lastUserMsg)

  // 2. pgvector 코사인 유사도 검색
  const supabase = createSupabaseAdminClient()
  const { data: chunks } = await supabase.rpc('match_complex_embeddings', {
    query_embedding:   queryEmbedding,
    target_complex_id: complexId,
    match_count:       3,
  })

  const context = (chunks ?? [])
    .map((c: { content: string }) => c.content)
    .join('\n\n')

  // 3. Claude API 스트리밍
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = client.messages.stream({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `당신은 부동산 단지 정보 안내 도우미입니다. 반드시 아래 단지 데이터만 참조하여 답변하세요. 데이터에 없는 내용은 "해당 정보는 단지 데이터에 없습니다."라고 답하세요. 추측하거나 일반 지식으로 답하지 마세요.

[단지 데이터]
${context}`,
    messages: messages.map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  // 4. ReadableStream으로 변환하여 SSE 반환
  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':   'keep-alive',
    },
  })
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: 'voyage-4-lite', input_type: 'query' }),
  })
  const json = await res.json() as { data: Array<{ embedding: number[] }> }
  return json.data[0]?.embedding ?? []
}
```

**`stream.toReadableStream()`:** Anthropic SDK `MessageStream`의 메서드. SSE 이벤트를 Web ReadableStream으로 변환. Next.js Route Handler의 `Response` 생성자에 직접 전달 가능. [CITED: anthropics/anthropic-sdk-typescript helpers.md]

### Client Component: AI 채팅 패널

```typescript
// src/components/complex/AiChatPanel.tsx
'use client'
// UI-SPEC.md 사양 준수:
// - 'AI 상담' 버튼: position fixed bottom-right
// - 슬라이드인 패널: width 400px, transform translateX 200ms
// - 메시지 스트리밍: SSE 텍스트 수신하여 실시간 표시

// 스트리밍 수신 패턴 (Anthropic SSE 포맷):
// event: content_block_delta
// data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
async function sendMessage(userMsg: string) {
  const res = await fetch('/api/chat/complex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complexId, messages: [...messages, { role: 'user', content: userMsg }] }),
  })
  // ReadableStream 소비
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let assistantText = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    // Anthropic SSE 파싱: text_delta 이벤트에서 텍스트 추출
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
            assistantText += data.delta.text
            // setMessages로 실시간 업데이트
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }
}
```

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Voyage AI API 추가 비용 | `voyage-4-lite` 가장 저렴. 사용자 쿼리당 1회 호출. 무료 티어 10M tokens/월 |
| CONTEXT.md의 "Claude API 임베딩" 전제 오류 | Claude는 임베딩 미지원 (공식 문서 확인). Voyage AI 사용으로 수정 |
| pgvector HNSW 인덱스 빌드 시간 | 3000단지 × 3 chunk = 9000 vectors. HNSW 빌드 수초. 문제 없음 |
| 스트리밍 중 연결 끊김 | 클라이언트에서 AbortController로 취소 처리. 에러 메시지 표시 |
| Vercel Hobby 함수 실행 시간 제한 (10s) | claude-haiku는 512 tokens 기준 3-5초 응답. 스트리밍이므로 TTFB가 중요 |
| 환각 (hallucination) | 시스템 프롬프트에 "단지 데이터만 참조" 명시. DB 데이터로만 context 구성 |

---

## Feature: GPS L2+L3 인증 (AUTH-01)

### Technical Approach

기존 `complex_reviews.gps_verified` (boolean) 위에 `gps_visits` 테이블을 추가하여 L2 집계. L3는 `gps_verification_requests` 테이블 + Storage 버킷 + 어드민 승인.

### Migration: 신규 테이블

```sql
-- supabase/migrations/20260508000004_gps_auth.sql

-- L1/L2 GPS 방문 기록
create table public.gps_visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  verified_at timestamptz not null default now(),
  lat         double precision,   -- 검증된 좌표 (감사용)
  lng         double precision
);

create index gps_visits_user_complex_idx
  on public.gps_visits(user_id, complex_id, verified_at desc);

alter table public.gps_visits enable row level security;

create policy "gps_visits: owner read"
  on public.gps_visits for select
  using (user_id = auth.uid());

create policy "gps_visits: auth insert"
  on public.gps_visits for insert
  with check (user_id = auth.uid());

-- L3 서류 인증 요청
create table public.gps_verification_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  doc_type    text not null check (doc_type in ('등본', '관리비')),
  storage_path text not null,     -- Supabase Storage 파일 경로
  status      text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.gps_verification_requests enable row level security;

create policy "gps_req: owner read"
  on public.gps_verification_requests for select
  using (user_id = auth.uid());

create policy "gps_req: auth insert"
  on public.gps_verification_requests for insert
  with check (user_id = auth.uid());

create policy "gps_req: admin all"
  on public.gps_verification_requests for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- profiles 테이블에 배지 레벨 추가
alter table public.profiles
  add column if not exists gps_badge_level smallint not null default 0
    check (gps_badge_level between 0 and 3);
-- 0 = 없음, 1 = 방문인증, 2 = 거주인증, 3 = 소유자인증
```

### L2 Badge Upgrade Logic

```typescript
// src/lib/auth/gps-badge.ts (Server Action)
'use server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// L1 방문 기록 후 L2 체크
export async function recordGpsVisitAndCheckL2(
  complexId: string,
  lat: number,
  lng: number,
): Promise<{ newBadgeLevel: number }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const adminClient = createSupabaseAdminClient()

  // 1. gps_visits INSERT
  await adminClient.from('gps_visits').insert({
    user_id: user.id, complex_id: complexId, lat, lng,
  })

  // 2. 30일 내 동일 단지 방문 횟수 집계
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await adminClient
    .from('gps_visits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('complex_id', complexId)
    .gte('verified_at', since)

  // 3. L2 조건: 30일 3회 이상
  const currentProfile = await adminClient
    .from('profiles').select('gps_badge_level').eq('id', user.id).single()
  const currentLevel = (currentProfile.data as { gps_badge_level: number })?.gps_badge_level ?? 0

  if (currentLevel < 2 && (count ?? 0) >= 3) {
    await adminClient
      .from('profiles')
      .update({ gps_badge_level: 2 })
      .eq('id', user.id)
    return { newBadgeLevel: 2 }
  }

  return { newBadgeLevel: currentLevel }
}
```

### L3 Admin Approval

1. 유저가 서류 파일 업로드 → `supabase.storage.from('gps-docs').upload()`
2. `gps_verification_requests` INSERT (status = 'pending')
3. 어드민 `/admin/gps-requests` 페이지에서 목록 조회 + 파일 미리보기
4. 승인 클릭 → Server Action → `profiles.gps_badge_level = 3` + `gps_verification_requests.status = 'approved'`

**Storage 버킷 설정:**

```sql
-- Storage 버킷 생성 (Supabase 대시보드 또는 migration으로)
insert into storage.buckets (id, name, public)
values ('gps-docs', 'gps-docs', false);   -- private 버킷

create policy "gps-docs: owner upload"
  on storage.objects for insert
  with check (bucket_id = 'gps-docs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "gps-docs: admin read"
  on storage.objects for select
  using (
    bucket_id = 'gps-docs' and
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
```

### Badge Display

`complex_reviews` 작성 시 배지 표시:
- `gps_badge_level = 1`: "방문인증" 배지 (`.badge.neutral`)
- `gps_badge_level = 2`: "거주인증" 배지 (`.badge.pos`)
- `gps_badge_level = 3`: "소유자인증" 배지 (`.badge.orange`)

기존 `complex_reviews.gps_verified` boolean은 레거시. 신규는 `profiles.gps_badge_level`로 읽음.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GPS 좌표 위조 | 서버 측에서 `complexes.location`과 ±100m 반경 PostGIS 검증 |
| 서류 파일 크기 | Storage upload 시 최대 5MB 제한. 클라이언트에서 사전 검증 |
| 어드민 검토 부담 | L3 요청 수가 적을 것으로 예상. MVP 어드민 수동 처리 허용 |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 벡터 DB | 직접 코사인 계산 | pgvector HNSW | 인덱스 없는 벡터 검색은 풀 스캔. O(n) |
| 임베딩 모델 | Claude로 임베딩 시도 | Voyage AI API | Anthropic은 임베딩 미제공 |
| Ratelimit 카운터 | DB 카운트 쿼리 | Upstash Redis sliding window | DB 락 경합, 정밀도 불일치 |
| JSON 스트리밍 파서 | 직접 SSE 파서 | Anthropic SDK `stream.toReadableStream()` | 이벤트 타입 복잡도 숨김 |
| Admin auth guard | 직접 role 체크 인라인 | `createSupabaseServerClient()` + profile 조회 패턴 | 기존 admin 페이지 패턴 동일 |

---

## Common Pitfalls

### Pitfall 1: Anthropic 임베딩 미지원 전제

**What goes wrong:** `client.embeddings.create()` 호출 → 메서드 없음 오류.
**Why it happens:** OpenAI SDK 패턴을 그대로 적용. Anthropic SDK에는 embeddings 엔드포인트 없음.
**How to avoid:** Voyage AI HTTP API 직접 호출 또는 `voyageai` npm 패키지 사용.
**Warning signs:** `client.embeddings` 타입 오류.

### Pitfall 2: pgvector 차원 불일치

**What goes wrong:** `embedding vector(1536)` 컬럼에 `voyage-4-lite`의 1024차원 벡터 삽입 시 오류.
**Why it happens:** OpenAI text-embedding-3-small (1536)과 Voyage AI (1024) 차원이 다름.
**How to avoid:** migration에서 `vector(1024)` 명시. 임베딩 함수 인자도 동일하게.
**Warning signs:** `ERROR: different vector dimensions` PostgreSQL 오류.

### Pitfall 3: SGIS accessToken 만료

**What goes wrong:** 4시간 후 토큰 만료 → API 403.
**Why it happens:** SGIS token TTL = 4시간. GitHub Actions job이 10시간 이상 걸리면 만료.
**How to avoid:** `accessTimeout` epoch 값 확인 후 잔여 시간 < 30분이면 토큰 재발급. 단, 분기 적재는 6지역 × 2 API = 12 calls → 수 분 이내 완료. 실질 문제 없음.
**Warning signs:** `errCd != 0` + `errMsg: '인증 오류'`.

### Pitfall 4: CHECK constraint 변경 후 기존 row 영향 착각

**What goes wrong:** `event_type` CHECK 수정 후 기존 `'impression'`, `'click'` 레코드가 깨질 것을 우려.
**Why it happens:** PostgreSQL CHECK constraint는 INSERT/UPDATE 시에만 검증. 기존 row는 영향 없음.
**How to avoid:** migration 전 문서화만 하면 됨. DROP + ADD constraint 순서 정확히 유지.

### Pitfall 5: `stream.toReadableStream()` 없는 구버전 SDK

**What goes wrong:** 구버전 Anthropic SDK에서 `toReadableStream` 미존재.
**Why it happens:** 0.95.1 기준으로는 존재. 구버전(< 0.20)은 없음.
**How to avoid:** `npm install @anthropic-ai/sdk@latest`. `package.json` 버전 고정 후 검증.

### Pitfall 6: `revalidate = 86400`이 갭 라벨에 적용됨

**What goes wrong:** 매물가 갱신 후 24시간 동안 갭 라벨 미반영.
**Why it happens:** `complexes/[id]/page.tsx`의 `revalidate = 86400` 전체 페이지 적용.
**How to avoid:** 이는 의도된 동작 (D-12 기준). ISR이므로 on-demand revalidation으로 즉시 반영 가능. 매물가 admin 등록 시 `revalidatePath('/complexes/[id]')` 추가 고려.

---

## Code Examples

### 기존 패턴 재사용

**admin auth guard pattern (기존 `/admin/ads/page.tsx` 동일):**

```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login?next=/admin/ads')

const { data: profile } = await supabase
  .from('profiles').select('role').eq('id', user.id).single()
if (!['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
  redirect('/')
}
const adminClient = createSupabaseAdminClient()
```

**서비스 어댑터 구조 (`src/services/sgis.ts`):**
`molit.ts`와 동일 구조: `z.object` 스키마 → `fetch` + timeout → `safeParse` → typed return.

**Upstash Redis 두 번째 limiter:**
`src/lib/ratelimit.ts` 파일에 `adClickDailyLimit` export 추가. 기존 `adEventRatelimit` 삭제 없이 공존.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@anthropic-ai/sdk` | AD-02, DIFF-03 | ✗ (미설치) | — | `npm install @anthropic-ai/sdk` |
| `voyageai` (npm) | DIFF-03 임베딩 | ✗ (미설치) | — | Voyage HTTP API 직접 호출 |
| Anthropic API Key | AD-02, DIFF-03 | 미확인 | — | `ANTHROPIC_API_KEY` 환경변수 설정 필요 |
| Voyage AI API Key | DIFF-03 | 미확인 | — | `VOYAGE_API_KEY` 환경변수 설정 필요 |
| SGIS API Key | DATA-06 | 미확인 | — | `SGIS_CONSUMER_KEY`, `SGIS_CONSUMER_SECRET` 설정 필요 |
| pgvector extension | DIFF-03 | ✓ (Supabase 기본 포함) | — | — |
| Upstash Redis | AD-01 | ✓ (기존 사용 중) | — | — |
| Supabase Storage | AUTH-01 (L3) | ✓ (기존 사용 중) | — | — |

**Missing dependencies (blocking):**
- `@anthropic-ai/sdk`: `npm install @anthropic-ai/sdk` Wave 0에서 설치
- Voyage AI API key: 신규 계정 발급 필요 (voyageai.com)
- SGIS API key: 통계청 개발자 센터 신청 필요

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 창원시 5개 구 + 김해시 SGIS adm_cd 코드 (48121 등) | SGIS DATA-06 | 잘못된 코드로 API 호출 시 0건 반환. 구현 전 stage API로 검증 |
| A2 | `transactions` 테이블에 `price_per_py` 컬럼 존재 | 갭 라벨 | 없으면 `(price / exclu_use_ar * 3.3058)` 계산 필요 |
| A3 | `profiles` 테이블에 `gps_badge_level` 컬럼 추가 가능 | GPS L2/L3 | 기존 profiles schema 충돌 시 별도 테이블 필요 |
| A4 | Voyage AI 무료 티어 10M tokens/월로 초기 전체 임베딩 가능 | DIFF-03 | 단지 3000개 초과 시 유료 전환 필요 |
| A5 | `stream.toReadableStream()` Anthropic SDK 0.95.1에 존재 | DIFF-03 | 없으면 수동 ReadableStream 구성 필요 |

---

## Open Questions

1. **`transactions.price_per_py` 컬럼 존재 여부**
   - 확인 방법: `SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'`
   - 없으면 갭 라벨 쿼리에서 `(price / exclu_use_ar * 3.3058)` on-the-fly 계산

2. **SGIS 정확한 adm_cd 코드**
   - 확인 방법: SGIS 계정 발급 후 stage API 호출 또는 adm_code.xls 다운로드
   - URL: `https://sgis.kostat.go.kr/upload/census/adm_code.xls`

3. **Voyage AI 계정 발급 타임라인**
   - voyageai.com 즉시 발급 (이메일 가입 후 API key 즉시)
   - 무료 티어: 10M tokens/월

4. **pgvector `vector` 타입 schema 인식**
   - Supabase의 `extensions.vector` vs `vector` 네임스페이스
   - 검색 함수의 인자 타입은 `extensions.vector(1024)`로 통일

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config | `vitest.config.ts` (기존) |
| Quick run | `npm run test` |
| Full suite | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DATA-05 | 갭 라벨 계산 (높음/낮음/null) | unit | `npm run test -- gap-label` | ❌ Wave 0 |
| AD-01 | 전환 이벤트 기록 | unit | `npm run test -- ad-events` | ❌ Wave 0 |
| AD-01 | 이상 트래픽 10회 초과 시 is_anomaly=true | unit (mock Redis) | `npm run test -- anomaly` | ❌ Wave 0 |
| AD-02 | Claude API 응답 JSON 파싱 | unit (mock API) | `npm run test -- ad-copy-review` | ❌ Wave 0 |
| DATA-06 | district_stats 조회 | integration | `npm run test -- district-stats` | ❌ Wave 0 |
| DIFF-03 | RAG 봇 응답 (mock pgvector) | unit | `npm run test -- chat-complex` | ❌ Wave 0 |
| AUTH-01 | L2 배지 업그레이드 (30일 3회) | unit | `npm run test -- gps-badge` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `src/lib/data/gap-label.test.ts` — 갭 계산 null handling
- [ ] `src/app/api/ads/events/route.test.ts` — conversion 이벤트 + anomaly flag
- [ ] `src/app/api/admin/ad-copy-review/route.test.ts` — Claude API mock
- [ ] `src/app/api/chat/complex/route.test.ts` — Voyage AI + Claude mock

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `createSupabaseServerClient()` auth guard (기존 패턴) |
| V4 Access Control | yes | admin route handler에 role check. GPS 배지는 본인만 upgrade |
| V5 Input Validation | yes | zod로 body 파싱. copy 텍스트 길이 제한 (500자) |
| V6 Cryptography | no | 해당 없음 |
| V9 Communications | yes | Voyage AI, SGIS, Claude API HTTPS only. API key 환경변수만 |

| Threat Pattern | STRIDE | Mitigation |
|----------------|--------|------------|
| Prompt injection via ad copy | Tampering | 시스템 프롬프트로 역할 고정. 사용자 입력은 단순 분류 대상 |
| GPS 좌표 위조 | Spoofing | 서버에서 단지 좌표와 ±100m PostGIS 거리 검증 |
| 과도한 Claude API 호출 | DoS | 어드민 전용 엔드포인트. 일반 유저 접근 불가. Rate limit 추가 고려 |
| ad_events 대량 삽입 | DoS | 기존 분당 100회 rate limit 유지. 일별 10회 anomaly 감지 추가 |
| Storage 파일 악성코드 | Tampering | L3 서류 파일: private 버킷. 어드민만 접근. 파일 타입 whitelist (PDF, JPG, PNG) |

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Embeddings Docs](https://platform.claude.com/docs/en/build-with-claude/embeddings) — "Anthropic does not offer its own embedding model" 확인. Voyage AI 권장.
- [Anthropic SDK TypeScript 0.95.1](https://www.npmjs.com/package/@anthropic-ai/sdk) — 최신 버전 확인
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/api/streaming) — `messages.stream()` + `toReadableStream()` 패턴
- [SGIS Census API](https://sgis.mods.go.kr/developer/html/newOpenApi/api/dataApi/census.html) — 인구/세대 엔드포인트 확인
- [SGIS Auth Docs](https://sgis.mods.go.kr/developer/html/openApi/api/intro.html) — consumer_key/secret → accessToken 교환
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector) — `create extension vector` + `<=>` operator
- [Upstash Ratelimit Algorithms](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms) — `slidingWindow(10, '24 h')` 패턴
- [Voyage AI Models](https://platform.claude.com/docs/en/build-with-claude/embeddings) — `voyage-4-lite`, 1024 dim, 최신 세대

### Secondary (MEDIUM confidence)
- 기존 `src/lib/ratelimit.ts` — Upstash 기존 패턴 확인
- 기존 `src/services/molit.ts`, `kapt.ts` — 서비스 어댑터 패턴 확인
- 기존 `/api/ads/events/route.ts` — IP hash + admin client 패턴 확인
- 기존 `/admin/ads/page.tsx` — admin auth guard 패턴 확인

### Tertiary (LOW confidence)
- SGIS adm_cd 코드 값 (48121 등) — 국토부 sgg_code 패턴 유추. 실제 확인 필요.

---

## Metadata

**Confidence breakdown:**
- 갭 라벨: HIGH — 기존 테이블 사용, 신규 인프라 없음
- AD-01 전환/이상감지: HIGH — 기존 패턴 확장
- AD-02 Claude 카피 검토: HIGH — SDK 확인, 패턴 명확
- SGIS 적재: MEDIUM — API 구조 확인, adm_cd 코드 미검증
- DIFF-03 RAG 봇: MEDIUM — Voyage AI 임베딩 전환 결정 (CONTEXT.md 수정 사항)
- GPS L2/L3: MEDIUM — 설계 명확, profiles schema 영향 미확인

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (Voyage AI/Anthropic SDK 업데이트 주기 고려)
