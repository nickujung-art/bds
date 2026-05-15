---
phase: 12-map-marker-cluster
plan: "03"
subsystem: map-data-tooltip
tags: [complexes-map, ComplexMarker, hover-tooltip, supercluster, transactions, zoom-policy]
dependency_graph:
  requires:
    - "12-01: HouseMarker.tsx, badge-logic.ts (3종 단순화)"
    - "11-00: transactions 테이블 cancel_date/superseded_by 컬럼"
    - "11-01: ComplexMapItem 기반 타입"
  provides:
    - "ComplexMapItem: si/gu/dong/recent_price/recent_date/recent_area_m2 포함 확장 타입"
    - "getComplexesForMap: transactions IN 쿼리 병렬 조회로 최근 3개월 거래 데이터 제공"
    - "ComplexMarker: HouseMarker 기반 hover 카드 툴팁 (단지명·시구·실거래·세대수·준공)"
  affects:
    - "12-02: DongClusterChip이 recent_price/si/gu/dong 필드 활용 가능"
    - "12-04: KakaoMap 줌 레벨 3단계 정책 이미 적용됨"
tech_stack:
  added: []
  patterns:
    - "IN 쿼리 + Map 집계: supercluster LATERAL JOIN 불가 우회 — 2-step 조회 후 Map<complex_id, tx> 병합"
    - "React.memo: ComplexMarker에 추가 — 수백 개 CustomOverlayMap 최적화"
    - "줌 레벨 3단계: level≥10 마커 숨김 / level7-9 가격만 / level≤6 이름+가격"
key_files:
  created: []
  modified:
    - src/lib/data/complexes-map.ts
    - src/components/map/ComplexMarker.tsx
    - src/components/map/KakaoMap.tsx
    - src/components/map/markers/BadgeMarker.tsx
    - src/__tests__/complexes-map.test.ts
decisions:
  - "avgSalePerPyeong prop 제거: ComplexMarker가 recentPrice(최근 실거래)를 직접 사용하므로 평당가 prop 불필요"
  - "줌 레벨 3단계 정책: KakaoMap에서 showLabel(level≤9) + showName(level≤6) + mapLevel≥10 마커 숨김 동시 구현"
  - "BadgeMarker.tsx dead code 제거: Phase 12-01 단순화 후 남겨진 CrownPin/SurgePin/DropPin/SchoolPin/LargeComplexPin/RedevelopPin 6개 함수 삭제 [Rule 1]"
metrics:
  duration: "20분"
  completed_date: "2026-05-15"
  tasks_completed: 2
  files_changed: 5
---

# Phase 12 Plan 03: ComplexMapItem 확장 + ComplexMarker hover 툴팁 카드 Summary

ComplexMapItem에 si/gu/dong/recent_price/recent_date/recent_area_m2를 추가하고, ComplexMarker hover 시 단지명·시구·최근 실거래·세대수·준공 카드를 표시하도록 개선했다. HouseMarker로 교체, 줌 레벨 3단계 정책 적용.

## What Was Built

### ComplexMapItem 타입 확장 (complexes-map.ts)

Phase 12 신규 필드 6개 추가:

```typescript
// Phase 12 추가 — hover 툴팁 + DongClusterChip
si:              string | null
gu:              string | null
dong:            string | null
recent_price:    number | null  // 만원 단위 — 최근 3개월 이내 거래 1건
recent_date:     string | null  // 'YYYY-MM-DD'
recent_area_m2:  number | null  // m² 단위
```

### getComplexesForMap 2-step 쿼리

Supabase JS client의 LATERAL JOIN 불가 제약으로 2단계 조회:

1. complexes SELECT에 `si, gu, dong` 추가
2. transactions IN 쿼리로 최근 3개월 거래 조회:
   - `cancel_date IS NULL AND superseded_by IS NULL` 필수 (CLAUDE.md 준수)
   - `gte('deal_date', threeMonthsAgoStr)` — MAP-08 3개월 요건
   - `order('deal_date', { ascending: false })` — 최신 거래 먼저
3. `Map<complex_id, tx>` 구성 후 첫 번째 행(최신)만 취해 ComplexMapItem에 merge

669개 complexes → 최대 669개 IN 쿼리 (Supabase .in() 1000개 한도 이내, 안전).

### buildClusterIndex 업데이트

properties에 si/gu/dong/recent_price/recent_date/recent_area_m2 추가 — DongClusterChip(Plan 12-02)이 클러스터에서 바로 접근 가능.

