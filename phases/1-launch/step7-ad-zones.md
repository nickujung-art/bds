# Step 7 (1-launch): ad-zones

## 목표
광고 슬롯 컴포넌트를 구현한다. 분양·중개 광고 영역 분리, 표시광고법 "광고" 명시 라벨, 광고 없을 때 fallback.

## 전제 (Prerequisites)
- step6 완료 (랜딩)

## 적용 범위 (Scope)
- `src/components/ads/AdSlot.tsx` — 슬롯 컴포넌트 (slot 타입별)
- `src/lib/ads/get-creative.ts` — 게재 로직 (step9에서 완성)
- 슬롯 위치:
  - `search_top`: 검색 결과 상단 (분양)
  - `danji_side`: 단지 상세 우측 (분양, 데스크톱)
  - `danji_bottom`: 단지 상세 하단 (중개)
  - `landing_promo`: 랜딩 하단 프로모션 (분양)

## 도메인 컨텍스트 / 가드레일
- ADR-005: 분양/중개 UI 영역 분리 필수
- 표시광고법: 모든 광고 슬롯에 "광고" 라벨 (배지: `bg-[#f3f4f6] text-[#6b7280]`)
- 광고 없을 때: 슬롯 숨김 (`null` 반환). 빈 박스 절대 금지
- RSC에서 게재 쿼리 (서버 렌더). 클라이언트에서 클릭 이벤트만

## 작업 목록
1. `AdSlot.tsx`: slot prop → get-creative(stub) → 광고 렌더 or null
2. 슬롯 위치별 컴포넌트 삽입 (검색·단지상세·랜딩)
3. "광고" 라벨 항상 표시 (UI_GUIDE 배지 스타일)
4. Vitest: 광고 없을 때 null 반환 테스트

## 수용 기준 (Acceptance Criteria)
- [ ] 모든 슬롯에 "광고" 라벨 표시
- [ ] 광고 데이터 없을 때 슬롯 자체 사라짐 (빈 공간 없음)

## Definition of Done
광고 슬롯 구조 완성. step9 게재 로직 연결 준비됨.
