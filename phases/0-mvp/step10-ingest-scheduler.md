# Step 10: ingest-scheduler

## 목표
소스별 차등 cron을 `vercel.json`에 등록하고, 갱신 실패 grace period + 운영자 알림을 구현한다. 이 step이 끝나면 모든 데이터 파이프라인이 자동 운영된다.

## 전제 (Prerequisites)
- Step 4~9 완료 (모든 ingest 어댑터)

## 적용 범위 (Scope)
- `vercel.json` — cron jobs 등록
- `src/lib/data/source-monitor.ts` — 갱신 상태 모니터링 + 알림
- `src/lib/notifications/email.ts` — 운영자 알림 이메일 (step의 첫 이메일 구현)

## 도메인 컨텍스트 / 가드레일
- ADR-037: 소스별 차등 cadence
  - molit_trade/rent: `"0 19 * * *"` (UTC 19:00 = KST 04:00)
  - kapt: `"0 18 25 * *"` (매월 25일)
  - school_alimi: `"0 18 1 3,6,9,12 *"` (분기 첫날)
  - kakao_poi: `"0 18 1 1,4,7,10 *"` (분기)
- consecutive_failures: 3회 → Sentry + 운영자 이메일. 5회 → UI 노란 배너
- MOLIT 1회 실패 시 즉시 알람 (트래픽 영향 큼)
- Vercel Hobby Cron: 1일 1회 무료 (유일 제약)

## 작업 목록
1. `vercel.json` cron 등록 (각 route + schedule)
2. `source-monitor.ts`: `checkSourceHealth(sourceId)` — `consecutive_failures` 업데이트
3. 3회 실패 시 Resend 이메일 → 운영자 (`OPERATOR_EMAIL` 환경변수)
4. 5회 실패 시 `data_sources.last_status = 'failed'` → UI가 노란 배너 표시 (step12에서 렌더)
5. `data_source_runs` 기록 완성 (모든 ingest route에 시작/종료 기록 추가)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] `vercel.json` cron 스케줄 형식 유효성 (Vitest로 cron 표현식 파싱 테스트)
- [ ] consecutive_failures=3 시뮬레이션 → 이메일 발송 로직 호출 확인 (mock)
- [ ] `data_source_runs` 테이블에 성공/실패 이력 기록 확인

## Definition of Done
데이터 파이프라인 전체 자동화 완료. 운영자 개입 없이 일배치·월배치·분기배치 동작.
