---
phase: 12-map-marker-cluster
plan: "02"
subsystem: map-cluster-chip
tags: [cluster, dong, price, tdd, vitest, react-memo]
dependency_graph:
  requires:
    - "12-01: HouseMarker.tsx, badge-logic.ts (3종 단순화)"
    - "12-03: ComplexMapItem si/gu/dong/recent_price 필드 (buildClusterIndex properties)"
  provides:
    - "DongClusterChip.tsx: 구/동 이름 + 최고 실거래가 사각형 클러스터 칩 컴포넌트"
    - "DongClusterChip.test.tsx: 5개 케이스 TDD 검증"
  affects:
    - "12-04: KakaoMap.tsx에서 ClusterMarker → DongClusterChip 교체"
tech_stack:
  added: []
  patterns:
    - "React.memo: 수백 개 CustomOverlayMap 동시 렌더링 최적화"
    - "getLeaves(Infinity): 클러스터 leaves에서 구/동 이름 + 최고 실거래가 클라이언트 집계"
    - "TDD RED→GREEN: 테스트 먼저 작성 후 구현"
key_files:
  created:
    - src/components/map/DongClusterChip.tsx
    - src/components/map/DongClusterChip.test.tsx
  modified: []
decisions:
  - "구/동 이름은 첫 번째 leave의 gu 우선, 없으면 dong, 없으면 '기타' — 다수결보다 단순하고 일관"
  - "formatPrice 함수: man=0이면 '13억', man>0이면 '12억 5,000만' 형식 — CONTEXT.md 실거래가 표시 형식 준수"
  - "ClusterMarker handleClick 로직 복사: getLeaves → LatLngBounds → setBounds (동일 동작 보장)"
metrics:
  duration: "5분"
  completed_date: "2026-05-15"
  tasks_completed: 2
  files_changed: 2
---

# Phase 12 Plan 02: DongClusterChip 구/동 이름 + 최고 실거래가 사각형 클러스터 칩 Summary

숫자 원형 ClusterMarker를 대체하는 DongClusterChip을 TDD로 구현했다. 구/동 이름과 최근 최고 실거래가를 표시하는 흰 사각형 칩으로, 클릭 시 해당 클러스터 bounds로 줌인한다.

## What Was Built

### DongClusterChip.tsx

구/동 단위 사각형 클러스터 칩 컴포넌트:

- **React.memo** 적용 — 수백 개 CustomOverlayMap 동시 렌더링 최적화
- **useMap('DongClusterChip')** — 카카오 지도 인스턴스 획득
- **구/동 이름 추출**: `clusterIndex.getLeaves(clusterId, Infinity)`로 leaves 추출 → 첫 번째 leave의 `properties.gu` 우선, 없으면 `dong`, 없으면 `'기타'`
- **최고 실거래가**: leaves 전체의 `properties.recent_price`(만원) 중 최대값 집계 (모두 null이면 미표시)
- **formatPrice 함수**:
  - 1억 미만: `'9,500만'`
  - 1억, man=0: `'13억'`
  - 1억 이상, man>0: `'12억 5,000만'`
- **클릭 줌인**: ClusterMarker와 동일한 `LatLngBounds → map.setBounds()` 로직
- **스타일 (D-03 locked)**:
  - `background: 'white'`, `border: '1px solid #E5E7EB'`, `borderRadius: 6`
  - `padding: '8px 12px'`, `boxShadow: '0 4px 16px rgba(0,0,0,0.10)'`
  - 구/동 이름: `fontSize:12, fontWeight:700, color:'#111827'`
  - 가격: `fontSize:11, fontWeight:500, color:'#F97316'`
- **금지 패턴 없음**: backdrop-blur, gradient, glow, 이모지, 보라/인디고 색상

### DongClusterChip.test.tsx (5개 테스트)

| # | 케이스 | 결과 |
|---|--------|------|
| 1 | gu='성산구', recent_price=125000 → '성산구' + '12억 5,000만' | PASS |
| 2 | gu=null, dong='상남동', recent_price=85000 → '상남동' + '8억 5,000만' | PASS |
| 3 | recent_price=null → 가격 텍스트 없음 (구 이름만) | PASS |
| 4 | 3개 leaves (50000, 130000, 90000) → 최대값 '13억' 표시 | PASS |
| 5 | gu=null, dong=null → '기타' 표시 | PASS |

모든 케이스에서 `react-kakao-maps-sdk`를 vi.mock으로 처리 (CustomOverlayMap → div, useMap → setBounds: vi.fn()).

## Deviations from Plan

없음 - 계획대로 정확히 실행됨.

## Known Stubs

없음 — DongClusterChip은 clusterIndex.getLeaves()에서 real data를 받아 렌더한다. 
구/동 이름과 실거래가는 12-03에서 ComplexMapItem에 추가된 si/gu/dong/recent_price 필드를 supercluster properties를 통해 그대로 사용한다.

## Threat Flags

없음 — T-12-03(지도 공개 데이터 표시, 개인정보 미포함) accept, T-12-04(getLeaves 로컬 동기 처리) accept.

## Self-Check: PASSED

- FOUND: src/components/map/DongClusterChip.tsx
- FOUND: src/components/map/DongClusterChip.test.tsx
- FOUND commit 9ccfd1e: feat(12-02): DongClusterChip 구/동 이름 + 최고 실거래가 사각형 클러스터 칩
