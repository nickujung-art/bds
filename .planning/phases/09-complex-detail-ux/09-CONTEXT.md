# Phase 9: 단지 상세 UX 고도화 — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Source:** 대화 기반 (사용자와 직접 논의한 결정 사항)

<domain>
## Phase Boundary

단지 상세 페이지(`/complexes/[id]`)의 4개 섹션 개선:
1. 실거래가 그래프 (TransactionChart) — 필터·탭·이상치
2. 관리비 카드 (ManagementCostCard) — 계절별 + 평형별
3. 시설 카드 (FacilitiesCard 또는 동등 컴포넌트) — 주차·엘리베이터 표시 방식
4. 평형 필터 칩 — 전체 상세 페이지 공유 상태 (nuqs)

학군 정보는 이 Phase에서 제외 (facility_school 데이터 미적재, Phase 6에서 처리).

</domain>

<decisions>
## Implementation Decisions

### D-01: 월세 탭 제거 [LOCKED]
실거래가 그래프에서 월세 탭 제거. 매매/전세 두 탭만 유지.
**근거:** 보증금 컨텍스트 없이 월세 단독으로는 가치 판단 불가. 실수요자가 원하는 정보 아님.

### D-02: 기간 필터 (nuqs URL 상태) [LOCKED]
옵션: `1년 / 3년 / 5년 / 전체`. 기본값 `3년`.
URL 파라미터: `?period=1y|3y|5y|all` (nuqs 사용).
**근거:** URL 공유 가능, nuqs가 이미 프로젝트에 설치됨.

### D-03: IQR 이상치 시각화 [LOCKED]
알고리즘: IQR × 1.5 (box plot 표준).
표시: 이상치 제거 대신 **투명/회색 점으로 구분** 표시.
그래프 선(평균선)에서는 이상치 제외.
**근거:** 실제 신고가(record)를 "이상치"로 숨기면 신뢰 손상. 시각 구분 후 hover 시 안내.

### D-04: 평형 칩 셀렉터 [LOCKED]
기준: **전용면적(㎡)** 기준 그룹화 (공급면적 아님).
표시: `59㎡ / 84㎡ / 109㎡` (실제 DB 데이터 기반 동적 생성).
기본값: 거래량 가장 많은 평형.
URL 파라미터: `?area=84` (nuqs 사용).
위치: 차트 위 상단 칩 행.
**동작:** 칩 선택 → 그래프·실거래 목록 동시 필터. `[전체]` 탭은 v2로 defer.

### D-05: 평형 필터 적용 범위 [LOCKED]
실거래가 그래프 + 실거래 목록에만 적용.
관리비는 K-apt 데이터가 단지 전체 합계만 제공하므로 평형 분리 불가 — 세대당 평균으로 유지.

### D-06: 주차 표시 방식 [LOCKED]
`총주차대수 ÷ 세대수` → "세대당 N.N대" 형식.
`household_count`는 이미 존재. `total_parking` 필드 유무 사전 확인 필요.

### D-07: 엘리베이터 표시 방식 [LOCKED]
`총엘리베이터수 ÷ 동수` → "동당 N대" 형식.
`building_count` 필드 유무 사전 확인 필요. 없으면 마이그레이션 또는 K-apt 재적재.

### D-08: 관리비 계절별 표시 [LOCKED]
현재 상세 항목 내역(공용관리비·인건비·청소비…) 제거.
대체: **하절기(6~9월) 월평균** vs **동절기(10~3월) 월평균** 비교 표시.
현재 DB에 최대 6개월 데이터 존재 → 4개월 이상 데이터 있을 때만 계절 비교 표시.
세대당 평균(총합 ÷ 세대수)만 표시, 평형별 분리는 하지 않음.

### D-09: 데이터 fetch 범위 확장 [LOCKED]
현재 `getManagementCostMonthly` limit=6. 계절 분류에 충분.
실거래 fetch: 현재 구조 확인 필요 — 5년 기간 필터를 위해 더 많은 row 필요할 수 있음.
기간 필터는 client-side slice 방식으로 처리 (fetch once, filter on client).

### Claude's Discretion
- 평형 칩 컴포넌트 위치 및 스타일 (CLAUDE.md AI 슬롭 금지 준수)
- IQR 계산 함수의 위치 (`src/lib/` 유틸리티)
- 관리비 계절 집계 로직 위치 (컴포넌트 내부 vs 데이터 레이어)
- `building_count` 없을 경우 fallback (null → 엘리베이터 동당 항목 숨김)
- 기간 필터 기본값 3년인 경우 `?period=3y`를 URL에 명시할지 생략할지

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 현재 단지 상세 구조
- `src/app/complexes/[id]/page.tsx` — 단지 상세 RSC (Promise.all 13개 항목)
- `src/components/complex/ManagementCostCard.tsx` — 관리비 카드 현재 구현
- `src/lib/data/management-cost.ts` — ManagementCostRow 타입 + getManagementCostMonthly
- `src/lib/data/complexes-map.ts` — ComplexMapItem 타입 패턴 참고

### 거래 데이터
- `src/lib/data/` — 거래 데이터 레이어 (실거래가 fetch 함수 위치 확인)
- `supabase/migrations/` — 기존 complexes 스키마 (parking, elevator, building_count 확인)

### nuqs 사용 패턴
- 프로젝트에 nuqs 설치됨 (commit c6c569a). 기존 사용 패턴 확인.

### 설계 제약 (CLAUDE.md)
- RSC 우선: 데이터 fetch는 서버 컴포넌트에서만
- AI 슬롭 금지: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb
- 거래 쿼리: `WHERE cancel_date IS NULL AND superseded_by IS NULL` 필수

</canonical_refs>

<specifics>
## Specific Ideas

### 평형 칩 UI 예시
```
[59㎡] [84㎡] [109㎡]   ← 차트 헤더 위 우측 정렬
━━━━━━━━━━━━━━━━━━━━━
  매매 추이 차트 (선택된 평형)
```

### 이상치 시각화
- 정상 거래: 실선 + 채워진 원 마커
- IQR 이상치: 점선 없음 + 투명/연회색 원 마커 (opacity 0.3)
- hover 시 tooltip: "이상 거래 의심 (분기 IQR 기준)"

### 관리비 계절별 표시 예시
```
하절기 (6~9월) 평균    동절기 (10~3월) 평균
   32만원                   48만원
   세대당 약 12만원          세대당 약 18만원
```

### 주차/엘리베이터 표시 예시
```
주차대수  세대당 1.2대 (총 840대)
엘리베이터  동당 2대 (총 12개 동)
```

</specifics>

<deferred>
## Deferred Ideas

- `[전체]` 평형 탭 (모든 평형 색상 구분 차트) — 복잡도 높아 v2로 defer
- 학군 정보 섹션 — facility_school 데이터 미적재, Phase 6에서 처리
- 관리비 평형별 정확한 분리 — K-apt 원천 데이터 한계로 불가
- 신고가/조회수 핀 표시 — 지도 탭, 별도 계획

</deferred>

---

*Phase: 09-complex-detail-ux*
*Context gathered: 2026-05-14*
