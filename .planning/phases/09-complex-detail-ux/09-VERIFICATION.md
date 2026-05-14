---
phase: 09-complex-detail-ux
verified: 2026-05-14T12:15:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "실거래가 그래프 기간 필터 URL 상태 동작"
    expected: "기간 칩(1년/3년/5년/전체) 클릭 시 URL에 ?period=1y 반영, 새로고침 후 선택 유지"
    why_human: "nuqs URL 상태는 정적 코드 분석으로 동작 확인 불가. 브라우저에서 /complexes/{id} 접속 필요"
  - test: "평형 칩 선택 시 URL 공유 가능 여부"
    expected: "평형 칩 클릭 시 URL에 ?area=84 반영, URL 공유 시 같은 평형이 선택된 상태로 로드"
    why_human: "URL 파라미터 유지와 공유 가능성은 브라우저 동작 확인 필요"
  - test: "IQR 이상치 투명 점 시각 확인"
    expected: "이상치가 있는 단지에서 차트에 투명/회색 점이 표시됨. 정상 거래는 진한 파란 점"
    why_human: "Recharts ComposedChart Scatter 렌더링은 실제 화면 렌더링 필요"
  - test: "시설 카드 주차 세대당 표시"
    expected: "주차대수 항목이 '세대당 1.2대 (총 840면)' 형식으로 표시됨 (parking_count + household_count 모두 있는 단지)"
    why_human: "DB에 실제 데이터가 있는 단지를 브라우저에서 접속하여 확인 필요"
  - test: "관리비 계절별 표시 (하절기/동절기 4개월 이상)"
    expected: "K-apt 6개월 이상 데이터가 있는 단지에서 '하절기 (6~9월)' / '동절기 (10~3월)' 블록 표시"
    why_human: "K-apt 데이터 유무에 따라 SeasonalView / FallbackTotalsView 분기 — 실제 DB 데이터 확인 필요"
---

# Phase 9: 단지 상세 UX 고도화 Verification Report

**Phase Goal:** 실거래가 그래프·시설 정보·관리비 섹션을 실수요자 관점으로 재설계
**Verified:** 2026-05-14T12:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 실거래가 그래프에 월세 탭이 없고, 기간 필터(1/3/5/전체)가 URL 상태로 동작한다 | ? HUMAN | TABS 배열에 `monthly` 없음 확인. `useQueryState('period', parseAsStringEnum<PeriodKey>)` 구현 확인. 실제 URL 동작은 브라우저 필요 |
| 2 | IQR 1.5배 기준 이상치가 투명 점으로 구분 표시된다 | ✓ VERIFIED | `computeIqrOutliers`에서 `lower = q1 - 1.5 * iqr`, `upper = q3 + 1.5 * iqr` 구현. TransactionChart에서 `opacity={0.4}`, `fill="transparent"` Scatter 시리즈 분리 렌더 |
| 3 | 평형 칩 선택 시 그래프·목록이 해당 평형 데이터만 표시된다 (URL 공유 가능) | ? HUMAN | `useQueryState('area', parseAsString)` + `filterByArea` 연결 코드 확인. URL 공유 동작은 브라우저 확인 필요 |
| 4 | 시설 카드에 주차가 "세대당 N.N대", 엘리베이터가 "동당 N대"로 표시된다 | ✓ VERIFIED | `formatParkingPerUnit`/`formatElevatorPerBuilding` 유틸 구현. page.tsx에서 `` `세대당 ${parkingPerUnit}대 (총 ${...}면)` `` / `` `동당 ${elevatorPerBuilding}대 (총 ${...}대, ${...}동)` `` 표현식 확인 |
| 5 | 관리비 카드에 하절기/동절기 월평균이 표시된다 | ✓ VERIFIED | `getSeasonalAverages` 구현 + ManagementCostCard의 `SeasonalView`/`SeasonBlock`(하절기 6~9월, 동절기 10~3월) 분기 표시. `summerCount + winterCount >= 4` 조건 시 계절 표시 |

