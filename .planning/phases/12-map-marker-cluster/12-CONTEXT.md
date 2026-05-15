# Phase 12: 지도 마커·클러스터 개편 - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning
**Source:** 사용자 기획 세션 (호갱노노/네이버 UX 분석 + 로고 기반 디자인)

<domain>
## Phase Boundary

Phase 12는 Phase 11에서 구축한 지도 인프라(MapSidePanel, BadgeMarker, ClusterMarker, map-panel API) 위에서 **시각적 디자인을 완전 교체**한다. 기능 추가가 아닌 UX 고도화:

- 핀/티어드롭 마커 → 로고 기반 집 모양 SVG 마커
- 숫자 원형 클러스터 → 동/구 이름 + 최고 실거래가 사각형 칩
- hover 시 아무것도 없음 → 단지명+실거래+세대수 툴팁 카드
- 10종 배지 시스템 → 3종 단순화 (pre_sale/new_build/hot)
- 줌 레벨 정책: 3단계 (클러스터 전용 / 마커+가격 / 마커+이름+가격)

**Phase 11 의존:** Phase 11의 DB 컬럼(avg_sale_per_pyeong, tx_count_30d, price_change_30d), BadgeMarker.tsx, ClusterMarker.tsx, ComplexMarker.tsx, MapSidePanel.tsx, KakaoMap.tsx가 이미 존재하는 상태에서 교체/개선한다.

</domain>

<decisions>
## Implementation Decisions

### 마커 디자인 — 로고 기반 집 모양 SVG

**[LOCKED]** 기존 BadgeMarker.tsx 핀/티어드롭 형태를 완전 교체한다. 새 컴포넌트명: `HouseMarker.tsx`.

