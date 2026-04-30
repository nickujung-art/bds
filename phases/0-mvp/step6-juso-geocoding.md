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

### geocoding_accuracy 값 정의
정확도 컬럼 값은 다음 enum 수준으로 고정:
| 소스 | accuracy 값 |
|---|---|
| 행안부 도로명주소 API (건물 단위 매칭) | `1.0` |
| 카카오 로컬 주소 검색 (지번 매칭) | `0.7` |
| 행정동 센트로이드 fallback | `0.2` |
- 센트로이드 fallback: `complexes.emd_code`의 행정동 폴리곤 중심점. `complexes.location_label = 'estimated'` 컬럼 추가하여 지도 UI에서 "위치 추정" 라벨 표시

### 저정확도 단지 재지오코딩 배치
- `geocoding_accuracy < 0.7` (센트로이드) 단지는 월 1회 재지오코딩 시도 (주소가 추가되었을 가능성)
- GitHub Actions cron `"0 3 1 * *"` (매월 1일 03:00 UTC) — `geocoding-batch.ts --recheck-low-accuracy`
- 재지오코딩 성공 시 accuracy 갱신, 실패 시 그대로 유지 (덮어쓰지 않음)

## 작업 목록
1. `juso.ts`: 도로명주소 검색 → WGS84 좌표 반환. zod 검증. accuracy=1.0 반환
2. `kakao-local.ts`: 주소 검색 → 좌표 반환. accuracy=0.7 반환
3. `geocoding.ts`: `geocodeComplex(complex)` — 1차 juso → 실패 시 kakao → 실패 시 센트로이드(accuracy=0.2). `location_label` 설정 포함
4. `geocoding-batch.ts`: location IS NULL인 단지 일괄 처리 + `--recheck-low-accuracy` 플래그 + 진행상황 콘솔 출력
5. Vitest: 각 어댑터 mock 테스트 + accuracy 값 검증

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 배치 실행 후 창원·김해 단지 ≥ 95%에 `location` 좌표 존재
- [ ] `geocoding_accuracy < 0.7`인 단지 목록 콘솔 출력 (수동 확인용)
- [ ] 센트로이드 fallback 단지 → `geocoding_accuracy = 0.2` + `location_label = 'estimated'` (Vitest)
- [ ] 지도 페이지(step13)에서 사용할 PostGIS 범위 쿼리 동작 확인

## Definition of Done
단지 좌표 완성. 지도(step13)·검색(step11) 준비됨.
