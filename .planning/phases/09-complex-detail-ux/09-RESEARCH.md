# Phase 9: 단지 상세 UX 고도화 — Research

**Researched:** 2026-05-14
**Domain:** Next.js 15 RSC + Recharts + nuqs + Supabase RPC — 단지 상세 페이지 UX 개선
**Confidence:** HIGH (모든 핵심 사항 코드베이스 직접 검증)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** [LOCKED]: 월세 탭 제거. 매매/전세 두 탭만 유지.
- **D-02** [LOCKED]: 기간 필터 `1년/3년/5년/전체`, 기본값 `3년`. URL 파라미터 `?period=1y|3y|5y|all` (nuqs 사용).
- **D-03** [LOCKED]: IQR × 1.5 이상치 시각화. 제거 아닌 **투명/회색 점 구분** 표시. 평균선에서는 이상치 제외. hover 시 tooltip 안내.
- **D-04** [LOCKED]: 평형 칩 셀렉터. 전용면적(㎡) 기준, 동적 생성, 기본값 최다 거래 평형. URL 파라미터 `?area=84` (nuqs). 위치: 차트 헤더 위.
- **D-05** [LOCKED]: 평형 필터 적용 범위 — 실거래가 그래프 + 실거래 목록만. 관리비는 단지 전체 합계만 유지.
- **D-06** [LOCKED]: 주차 표시 → `총주차대수 ÷ 세대수` "세대당 N.N대" 형식.
- **D-07** [LOCKED]: 엘리베이터 표시 → `총엘리베이터수 ÷ 동수` "동당 N대" 형식. `building_count` 유무 사전 확인 필요 (없으면 fallback 처리).
- **D-08** [LOCKED]: 관리비 계절별 표시. 상세 항목 내역 제거. 하절기(6~9월)/동절기(10~3월) 월평균 비교. 4개월 이상 데이터 있을 때만 표시. 세대당 평균만.
- **D-09** [LOCKED]: 거래 데이터 fetch: client-side slice 방식. 관리비 fetch limit=6 유지.

### Claude's Discretion

- 평형 칩 컴포넌트 위치 및 스타일 (CLAUDE.md AI 슬롭 금지 준수)
- IQR 계산 함수 위치 (`src/lib/` 유틸리티)
- 관리비 계절 집계 로직 위치 (컴포넌트 내부 vs 데이터 레이어)
- `building_count` 없을 경우 fallback (null → 엘리베이터 동당 항목 숨김)
- 기간 필터 기본값 3년인 경우 `?period=3y`를 URL에 명시할지 생략할지

### Deferred Ideas (OUT OF SCOPE)

- `[전체]` 평형 탭 (모든 평형 색상 구분 차트) — v2로 defer
- 학군 정보 섹션 — facility_school 데이터 미적재
- 관리비 평형별 정확한 분리 — K-apt 원천 데이터 한계
- 신고가/조회수 핀 표시

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-01 | 실거래가 그래프 — 월세 탭 제거 + 기간 필터(1년/3년/5년/전체) + IQR 이상치 투명 점 표시 | DealTypeTabs 수정 + nuqs period 파라미터 + IQR 유틸리티 신규 작성 + 개별 거래 fetch RPC 필요 |
| UX-02 | 실거래가·관리비 평형별 필터 — 전용면적 기준 칩 셀렉터(nuqs URL 상태), 기본값 최다 거래 평형 | nuqs area 파라미터 + 평형 목록 추출 RPC 또는 client-side 집계 |
| UX-03 | 시설 정보 표시 개선 — 주차 세대당 대수(총주차÷세대수) + 엘리베이터 동당 대수(총엘리베이터÷동수) | facility_kapt.parking_count + elevator_count 확인 완료. building_count 미존재 → 마이그레이션 또는 fallback |
| UX-04 | 관리비 계절별 표시 — 상세내역 제거 + 하절기/동절기 월평균 + 세대당 평균 | management_cost_monthly limit=6 유지. 계절 집계 로직 컴포넌트 내 순수 함수로 처리 |

</phase_requirements>

---

## Summary

Phase 9는 `/complexes/[id]` 단지 상세 페이지의 4개 섹션을 실수요자 관점으로 개선한다. 코드베이스 전체 검증 결과 대부분 결정이 기존 인프라로 구현 가능하나, **한 가지 핵심 블로커**가 있다: IQR 이상치 계산은 월별 집계(avgPrice)가 아닌 **개별 거래 데이터**가 필요한데, 현재 `complex_monthly_prices` RPC는 월별 평균만 반환한다. 이를 해결하려면 (a) 새 RPC 함수를 작성하거나, (b) 기존 RPC에 `area_m2` 필터 파라미터를 추가하거나, (c) 원시 거래 행을 직접 쿼리하는 방식 중 하나를 선택해야 한다.

