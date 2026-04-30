# Step 18: reviews (커뮤니티 V0.9 선행 — 익명 후기)

## 목표
V0.9 베타에서 핵심 가치 "데이터 + 동네 의견"을 검증하기 위해 익명 후기 시스템을 조기 구현한다.  
V0.9에서는 로그인 없이 익명으로 작성 가능. V1.0 인증 연동 후 회원 후기로 자연 전환.

## 전제 (Prerequisites)
- Step 12 완료 (단지 상세 — 후기 탭 placeholder 포함)
- Step 15 완료 (observability — 욕설 필터 Sentry 연동)
- Step 16 완료 (admin-core — 모더레이션 큐 진입점)

## 적용 범위 (Scope)
- `supabase/migrations/0011_reviews.sql` — `reviews`, `review_reports` 테이블 + RLS
- `src/app/(public)/danji/[id]/reviews/` — 후기 목록 + 작성 폼
- `src/components/danji/ReviewCard.tsx`
- `src/lib/moderation/profanity.ts` — 한국어 욕설 필터
- `src/app/(admin)/admin/reviews/` — 어드민 모더레이션 큐

## 데이터 모델

```sql
reviews
  id              uuid PK DEFAULT gen_random_uuid()
  complex_id      uuid FK NOT NULL
  author_id       uuid FK NULL            -- V0.9: 항상 NULL (익명). V1.0 auth 이후 연결 가능
  nickname        text NULL               -- V0.9 선택 입력 (표시용, 인증 없음)
  body            text NOT NULL           -- max 1,000자 (Unicode 코드포인트)
  rating          smallint CHECK(1~5)
  ratings         jsonb                   -- {noise,parking,facility,management}: 1~5 (선택)
  gps_level       enum(L0, L1, L2, L3) DEFAULT 'L0'
  is_hidden       boolean DEFAULT false
  hidden_reason   text NULL
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

review_reports
  id              uuid PK
  review_id       uuid FK
  reporter_id     uuid FK NULL            -- V0.9: 비회원 신고도 허용 (IP rate-limit)
  reason          enum(spam, profanity, false_info, other)
  detail          text NULL
  status          enum(pending, resolved, dismissed) DEFAULT 'pending'
```

## 도메인 컨텍스트 / 가드레일

### V0.9 인증 전략 (임시)
- `author_id = NULL` — V0.9 전 후기는 익명 보존
- `nickname` 선택 입력 (미입력 시 "익명" 표시)
- RLS: `reviews` INSERT — **인증 없이도 허용** (Row Security 미적용, anon key로 삽입)
  - 단, IP 기반 rate-limit: 동일 IP + 동일 단지 24h 내 1건만
- V1.0 auth 적용 후: 이메일 일치 시 `author_id` 소급 연결 (optional UX)

### 욕설 필터
- 한국어 욕설 사전 기반 서버사이드 필터 (`profanity.ts`)
- `containsProfanity(body)` true → 400 반환 + Sentry warn
- 사전: `src/lib/data/profanity-words.json` (PROFANITY_WORDS 환경변수 대신 파일 관리)
- 오탐(False Positive) 이의 신청: 400 응답 시 `/support?type=profanity_appeal` 링크 표시

### 자동 hide 및 이중 제출 방지
- 신고 ≥ 5건 → `is_hidden=true` + 어드민 큐 enqueue
- 신고 SLA: 24h 이내 처리 (V0.9 베타 gate 조건)
- 폼 제출 멱등성 키: `idempotency_key = crypto.randomUUID()` → hidden input → 충돌 시 200 처리
- 본문 1,000자: Unicode 코드포인트 기준 (`[...body].length <= 1000`)

### 후기 RLS (V0.9 특례)
```sql
-- V0.9: anon 삽입 허용 (인증 없음)
CREATE POLICY "reviews_anon_insert" ON reviews FOR INSERT TO anon WITH CHECK (true);
-- V1.0 auth 적용 시 이 정책 교체 (1-launch step0 이후)
```

## 작업 목록
1. `0011_reviews.sql` 마이그레이션 + V0.9 특례 RLS (anon INSERT 허용)
2. `profanity.ts`: `containsProfanity(text)` + `src/lib/data/profanity-words.json` 사전
3. 후기 작성 Server Action: IP rate-limit → 욕설 필터 → `reviews` INSERT (author_id=NULL)
4. `ReviewCard.tsx`: 평점 별·세부 항목·GPS 인증 배지·작성일·신고 버튼
5. 단지 상세 후기 탭: 목록(최신순·평점순) + 작성 폼 (로그인 불필요)
6. 신고 모달 → `review_reports` INSERT → 5건 자동 hide
7. 어드민 모더레이션 큐: `is_hidden=true` 또는 `review_reports.status=pending` → 복원/삭제/무시
8. Vitest: 욕설 필터 + 자동 hide 임계 + IP rate-limit + 멱등성 키

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (욕설 필터 + 자동 hide + 멱등성)
- [ ] 로그인 없이 후기 작성 → 단지 상세 후기 탭에 즉시 표시
- [ ] 욕설 포함 후기 → 400 + 작성 불가 + 오탐 신청 링크
- [ ] 신고 5건 → `is_hidden=true` + 어드민 큐 enqueue
- [ ] 동일 IP 동일 단지 24h 내 2회 작성 → 429
- [ ] 어드민 모더레이션 큐에서 숨김/복원 동작

## V1.0 연동 계획
1-launch step0(인증) 완료 후:
- `reviews` RLS에서 anon INSERT 정책 제거 → auth.uid() 기반 INSERT 정책으로 교체
- `profiles.email`로 V0.9 익명 후기 소급 연결 UX (선택, 운영자 스크립트)
- GPS L1 인증(step19)은 V1.0 이후 배지 표시 활성화

## Definition of Done
단지온도 "데이터 + 동네 의견" 핵심 가치 V0.9에서 검증 가능. PRD Persona A JTBD 완성.
