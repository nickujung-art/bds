# Step 6: juso-geocoding

## 목표
`complexes` 테이블의 모든 단지에 좌표(`location`)를 부여한다. 1차: 행안부 도로명주소 API, 실패 시 2차: 카카오 로컬. 전체 정확도 ≥ 95%.

## 전제 (Prerequisites)
- Step 3b 완료 (complexes 테이블 존재)
- 사용자가 `.env.local`에 `JUSO_API_KEY`, `KAKAO_REST_API_KEY` 설정

## 적용 범위 (Scope)
- `src/services/juso.ts` — 행안부 도로명주소 어댑터
- `src/services/kakao-local.ts` — 카카오 로컬 어댑터 (주소 검색)
- `scripts/geocoding-batch.ts` — 배치 지오코딩 스크립트
- `src/lib/data/geocoding.ts` — 2단계 fallback 로직

## 도메인 컨텍스트 / 가드레일
- ADR-021: 행안부 1차, 카카오 2차. 모두 실패 시 행정동 센트로이드 + "위치 추정" 라벨
- `complexes.geocoding_accuracy` 컬럼에 0~1 정확도 저장
- 카카오 일 100,000회 한도 → rate-limit 적용
- PostGIS: `ST_GeomFromText('POINT(lng lat)', 4326)`

## 작업 목록
1. `juso.ts`: 도로명주소 검색 → WGS84 좌표 반환. zod 검증
2. `kakao-local.ts`: 주소 검색 → 좌표 반환
3. `geocoding.ts`: `geocodeComplex(complex)` — 1차 juso → 실패 시 kakao → 실패 시 센트로이드
4. `geocoding-batch.ts`: location IS NULL인 단지 일괄 처리 + 진행상황 콘솔 출력
5. Vitest: 각 어댑터 mock 테스트

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 배치 실행 후 창원·김해 단지 ≥ 95%에 `location` 좌표 존재
- [ ] `geocoding_accuracy < 0.7`인 단지 목록 콘솔 출력 (수동 확인용)
- [ ] 지도 페이지(step13)에서 사용할 PostGIS 범위 쿼리 동작 확인

## Definition of Done
단지 좌표 완성. 지도(step13)·검색(step11) 준비됨.