두 번째 구조적 발견: `building_count` (동수) 필드가 **어디에도 없다**. `kaptBasicInfoSchema`에 `kaptDongCnt` 필드가 존재하지만 DB에 저장하는 컬럼이 없다. D-07 구현을 위해 `complexes` 또는 `facility_kapt` 테이블에 마이그레이션이 필요하며, 없을 경우 D-07 항목을 숨기는 null fallback이 대안이다. CONTEXT.md D-07에서 이미 "없으면 마이그레이션 또는 K-apt 재적재"로 명시되어 있으며, Claude's Discretion에 "null → 엘리베이터 동당 항목 숨김"이 허용되어 있다.

nuqs 2.8.9가 설치되어 있고 `NuqsAdapter`가 layout.tsx에 이미 래핑되어 있다. RSC에서는 `createSearchParamsCache`/`parseAsString`, 클라이언트 컴포넌트에서는 `useQueryState`가 기존 패턴이다.

**Primary recommendation:** Wave 0에서 DB 마이그레이션 (building_count 컬럼 + area 필터 RPC) 먼저 수행 후, Wave 1에서 UI 4개 섹션을 병렬 구현한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 기간 필터 URL 상태 (period=) | Browser / Client | Frontend Server (SSR) | nuqs useQueryState (client), createSearchParamsCache (RSC) |
| 평형 칩 URL 상태 (area=) | Browser / Client | Frontend Server (SSR) | 동일 nuqs 패턴 |
| 평형별 거래 데이터 필터링 | Browser / Client | — | D-09 결정: fetch once + client-side slice |
| IQR 이상치 계산 | Browser / Client | — | 순수 유틸리티 함수 (src/lib/utils/iqr.ts), 데이터는 RSC에서 fetch 후 props 전달 |
| 평형 목록 추출 (칩 동적 생성) | Browser / Client | — | 전체 데이터에서 client-side 집계 (fetch once) |
| 시설 카드 주차/엘리베이터 계산 | Frontend Server (RSC) | — | 단순 산술 (÷), 데이터는 이미 RSC에서 fetch |
| 관리비 계절 집계 | Browser / Client | — | 컴포넌트 내 순수 함수 (입력: ManagementCostRow[]) |
| DB RPC (complex_monthly_prices + 신규 area 필터) | Database / Storage | API / Backend | Supabase SQL function |

---

## Standard Stack

### Core (이미 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nuqs | 2.8.9 | URL 상태 관리 (period, area 파라미터) | 프로젝트에 이미 설치 + NuqsAdapter 래핑 완료 |
| recharts | 3.8.1 | 실거래가 차트 (LineChart, Dot) | 기존 TransactionChart에서 사용 중 |
| next.js | 15.3.1 | App Router RSC + searchParams | 프로젝트 기반 |
| supabase-js | 2.105.1 | DB 쿼리 + RPC 호출 | 프로젝트 기반 |
| vitest | 2.1.9 | 단위 테스트 | 기존 테스트 인프라 |

### 추가 설치 불필요

Phase 9는 신규 패키지 설치 없이 기존 스택으로 구현 가능하다.

**Version verification:** [VERIFIED: package.json 직접 확인]

---

## Architecture Patterns

### System Architecture Diagram

```
URL ?period=3y&area=84
         │
         ▼
[RSC: complexes/[id]/page.tsx]
  ├─ createSearchParamsCache(period, area) → initialPeriod, initialArea
  ├─ getComplexById(id) → complex (household_count, floors_above 등)
  ├─ getComplexRawTransactions(id, 'sale') → RawTransaction[] (area_m2, price, yearMonth)
  ├─ getComplexRawTransactions(id, 'jeonse') → RawTransaction[]
  ├─ getManagementCostMonthly(id, limit=6) → ManagementCostRow[] (unchanged)
  └─ facility_kapt 쿼리 → { parking_count, elevator_count } (+ building_count if added)
         │
         ▼ props
[Client: DealTypeTabs (modified)]
  ├─ useQueryState('period', parseAsString) → 기간 필터 상태
  ├─ useQueryState('area', parseAsString) → 평형 필터 상태
  ├─ 평형 목록 추출: extractAreaGroups(rawData) → ['59', '84', '109']
  ├─ 기간 slice: filterByPeriod(rawData, period) → filtered[]
  ├─ 평형 slice: filterByArea(filtered, area) → areaFiltered[]
  ├─ IQR 계산: computeMonthlyIqrSeries(areaFiltered) → { normal[], outlier[] }
  └─ TransactionChart (modified) → normal: filled dot, outlier: opacity 0.3 dot
         │
         ▼
[Client: ManagementCostCard (modified)]
  └─ computeSeasonalAverages(rows, householdCount) → { summer, winter }
         │
         ▼
[RSC inline: 시설 카드]
  └─ parking_count / household_count → "세대당 N.N대"
     elevator_count / building_count → "동당 N대" (building_count null → 숨김)
```

