# Step 10 (2-community): cafe-signup-code

## 목표
카페 공지에 매주 새로운 가입 코드를 게시하고, 사이트 가입 시 코드 입력으로 카페 회원 임시 인증을 부여한다. ADR-044 자가 신고 + 운영자 수동 검증의 보완책.

## 전제 (Prerequisites)
- 1-launch step0 완료 (인증 + profiles)
- 1-launch step12 완료 (어드민 확장)

## 배경
ADR-044: 네이버는 카페 회원 정보 API 미제공. 카페 닉네임 자가 신고 + 운영자 수동 대조가 기존 방식이나 확장성 한계. 주간 회전 코드로 카페 공지 열람 여부를 간접 검증한다.

## 적용 범위 (Scope)
- `supabase/migrations/0019_cafe_codes.sql` — `cafe_signup_codes` 테이블
- `src/app/(auth)/settings/verify-cafe/page.tsx` — 코드 입력 페이지
- 어드민: 주간 코드 자동 생성·만료 관리

## 데이터 모델

```sql
cafe_signup_codes
  id              uuid PK
  code            text UNIQUE NOT NULL    -- 6자리 대문자 영숫자 (예: "ABC123")
  week_start      date NOT NULL           -- 해당 주 월요일
  expires_at      timestamptz NOT NULL    -- week_start + 7일
  created_at      timestamptz DEFAULT now()
  used_count      int DEFAULT 0

profiles
  -- 기존 테이블에 추가
  cafe_code_verified_at   timestamptz NULL   -- 코드 입력 성공일
  cafe_code_week          date NULL          -- 인증한 코드의 week_start
```

## 도메인 컨텍스트 / 가드레일
- 코드 생성: `crypto.randomBytes(3).toString('hex').toUpperCase()` (6자리) — 충분한 엔트로피
- 코드 저장: DB에 **평문 저장** (코드 자체가 시크릿이 아님, 공개 공지용). 단, 코드 추측 방어를 위해 입력 시 rate-limit 5회/h 적용
- 만료 코드 입력 → 400 + "이 코드는 만료됐습니다. 최신 카페 공지를 확인하세요." 안내
- `cafe_code_verified_at` 마킹은 `cafe_verified_at` (운영자 수동 검증)과 별개 — 코드 인증은 낮은 신뢰도, 닉네임 수동 검증이 높은 신뢰도
- 주간 코드 자동 생성 cron: 매주 월 KST 00:01 생성. 운영자가 카페에 수동 게시 (자동 게시는 V3-step10)
- audit_logs: 코드 생성·사용 이벤트 기록

## 작업 목록
1. `0019_cafe_codes.sql` + `profiles` 컬럼 추가 마이그레이션
2. 코드 생성 cron (`"0 15 * * 1"` UTC 15시 = KST 월 00시)
3. 코드 입력 Server Action: 유효성 → 만료 체크 → rate-limit → `profiles.cafe_code_verified_at` 갱신
4. 설정 페이지에 코드 입력 UI
5. 어드민: 코드 목록·만료 현황·used_count 모니터
6. Vitest: 만료 코드 거부 + rate-limit 5회 초과 거부 + audit_log 기록

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 유효 코드 입력 → `cafe_code_verified_at` 갱신
- [ ] 만료 코드 → 400
- [ ] 5회 연속 실패 → 429
- [ ] 코드 생성 cron → 매주 신규 코드 생성 확인

## Definition of Done
카페 가입 코드 시스템 완성. ADR-044 카페 회원 인증 보완. 운영자 수동 검증 부담 경감.
