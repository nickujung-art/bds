# Step 0 (2-community): reviews

> **⚠️ V0.9로 이동됨**: 이 기능은 V0.9 community 선행 구현으로 `phases/0-mvp/step18-reviews.md`에서 구현됩니다.  
> V0.9와의 주요 차이: V0.9는 익명(`author_id=NULL`) + anon RLS INSERT. V1.0 이후 auth 연동 시 이 파일의 RLS 정책으로 교체.

## 목표
익명 후기 작성·조회·신고·모더레이션 기능을 구현한다. GPS 인증(L1, step1)과 독립적으로 후기 작성 가능하되, 인증 배지는 L1 완료 후 표시.

## 전제 (Prerequisites)
- 1-launch step0 완료 (인증)
- 1-launch step10 완료 (법무 — 후기 관련 약관 포함 여부 확인)

## 적용 범위 (Scope)
- `supabase/migrations/0011_reviews.sql` — `reviews`, `review_reports` 테이블 + RLS
- `src/app/(public)/danji/[id]/reviews/` — 후기 목록 + 작성 폼
- `src/components/danji/ReviewCard.tsx`
- `src/lib/moderation/profanity.ts` — 한국어 욕설 필터
- `src/app/(admin)/admin/reviews/` — 어드민 모더레이션 큐

## 데이터 모델

```sql
reviews
  id              uuid PK
  complex_id      uuid FK NOT NULL
  author_id       uuid FK NULL            -- NULL = 탈퇴 회원 (익명 보존)
  body            text NOT NULL           -- max 1,000자
  rating          smallint CHECK(1~5)
  ratings         jsonb                   -- {noise,parking,facility,management}: 1~5
  gps_level       enum(L0, L1, L2, L3) DEFAULT 'L0'
  is_hidden       boolean DEFAULT false   -- 신고 처리 후 숨김
  hidden_reason   text NULL
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

review_reports
  id              uuid PK
  review_id       uuid FK
  reporter_id     uuid FK
  reason          enum(spam, profanity, false_info, other)
  detail          text NULL
  status          enum(pending, resolved, dismissed) DEFAULT 'pending'
  resolved_at     timestamptz NULL
  resolver_id     uuid FK NULL            -- admin
```

## 도메인 컨텍스트 / 가드레일
- RLS: `reviews` — author_id=auth.uid()만 INSERT. SELECT는 `is_hidden=false` 전체 공개. UPDATE/DELETE는 author_id=auth.uid()만 (자가 수정·삭제)
- RLS: `review_reports` — reporter_id=auth.uid()만 INSERT
- **욕설 필터**: 한국어 욕설 사전 기반 서버사이드 필터. `profanity.ts`가 `contains(body)` true이면 400 반환 + 운영자 Sentry 알림. 필터 사전은 `PROFANITY_WORDS` 환경변수 또는 별도 JSON 파일
- **자동 hide 임계**: 신고 ≥ 5건이면 `is_hidden=true` + 어드민 큐 enqueue (운영자가 복원·영구삭제 결정)
- **신고 SLA**: 어드민 큐 24h 이내 처리 (gate 조건)
- 후기 본문은 마크다운 미지원. 순수 텍스트 + `rehype-sanitize` allowlist 통과
- `ratings` jsonb는 선택 항목. 전체 평점(`rating`)만 필수
- 작성자 탈퇴 시 `author_id = NULL`로 갱신, 후기 본문 익명 보존 (집계 유지)

### 본문 글자 수 경계 (멀티바이트)
- `body max 1,000자` 는 **Unicode 코드포인트 기준** (한글 1자 = 1). byte 수 기준이 아님
- 서버 Server Action에서 `[...body].length <= 1000` 검증 (JS spread로 코드포인트 분리)
- zod: `z.string().max(1000)` 는 코드포인트 기준으로 동작 — 별도 처리 불필요

### 이중 제출(Double-Submit) 방지
- 후기 작성 Server Action에 멱등성 키 적용:
  - 클라이언트: 폼 제출 시 `idempotency_key = crypto.randomUUID()` 생성 → hidden input
  - 서버: `(author_id, complex_id, idempotency_key)` UNIQUE 제약. 동일 키 충돌 → 200 (이미 제출됨)으로 처리 (409 아님 — UX 일관성)
- 폼 제출 버튼: 클릭 즉시 비활성화 + 스피너 표시

### 욕설 필터 오탐(False Positive) 이의 신청 채널
- 후기 차단(400) 응답 시 UI에 "오탐 신고" 링크 표시 → `/support?type=profanity_appeal` 페이지
- 지원 페이지에서 원문 + 연락처 입력 → 운영자 Resend 이메일 (수동 검토)
- 자동 해제 없음. 운영자만 `PROFANITY_WORDS` 사전 갱신 가능

## 작업 목록
1. `0011_reviews.sql` 마이그레이션 + RLS
2. `profanity.ts`: `containsProfanity(text): boolean` + 한국어 욕설 사전 JSON
3. 후기 작성 Server Action: 로그인 확인 → 욕설 필터 → `reviews` INSERT → 신고 5건 자동 hide hook
4. `ReviewCard.tsx`: 평점 별·세부 항목·GPS 인증 배지·작성일·신고 버튼
5. 단지 상세 후기 탭: 목록(최신순·평점순) + 작성 버튼 (로그인 유도)
6. 신고 모달 → `review_reports` INSERT → 5건 도달 시 자동 hide
7. 어드민 모더레이션 큐: `is_hidden=true` 또는 `review_reports.status=pending` 목록 → 복원/영구삭제/무시
8. Vitest: 욕설 필터 단위 테스트 (recall ≥ 95% 기준 사전 평가 필요)
9. Playwright E2E: 후기 작성 → 목록 표시 → 신고 → 어드민 hide 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (욕설 필터 + 자동 hide 임계 단위 테스트)
- [ ] 후기 작성 → 단지 상세에 즉시 반영
- [ ] 욕설 포함 후기 → 400 + 작성 불가
- [ ] 신고 5건 → `is_hidden=true` + 어드민 큐 enqueue
- [ ] 탈퇴 회원 후기 → `author_id=NULL`, 본문 보존
- [ ] RLS: 타인 후기 DELETE 시도 → 차단

## Definition of Done
익명 후기 시스템 기반 완성. GPS 인증(step1) 연동으로 신뢰도 배지 활성화 가능.