### Recommended Project Structure

```
src/
├── lib/
│   └── utils/
│       └── iqr.ts              # IQR 계산 순수 유틸리티 (신규)
├── lib/data/
│   └── complex-detail.ts       # getComplexRawTransactions 추가 (또는 신규 파일)
├── components/complex/
│   ├── DealTypeTabs.tsx         # 수정: 월세 탭 제거 + period/area nuqs + 평형 칩
│   ├── TransactionChart.tsx     # 수정: IQR 이상치 점 렌더링
│   └── ManagementCostCard.tsx   # 수정: 계절별 표시로 교체
└── supabase/migrations/
    └── 20260514000001_phase9_ux.sql   # building_count 컬럼 + area 필터 RPC (신규)
```

### Pattern 1: nuqs URL 상태 (클라이언트 컴포넌트)

기존 `CompareAddButton.tsx` 패턴을 그대로 사용한다. [VERIFIED: src/components/complex/CompareAddButton.tsx]

```typescript
// Source: src/components/complex/CompareAddButton.tsx (기존 패턴)
'use client'
import { parseAsString, useQueryState } from 'nuqs'

export function DealTypeTabs({ rawSaleData, rawJeonseData, ... }: Props) {
  const [period, setPeriod] = useQueryState(
    'period',
    parseAsString.withDefault('3y'),
  )
  const [area, setArea] = useQueryState(
    'area',
    parseAsString.withDefault(''),
  )
  // ...
}
```

### Pattern 2: nuqs RSC 서버 파싱 (compare/page.tsx 패턴)

`page.tsx`의 `export const revalidate = 86400`가 유지되어야 하므로 URL 파라미터는 RSC에서 초기값을 읽어 클라이언트에 넘겨주는 방식이 필요하다. 그러나 `revalidate = 86400`이 설정된 ISR 페이지에서는 `searchParams`를 사용하면 dynamic rendering으로 전환되어 캐시가 깨진다.

**중요 아키텍처 결정:** 기간/평형 필터는 RSC searchParams를 읽지 않고 클라이언트에서만 처리한다. RSC는 전체 기간(120개월) 데이터를 fetch하고, 클라이언트 컴포넌트가 URL 상태 기반으로 slice한다. 이렇게 해야 `revalidate = 86400` ISR이 깨지지 않는다.

```typescript
// page.tsx: revalidate 유지, searchParams 읽지 않음
export const revalidate = 86400

// DealTypeTabs.tsx: 클라이언트에서만 URL 상태 관리
'use client'
const [period] = useQueryState('period', parseAsString.withDefault('3y'))
```

### Pattern 3: IQR 이상치 계산

```typescript
// Source: 순수 유틸리티 (신규 src/lib/utils/iqr.ts)
export interface PricePoint {
  yearMonth: string
  price: number
  area: number
}

export function computeIqrOutliers(points: PricePoint[]): {
  normal: PricePoint[]
  outliers: PricePoint[]
} {
  const prices = points.map(p => p.price).sort((a, b) => a - b)
  const q1 = prices[Math.floor(prices.length * 0.25)]!
  const q3 = prices[Math.floor(prices.length * 0.75)]!
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr
  return {
    normal:   points.filter(p => p.price >= lower && p.price <= upper),
    outliers: points.filter(p => p.price < lower || p.price > upper),
  }
}
```

### Pattern 4: Recharts 이상치 렌더링

Recharts `<Scatter>` 또는 `<Line>` + custom `<Dot>` 컴포넌트를 사용하여 이상치를 다른 스타일로 렌더링한다.

```typescript
// Source: recharts 문서 (custom Dot 패턴) [ASSUMED: 정확한 API는 Context7/공식 문서 확인 권장]
<Line
  dataKey="avgPrice"
  dot={(props) => {
    const isOutlier = props.payload?.isOutlier
    return <circle
      cx={props.cx} cy={props.cy} r={4}
      fill={isOutlier ? 'transparent' : '#1d4ed8'}
      stroke={isOutlier ? '#9ca3af' : '#1d4ed8'}
      opacity={isOutlier ? 0.4 : 1}
    />
  }}
/>
```

### Pattern 5: 관리비 계절 집계

