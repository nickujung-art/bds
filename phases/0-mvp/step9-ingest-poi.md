# Step 9: ingest-poi

## 목표
카카오 로컬 API로 각 단지 반경 500m의 편의시설(편의점·병원·마트·약국 등)을 적재한다. 분기 1회 + 신규 단지 등록 시 on-demand.

## 전제 (Prerequisites)
- Step 6 완료 (단지 좌표)
- `KAKAO_REST_API_KEY` 설정

## 적용 범위 (Scope)
- `src/services/kakao-local.ts` — POI 검색 추가
- `src/lib/data/facility.ts` — `upsertPoi` 추가
- `scripts/poi-batch.ts` — 배치 스크립트

## 도메인 컨텍스트 / 가드레일
- `facility_poi.poi_type` enum: convenience_store, hospital, mart, pharmacy, subway, park
- `snapshot_date` 컬럼으로 최신 스냅샷 관리 (이전 데이터 보존 X, 전체 교체)
- 카카오 일 100,000회 한도 주의 — 배치는 밤 시간대 실행
- `data_sources`: kakao_poi cadence=quarterly

## 작업 목록
1. `kakao-local.ts` POI 반경 검색 (카테고리 기반, 반경 500m)
2. `upsertPoi`: 단지별 전체 삭제 후 재삽입 (스냅샷 교체)
3. 배치: location IS NOT NULL인 모든 단지 순회

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 임의 단지 → `facility_poi`에 편의시설 ≥ 1건 (단지 밀집 지역 기준)
- [ ] 2회 실행 → 중복 없이 최신 스냅샷만 유지

## Definition of Done
편의시설 데이터 준비. 단지 상세 시설 V1 완성.
