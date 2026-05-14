---
phase: 09-complex-detail-ux
plan: "03"
subsystem: complex-detail-ui
tags: [facility-card, parking, elevator, building-count, isr, ux-03]
dependency_graph:
  requires:
    - "00"  # facility_kapt.building_count 컬럼 마이그레이션
  provides:
    - facility_kapt 시설 카드 D-06 주차 표시 (세대당 N.N대)
    - facility_kapt 시설 카드 D-07 엘리베이터 표시 (동당 N대)
    - src/lib/utils/facility-format.ts (09-01 병렬 실행 중 선제 생성 — Deviation Rule 3)
  affects:
    - /complexes/[id] 시설 카드 렌더링
tech_stack:
  added: []
  patterns:
    - RSC facilityKapt as unknown 타입 캐스팅 패턴 (Supabase generic return)
    - ISR revalidate = 86400 보존 (searchParams prop 미추가)
key_files:
  created:
    - src/lib/utils/facility-format.ts
  modified:
    - src/app/complexes/[id]/page.tsx
decisions:
  - "building_count null fallback: elevatorCount만 있을 때 '${elevatorCount}대' 단순 표시 (동당 prefix 없음)"
  - "동수 항목 별도 행 추가 (buildingCount != null 조건): 단지 규모 추가 정보 노출"
  - "facility-format.ts 선제 생성: 09-01 병렬 실행 중 미완료 시 빌드 블록 방지 (Deviation Rule 3)"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-05-14"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
---

# Phase 9 Plan 03: 시설 카드 주차/엘리베이터 D-06/D-07 표시 개선 Summary

시설 카드 주차대수를 "세대당 1.2대 (총 840면)", 엘리베이터를 "동당 2대 (총 12대, 6동)" 형식으로 변경. ISR(revalidate=86400) 완전 보존.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | facility-format 유틸 import + 주차/엘리베이터 표시 변경 | DONE | 4ecf7ee |

## What Was Built

### Task 1: 시설 카드 UX 개선

**변경 1 — import 추가 (page.tsx line 26):**
```typescript
import { formatParkingPerUnit, formatElevatorPerBuilding } from '@/lib/utils/facility-format'
```

**변경 2 — 환산값 사전 계산 (facilityKapt 선언 직후):**
```typescript
const parkingPerUnit = formatParkingPerUnit(
  (facilityKapt as { parking_count?: number | null } | null)?.parking_count ?? null,
  complex.household_count,
)
const elevatorCount = (facilityKapt as { elevator_count?: number | null } | null)?.elevator_count ?? null
const buildingCount = (facilityKapt as { building_count?: number | null } | null)?.building_count ?? null
const elevatorPerBuilding = formatElevatorPerBuilding(elevatorCount, buildingCount)
```

**변경 3 — 주차대수 항목 (D-06):**
```typescript
value: parkingPerUnit != null
  ? `세대당 ${parkingPerUnit}대 (총 ${(facilityKapt.parking_count as number).toLocaleString()}면)`
  : (facilityKapt.parking_count != null ? `총 ${facilityKapt.parking_count.toLocaleString()}면` : null)
```

**변경 4 — 동수 항목 추가:**
```typescript
{ label: '동수', value: buildingCount != null ? `${buildingCount}동` : null }
```

**변경 5 — 엘리베이터 항목 (D-07):**
```typescript
value: (() => {
  if (elevatorCount == null) return null
  if (elevatorPerBuilding != null && buildingCount != null) {
    return `동당 ${elevatorPerBuilding}대 (총 ${elevatorCount}대, ${buildingCount}동)`
  }
  return `${elevatorCount}대`
})()
```

**ISR 보존 확인:**
- `export const revalidate = 86400` 유지 (line 27)
- Props 인터페이스: `params: Promise<{ id: string }>` — searchParams 미추가
- TypeScript 컴파일: `tsc --noEmit` 오류 없음 (page.tsx 관련)
- Next.js 빌드: "Compiled successfully in 34.4s" — 타입/컴파일 통과

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] facility-format.ts 선제 생성**
- **Found during:** Task 1 시작 — 09-01 병렬 실행 중 `src/lib/utils/facility-format.ts` 미존재
- **Issue:** `import { formatParkingPerUnit, formatElevatorPerBuilding }` 추가 시 빌드 실패 위험
- **Fix:** 09-01 PLAN Task 2에서 정의된 동일 인터페이스로 `facility-format.ts` 선제 생성
- **Files modified:** `src/lib/utils/facility-format.ts` (신규)
- **Commit:** 26cbb0c (실제로는 management-cost.ts만 포함 — facility-format.ts는 09-01 62c0b5f에서 먼저 커밋됨)
- **결과:** 09-01이 62c0b5f에서 이미 동일 내용으로 커밋 완료. 중복이지만 내용 일치 확인.

## Known Stubs

없음. 모든 값이 실제 DB 데이터(facility_kapt.parking_count, elevator_count, building_count, complexes.household_count)로 계산됨.

## Threat Flags

없음.
- T-9-07(DoS via ISR 파괴): searchParams prop 미추가 확인 — `params: Promise<{ id: string }>` 시그니처 변경 없음
- T-9-06(Tampering): facility_kapt RLS public read만 가능 — 변조 위험 없음

## Self-Check: PASSED

- [x] src/app/complexes/[id]/page.tsx 수정 완료
- [x] src/lib/utils/facility-format.ts 존재 (09-01 또는 09-03 경유)
- [x] formatParkingPerUnit 2회 이상 (import + 호출)
- [x] formatElevatorPerBuilding 2회 이상 (import + 호출)
- [x] building_count 참조 존재
- [x] export const revalidate = 86400 유지
- [x] searchParams prop 미추가 확인
- [x] '세대당 ${parkingPerUnit}대' 표현식 존재
- [x] '동당 ${elevatorPerBuilding}대' 표현식 존재
- [x] Commit 4ecf7ee: page.tsx 변경
- [x] TypeScript noEmit 오류 없음 (page.tsx 관련)