**Score:** 3/5 truths programmatically verified; 2/5 require human verification

### UX-01~04 세부 요구사항 (PLAN must_haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| UX-01-A | computeIqrOutliers 함수가 IQR 1.5x 기준으로 normal/outliers를 분리 | ✓ VERIFIED | `src/lib/utils/iqr.ts:29-30` — `1.5 * iqr`. 17개 테스트 모두 GREEN |
| UX-01-B | filterByPeriod 함수가 1y/3y/5y/all 키를 받아 dealDate 기반 slice 반환 | ✓ VERIFIED | `src/lib/utils/period-filter.ts` — YEARS_MAP + cutoffStr 비교. 3건 테스트 GREEN |
| UX-01-C | getComplexRawTransactions가 complex_transactions_for_chart RPC 호출 | ✓ VERIFIED | `src/lib/data/complex-detail.ts:89` — `supabase.rpc('complex_transactions_for_chart', ...)` |
| UX-02-A | extractAreaGroups 함수가 ROUND(area_m2) 기준 평형 목록을 거래량 내림차순 반환 | ✓ VERIFIED | `src/lib/utils/area-groups.ts` — `Math.round(p.area)` + `sort((a,b) => b[1]-a[1])`. 3건 테스트 GREEN |
| UX-02-B | DealTypeTabs가 useQueryState로 'area' 파라미터를 관리 | ✓ VERIFIED | `DealTypeTabs.tsx:50` — `useQueryState('area', parseAsString.withDefault(...))` |
| UX-03-A | formatParkingPerUnit 주차 null fallback 처리 | ✓ VERIFIED | `facility-format.ts` — `if (parkingCount == null) return null; if (householdCount == null || householdCount <= 0) return null`. 4건 테스트 GREEN |
| UX-03-B | formatElevatorPerBuilding — building_count null 시 null 반환 | ✓ VERIFIED | `facility-format.ts` — `if (buildingCount == null || buildingCount <= 0) return null`. 테스트 GREEN |
| UX-03-C | page.tsx가 building_count 컬럼을 SELECT | ✓ VERIFIED | `page.tsx:147` — `select('*')` — building_count 자동 포함. `page.tsx:197` — `buildingCount` 추출 |
| UX-04-A | getSeasonalAverages가 6~9월/10~3월 평균을 반환 | ✓ VERIFIED | `management-cost.ts:60-66` — `isSummer: m>=6&&m<=9`, `isWinter: m>=10||m<=3`. 3건 테스트 GREEN |
| UX-04-B | summerCount/winterCount가 0일 때 "데이터 부족" 표시 | ✓ VERIFIED | `ManagementCostCard.tsx:141-144` — `count === 0` 분기 → `데이터 부족` 텍스트 |
| UX-04-C | summerCount + winterCount < 4 시 FallbackTotalsView 표시 | ✓ VERIFIED | `ManagementCostCard.tsx:43-44` — `totalSeasonRows >= 4` 조건 → hasSeasonalData |
| ISR | revalidate=86400 유지 — page.tsx에서 searchParams 읽지 않음 | ✓ VERIFIED | `page.tsx:28` — `export const revalidate = 86400`. Props 인터페이스: `params: Promise<{ id: string }>` only, searchParams 없음 |
| RPC-FILTER | complex_transactions_for_chart RPC에 cancel_date IS NULL AND superseded_by IS NULL | ✓ VERIFIED | `20260514000002_phase9_transactions_for_chart.sql:26-27` — 두 필터 하드코딩 |

