# Step 1 (1-launch): pwa-push

## 목표
Serwist PWA + VAPID 웹 푸시를 구현한다. iOS Safari 16.4+에서 홈 화면 추가 + 푸시 수신. 미만 버전은 이메일 fallback.

## 전제 (Prerequisites)
- 1-launch step0 완료 (회원 인증)

## 적용 범위 (Scope)
- `src/app/sw.ts` — Serwist 서비스 워커
- `public/manifest.webmanifest` — 업데이트 (아이콘, shortcuts)
- `src/lib/notifications/web-push.ts` — VAPID 발송 함수
- `src/app/api/push/subscribe/route.ts` — 구독 등록
- `src/components/shared/PushPermissionPrompt.tsx` — 권한 요청 UI

## 도메인 컨텍스트 / 가드레일
- ADR-006: iOS 16.4+ 전용. `navigator.userAgent` 감지 → 미만 버전은 버튼 숨김
- 권한 요청: 즐겨찾기 등록 후 1회만 모달
- 거부 시 이메일 채널 자동 활성화 + 재요청 안내 페이지
- 410 Gone (invalid subscription) → `push_subscriptions.is_valid = false` + 이메일 fallback
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT 환경변수

## 작업 목록
1. VAPID 키 생성 스크립트 (`scripts/gen-vapid.ts`)
2. `subscribe/route.ts`: 구독 정보 → `push_subscriptions` INSERT (RLS: user_id만)
3. `web-push.ts`: `sendPush(subscription, payload)` — 410 시 is_valid=false
4. `PushPermissionPrompt.tsx`: iOS 버전 체크 → 모달 또는 숨김
5. Serwist `sw.ts`: precache shell + runtime cache (단지 상세)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run build` 통과 + `sw.js` 생성
- [ ] iOS 16.4+ 기기에서 홈 추가 가능 (수동 확인)
- [ ] 구독 등록 → `push_subscriptions` 레코드 생성
- [ ] 410 시뮬레이션 → `is_valid=false` 업데이트

## Definition of Done
PWA + 웹 푸시 인프라 완성. 알림 엔진(step3)에서 실제 발송 가능.