**[LOCKED]** SVG 구조 (로고 참조):
- 지붕: 회색 삼각형 + 굴뚝 돌기 (작은 사각형 돌출)
- 바디: C형 (오른쪽 열린 반원형 또는 U형) — 일반은 오렌지 (#F97316), 분양은 빨강 (#EF4444), 신축은 민트 (#14B8A6)
- 실거래가 텍스트: 바디 아래 또는 안쪽에 표시 (줌 레벨에 따라 on/off)
- hot 왕관: 지붕 위에 작은 왕관 SVG path 추가 (별도 레이어)

**[LOCKED]** 마커 3종:
1. 일반 (기본): 회색 지붕 + 오렌지 바디
2. 분양 (status=pre_sale): 빨간 지붕 + 빨간 바디
3. 신축 (built_year >= 2021, status=new_build 또는 조건 계산): 민트 지붕 + 민트 바디

**[LOCKED]** hot 마커: tx_count_30d 상위 5% 단지에 왕관 SVG 추가 (색상은 기본/분양/신축 중 하나 위에 오버레이)

**[LOCKED]** 금지 사항: 이모지, backdrop-blur, gradient-text, glow 애니메이션, 보라/인디고 색상, gradient orb (CLAUDE.md 준수)

**[LOCKED]** 성능: 수백 개 CustomOverlayMap 동시 렌더링 — SVG는 인라인, React.memo 적용

### hover 툴팁

**[LOCKED]** 클릭 전 hover 시 툴팁 카드를 표시한다. 클릭 시 MapSidePanel이 열린다 (Phase 11 동작 유지).

**[LOCKED]** 툴팁 표시 정보:
```
┌─────────────────────────┐
│ 용지아이파크             │  단지명 (canonical_name)
│ 창원시 성산구            │  si + gu
├─────────────────────────┤
│ 최근 실거래  9억 9,500만  │  최근 거래 1건 (price)
│             2026-04-29  │  deal_date
│             25.6평       │  area_m2 / 3.3058
├─────────────────────────┤
│ 1,036세대 · 2017년       │  household_count · built_year
└─────────────────────────┘
```

**[LOCKED]** 툴팁 데이터 소스: Phase 11에서 만든 `/api/complexes/[id]/map-panel` 또는 `complexes-map.ts` 에서 이미 내려오는 데이터를 재활용한다. **별도 API 추가 없음**.

**[LOCKED]** 툴팁 스타일: 흰 배경, 1px border (#E5E7EB), border-radius 8px, 그림자 `0 4px 16px rgba(0,0,0,0.10)`, 폰트 시스템 기본. backdrop-blur 금지.

**[LOCKED]** 데이터 공급 방식: `getComplexesForMap()` 반환 타입(`ComplexMapItem`)에 `recent_price`, `recent_date`, `recent_area_m2`, `household_count`, `built_year` 필드를 추가하거나, ComplexMarker가 이미 받은 데이터를 props로 내려받는다. 추가 fetch 없이 처리한다.

### 동/구 단위 클러스터 칩

**[LOCKED]** 숫자 원형 ClusterMarker를 사각형 칩으로 교체한다. 새 컴포넌트명: `DongClusterChip.tsx` (또는 `ClusterChip.tsx`).

**[LOCKED]** 칩 표시 정보:
```
┌─────────────────────┐
│ 성산구   12.5억      │  ← 구/동 이름 + 최근 3개월 최고 실거래가
└─────────────────────┘
```

**[LOCKED]** 최고 실거래가 계산: supercluster의 클러스터에 묶인 단지들의 recent_price 중 최대값. DB 별도 쿼리 없이 클라이언트 집계.

**[LOCKED]** 클릭 동작: 기존 ClusterMarker와 동일하게 클릭 시 해당 클러스터 bounds로 줌인.

**[LOCKED]** 칩 스타일: 흰 배경, border-radius 6px, padding 8px 12px, 1px border (#E5E7EB), 그림자. backdrop-blur/gradient 금지.

**[LOCKED]** 구/동 이름 출처: 클러스터에 포함된 단지들의 `gu` (또는 `dong`) 필드. 다수결 또는 첫 번째 단지의 값을 사용한다.

### 줌 레벨 정책

**[LOCKED]** 3단계 정책 (KakaoMap.tsx의 mapLevel 기반):
- level ≥ 10: DongClusterChip만 표시 (단지 마커 렌더링 안 함)
- level 7~9: HouseMarker + 실거래가만 (단지명 없음)
- level ≤ 6: HouseMarker + 단지명 + 실거래가

**[LOCKED]** 현재 Phase 11의 `showLabel = level ≤ 7` 로직을 위 3단계로 교체한다.

### 배지 단순화

**[LOCKED]** 기존 10종 배지 시스템(badge-logic.ts의 surgeup, surgedown, school, large_complex, redevelop, none 등)을 제거하고 3종으로 단순화:
1. `pre_sale` — 분양 (빨간 마커로 표현, 별도 배지 없음)
2. `new_build` — 신축 (민트 마커로 표현, 별도 배지 없음)
3. `hot` — 왕관 SVG (tx_count_30d 상위 5%, 어떤 색 마커든 왕관 추가)

**[LOCKED]** 배지는 마커 색/형태로 표현하므로 별도 배지 오버레이가 최소화된다. 왕관만 SVG 오버레이.

**[Claude's Discretion]** 왕관 SVG path의 정확한 픽셀 크기 및 위치 오프셋.
**[Claude's Discretion]** hot 임계값 계산 방식 (상위 5%를 복잡한 백분위로 계산하기보단 tx_count_30d > 특정 값 등 단순화 가능).
**[Claude's Discretion]** ComplexMapItem 타입 확장 vs 별도 타입 사용.
**[Claude's Discretion]** HouseMarker SVG viewBox 크기 및 정확한 path 값.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 지도 관련 현재 구현
- `src/components/map/KakaoMap.tsx` — 메인 지도 컴포넌트, mapLevel state, showLabel 로직, determineBadge() 호출
- `src/components/map/markers/BadgeMarker.tsx` — 기존 핀 마커 (교체 대상)
- `src/components/map/markers/badge-logic.ts` — 기존 10종 배지 로직 (단순화 대상)
- `src/components/map/ComplexMarker.tsx` — CustomOverlayMap, hover 툴팁 (개선 대상)
- `src/components/map/ClusterMarker.tsx` — 클러스터 (교체 대상)
- `src/components/map/MapSidePanel.tsx` — 사이드 패널 (유지, 수정 없음)

### 데이터 레이어
- `src/lib/data/complexes-map.ts` — getComplexesForMap(), ComplexMapItem 타입 정의
- `src/app/api/complexes/[id]/map-panel/route.ts` — Phase 11 map-panel API
- `src/lib/data/map-panel.ts` — MapPanelData 타입

### Phase 11 Plans (참조용 — 의존성 이해)
- `.planning/phases/11-map-enhancement/11-01-PLAN.md` — ComplexMapItem 확장, badge-logic.ts
- `.planning/phases/11-map-enhancement/11-02-PLAN.md` — map-panel 데이터 레이어
- `.planning/phases/11-map-enhancement/11-03-PLAN.md` — BadgeMarker, ClusterMarker, ComplexMarker
- `.planning/phases/11-map-enhancement/11-04-PLAN.md` — MapSidePanel, KakaoMap 통합

### 프로젝트 제약
- `CLAUDE.md` — 이모지/backdrop-blur/gradient-text/glow/보라색 금지, SVG path만 허용, Supabase 쿼리 서버에서만

</canonical_refs>

<specifics>
## Specific Ideas

### 로고 SVG 참조
사용자가 제공한 로고 이미지: 회색 지붕선 + 굴뚝 돌기 + 오렌지 C형 바디 (오른쪽 열린 형태). 이 형태를 그대로 마커 SVG로 구현한다.

### 호갱노노 UX 참조
- 줌 아웃: 동 단위 사각형 칩 (이름 + 가격)
- 줌 인: 개별 마커 (집 아이콘 형태)
- hover: 미니 카드 (단지명 + 가격 + 면적)
- 단지 상세: 클릭 후 사이드 패널

### 실거래가 표시 형식
- 1억 미만: `9,500만원`
- 1억 이상: `1억 5,000만원` (eok+man 형식)
- 클러스터 칩의 최고가는 동일한 형식

### hot 판단 기준
tx_count_30d 컬럼 (Phase 11 DB에 추가됨). 배치로 갱신되므로 클라이언트에서 이 값을 기준으로 상위 5% 임계값을 계산하거나, 단순히 `tx_count_30d >= N` 하드코딩 가능.

</specifics>

<deferred>
## Deferred Ideas

- 평당가 표시를 툴팁에 추가 — 실거래가만으로 충분하다는 사용자 결정으로 제외
- 마커 애니메이션 (glow, pulse) — CLAUDE.md 금지 사항
- 구/동 이름 DB에서 집계하는 별도 API — 클라이언트 집계로 충분
- 사이드 패널 디자인 변경 — Phase 12 범위 외 (Phase 11 구현 유지)

</deferred>

---

*Phase: 12-map-marker-cluster*
*Context gathered: 2026-05-15 via 사용자 기획 세션*
