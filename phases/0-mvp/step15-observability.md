# Step 15: observability

## 목표
PostHog + Sentry + Vercel Logs + cost-report 스크립트를 설정한다. 이 step이 끝나면 페이지 뷰·에러·비용 한도를 자동 모니터링한다.

## 전제 (Prerequisites)
- Step 0 완료
- 사용자가 PostHog 프로젝트 생성 + `NEXT_PUBLIC_POSTHOG_KEY` 설정
- 사용자가 Sentry 프로젝트 생성 + `SENTRY_DSN` 설정

## 적용 범위 (Scope)
- `src/app/layout.tsx` — PostHog Provider 추가
- `sentry.client.config.ts`, `sentry.server.config.ts`
- `scripts/cost-report.ts` — 일일 비용 체크 + 임계 초과 시 이메일
- `src/lib/analytics/events.ts` — PostHog 이벤트 상수

## 도메인 컨텍스트 / 가드레일
- PostHog 1M events/월 한도 → 80만 초과 시 알람
- Sentry 5k errors/월 → 4k 초과 시 알람
- `cost-report.ts`: Supabase 사용량 API + Vercel 사용량 API → 임계 초과 이메일
- 개인정보: PostHog IP 익명화 (`person_properties_mode: 'identified_only'`)

## 작업 목록
1. PostHog Next.js SDK 설정 + Provider
2. `events.ts`: `DANJI_VIEW`, `SEARCH_QUERY`, `FAVORITE_ADD`, `AD_IMPRESSION`, `AD_CLICK` 상수
3. Sentry: `withSentryConfig` next.config, 클라이언트/서버 분리 설정
4. ErrorBoundary 전역 (`src/components/shared/ErrorBoundary.tsx`)
5. `cost-report.ts`: Supabase DB 용량 / Resend 월 발송수 / 카카오 일 호출 수 → 임계 초과 이메일

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run build` 통과 (Sentry sourcemap 빌드 포함)
- [ ] 브라우저에서 단지 페이지 접속 → PostHog에 `DANJI_VIEW` 이벤트 수신 확인
- [ ] 의도적 throw → Sentry Dashboard 에러 수신 확인

## Definition of Done
관측 인프라 완성. V0.9 베타 운영 중 이슈 즉시 감지 가능.