```typescript
// Source: 코드베이스 분석 기반 (신규 순수 함수)
// ManagementCostRow.year_month: "YYYY-MM-01"
function getSeasonalAverages(rows: ManagementCostRow[], householdCount: number | null) {
  const summer = rows.filter(r => {
    const month = parseInt(r.year_month.slice(5, 7), 10)
    return month >= 6 && month <= 9
  })
  const winter = rows.filter(r => {
    const month = parseInt(r.year_month.slice(5, 7), 10)
    return month >= 10 || month <= 3
  })
  const avg = (subset: ManagementCostRow[]) => {
    if (subset.length === 0) return null
    const total = subset.reduce((sum, r) =>
      sum + (r.common_cost_total ?? 0) + (r.individual_cost_total ?? 0) + (r.long_term_repair_monthly ?? 0), 0)
    return Math.round(total / subset.length)
  }
  const summerAvg = avg(summer)
  const winterAvg = avg(winter)
  const summerPerUnit = summerAvg && householdCount ? Math.round(summerAvg / householdCount) : null
  const winterPerUnit = winterAvg && householdCount ? Math.round(winterAvg / householdCount) : null
  return { summerAvg, winterAvg, summerPerUnit, winterPerUnit,
           summerCount: summer.length, winterCount: winter.length }
}
```

### Anti-Patterns to Avoid

- **ISR 파괴**: `page.tsx`에서 `searchParams`를 읽으면 dynamic rendering으로 전환되어 `revalidate = 86400`이 무시된다. 기간/평형 파라미터는 클라이언트에서만 처리해야 한다.
- **월세 탭 유지**: `DealTypeTabs`의 `TABS` 배열에서 `monthly` 항목 제거 필수. `monthlyData` prop도 제거해야 하지만, `page.tsx`에서 `getComplexTransactionSummary(..., 'monthly')` fetch를 유지할지 제거할지 결정 필요 (제거하면 Promise.all 최적화).
- **평균 데이터로 IQR 계산**: 현재 `MonthlyPriceSummary.avgPrice`는 월별 평균이므로 IQR 의미 없음. 개별 거래 데이터가 필요하다 (핵심 블로커 참조).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL 상태 동기화 | 커스텀 useSearchParams 훅 | `nuqs useQueryState` | 이미 설치됨. SSR hydration 처리 내장 |
| IQR 계산 | 새 npm 패키지 | 순수 TS 함수 (< 20줄) | 외부 의존성 불필요한 단순 산술 |
| 차트 | 커스텀 SVG | recharts (이미 설치) | 이미 TransactionChart에서 사용 중 |

---

## Critical Blocker: IQR를 위한 개별 거래 데이터

### 문제

현재 `complex_monthly_prices` RPC는 월별 집계(avgPrice, count, avgArea)만 반환한다. IQR 이상치를 계산하려면 동일 월 내 개별 거래 가격이 필요하다.

### 옵션 비교

| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A) 신규 RPC: complex_raw_transactions** | 개별 거래 행 반환 (area_m2, price, deal_date) | 완전한 이상치 계산 가능 | 마이그레이션 필요, 응답 크기 증가 |
| **B) 기존 RPC 확장: area 필터 파라미터 추가** | p_area_min, p_area_max 파라미터 추가 | 평형 필터 + 집계를 DB에서 처리 | IQR 계산에 개별 데이터 여전히 부재 |
| **C) 직접 테이블 쿼리** | `transactions` 테이블 직접 SELECT | 마이그레이션 불필요 | KAPT RLS 없음, 응답 크기 큰 경우 있음 |