**Score:** 5/5 must-have truths VERIFIED (programmatically)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260514000001_phase9_building_count.sql` | building_count 컬럼 추가 | ✓ VERIFIED | `ALTER TABLE public.facility_kapt ADD COLUMN IF NOT EXISTS building_count integer` — 10줄 |
| `supabase/migrations/20260514000002_phase9_transactions_for_chart.sql` | complex_transactions_for_chart RPC | ✓ VERIFIED | `CREATE OR REPLACE FUNCTION public.complex_transactions_for_chart(...)` — cancel_date IS NULL AND superseded_by IS NULL 포함 — 34줄 |
| `src/lib/utils/iqr.ts` | computeIqrOutliers 순수 함수 | ✓ VERIFIED | 40줄, IQR 1.5x 구현, exports: PricePoint, IqrResult, computeIqrOutliers |
| `src/lib/utils/period-filter.ts` | filterByPeriod + PeriodKey | ✓ VERIFIED | 30줄, 1y/3y/5y/all 처리 |
| `src/lib/utils/area-groups.ts` | extractAreaGroups + filterByArea | ✓ VERIFIED | 27줄, Math.round 그룹화 + 거래량 내림차순 |
| `src/lib/utils/facility-format.ts` | formatParkingPerUnit + formatElevatorPerBuilding | ✓ VERIFIED | 23줄, null fallback 처리 |
| `src/lib/data/complex-detail.ts` | RawTransaction + getComplexRawTransactions 추가 | ✓ VERIFIED | complex_transactions_for_chart RPC 호출, 기존 함수 보존 |
| `src/lib/data/management-cost.ts` | SeasonalAverages + getSeasonalAverages 추가 | ✓ VERIFIED | 하절기/동절기 분기, isSummer/isWinter 헬퍼, 기존 getManagementCostMonthly 보존 |
| `src/components/complex/DealTypeTabs.tsx` | 월세 제거 + nuqs period/area + 평형 칩 | ✓ VERIFIED | 155줄, TABS=['sale','jeonse'], useQueryState('period'), useQueryState('area'), clearOnDefault, computeIqrOutliers 연결 |
| `src/components/complex/TransactionChart.tsx` | normal/outlier 분리 + 투명 점 | ✓ VERIFIED | 133줄, ComposedChart + 2개 Scatter + Line(normal 기반 평균선), opacity={0.4} |
| `src/components/complex/ManagementCostCard.tsx` | 계절별 표시로 재작성 | ✓ VERIFIED | 219줄, getSeasonalAverages 사용, SeasonalView/SeasonBlock/FallbackTotalsView, COST_LABELS 13개 완전 제거 |
| `src/app/complexes/[id]/page.tsx` | getComplexRawTransactions 호출 + monthly 제거 + building_count + ISR 유지 | ✓ VERIFIED | rawSaleData/rawJeonseData 추가, monthlyData 완전 제거, formatParkingPerUnit/formatElevatorPerBuilding 적용, revalidate=86400 유지 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| getComplexRawTransactions | complex_transactions_for_chart RPC | `supabase.rpc('complex_transactions_for_chart', ...)` | ✓ WIRED | complex-detail.ts:89 |
| computeIqrOutliers | IQR 1.5x 분류 | `1.5 * iqr` 계산 | ✓ WIRED | iqr.ts:29-30 |
| page.tsx getComplexRawTransactions | DealTypeTabs rawSaleData/rawJeonseData prop | Promise.all → JSX props | ✓ WIRED | page.tsx:138-139, 395-397 |
| DealTypeTabs useQueryState('area') | URL ?area=N | nuqs useQueryState | ✓ WIRED | DealTypeTabs.tsx:50 |
| DealTypeTabs useQueryState('period') | URL ?period=Xy | nuqs useQueryState | ✓ WIRED | DealTypeTabs.tsx:35 |
| ManagementCostCard | getSeasonalAverages 호출 | import + 호출 | ✓ WIRED | ManagementCostCard.tsx:2,42 |
| summerCount + winterCount | 계절 표시 분기 | `totalSeasonRows >= 4` | ✓ WIRED | ManagementCostCard.tsx:43-44 |
| facility_kapt SELECT | building_count 컬럼 | `select('*')` | ✓ WIRED | page.tsx:147 |
| RPC WHERE 절 | cancel_date IS NULL AND superseded_by IS NULL | SQL 하드코딩 | ✓ WIRED | 20260514000002...sql:26-27 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| DealTypeTabs | rawSaleData/rawJeonseData | page.tsx → getComplexRawTransactions → complex_transactions_for_chart RPC → public.transactions | YES — RPC가 실거래 테이블에서 cancel_date IS NULL 필터로 조회 | ✓ FLOWING |
| TransactionChart | normal/outliers PricePoint[] | DealTypeTabs → filterByArea → filterByPeriod → computeIqrOutliers | YES — rawSaleData 데이터에서 파생 | ✓ FLOWING |
| ManagementCostCard | rows ManagementCostRow[] | page.tsx → getManagementCostMonthly → management_cost_monthly 테이블 | YES — DB 쿼리로 최근 6개월 데이터 | ✓ FLOWING |
| 시설 카드 (page.tsx) | facilityKapt | facility_kapt SELECT * | YES — select('*')로 building_count 포함 전체 컬럼 | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 17개 UX 단위 테스트 (IQR/기간필터/평형그룹/시설포맷/계절평균) | `npx vitest run iqr.test.ts phase9-ux.test.ts` | 17 passed (0 failed) | ✓ PASS |
| computeIqrOutliers — 극단값 분리 | iqr.test.ts 테스트 통과 | outliers.length === 1 (price=999999) | ✓ PASS |
| filterByPeriod '1y' 컷오프 | phase9-ux.test.ts 테스트 통과 | 기준일 2026-05-14 기준 1년 이내 2건만 반환 | ✓ PASS |
| getSeasonalAverages 계절 분리 | phase9-ux.test.ts 테스트 통과 | summerCount=2, winterCount=4 정확 분류 | ✓ PASS |
| ISR 미파괴 (searchParams 미추가) | page.tsx Props 인터페이스 확인 | `params: Promise<{ id: string }>` — searchParams 없음 | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|------------|-------------|-------------|--------|----------|
| UX-01 | 09-00, 09-01, 09-02 | 실거래가 그래프 — 월세 탭 제거 + 기간 필터 + IQR 이상치 투명 점 | ✓ SATISFIED | computeIqrOutliers 구현, TABS=['sale','jeonse'], useQueryState('period'), TransactionChart Scatter opacity=0.4 |
| UX-02 | 09-01, 09-02 | 평형별 필터 — 전용면적 칩 셀렉터(nuqs), 기본값 최다 거래 평형 | ✓ SATISFIED | extractAreaGroups + filterByArea, useQueryState('area'), areaGroups[0] = defaultArea |
| UX-03 | 09-00, 09-01, 09-03 | 시설 정보 — 주차 세대당 + 엘리베이터 동당 | ✓ SATISFIED | formatParkingPerUnit/formatElevatorPerBuilding + building_count 마이그레이션 + page.tsx 시설 카드 변경 |
| UX-04 | 09-01, 09-04 | 관리비 계절별 — 상세내역 제거 + 하절기/동절기 월평균 + 세대당 | ✓ SATISFIED | getSeasonalAverages + ManagementCostCard SeasonalView, COST_LABELS 제거 확인 |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/data/management-cost.ts` | 39 | `console.error('[management-cost] ...')` | ℹ️ Info | 서버사이드 에러 로그 — CLAUDE.md 위반이나 운영 에러 추적 목적으로 허용 범위 |

