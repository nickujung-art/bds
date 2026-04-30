# Step 3a: complex-seed

## 목표
창원·김해 아파트 단지 마스터를 `complexes` 테이블에 일괄 적재한다. 이 step이 끝나면 step3b 매칭 파이프라인이 후보 단지를 찾을 수 있고, step4~9 ingest 데이터가 올바른 complex_id와 연결된다.

## 전제 (Prerequisites)
- Step 2 완료 (DB 스키마 + `complexes` 테이블)
- Step 3 완료 (시군구코드 LAWD 5자리 확인)

## cold-start 문제
`complexes`가 비어있으면 step3b 매칭은 후보 단지가 없어 전체가 `complex_match_queue`에 적체되고, step4 MOLIT ingest도 complex_id를 얻지 못해 진행 불가. 이 step은 그 부트스트랩을 담당한다.

## 단지 마스터 출처 (우선순위)

1. **K-apt 단지 목록 API** (`https://www.k-apt.go.kr/openapi/...`) — 아파트 단지코드·단지명·주소·세대수·건축연도 제공
2. **국토부 MOLIT 단지 마스터 API** — 시군구 단위 아파트 단지 정보 (실거래 데이터 추출 방식 병용 가능)
3. 위 두 출처 매칭 불가 단지는 step16 어드민에서 운영자 수동 등록

## 적용 범위 (Scope)
- `scripts/seed-complexes.ts` — 단지 마스터 일괄 시드 스크립트
- `src/services/kapt.ts` — 단지 목록 조회 함수 추가 (`fetchComplexList(sggCode)`)
- `src/lib/data/complex-matching.ts` — `seedComplex(raw)` 함수 (기존 매칭 함수 재사용)
- `supabase/seed/complexes_bootstrap.sql` — 검증된 단지 스냅샷 (초기 500건 대상)

## 도메인 컨텍스트 / 가드레일
- ADR-033: `complexes`는 Golden Record. 시드 시에도 canonical_name을 name-normalize.ts 파이프라인 통과시켜 삽입
- ADR-035: `status` 초기값 = `active` (입주 완료 단지). 신축·재건축은 운영자 수동 등록 (step16)
- `geocoding_accuracy` 초기값 = `null` — step6(지오코딩)에서 채워짐
- `molit_complex_code`, `kapt_code` — 가능한 경우 둘 다 채움. 없으면 NULL
- `data_completeness` 초기값 = `{"transactions": false, "school": false, "kapt": false, "poi": false}` — 각 ingest 완료 시 true로 갱신
- **멱등성**: `INSERT ... ON CONFLICT (molit_complex_code) DO UPDATE SET canonical_name=EXCLUDED.canonical_name ...` — 중복 실행 안전

## 작업 목록
1. `src/services/kapt.ts`에 `fetchComplexList(sggCode: string): Promise<KaptComplex[]>` 추가
2. `scripts/seed-complexes.ts`:
   - 창원 5개 구 + 김해시 LAWD code 순회
   - K-apt API → 단지 목록 취득 → name-normalize → `complexes` upsert
   - 실패 단지 목록 CSV로 출력 (운영자 수동 등록용)
3. `supabase/seed/complexes_bootstrap.sql` — 스크립트 실행 결과를 검증 후 SQL dump로 저장 (재현 가능한 시드)
4. `data_completeness` 컬럼 초기화 함수 `initDataCompleteness(complexId)` — `complex-matching.ts`에 추가
5. Vitest: 시드 스크립트 mock — 창원 의창구 대상 10건 upsert 멱등성 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npx tsx scripts/seed-complexes.ts` 에러 없이 완료
- [ ] `SELECT count(*) FROM complexes WHERE sgg_code LIKE '481%'` → 300건 이상 (창원·김해 추정치)
- [ ] 동일 스크립트 2회 실행 → `complexes` 레코드 수 변화 없음 (멱등성)
- [ ] 실패 단지 목록 CSV 생성 확인
- [ ] `npm run test` 통과 (mock 시드 10건 멱등성)

## Definition of Done
단지 마스터 적재 완료. step3b 매칭 파이프라인이 후보 단지를 찾을 수 있음. step4~9 ingest 진입 가능.
