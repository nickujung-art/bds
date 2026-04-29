# Step 15 (1-launch): digest-weekly

## 목표
매주 월요일 즐겨찾기 단지 5곳의 주간 동향을 요약한 이메일 다이제스트를 발송한다.

## 전제 (Prerequisites)
- step3 완료 (알림 엔진)
- step2 완료 (즐겨찾기)

## 적용 범위 (Scope)
- `src/components/email/WeeklyDigestTemplate.tsx` — React Email 템플릿
- `src/app/api/notifications/weekly-digest/route.ts` — 월요일 07:00 KST cron
- `src/app/(auth)/settings/page.tsx` — 다이제스트 구독 on/off

## 도메인 컨텍스트 / 가드레일
- Resend 3k/월 한도 — 다이제스트는 일별 알림과 별도 dedupe_key (`weekly_YYYY-WW`)
- 즐겨찾기 없는 회원은 다이제스트 발송 안 함
- `notification_pref.weekly_digest = false` → 발송 skip

## 작업 목록
1. `WeeklyDigestTemplate.tsx`: 즐겨찾기 단지 목록 + 주간 최고가·거래량·갱신폭
2. cron route: 즐겨찾기 있는 회원 × 단지 주간 요약 쿼리 → 이메일 발송
3. 설정 페이지에 다이제스트 구독 토글 추가

## 수용 기준 (Acceptance Criteria)
- [ ] 월요일 cron 시뮬레이션 → 이메일 발송 로직 호출 (mock)
- [ ] 즐겨찾기 없는 회원 → 발송 skip 확인
- [ ] `notification_pref.weekly_digest = false` → 발송 skip

## Definition of Done
주간 다이제스트 완성. 7일 리텐션 지표 향상 수단 확보.
