---
phase: 09-complex-detail-ux
plan: "01"
subsystem: data-layer
tags: [iqr, period-filter, area-groups, facility-format, management-cost, pure-functions, tdd]
dependency_graph:
  requires: ["09-00"]
  provides: ["09-02", "09-03"]
  affects: []
tech_stack:
  added: []
  patterns: ["IQR outlier detection", "period slice filter", "area grouping by rounding", "seasonal average aggregation"]
key_files:
  created:
    - src/lib/utils/iqr.ts
    - src/lib/utils/period-filter.ts
    - src/lib/utils/area-groups.ts
    - src/lib/utils/facility-format.ts
  modified:
    - src/lib/data/complex-detail.ts
    - src/lib/data/management-cost.ts
decisions:
  - "IQR Q1/Q3 인덱스를 floor(n*0.25)/floor(n*0.75)로 구현 — 배열 길이와 무관하게 안전"
  - "filterByPeriod cutoff 비교를 ISO string 사전순으로 처리 — Date 객체 생성 최소화"
  - "extractAreaGroups는 Map 기반으로 O(n) 그룹화 후 sort — 메모리 효율"
  - "getSeasonalAverages 구현은 병렬 실행 에이전트(09-03)가 먼저 커밋 — 내용 일치 확인 후 Task 3 완료 처리"
metrics:
  duration: "316s"
  completed: "2026-05-14T02:36:46Z"
  tasks_completed: 3
  files_changed: 6
---

# Phase 9 Plan 01: 데이터 레이어 + 순수 유틸리티 함수 Summary

Wave 0 RED 테스트(iqr.test.ts 4건 + phase9-ux.test.ts 13건)를 GREEN으로 전환한 데이터 레이어 유틸리티 구현. IQR 이상치 분류, 기간 슬라이스, 평형 그룹화, 시설 포맷터, RPC 래퍼, 계절 관리비 집계 6개 모듈을 신규 작성하거나 기존 파일에 추가.

## Task 결과

| Task | 이름 | 커밋 | 핵심 파일 |
|------|------|------|-----------|
| 1 | IQR/기간필터/평형그룹 유틸리티 | 231ca06 | iqr.ts, period-filter.ts, area-groups.ts |
| 2 | facility-format + getComplexRawTransactions | 62c0b5f | facility-format.ts, complex-detail.ts |
| 3 | getSeasonalAverages | 26cbb0c (09-03 에이전트) | management-cost.ts |

## 테스트 결과

```
Tests: 17 passed (17)
  iqr.test.ts: 4 passed
  phase9-ux.test.ts: 13 passed
    - filterByPeriod (UX-01): 3
    - extractAreaGroups (UX-02): 3
    - parking/elevator (UX-03): 4
    - getSeasonalAverages (UX-04): 3
```

## 구현된 함수 시그니처

### src/lib/utils/iqr.ts
```typescript
export interface PricePoint { yearMonth: string; price: number; area: number }
export interface IqrResult { normal: PricePoint[]; outliers: PricePoint[] }
export function computeIqrOutliers(points: PricePoint[]): IqrResult
```

### src/lib/utils/period-filter.ts
```typescript
export type PeriodKey = '1y' | '3y' | '5y' | 'all'
export function filterByPeriod<T extends { dealDate: string }>(points: T[], period: PeriodKey, now?: Date): T[]
```

### src/lib/utils/area-groups.ts
```typescript
export function extractAreaGroups<T extends { area: number }>(points: T[]): number[]
export function filterByArea<T extends { area: number }>(points: T[], targetArea: number): T[]
```

### src/lib/utils/facility-format.ts
```typescript
export function formatParkingPerUnit(parkingCount: number | null, householdCount: number | null): string | null
export function formatElevatorPerBuilding(elevatorCount: number | null, buildingCount: number | null): string | null
```

### src/lib/data/complex-detail.ts (추가)
```typescript
export interface RawTransaction { dealDate: string; yearMonth: string; price: number; area: number }
export async function getComplexRawTransactions(complexId: string, dealType: 'sale' | 'jeonse', supabase: SupabaseClient, months?: number): Promise<RawTransaction[]>
```

### src/lib/data/management-cost.ts (추가)
```typescript
export interface SeasonalAverages { summerAvg, winterAvg, summerPerUnit, winterPerUnit, summerCount, winterCount }
export function getSeasonalAverages(rows: ManagementCostRow[], householdCount: number | null): SeasonalAverages
```

## 기존 함수 보존 확인

- getComplexById: 변경 없음
- getComplexTransactionSummary: 변경 없음
- getManagementCostMonthly: 변경 없음

## Deviations from Plan

### 병렬 실행 에이전트에 의한 Task 3 선행 커밋

**발견:** Task 3 커밋 시도 시 `nothing to commit` — management-cost.ts가 이미 09-03 에이전트에 의해 커밋됨

**커밋:** 26cbb0c (feat(09-03): facility-format.ts — formatParkingPerUnit / formatElevatorPerBuilding 유틸)

**처리:** 내용 확인 결과 SeasonalAverages 인터페이스와 getSeasonalAverages 함수가 플랜 스펙과 동일하게 구현되어 있음. 테스트 17건 모두 GREEN 확인. Task 3 완료 처리.

## Known Stubs

없음 — 모든 함수가 실제 로직을 구현. UI 컴포넌트 없음 (Wave 2 담당).

## Threat Flags

없음 — 신규 네트워크 엔드포인트 없음. getComplexRawTransactions는 기존 RPC 래퍼이며 서버 전용.

## Self-Check

파일 존재 확인:
- src/lib/utils/iqr.ts: FOUND
- src/lib/utils/period-filter.ts: FOUND
- src/lib/utils/area-groups.ts: FOUND
- src/lib/utils/facility-format.ts: FOUND
- src/lib/data/complex-detail.ts (RawTransaction + getComplexRawTransactions): FOUND
- src/lib/data/management-cost.ts (SeasonalAverages + getSeasonalAverages): FOUND

커밋 존재 확인:
- 231ca06: FOUND
- 62c0b5f: FOUND

테스트: 17 passed (17)

## Self-Check: PASSED
