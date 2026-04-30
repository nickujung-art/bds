# Step 10 (1-launch): legal-policy

## 목표
약관·개인정보처리방침·광고 정책 페이지와 회원 동의 흐름, 탈퇴 처리를 구현한다. V1.0 출시 법무 게이트.

## 전제 (Prerequisites)
- 1-launch step0 완료 (인증)

## 적용 범위 (Scope)
- `src/app/(public)/terms/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/ad-policy/page.tsx`
- `src/components/auth/ConsentModal.tsx` — 가입 시 동의 체크
- `src/app/(auth)/settings/page.tsx` — 동의 철회·탈퇴

## 도메인 컨텍스트 / 가드레일
- 법규 체크리스트 (V1.0 게이트):
  - [ ] 표시광고법: 분양·중개 광고 필수 표기 문구
  - [ ] 정보통신망법: 광고성 이메일 옵트인, 발송시간 22~07 금지
  - [ ] 개인정보보호법: 수집 항목·목적·보유·제3자 제공 명시. **처리위탁자 명단 필수 고지**
  - [ ] 14세 미만 가입 차단 (동의 체크박스에 명시)
  - [ ] **개인정보보호책임자(CPO) 지정·성명·연락처 개인정보처리방침에 명시** (법 제31조)
  - [ ] **접속기록 6개월 이상 보관** (법 제29조, 시행령 제30조) — `audit_logs` 보존 정책으로 충족
  - [ ] **정보주체 권리(열람·정정·삭제·처리정지) 행사 채널** 명시
- 탈퇴: 30일 grace → hard delete cron. 단, **정보주체가 즉시 삭제를 요청한 경우 별도 트랙**(아래 작업 목록 6번)
- 동의 3종: 필수(이용약관+개인정보), 선택(마케팅) 분리
- 마케팅 동의 철회 시 Resend 구독·웹 푸시 즉시 중단

## 적용 범위 (Scope) 추가
- `src/app/(public)/data-processors/page.tsx` — 개인정보 처리위탁 현황 페이지
- `src/app/api/privacy/delete-request/route.ts` — 즉시 삭제 요청 처리 Server Action

## 작업 목록
1. 각 정책 페이지 (마크다운 기반, SSG)
2. `ConsentModal.tsx`: 필수 2종 체크 없이 가입 불가 + 선택 마케팅 분리
3. `profiles.consent_terms_at`, `consent_privacy_at`, `consent_marketing_at` 기록
4. 설정 페이지: 동의 철회 + 탈퇴 신청 (grace 30일 안내)
5. 탈퇴 cron: 30일 후 `auth.users` hard delete (마케팅 비동의자 집계 익명 보존)
6. **즉시 삭제 요청 트랙**: 사용자 설정 > "개인정보 즉시 삭제 요청" 버튼 → Server Action → 7영업일 내 처리 안내 이메일 + 운영자 알림. 처리 후 `audit_logs`에 기록
7. **처리위탁자 페이지** (`/data-processors`): Supabase(DB·인증), Vercel(호스팅), Resend(이메일), Kakao(지도·로컬), PostHog(분석), Sentry(오류 추적) 목록 + 각 업체 개인정보처리방침 링크
8. **CPO 정보**: 개인정보처리방침에 이름·이메일·전화 명시 (`PRIVACY_CPO_NAME`, `PRIVACY_CPO_EMAIL` env)
9. **접속기록 보존 정책**: `audit_logs` 보존 기간 6개월 명시, 만료 레코드 cron 삭제 (집계 데이터 익명 보존)

### 이메일 지원 채널
- 사용자 문의 채널: 이메일 단일 창구. `SUPPORT_EMAIL` 환경변수로 주소 관리.
- 노출 위치: 푸터, 개인정보처리방침 하단, 이의신청 안내 페이지
- 지원 카테고리: 일반 문의, 욕설 필터 오탐 이의신청(`/support?type=profanity_appeal`), 개인정보 즉시 삭제 요청
- V1.5 이전: 운영자 개인 이메일로 수신. V1.5 이후: 헬프데스크 툴(채널톡·Freshdesk) 전환 검토

## 작업 목록 (추가)
10. **이메일 지원 채널 페이지** (`/support`): 지원 유형 선택 → 이메일 발송 폼 (Resend → `SUPPORT_EMAIL`) + `type=profanity_appeal` 쿼리 파라미터로 욕설 오탐 이의신청 폼 자동 선택

## 수용 기준 (Acceptance Criteria)
- [ ] 약관·개인정보·광고 정책 3페이지 접근 가능
- [ ] 필수 동의 미체크 시 가입 불가
- [ ] 탈퇴 신청 → 30일 후 삭제 예약 확인
- [ ] `/data-processors` 페이지 접근 가능, 위탁사 목록 6개 이상
- [ ] 즉시 삭제 요청 → 운영자 알림 이메일 발송 확인 (Vitest mock)
- [ ] 개인정보처리방침에 CPO 성명·연락처 표시
- [ ] `/support` 페이지 접근 가능, 이메일 발송 확인 (Vitest mock)
- [ ] `/support?type=profanity_appeal` → 오탐 이의신청 폼 자동 노출

## Definition of Done
법무 요건 충족. V1.0 출시 게이트 통과 가능.
