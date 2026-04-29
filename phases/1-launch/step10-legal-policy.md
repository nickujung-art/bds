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
  - [ ] 개인정보보호법: 수집 항목·목적·보유·제3자 명시
  - [ ] 14세 미만 가입 차단 (동의 체크박스에 명시)
- 탈퇴: 30일 grace → hard delete cron (회원 식별자만, 익명 집계 보존)
- 동의 3종: 필수(이용약관+개인정보), 선택(마케팅) 분리

## 작업 목록
1. 각 정책 페이지 (마크다운 기반, SSG)
2. `ConsentModal.tsx`: 필수 2종 체크 없이 가입 불가 + 선택 마케팅 분리
3. `profiles.consent_terms_at`, `consent_privacy_at`, `consent_marketing_at` 기록
4. 설정 페이지: 동의 철회 + 탈퇴 신청 (grace 30일 안내)
5. 탈퇴 cron: 30일 후 `auth.users` hard delete

## 수용 기준 (Acceptance Criteria)
- [ ] 약관·개인정보·광고 정책 3페이지 접근 가능
- [ ] 필수 동의 미체크 시 가입 불가
- [ ] 탈퇴 신청 → 30일 후 삭제 예약 확인

## Definition of Done
법무 요건 충족. V1.0 출시 게이트 통과 가능.
