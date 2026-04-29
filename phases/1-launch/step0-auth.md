# Step 0 (1-launch): auth

## 목표
NextAuth.js v5 + Naver OAuth + 이메일 매직링크 + Supabase JWT 동기화를 구현한다. 카페 닉네임 자가 신고, 슈퍼어드민 화이트리스트, signup_source 추적 포함.

## 전제 (Prerequisites)
- 0-mvp 전체 완료
- 사용자가 네이버 디벨로퍼스 OAuth 앱 등록 + `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` 설정

## 적용 범위 (Scope)
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/lib/auth/config.ts` — NextAuth 설정 (Naver + Resend Magic Link)
- `src/lib/auth/supabase-sync.ts` — Supabase JWT 발급
- `src/app/(public)/login/page.tsx` — 로그인 UI
- `src/components/shared/UserMenu.tsx` — 로그인/아웃 메뉴
- `supabase/migrations/0010_auth_profiles.sql` — profiles 확장 컬럼

## 도메인 컨텍스트 / 가드레일
- ADR-011: NextAuth v5 + Naver + Supabase JWT 동기화
- ADR-044: 카페 닉네임 자가 신고 (`profiles.cafe_nickname`) + `signup_source` 추적
- 슈퍼어드민: `SUPERADMIN_EMAIL` env → `profiles.role = 'admin'` 자동 부여
- URL 힌트 `?from=cafe&n={닉네임}` → 가입 폼 prefill → `signup_source = 'cafe_link'`
- `linkAccount`: `allowDangerousEmailAccountLinking = false` (보안 기본값)
- 탈퇴: 30일 grace period → hard delete cron

## 작업 목록
1. `lib/auth/config.ts`: NaverProvider + Resend EmailProvider. session 콜백에서 Supabase JWT 발급
2. `supabase-sync.ts`: `createClient` with service_role → JWT 발급 → 클라에 cookie로 전달
3. `profiles` 마이그레이션: `cafe_nickname`, `cafe_verified_at`, `signup_source`, `naver_id_hash`
4. 로그인 페이지: 네이버 버튼(1순위 강조) + 이메일 매직링크(보조)
5. URL 힌트 파라미터 → 카페 닉네임 prefill
6. `UserMenu.tsx`: 로그인 상태별 분기 (아바타 + 즐겨찾기 + 설정 + 로그아웃)
7. 미들웨어 업데이트: role 기반 `/admin`, `/(auth)` 보호

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run build` 통과
- [ ] 네이버 OAuth 로그인 → `profiles` 레코드 생성
- [ ] 이메일 매직링크 → 이메일 수신 + 인증 완료
- [ ] `?from=cafe&n=닉네임` URL → 가입 폼에 카페 닉네임 자동 입력
- [ ] `SUPERADMIN_EMAIL` 계정 → `profiles.role = 'admin'` 자동 부여

## Definition of Done
인증 시스템 완성. 즐겨찾기(step2), 알림(step3), 광고(step8) 회원 의존 기능 진입 가능.
