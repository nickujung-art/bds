# Step 3 (1-launch): notification-engine

## 목표
신고가 갱신 시 즐겨찾기 회원에게 이메일 + 웹 푸시 알림을 발송한다. 중복 발송 방지(dedupe), 야간 발송 금지, 일일 회원당 최대 10건 제한.

## 전제 (Prerequisites)
- 1-launch step1 (PWA 푸시), step2 (즐겨찾기)
- `RESEND_API_KEY` 설정

## 적용 범위 (Scope)
- `src/lib/notifications/email.ts` — Resend + React Email 템플릿
- `src/lib/notifications/queue.ts` — 알림 enqueue / dequeue
- `src/app/api/ingest/notify/route.ts` — 신고가 감지 + 큐 enqueue (일배치 cron)
- `src/app/api/notifications/worker/route.ts` — 5분 워커 (GitHub Actions cron 트리거)
- `src/components/email/NewHighTemplate.tsx` — React Email 템플릿

## 도메인 컨텍스트 / 가드레일
- ADR-023: `notifications` 테이블 큐 (Postgres, 폴링 5분)
- dedupe: `UNIQUE(user_id, event_type, target_id, dedupe_key)` — dedupe_key = 날짜
- 동일 단지 24h 내 1회만 발송
- 야간 발송 금지: 22:00~07:00 KST → `scheduled_at` 다음 07:00으로 조정
- 발송 실패 3회 → `status='failed'` + Sentry
- Resend 3k/월 한도 → 2.4k 초과 시 알람 (cost-report 연동)

### 야간 시간대 계산 주의사항
- DB 저장 시각은 UTC. KST = UTC+9
- `22:00 KST = 13:00 UTC`, `07:00 KST = 22:00 UTC (전일)`
- `scheduled_at` 계산: `date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') + interval '7 hours'` → KST 07:00을 UTC로 변환하여 저장
- 서머타임 없으므로 오프셋 고정 +9h. 단, `AT TIME ZONE` 사용 권장 (Postgres)

### 웹 푸시 구독 무효화 처리
- 푸시 발송 응답 HTTP 410 Gone → 해당 `push_subscriptions.is_valid = false` 즉시 업데이트. 재발송 시도 없음
- HTTP 429 (Too Many Requests) → `Retry-After` 헤더 값만큼 대기 후 재시도 큐 상단 대기

### Resend 오류 처리
- Resend HTTP 422 (Unprocessable): 수신자 이메일 도메인 문제(disposable 등) → `status='failed'`, retry 없음. Sentry info 로그
- Resend HTTP 503: 일시적 서비스 장애 → 3회 지수 백오프(30s, 60s, 120s) 후 `status='failed'` + Sentry error
- 이메일 수신 불가(bounce) Resend webhook → `profiles.email_bounced = true` 업데이트 → 이후 이메일 발송 skip

## 작업 목록
1. `queue.ts`: `enqueue(userId, eventType, targetId, channel, payload)` — UNIQUE 충돌 시 skip. `scheduled_at` KST 야간 계산 포함
2. `email.ts`: `sendEmail(to, template, data)` — Resend SDK. 422/503 분기 처리
3. `NewHighTemplate.tsx`: 단지명·평형·갱신폭 표시, 단지 상세 링크, 단지온도 브랜딩
4. `notify/route.ts`: 일배치에 추가 — 전일 신고가 갱신 단지 탐지 → 즐겨찾기 회원 → enqueue
5. `worker/route.ts`: pending 50건 fetch → 채널별 발송 → status 업데이트. 410 즉시 무효화, 429 Retry-After 대기
6. `.github/workflows/notify-worker.yml`: `schedule: "*/5 * * * *"` → `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/notifications/worker` 호출
6. Resend bounce webhook 핸들러: `POST /api/webhooks/resend` → `email_bounced=true` 업데이트

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (dedupe 로직 + 야간 스케줄 조정 테스트)
- [ ] 동일 단지 알림 2회 enqueue → 1건만 전송됨
- [ ] 22:00 KST 발송 시도 → `scheduled_at` = 다음날 07:00 KST (UTC 변환 검증, Vitest)
- [ ] 실제 이메일 수신 확인 (테스트 계정)
- [ ] 푸시 발송 410 → `is_valid=false` 즉시 업데이트 (Vitest)
- [ ] Resend 422 → retry 없이 `status='failed'` (Vitest)

## Definition of Done
알림 엔진 완성. 회원 retention 핵심 기능 가동.
