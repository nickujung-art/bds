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
- **Vercel Hobby Cron 한도 정합**: Hobby는 cron job 당 최대 1회/일 실행만 허용. CLAUDE.md의 "5분 간격 알림 워커"는 Hobby에서 불가 → 알림 워커(phase 1 step3)는 아래 대안 중 하나 채택 (ADR-023 갱신 필요):
  1. **GitHub Actions cron** `"*/5 * * * *"` — 무료 한도 내 가능, cold-start 지연 ~30s
  2. **Upstash QStash** — 무료 티어 500req/일, 충분. API 호출 방식으로 워커 트리거
  3. Vercel Pro 업그레이드 (월 $20) — 1분 단위 cron 지원
  - **V0.9 결정**: GitHub Actions cron 사용. 알림 latency ≤ 10분 허용 (베타 기준)

### HTTP 200 빈 응답 처리 정책
- 국토부 API가 HTTP 200을 반환하지만 `response.item` 배열이 빈 경우(해당 월 거래 없음): **정상 성공**으로 처리
- `consecutive_failures` 증가 없음. `data_source_runs.status = 'success'`, `rows_inserted = 0` 기록
- 거래가 없는 신규 지역·신축 단지 케이스에서 false alarm 방지

### consecutive_failures 리셋 정책
- 성공 응답(HTTP 200, rows_inserted ≥ 0) 시 `consecutive_failures = 0` 즉시 리셋
- Sentry alert 후 다음 배치에서 성공하면 Sentry "resolved" 이벤트도 함께 전송 (인시던트 자동 종료)

### 매칭 큐 SLA 경보 (step3b 연동)
- 일배치 마지막 단계에 SLA 체크 추가: `complex_match_queue WHERE status='pending' AND created_at < now() - interval '7 days'` 건수 > 0이면 운영자 Resend 이메일

## 작업 목록
1. `vercel.json` cron 등록 (각 route + schedule)
2. `source-monitor.ts`: `checkSourceHealth(sourceId)` — 200+빈배열=성공 정책. `consecutive_failures` 업데이트 + 성공 시 리셋. SLA 경보 체크 포함
3. 3회 실패 시 Resend 이메일 → 운영자 (`OPERATOR_EMAIL` 환경변수)
4. 5회 실패 시 `data_sources.last_status = 'failed'` → UI가 노란 배너 표시 (step12에서 렌더)
5. `data_source_runs` 기록 완성 (모든 ingest route에 시작/종료 기록 추가)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] `vercel.json` cron 스케줄 형식 유효성 (Vitest로 cron 표현식 파싱 테스트)
- [ ] consecutive_failures=3 시뮬레이션 → 이메일 발송 로직 호출 확인 (mock)
- [ ] `data_source_runs` 테이블에 성공/실패 이력 기록 확인
- [ ] HTTP 200 + 빈 배열 응답 → consecutive_failures 증가 없음, status='success' (Vitest)
- [ ] 성공 응답 후 consecutive_failures = 0 리셋 확인 (Vitest)
- [ ] 매칭 큐 7일 초과 pending → 운영자 이메일 발송 로직 호출 (mock)

## Definition of Done
데이터 파이프라인 전체 자동화 완료. 운영자 개입 없이 일배치·월배치·분기배치 동작.
