# Step 2 (3-extras): redevelopment-data

## 목표
창원시·김해시 재개발·재건축 행정 데이터를 자동 적재한다. ADR-041: 출처 확보 시 진행.

## 전제 (Prerequisites)
- 2-community step7 완료 (redev-manual — 수동 입력 구조)
- **데이터 출처 확보 필수** — 창원시·김해시 행정 공개 데이터 또는 API 접근 확인 후 진행

## 데이터 출처 조사 (구현 전 필수)

| 출처 | 접근 방법 | 가용 여부 |
|---|---|---|
| 공공데이터포털 (data.go.kr) | 재건축·재개발 사업 현황 API | 확인 필요 |
| 창원시 도시재생 포털 | 웹 스크래핑 (약관 확인 필요) | 확인 필요 |
| 국토부 도시정비사업 정보 | RHMS API | 확인 필요 |
| 김해시 도시계획 공개 자료 | 수동 다운로드 | 부분 가능 |

## 적용 범위 (Scope)
- `src/services/redev-data.ts` — 행정 데이터 어댑터 (출처 확보 후 구현)
- `src/app/api/ingest/redevelopment/route.ts` — 반기 cron

## 도메인 컨텍스트 / 가드레일
- ADR-041: V1.5까지 수동 입력. V2에서 자동화 — 출처 확보 실패 시 이 step 보류 지속
- `redevelopment_projects` 테이블은 2-community step7에서 이미 생성. 이 step은 자동 적재만 추가
- 자동 적재는 기존 수동 입력 데이터를 덮어쓰지 않음 (`source='manual'` 우선)
- CRON_SECRET 가드 필수

## 작업 목록 (출처 확보 후)
1. 출처별 어댑터 구현 (`redev-data.ts`)
2. 기존 수동 입력과 중복 방지 매칭 로직
3. 반기 cron + `data_sources` 메타 추가
4. Vitest: 어댑터 변환 + 중복 방지 테스트

## 수용 기준 (Acceptance Criteria)
- [ ] 행정 데이터 출처 확보 문서 존재
- [ ] `npm run test` 통과
- [ ] 자동 적재 후 수동 입력 데이터 보존 확인
- [ ] CRON_SECRET 검증

## Definition of Done
재개발 데이터 자동 적재 완성. 운영자 수동 입력 부담 제거.
