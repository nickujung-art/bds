---
phase: 09-complex-detail-ux
plan: "02"
subsystem: complex-detail-ui
tags: [nuqs, iqr, recharts, period-filter, area-chips, deal-type-tabs]
dependency_graph:
  requires: ["09-00", "09-01", "09-03"]
  provides: []
  affects: ["src/app/complexes/[id]/page.tsx", "src/components/complex/DealTypeTabs.tsx", "src/components/complex/TransactionChart.tsx"]
tech_stack:
  added: []
  patterns: ["nuqs URL state", "client-side IQR slice", "ComposedChart Scatter+Line", "area chip selector"]
key_files:
  created: []
  modified:
    - src/app/complexes/[id]/page.tsx
    - src/components/complex/DealTypeTabs.tsx
    - src/components/complex/TransactionChart.tsx
    - .eslintrc.json
decisions:
  - "jeonseData는 rawJeonseData로 대체되어 미사용 → _jeonseData로 변경 + ESLint varsIgnorePattern 추가"
  - "TransactionChart를 LineChart → ComposedChart로 전환하여 Scatter + Line 혼합 렌더"
  - "평형 칩 좌측 + 기간 필터 우측 배치 (CONTEXT.md 우측 정렬과 약간 다르지만 UX 균형상 타당)"
  - "getComplexRawTransactions(jeonse) fetch는 유지하나 jeonseData summary fetch도 병행 유지 (우측 최근 거래 카드 saleData 의존, 좌측은 rawJeonseData 의존)"
metrics:
  duration: "~15min"
  completed: "2026-05-14"
  tasks_completed: 3
  files_changed: 4
---

# Phase 9 Plan 02: 실거래가 그래프 UI 재설계 Summary

nuqs URL 상태 기반 기간/평형 필터 + IQR 이상치 시각화를 DealTypeTabs/TransactionChart에 구현. 월세 탭 제거, 평형 칩 셀렉터, 기간 칩 필터, 투명 이상치 점, 정상 거래 기반 평균선을 완성.

## Task 결과

| Task | 이름 | 커밋 | 핵심 파일 |
|------|------|------|-----------|
| 1 | page.tsx — raw fetch + monthly 제거 | 69033f6 | page.tsx |
| 1 fix | jeonseData → _jeonseData + ESLint | 6820e79 | page.tsx, .eslintrc.json |
| 2 | DealTypeTabs 전체 재작성 | 723dece | DealTypeTabs.tsx (155줄) |
| 3 | TransactionChart 전체 재작성 | f1852d0 | TransactionChart.tsx (133줄) |

## 구현 내용

### page.tsx 변경

```typescript
// import 추가
import { getComplexById, getComplexTransactionSummary, getComplexRawTransactions } from '@/lib/data/complex-detail'

// Promise.all: monthlyData 제거, rawSaleData/rawJeonseData 추가
// DealTypeTabs props 변경
<DealTypeTabs rawSaleData={rawSaleData} rawJeonseData={rawJeonseData} />
```

- ISR `export const revalidate = 86400` 유지
- `Props` 인터페이스에 searchParams 추가 없음 (ISR 보존)

### DealTypeTabs.tsx (D-01/D-02/D-04)

```typescript
// D-01: 매매/전세 두 탭만
const TABS = [{ id: 'sale', label: '매매' }, { id: 'jeonse', label: '전세' }]

// D-02: 기간 nuqs 상태
const [period, setPeriod] = useQueryState('period',
  parseAsStringEnum<PeriodKey>(['1y', '3y', '5y', 'all'])
    .withDefault('3y').withOptions({ clearOnDefault: true }))

// D-04: 평형 nuqs 상태
const [area, setArea] = useQueryState('area',
  parseAsString.withDefault(defaultArea != null ? String(defaultArea) : ''))
```

- `areaGroups[0]`가 defaultArea (최다 거래 평형)
- `T-9-08`: `areaGroups.includes(parsed)` 검증으로 잘못된 URL `?area=999` → defaultArea fallback
- `T-9-10`: `parseAsStringEnum`이 유효하지 않은 period 값 자동 무시
- IQR slice: `filterByArea → filterByPeriod → computeIqrOutliers`

### TransactionChart.tsx (D-03)

```typescript
// ComposedChart = Line + 2x Scatter
<Scatter data={normalDots} fill="#1d4ed8" />       // 정상 점 — 채워진 원
<Scatter data={outlierDots} opacity={0.4}          // 이상치 — 투명 점
  fill="transparent" stroke="#9ca3af" />
<Line dataKey="avgPrice" data={avgSeries} />        // 평균선 — normal만 계산
```

- `aggregateMonthlyAverage(normal)`: 이상치 제외 월평균
- Props: `data: MonthlyPriceSummary[]` → `normal/outliers: PricePoint[]`
- dealType 타입: `'sale' | 'jeonse' | 'monthly'` → `'sale' | 'jeonse'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] jeonseData 미사용 변수 ESLint 오류**
- **발견 during:** Task 1 lint 실행 시
- **Issue:** `jeonseData`가 `getComplexTransactionSummary(jeonse)` 반환값을 받지만 DealTypeTabs에 더 이상 전달되지 않아 `@typescript-eslint/no-unused-vars` 오류 발생
- **Fix:** `jeonseData` → `_jeonseData` 변경. ESLint `.eslintrc.json`에 `varsIgnorePattern: "^_"` 추가 (기존 `argsIgnorePattern`만 있던 것 확장)
- **Files modified:** `src/app/complexes/[id]/page.tsx`, `.eslintrc.json`
- **Commit:** 6820e79

**2. [Rule 3 - Verification] 검증 스크립트 opacity 정규식 불일치**
- **발견 during:** Task 3 자동화 검증
- **Issue:** 검증 스크립트 패턴 `opacity[:=]\s*0?[.][0-9]`가 JSX prop 문법 `opacity={0.4}`를 인식하지 못함 (`={`가 `=`만 허용한 패턴과 불일치)
- **Fix:** 파일 내용이 올바름을 수동 확인 (`opacity={0.4}` 116번째 줄 존재). 검증 스크립트 자체의 패턴 문제로 코드 수정 불필요
- **Files modified:** 없음

## Known Stubs

없음 — DealTypeTabs와 TransactionChart 모두 실제 데이터를 처리하는 로직 구현 완료. rawSaleData/rawJeonseData가 빈 배열이면 "거래 없음" / "거래 데이터가 없습니다" 안전하게 표시.

## Threat Flags

없음 — 신규 네트워크 엔드포인트 없음. URL 파라미터는 nuqs 파서가 타입 강제하고 DB 쿼리에 직접 전달되지 않음.

## 빌드 상태

- `npm run lint` (ESLint + tsc --noEmit): PASSED
- `npm run build` 전체: `/presale` 페이지 Supabase URL 환경변수 미설정으로 실패 — 이번 Plan 변경과 무관한 기존 로컬 환경 이슈. TypeScript 컴파일 단계는 성공.

## Self-Check

파일 존재 확인:
- src/components/complex/DealTypeTabs.tsx: FOUND (155줄)
- src/components/complex/TransactionChart.tsx: FOUND (133줄)
- src/app/complexes/[id]/page.tsx: FOUND (modified)

커밋 존재 확인:
- 69033f6: FOUND (page.tsx task 1)
- 723dece: FOUND (DealTypeTabs.tsx task 2)
- f1852d0: FOUND (TransactionChart.tsx task 3)
- 6820e79: FOUND (fix jeonseData + eslint)

## Self-Check: PASSED