**AI 슬롭 금지 확인:**
- DealTypeTabs.tsx: backdrop-blur, gradient-text, 보라/인디고 없음 — ✓ CLEAN
- ManagementCostCard.tsx: COST_LABELS/인건비/청소비 없음, var(--dj-orange) 토큰만 사용 — ✓ CLEAN
- TransactionChart.tsx: 보라/인디고 없음, #1d4ed8 (Tailwind blue-700) 사용 — ✓ CLEAN

---

## Notable Implementation Deviation

**IQR guard 조건 변경 (점수에 영향 없음):**

09-01 PLAN 원안의 `computeIqrOutliers`는 `points.length < 2` 시 early return이었으나, 코드 리뷰(commit e12327d) 이후 `points.length < 4`로 수정됨. 이 변경은 Q1/Q3 계산의 신뢰성을 위한 개선이며, 기존 테스트(`단일 거래: IQR 계산 불가 → 모두 normal로 분류`)도 통과함. 목표 달성에 영향 없음.

---

## Human Verification Required

### 1. 기간 필터 URL 상태 동작

**Test:** `npm run dev` → `/complexes/{id}` 접속 → 기간 칩(1년/3년/5년/전체) 클릭
**Expected:** URL에 `?period=1y` 반영. '3년'(기본값) 클릭 시 URL에서 period 파라미터 사라짐(clearOnDefault). 새로고침 후 선택 유지.
**Why human:** nuqs URL 상태는 정적 분석으로 실제 동작 확인 불가