**권장 접근 (Claude's Discretion 범위):** 옵션 A + B 조합. 새 RPC `complex_transactions_for_chart`를 작성하여 개별 거래 행 반환 + area 필터 지원. 이 RPC는 RSC에서 호출하고 클라이언트로 전달한다. IQR 계산은 클라이언트에서 수행한다.

```sql
-- 신규 RPC: 개별 거래 행 (area 필터 선택적)
create or replace function public.complex_transactions_for_chart(
  p_complex_id uuid,
  p_deal_type  text,
  p_months     int default 120,
  p_area_m2    numeric default null  -- null이면 전체
) returns table (
  deal_date text,
  year_month text,
  price     numeric,
  area_m2   numeric
) language sql stable as $$
  select
    deal_date::text,
    to_char(deal_date, 'YYYY-MM') as year_month,
    price::numeric,
    area_m2
  from public.transactions
  where
    complex_id     = p_complex_id
    and deal_type  = p_deal_type::public.deal_type
    and deal_date  >= (now() - (p_months || ' months')::interval)::date
    and cancel_date    is null
    and superseded_by  is null
    and (p_area_m2 is null or round(area_m2) = round(p_area_m2))
  order by deal_date asc
$$;
```

---

## DB 스키마 검증 결과 (VERIFIED)

### facility_kapt 현재 컬럼 [VERIFIED: migrations 직접 확인]

| 컬럼 | 타입 | 출처 마이그레이션 | 상태 |
|------|------|-------------------|------|
| `parking_count` | integer | 20260430000004_facility.sql | 존재함 |
| `elevator_count` | integer | 20260513000001_facility_kapt_elevator.sql | 존재함 |
| `management_type` | text | 20260513000002_facility_kapt_management_type.sql | 존재함 |
| `management_cost_m2` | integer | 20260430000004_facility.sql | 존재함 |
| `data_month` | date | 20260430000004_facility.sql | 존재함 |

### complexes 테이블 관련 컬럼 [VERIFIED: 20260430000002_complexes.sql]

| 컬럼 | 상태 | Phase 9 용도 |
|------|------|-------------|
| `household_count` | 존재함 | 세대당 주차/관리비 계산 기준 |
| `total_parking` | **없음** | — |
| `building_count` | **없음** | D-07 구현 불가 → 마이그레이션 필요 또는 숨김 fallback |

### building_count 현황 [VERIFIED: 전체 migrations + scripts 검색]

- `kaptBasicInfoSchema`에 `kaptDongCnt` (동수) 필드가 정의됨 [VERIFIED: src/services/kapt.ts:71]
- 그러나 `kapt-enrich.ts` 또는 `kapt-facility-enrich.ts` 어디서도 `kaptDongCnt`를 DB에 저장하지 않음
- `complexes` 및 `facility_kapt` 테이블 모두에 해당 컬럼 없음
- **결론:** D-07 구현을 위해 `facility_kapt.building_count` 컬럼 추가 마이그레이션 + `kapt-facility-enrich.ts` 스크립트 업데이트가 필요하거나, Claude's Discretion에 따라 `building_count = null`이면 "동당 N대" 항목 숨김 처리

### transactions 테이블 [VERIFIED: 20260430000003_transactions.sql]

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `area_m2` | numeric(6,2) | 전용면적 — 평형 그룹화 기준 |
| `price` | bigint | 거래가(만원) — IQR 대상 |
| `deal_date` | date | 기간 필터 기준 |
| `deal_type` | deal_type enum | 매매/전세/월세 |
| `cancel_date` | date | `IS NULL` 필수 |
| `superseded_by` | bigint | `IS NULL` 필수 |

---

## 현재 구현 현황 상세 분석 (VERIFIED)

### DealTypeTabs.tsx [VERIFIED: src/components/complex/DealTypeTabs.tsx]

- `'use client'` 컴포넌트
- `useState`로 탭 상태 관리 (로컬 — URL 없음)
- 현재 3개 탭: `sale`, `jeonse`, `monthly`
- **변경 필요:** monthly 탭 제거 + nuqs period/area 상태 추가 + 평형 칩 추가

### TransactionChart.tsx [VERIFIED: src/components/complex/TransactionChart.tsx]

- `recharts` LineChart 사용
- `dataKey="avgPrice"` — 월별 평균 단일 선
- `dot={false}` — 현재 마커 없음
- **변경 필요:** IQR 이상치 점 렌더링을 위해 dot 커스터마이즈 + 데이터 구조 변경

### page.tsx fetch 구조 [VERIFIED: src/app/complexes/[id]/page.tsx]

- `export const revalidate = 86400` (ISR)
- Promise.all 13개 병렬 fetch
- 현재 `getComplexTransactionSummary(id, 'monthly', supabase)` 포함
- **변경:** monthly fetch 제거 가능. 신규 raw transactions fetch 추가 시 Promise.all 재구성

### getComplexTransactionSummary [VERIFIED: src/lib/data/complex-detail.ts]

- `complex_monthly_prices` RPC 호출, `p_months=120` (기본값)
- 반환 타입: `MonthlyPriceSummary[]` (yearMonth, avgPrice, count, avgArea)
- **한계:** 개별 거래 데이터 없음 → IQR 계산 불가

### getManagementCostMonthly [VERIFIED: src/lib/data/management-cost.ts]

- `management_cost_monthly` 테이블 쿼리, `limit(6)`, `order('year_month', desc)`
- 반환: 최신 6개월 데이터
- **계절 분류 가능성:** 6개월 데이터로 하절기(6~9월)와 동절기(10~3월)가 혼재할 수 있음. 예: 최근 6개월이 1월~6월이면 동절기 5개월 + 하절기 1개월. D-08 "4개월 이상 데이터 있을 때만 표시" 조건으로 신뢰성 확보.
- **limit 확장 여부:** D-09 "limit=6 유지"로 잠금됨.

### nuqs 패턴 [VERIFIED: src/app/layout.tsx, CompareAddButton.tsx, compare/page.tsx]

- `NuqsAdapter` → `src/app/layout.tsx`에서 래핑됨 (전체 앱 지원)
- 클라이언트: `useQueryState(key, parser)` 패턴
- 서버(RSC): `createSearchParamsCache({ key: parser })` → `.parse(searchParams)` 패턴
- 단, ISR(`revalidate = 86400`) + searchParams 병용 금지 (dynamic rendering 강제)

---

## Common Pitfalls

### Pitfall 1: ISR 파괴 — searchParams in RSC

**What goes wrong:** `page.tsx`에서 `searchParams` prop을 읽으면 Next.js가 dynamic rendering으로 강제 전환되어 `export const revalidate = 86400`이 무시된다.
**Why it happens:** Next.js는 request-time 데이터(searchParams)가 있으면 정적/ISR 캐시 불가.
**How to avoid:** `period`, `area` 파라미터를 RSC에서 읽지 않는다. 클라이언트 컴포넌트(`DealTypeTabs`)에서 `useQueryState`로만 관리한다. RSC는 전체 기간 데이터를 fetch하고 클라이언트에서 slice.
**Warning signs:** `next build` 출력에서 `/complexes/[id]`가 `○ Static`이 아닌 `λ Dynamic`으로 표시됨.

### Pitfall 2: 월별 평균으로 IQR 계산

**What goes wrong:** `MonthlyPriceSummary.avgPrice`로 IQR을 계산하면 무의미하다. 월별 평균의 IQR은 "이상 거래"를 감지하지 못하고, 단순히 계절성 변동을 이상치로 분류할 수 있다.
**Why it happens:** 개발자가 기존 데이터 구조를 재사용하려다 발생.
**How to avoid:** `complex_transactions_for_chart` 신규 RPC 또는 직접 쿼리로 개별 거래 `price` 행을 가져온다. IQR은 같은 `year_month` 내 개별 거래 또는 전체 기간 데이터에서 계산.
**Warning signs:** 이상치 점이 거의 없거나 모든 점이 이상치로 표시됨.

### Pitfall 3: area_m2 정밀도로 평형 그룹화 실패

**What goes wrong:** `area_m2` 컬럼은 `numeric(6,2)` 타입으로 동일 평형이라도 `84.99`, `84.97`, `84.82` 등 다양한 값으로 저장됨. 정확한 값으로 그룹화하면 수십 개 평형이 생성됨.
**Why it happens:** 국토부 실거래 데이터의 면적 표기 정밀도 차이.
**How to avoid:** `ROUND(area_m2)` 또는 `FLOOR(area_m2 / 5) * 5` 방식으로 반올림 그룹화. 클라이언트에서는 `Math.round(transaction.area_m2)`로 그룹 키 생성. 표시는 `84㎡` 형식.
**Warning signs:** 평형 칩이 20개 이상 생성됨.

### Pitfall 4: 관리비 계절 분류 — 6개월 창(window) 한계

**What goes wrong:** `limit=6` 최신 6개월 데이터만 있을 때, 현재 월이 4월이면 데이터는 11월~4월. 이 경우 하절기(6~9월) 데이터 없음 → 비교 불가.
**Why it happens:** D-09 "limit=6 유지" + 계절 분류 로직 충돌.
**How to avoid:** D-08의 "4개월 이상 데이터 있을 때만 표시" 조건 구현. `summerCount >= 1 && winterCount >= 1`일 때만 계절 비교 표시, 아니면 월별 추이(현재 UI 유지)로 fallback.
**Warning signs:** 항상 "계절 데이터 부족" 메시지만 표시.

### Pitfall 5: nuqs 기본값 URL 기록

**What goes wrong:** `parseAsString.withDefault('3y')`으로 설정된 기간 필터가 기본값 `3y`일 때도 `?period=3y`를 URL에 추가해 URL이 불필요하게 길어짐.
**Why it happens:** nuqs의 `withDefault` 설정과 URL 명시 여부는 별개.
**How to avoid:** CONTEXT.md Claude's Discretion — "기본값 3년인 경우 `?period=3y`를 URL에 명시할지 생략할지"는 플래너 결정. nuqs의 `clearOnDefault(true)` 옵션 또는 기본값 시 URL 파라미터 제거 패턴 사용.

---

## Code Examples

### 기존 nuqs 클라이언트 패턴 (verbatim)

```typescript
// Source: src/components/complex/CompareAddButton.tsx [VERIFIED]
'use client'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'

const [ids, setIds] = useQueryState(
  'ids',
  parseAsArrayOf(parseAsString).withDefault([]),
)
```

### 기존 nuqs 서버 패턴 (verbatim)

```typescript
// Source: src/app/compare/page.tsx [VERIFIED]
import { createSearchParamsCache, parseAsArrayOf, parseAsString } from 'nuqs/server'

const searchParamsCache = createSearchParamsCache({
  ids: parseAsArrayOf(parseAsString).withDefault([]),
})

// RSC에서:
const { ids: rawIds } = searchParamsCache.parse(await searchParams)
```

### facility_kapt 현재 쿼리 패턴 (verbatim)

```typescript
// Source: src/app/complexes/[id]/page.tsx [VERIFIED]
supabase
  .from('facility_kapt')
  .select('*')
  .eq('complex_id', id)
  .order('data_month', { ascending: false })
  .limit(1)
  .maybeSingle()
```

### 세대당 주차 계산 패턴

```typescript
// Source: CONTEXT.md D-06 [VERIFIED 계산 방식]
const parkingPerUnit = facilityKapt?.parking_count && complex.household_count
  ? (facilityKapt.parking_count / complex.household_count).toFixed(1)
  : null
// 표시: parkingPerUnit ? `세대당 ${parkingPerUnit}대 (총 ${facilityKapt.parking_count.toLocaleString()}면)` : '-'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nuqs v1 (별도 어댑터 불필요) | nuqs v2 (`NuqsAdapter` 필수) | nuqs 2.0 | `NuqsAdapter`가 layout.tsx에 이미 있음 — 추가 설정 불필요 |
| Recharts v2 API | Recharts v3 API (`recharts@3.8.1`) | Recharts 3.0 | 일부 prop 변경 가능성 — Context7/공식 문서 확인 권장 [ASSUMED] |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recharts 3.x에서 custom `dot` prop이 function 형태로 동작한다 | Code Examples | dot 렌더링 API가 변경됐다면 이상치 시각화 방식 수정 필요 |
| A2 | `revalidate = 86400` ISR 페이지에서 searchParams 읽으면 dynamic 강제 전환된다 | Pitfall 1 | Next.js 15에서 동작이 다를 수 있음 (PPR 관련) — 실제 build 결과로 확인 필요 |
| A3 | management_cost_monthly의 year_month 슬라이스 패턴 `dateStr.slice(5, 7)`로 월 추출 가능하다 | Code Examples | year_month가 "YYYY-MM-01" 형식임은 VERIFIED (migration + ManagementCostCard 기존 코드로 확인됨) — HIGH confidence |

**A3은 VERIFIED로 분류 가능:** `ManagementCostCard.tsx`의 `fmtMonth` 함수에서 `dateStr.slice(0, 7)`를 사용하고 있어 형식 확인됨.

---

## Open Questions (RESOLVED)

1. **building_count 추가 방식**
   - What we know: `kaptDongCnt` 필드가 `kaptBasicInfoSchema`에 존재하나 DB에 없음. `kapt-enrich.ts`는 `complexes` 테이블 상세정보를 채우고, `kapt-facility-enrich.ts`는 `facility_kapt`를 채움.
   - What's unclear: `building_count`를 `complexes`에 넣을지 `facility_kapt`에 넣을지.
   - RESOLVED: `facility_kapt.building_count` 컬럼 추가 (09-00-PLAN.md Task 1 마이그레이션). `kapt-facility-enrich.ts`에서 `kaptDongCnt` 저장 추가 (09-00-PLAN.md Task 2). 데이터가 없는 기존 단지는 null → 엘리베이터 동당 항목 숨김 처리 (09-03-PLAN.md).

2. **IQR 계산 단위 (거래 전체 vs 월 단위)**
   - What we know: CONTEXT.md D-03 "그래프 선(평균선)에서는 이상치 제외". 이상치는 평균 계산에서 빼고 점으로만 표시.
   - What's unclear: IQR을 전체 기간 데이터로 계산할지, 분기별/연도별로 계산할지.
   - RESOLVED: 전체 기간 데이터 기반 IQR 계산 채택 (09-01-PLAN.md iqr.ts 유틸리티). 분기별 IQR은 데이터가 적은 단지에서 의미없는 결과를 낼 수 있어 전체 기간 단일 IQR이 더 안정적임.

3. **페이지 revalidate 유지 여부**
   - What we know: `export const revalidate = 86400`. nuqs의 `useQueryState`는 클라이언트에서만 작동.
   - What's unclear: Next.js 15의 PPR(Partial Prerendering) 환경에서 동작 변화 가능성.
   - RESOLVED: `page.tsx`에서 `searchParams`를 읽지 않음으로써 ISR(`revalidate = 86400`) 유지 확정 (09-02-PLAN.md 아키텍처). `period`, `area` 파라미터는 클라이언트 컴포넌트 `DealTypeTabs`의 `useQueryState`로만 관리.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| nuqs | D-02, D-04 URL 상태 | ✓ | 2.8.9 (package.json 확인) | — |
| recharts | UX-01 차트 개선 | ✓ | 3.8.1 (package.json 확인) | — |
| Supabase local | 통합 테스트 | 선택적 | — | `describe.skipIf(!SKEY)` 패턴 사용 |
| vitest | 단위 테스트 | ✓ | 2.1.9 | — |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + happy-dom |
| Config file | `vitest.config.ts` (루트) |
| Quick run command | `npm run test -- --reporter=verbose src/__tests__/phase9-ux.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | IQR 이상치 계산 정확성 | unit | `npm run test -- src/lib/utils/iqr.test.ts` | Wave 0 |
| UX-01 | 기간 필터 client-side slice | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-02 | 평형 그룹 추출 (round 방식) | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-03 | 주차 세대당 계산 | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-04 | 계절별 평균 계산 | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-04 | limit=6 데이터 하절기/동절기 혼재 | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test -- src/__tests__/phase9-ux.test.ts src/lib/utils/iqr.test.ts -x`
- **Per wave merge:** `npm run test`
- **Phase gate:** `npm run lint && npm run build && npm run test` 통과 후 `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/utils/iqr.test.ts` — IQR 계산 유틸리티 단위 테스트 (UX-01)
- [ ] `src/__tests__/phase9-ux.test.ts` — 기간 필터 slice, 평형 그룹, 주차 계산, 계절 평균 (UX-01~04)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | facility_kapt, management_cost_monthly 모두 public read RLS 있음 |
| V5 Input Validation | yes | nuqs 파라미터 (period, area)는 클라이언트 display 전용 — DB 쿼리에 직접 전달되지 않음 |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| URL 파라미터 인젝션 (period, area) | Tampering | nuqs 파서가 타입 강제. DB 쿼리에 searchParams 직접 전달 없음 — client-side slice만 |
| XSS via 단지명 | Tampering | React 자동 이스케이프 — 별도 처리 불필요 |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: src/app/complexes/[id]/page.tsx] — 현재 단지 상세 RSC 전체 구조
- [VERIFIED: src/components/complex/DealTypeTabs.tsx] — 현재 탭 컴포넌트
- [VERIFIED: src/components/complex/TransactionChart.tsx] — 현재 차트 컴포넌트
- [VERIFIED: src/components/complex/ManagementCostCard.tsx] — 현재 관리비 카드
- [VERIFIED: src/lib/data/management-cost.ts] — ManagementCostRow 타입 + getManagementCostMonthly
- [VERIFIED: src/lib/data/complex-detail.ts] — getComplexTransactionSummary + MonthlyPriceSummary 타입
- [VERIFIED: supabase/migrations/20260430000002_complexes.sql] — complexes 테이블 스키마
- [VERIFIED: supabase/migrations/20260430000003_transactions.sql] — transactions 테이블 스키마 (area_m2 numeric(6,2) 확인)
- [VERIFIED: supabase/migrations/20260430000004_facility.sql] — facility_kapt 원본 스키마
- [VERIFIED: supabase/migrations/20260513000001_facility_kapt_elevator.sql] — elevator_count 컬럼 확인
- [VERIFIED: supabase/migrations/20260430000013_complex_detail_functions.sql] — complex_monthly_prices RPC 코드
- [VERIFIED: src/services/kapt.ts] — kaptBasicInfoSchema (kaptDongCnt 존재), kaptDetailInfoSchema
- [VERIFIED: scripts/kapt-facility-enrich.ts] — parking_count, elevator_count 저장 코드 (building_count 미저장 확인)
- [VERIFIED: src/app/layout.tsx] — NuqsAdapter 래핑 확인
- [VERIFIED: src/components/complex/CompareAddButton.tsx] — nuqs useQueryState 클라이언트 패턴
- [VERIFIED: src/app/compare/page.tsx] — nuqs createSearchParamsCache 서버 패턴
- [VERIFIED: package.json] — nuqs 2.8.9, recharts 3.8.1

### Secondary (MEDIUM confidence)
- [ASSUMED: A1] Recharts 3.x custom dot prop API — 공식 문서 확인 권장

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 모든 라이브러리 package.json 직접 확인
- Architecture: HIGH — 현재 코드베이스 전체 구조 검증, ISR 제약 파악
- DB 스키마: HIGH — migrations 직접 검증, building_count 부재 확인
- Pitfalls: HIGH — ISR 파괴, area_m2 정밀도, limit=6 계절 분류 모두 코드베이스 기반 도출
- Recharts dot API: MEDIUM — 버전 특정 API는 공식 문서 미확인

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable stack)
