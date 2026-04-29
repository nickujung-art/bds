# Step 8: ingest-kapt

## 목표
K-apt에서 창원·김해 아파트 관리비(월별 평균 원/㎡)를 적재한다. 월 1회 갱신.

## 전제 (Prerequisites)
- Step 6 완료
- 사용자가 `KAPT_API_KEY` 설정 (또는 CSV 다운로드 경로 설정)

## 적용 범위 (Scope)
- `src/services/kapt.ts` — K-apt 어댑터
- `src/app/api/ingest/kapt/route.ts` — 월 1회 cron
- `src/lib/data/facility.ts` — `upsertKapt` 추가

## 도메인 컨텍스트 / 가드레일
- `facility_kapt.period_ym` = 'YYYYMM'. PRIMARY KEY (complex_id, period_ym)
- ADR-040: 신축 12개월 미만 → K-apt 데이터 부재. UI에 "입주 12개월 후 공개 예정" 라벨 (step12 처리)
- step17에서 K-apt 부재 시 AI 추정값으로 대체
- `data_sources`: kapt cadence=monthly, ui_label="전월 기준"

## 작업 목록
1. `kapt.ts`: K-apt API or CSV → `FacilityKapt` 타입 변환 + 단지 코드 매칭 (complex_aliases 활용)
2. `upsertKapt`: ON CONFLICT (complex_id, period_ym) DO UPDATE
3. Cron route + `data_source_runs` 기록

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 임의 단지 → `facility_kapt`에 최근 12개월 데이터 존재
- [ ] `period_ym` 중복 upsert → 1건 유지

## Definition of Done
관리비 데이터 준비. step17 AI 추정 fallback 구현 가능.
