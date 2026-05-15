---
phase: 12-map-marker-cluster
plan: "01"
subsystem: map-markers
tags: [svg, marker, badge-logic, tdd, vitest]
dependency_graph:
  requires:
    - "11-03: BadgeMarker.tsx, ClusterMarker.tsx, ComplexMarker.tsx, KakaoMap.tsx"
    - "11-01: badge-logic.ts (기존 10종 구현)"
  provides:
    - "HouseMarker.tsx: 집 모양 SVG 마커 컴포넌트 (3종 색상 + hot 왕관)"
    - "badge-logic.ts: 3종 배지 판별 순수 함수 (단순화)"
  affects:
    - "12-02: DongClusterChip 클러스터 교체"
    - "12-03: ComplexMarker hover 툴팁 + 줌 레벨 정책"
tech_stack:
  added:
    - "@testing-library/react: 컴포넌트 단위 테스트"
  patterns:
    - "React.memo: 수백 개 CustomOverlayMap 동시 렌더링 최적화"
    - "인라인 SVG 집 모양: viewBox 0 0 40 48, 지붕+굴뚝+바디 C형+왕관"
key_files:
  created:
    - src/components/map/markers/HouseMarker.tsx
    - src/components/map/markers/HouseMarker.test.tsx
  modified:
    - src/components/map/markers/badge-logic.ts
    - src/components/map/markers/BadgeMarker.tsx
    - src/components/map/ComplexMarker.tsx
    - src/components/map/KakaoMap.tsx
    - src/lib/utils/badge-logic.test.ts
decisions:
  - "badge-logic 10종 → 4종(pre_sale/new_build/hot/none): crown=hot으로 통합, surge/drop/school/large_complex/redevelop 제거"
  - "getPriceColor 함수 badge-logic에서 분리: BadgeMarker.tsx와 ComplexMarker.tsx에 각각 로컬 함수로 이관"
  - "HouseMarker는 C형 바디를 path+rect 조합으로 구현 (오른쪽 8px 흰색 덮기)"
metrics:
  duration: "5분"
  completed_date: "2026-05-15"
  tasks_completed: 2
  files_changed: 9
---

# Phase 12 Plan 01: HouseMarker SVG 마커 + badge-logic 3종 단순화 Summary

집 모양 인라인 SVG 마커(HouseMarker)를 도입하고 배지 로직을 10종에서 3종(+none)으로 단순화했다.

## What Was Built

### badge-logic.ts 단순화

Phase 11의 10종 BadgeType(crown/hot/surge/drop/school/large_complex/redevelop 등)을 **4종**으로 단순화:

```typescript
export type BadgeType = 'pre_sale' | 'new_build' | 'hot' | 'none'
```

판별 우선순위: pre_sale > new_build > hot > none

- `getPriceColor` 함수 제거 (호출처인 BadgeMarker.tsx, ComplexMarker.tsx에 로컬 함수로 이관)
- `BadgeInput`에서 view_count/price_change_30d/hagwon_grade/household_count/p95_view_count 제거

### HouseMarker.tsx

집 모양 SVG 마커 컴포넌트:
- **3종 색상**: 일반/hot → 오렌지 바디(#F97316) + 회색 지붕(#9CA3AF), 분양 → 빨강(#EF4444), 신축 → 민트(#14B8A6)
- **SVG 구성**: 굴뚝(rect), 지붕(polygon), 바디 C형(path + 흰색 덮기), hot 왕관(g transform)
- **실거래가 라벨**: data-testid="price-label", formatPrice 함수(1억/만원 형식)
- **단지명**: showName=true 시 data-testid="complex-name"
- **React.memo** 적용

### HouseMarker.test.tsx (8개 테스트)

| # | 케이스 | 결과 |
|---|--------|------|
| 1 | badge=none → F97316 오렌지 | PASS |
| 2 | badge=pre_sale → EF4444 빨강 | PASS |
| 3 | badge=new_build → 14B8A6 민트 | PASS |
| 4 | badge=hot → FCD34D 왕관 | PASS |
| 5 | recentPrice=95000 → '9억 5,000만' | PASS |
| 6 | recentPrice=null → 가격 없음 | PASS |
| 7 | showName=true → 단지명 렌더 | PASS |
| 8 | showName=false → 단지명 없음 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getPriceColor 함수 이관**
- **Found during:** Task 1 구현 중 — BadgeMarker.tsx, ComplexMarker.tsx가 badge-logic에서 getPriceColor를 import 중이었으나 삭제됨
- **Fix:** 각 파일에 로컬 함수로 이관 (동일 로직, 복사)
- **Files modified:** src/components/map/markers/BadgeMarker.tsx, src/components/map/ComplexMarker.tsx
- **Commit:** b31aaa1

**2. [Rule 1 - Bug] KakaoMap.tsx p95ViewCount 참조 제거**
- **Found during:** Task 1 구현 중 — KakaoMap.tsx가 p95ViewCount를 계산하고 determineBadge에 전달하고 있었으나 view_count 필드가 BadgeInput에서 삭제됨
- **Fix:** p95ViewCount 계산 로직 제거, determineBadge 호출에서 관련 필드 제거
- **Files modified:** src/components/map/KakaoMap.tsx
- **Commit:** b31aaa1

**3. [Rule 1 - Bug] BadgeMarker.tsx switch문 오래된 타입 참조**
- **Found during:** TypeScript 컴파일 검증 — crown/surge/drop/school/large_complex/redevelop이 새 BadgeType에 존재하지 않음
- **Fix:** switch case에서 제거된 타입 케이스 삭제
- **Files modified:** src/components/map/markers/BadgeMarker.tsx
- **Commit:** b31aaa1

**4. [Rule 1 - Bug] badge-logic.test.ts 구버전 API 사용**
- **Found during:** Task 1 완료 후 기존 테스트 검토
- **Fix:** 구버전(10종) 테스트를 새 3종 API에 맞게 전면 재작성
- **Files modified:** src/lib/utils/badge-logic.test.ts
- **Commit:** b31aaa1

**5. [Rule 3 - Blocking] @testing-library/react 미설치**
- **Found during:** Task 2 테스트 실행 시 import 해결 실패
- **Fix:** npm install --save-dev @testing-library/react @testing-library/jest-dom
- **Commit:** b31aaa1 (package.json/package-lock.json 포함)

## Known Stubs

없음 — HouseMarker는 badge/recentPrice/showName/name을 직접 받아 렌더하는 완전한 컴포넌트.

## Threat Flags

없음 — 순수 표시 컴포넌트, 사용자 데이터 미포함. T-12-01/T-12-02 계획대로 accept.

## Self-Check: PASSED

- FOUND: src/components/map/markers/HouseMarker.tsx
- FOUND: src/components/map/markers/HouseMarker.test.tsx
- FOUND: src/components/map/markers/badge-logic.ts
- FOUND commit b31aaa1: feat(12-01): HouseMarker SVG 집 마커 + badge-logic 3종 단순화