### ComplexMarker hover 툴팁 카드 (D-02 locked 레이아웃)

```
┌─────────────────────────┐
│ 용지아이파크             │  단지명 (fontWeight:700, #111827)
│ 창원시 성산구            │  si + gu (#6B7280, fontSize:11)
├─────────────────────────┤
│ 최근 실거래              │
│ 9억 9,500만             │  formatPrice(recentPrice)
│ 2026-04-29              │  recentDate
│ 25.6평                  │  recentAreaM2/3.3058
├─────────────────────────┤
│ 1,036세대 · 2017년       │  householdCount + builtYear
└─────────────────────────┘
```

- 스타일: `background:'white', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 12px', boxShadow:'0 4px 16px rgba(0,0,0,0.10)'`
- backdrop-blur 없음, gradient 없음 (CLAUDE.md 준수)
- React.memo 적용

### KakaoMap 줌 레벨 3단계 정책

```typescript
// level ≥ 10: DongClusterChip만 (마커 렌더 안 함)
// level 7~9:  HouseMarker + 가격 (단지명 없음)
// level ≤ 6:  HouseMarker + 단지명 + 가격
const showLabel = mapLevel <= 9
const showName  = mapLevel <= 6
if (mapLevel >= 10) return null  // 마커 숨김
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BadgeMarker.tsx unused SVG 함수 6개 제거**
- **Found during:** Task 2 — `npm run lint` 실행 시 발견
- **Issue:** Phase 12-01에서 badge-logic을 3종으로 단순화하면서 CrownPin/SurgePin/DropPin/SchoolPin/LargeComplexPin/RedevelopPin 함수가 switch 케이스에서 제거됐지만 함수 정의는 남아 있었음
- **Fix:** 6개 함수 정의 삭제 — BadgePin switch는 이미 pre_sale/new_build/hot/default만 처리하므로 무영향
- **Files modified:** src/components/map/markers/BadgeMarker.tsx
- **Commit:** b3f4f53

**2. [Rule 2 - Missing] ComplexMarker avgSalePerPyeong prop 제거**
- **Found during:** Task 2 설계 — recentPrice가 실거래 표시를 완전히 대체하므로 avgSalePerPyeong prop이 unused
- **Fix:** Props 인터페이스에서 avgSalePerPyeong 제거, KakaoMap 호출부도 동일하게 제거
- **Files modified:** src/components/map/ComplexMarker.tsx, src/components/map/KakaoMap.tsx
- **Commit:** b3f4f53

**3. [Rule 2 - Missing] complexes-map.test.ts BASE_COMPLEX 업데이트**
- **Found during:** Task 1 — `npx tsc --noEmit` 결과 complexes-map.test.ts에서 TS2345 오류 발생
- **Issue:** 기존 테스트의 BASE_COMPLEX가 새 ComplexMapItem 필드(si/gu/dong/recent_price/recent_date/recent_area_m2)를 포함하지 않아 타입 불일치
- **Fix:** BASE_COMPLEX에 6개 신규 필드 추가 (모두 null)
- **Files modified:** src/__tests__/complexes-map.test.ts
- **Commit:** bce805a

## Known Stubs

없음 — ComplexMapItem의 si/gu/dong은 DB에 실제 데이터가 있을 때 표시되고, recent_price/recent_date/recent_area_m2는 최근 3개월 거래가 없는 단지에서는 null로 표시되지 않는다. 툴팁 UI는 null 조건부 렌더링으로 완전히 처리됨.

## Threat Flags

없음 — T-12-06(transactions 쿼리) mitigate 완료: cancel_date IS NULL AND superseded_by IS NULL 필터 적용됨. T-12-05/T-12-07은 accept 처리.

## Self-Check: PASSED

- FOUND: src/lib/data/complexes-map.ts (si/gu/dong/recent_price/recent_date/recent_area_m2 포함)
- FOUND: src/components/map/ComplexMarker.tsx (HouseMarker, React.memo, E5E7EB, 3.3058)
- FOUND: src/components/map/KakaoMap.tsx (showLabel/showName/mapLevel≥10 마커 숨김)
- FOUND commit bce805a: feat(12-03): ComplexMapItem에 si/gu/dong/recent_price/recent_date/recent_area_m2 추가
- FOUND commit b3f4f53: feat(12-03): ComplexMarker hover 툴팁 카드 + HouseMarker 교체 + 줌 레벨 3단계 정책
