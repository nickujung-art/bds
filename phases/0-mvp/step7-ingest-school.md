# Step 7: ingest-school

## 목표
학교알리미 API에서 창원·김해 초·중·고 배정 학군 정보를 적재한다. 분기 1회 갱신.

## 전제 (Prerequisites)
- Step 6 완료 (단지 좌표 존재)
- 사용자가 `SCHOOL_ALIMI_API_KEY` 설정

## 적용 범위 (Scope)
- `src/services/school-alimi.ts` — 학교알리미 어댑터
- `src/app/api/ingest/school/route.ts` — 수동 trigger 또는 분기 cron
- `src/lib/data/facility.ts` — `upsertSchools(complexId, schools)` 함수

## 도메인 컨텍스트 / 가드레일
- `facility_school.assignment_type`: 배정(법정 학군) vs 인근(근거리)
- `data_sources`: school_alimi cadence=quarterly, 분기 cron 등록
- 학교 데이터 부재(신축) 시 UI에 "학기 기준 갱신" 라벨 표시 (UI 처리는 step12)

## 작업 목록
1. `school-alimi.ts`: 행정동 기준 배정 학교 조회 → `FacilitySchool` 타입 변환
2. `facility.ts`: `upsertSchools` — ON CONFLICT (complex_id, school_type, school_name) DO UPDATE
3. Cron route + `data_source_runs` 기록
4. Vitest mock 테스트

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 임의 단지 → `facility_school`에 초·중·고 데이터 존재
- [ ] 동일 데이터 2회 ingest → DB 레코드 중복 없음

## Definition of Done
학군 데이터 준비. 단지 상세 시설 V1 표시 가능.