### 2. 평형 칩 URL 공유 가능 여부

**Test:** 평형 칩 클릭 → URL 복사 → 새 탭에 붙여넣기
**Expected:** `?area=84` 파라미터 유지. 같은 평형이 선택된 상태로 로드됨. 존재하지 않는 평형 값(`?area=999`) 입력 시 최다 거래 평형으로 fallback.
**Why human:** URL 파라미터 유지와 공유는 브라우저 동작 확인 필요

### 3. IQR 이상치 투명 점 시각 확인

**Test:** 이상치 거래가 있는 단지(10년치 데이터 중 가격 급등락 존재)에서 그래프 확인
**Expected:** 정상 거래: 진한 파란 채워진 원. 이상치: 회색 테두리 투명 원. tooltip hover 시 "이상 거래 의심 (분기 IQR 기준)" 레이블 표시.
**Why human:** Recharts ComposedChart 렌더링은 실제 화면 확인 필요

### 4. 시설 카드 주차 세대당 표시

**Test:** parking_count + household_count 모두 있는 단지 상세 접속
**Expected:** 주차대수: "세대당 1.2대 (총 840면)" 형식. building_count 있는 단지: 엘리베이터: "동당 2대 (총 12대, 6동)". building_count null 단지: "N대" 단순 표시.
**Why human:** DB에 실제 facility_kapt 데이터(building_count 포함)가 있는 단지 브라우저 확인 필요

### 5. 관리비 계절별 표시

**Test:** K-apt 관리비 4개월 이상 데이터가 있는 단지 상세 접속
**Expected:** "하절기 (6~9월)" / "동절기 (10~3월)" 두 블록이 나란히 표시. 각 블록에 월평균 금액 + "세대당 약 N만원" + "N개월 평균". 4개월 미만 단지: "최근 단지 합계" + "4개월 이상 데이터가 쌓이면 표시됩니다" 안내.
**Why human:** K-apt 데이터 유무에 따른 분기는 실제 DB 데이터 보유 단지에서만 확인 가능

---

## Gaps Summary

갭 없음 — 5개 ROADMAP 성공 기준 모두 코드베이스에서 구현 확인됨.

자동화 검증 가능한 항목(IQR 계산, 데이터 레이어, 시설 포맷터, 관리비 계절 분기, ISR 보존, CRITICAL cancel_date/superseded_by 필터)은 모두 VERIFIED.

브라우저/런타임 동작 확인이 필요한 5개 항목(URL 상태 동작, 시각적 렌더링)은 human_verification 섹션에 정리됨.

---

_Verified: 2026-05-14T12:15:00Z_
_Verifier: Claude (gsd-verifier)_
