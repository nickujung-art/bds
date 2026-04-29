# Step 3: seed-region

## 목표
창원시·김해시 행정동 코드와 `data_sources` 초기 시드를 적재한다. 이 step이 끝나면 단지 매칭 파이프라인(step3b)이 참조할 지역 기준 데이터가 준비된다.

## 전제 (Prerequisites)
- Step 2 완료 (DB 스키마)

## 적용 범위 (Scope)
- `supabase/seed/regions.sql` — 창원시·김해시 시군구코드 + 읍면동 코드 목록
- `supabase/seed/data_sources.sql` — `data_sources` 초기 레코드 (MOLIT, K-apt, 학교알리미 등)
- `scripts/seed.ts` — 로컬 seed 실행 스크립트

## 도메인 컨텍스트 / 가드레일
- ADR-037: `data_sources` 메타에 소스별 cadence·expected_freshness_hours 명시
- 시군구코드: 창원시 = 38110~38115 (의창·성산·마산합포·마산회원·진해구), 김해시 = 38250
- `data_sources.id`는 코드명 (예: 'molit_trade', 'molit_rent', 'kapt', 'school_alimi', 'kakao_poi', 'juso')

## 작업 목록
1. `supabase/seed/regions.sql`: 창원·김해 시군구·읍면동 INSERT
2. `supabase/seed/data_sources.sql`:
   - molit_trade: cadence=daily, freshness=48h
   - molit_rent: cadence=daily, freshness=48h
   - kapt: cadence=monthly, freshness=45d
   - school_alimi: cadence=quarterly, freshness=100d
   - kakao_poi: cadence=quarterly, freshness=100d
   - juso: cadence=event, freshness=168h
3. `npm run db:seed` 스크립트 연결

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run db:seed` 에러 없음
- [ ] `SELECT count(*) FROM data_sources` → 6건 이상
- [ ] 창원·김해 시군구코드 레코드 존재 확인

## Definition of Done
지역 기준 데이터 + data_sources 시드 완료. step3b 매칭 파이프라인 진입 가능.
