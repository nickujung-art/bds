# Phase 4: 커뮤니티 기초 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

후기에 댓글 달기(COMM-01), GPS L1 배지 활성화(COMM-02), 단지→카페 외부 링크(COMM-03), 신고 통합 큐(COMM-04), 주간 카페 가입 코드(COMM-05), K-apt 부대시설 데이터(DATA-01), 신축 분양 정보(DATA-02), 주간 다이제스트 이메일(NOTIF-01), 알림 토픽 구독(NOTIF-02).

Persona A(실수요자)의 "이웃 의견" 수요 충족 + 커뮤니티 참여 기능 + 데이터 깊이 확장.
V1.5 마일스톤. transactions 대원칙(`cancel_date IS NULL AND superseded_by IS NULL`) 유지 필수.

</domain>

<decisions>
## Implementation Decisions

### 댓글 구조 (COMM-01)
- **D-01:** 1-depth flat 댓글. `comments` 테이블 신규 생성: `(id UUID PK, review_id UUID FK complex_reviews, user_id UUID FK profiles, content TEXT CHECK(10~500자), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. parent_id 없음.
- **D-02:** 댓글을 후기 카드 하단에 인라인 표시. 기본 3개 표시 → "댓글 N개 더 보기" 토글.
- **D-03:** 로그인 회원만 댓글 작성 가능. RLS: public select, auth.uid() insert, owner update/delete.
- **D-04:** 댓글 신고는 기존 `reports` 테이블 통합 — `target_type` enum에 `'comment'` 추가. 어드민 신고 큐 UI는 Phase 3에서 완성됨.

### GPS 인증 흐름 (COMM-02)
- **D-05:** GPS 캡처는 후기 작성 중 선택사항 — ReviewForm에 "현재 위치로 인증" 버튼 추가. 버튼 클릭 시 `navigator.geolocation.getCurrentPosition()` 호출.
- **D-06:** GPS 인증 실패/거부 시 `gps_verified=false`로 후기 제출 허용. 강제 아님.
- **D-07:** 서버 검증: 클라이언트에서 lat/lng를 Server Action에 전달 → PostGIS `ST_DWithin(complex.location, ST_Point(lng, lat)::geography, 100)` 로 단지 중심 ±100m 검증 → `gps_verified` 플래그 저장. 스푸핑 저항 (클라이언트 신뢰 안 함).

### 신축·분양권 데이터 모델 (DATA-02)
- **D-08:** 신축 전용 별도 테이블 신규 생성. `transactions` 테이블 오염 없이 대원칙 유지.
  - `new_listings(id, complex_id NULLABLE FK complexes, name TEXT, region TEXT, price_min INT, price_max INT, total_units INT, move_in_date DATE, source_code TEXT, fetched_at TIMESTAMPTZ)`
  - `presale_transactions(id, listing_id FK new_listings, area NUMERIC, floor INT, price INT, deal_date DATE, cancel_date DATE NULLABLE, superseded_by UUID NULLABLE, created_at TIMESTAMPTZ)`
- **D-09:** MOLIT API 자동 연동으로 분양 데이터 수집. 기존 `src/services/` 어댑터 패턴 준수.
- **D-10:** 랜딩 페이지(`src/app/page.tsx`)에 별도 '분양' 섹션 추가. 기존 nav의 `href="#"` 분양 링크를 `/presale`로 활성화. 별도 `/presale` 페이지 (ISR).
- **D-11:** 분양 카드 리스트 표시: 단지명, 지역, 분양가범위, 총세대수, 입주예정일.
- **D-12:** 일배치 cron(`/api/cron/daily`)에 분양 API 콜 통합. Vercel Hobby 1일 1회 한도 내.

### Claude's Discretion
아래 영역은 사용자가 논의하지 않았으므로 Claude가 기존 패턴에 맞게 구현:
- **COMM-03:** 카페 외부 링크 — 단지명+지역으로 네이버 카페 검색 URL 생성 (`https://cafe.naver.com/ArticleSearchList.nhn?search.query={단지명}`). 단지 상세 후기 섹션 상단 고정.
- **COMM-04:** 신고 통합 큐 SLA ≤ 24h — 어드민 `/admin/reports`에 24h 경과 여부 컬럼/뱃지 추가. 별도 알림 없음.
- **COMM-05:** 주간 회전 카페 가입 코드 — `cafe_join_codes(id, code TEXT, week_start DATE, created_at)` 테이블. GitHub Actions 주간 cron으로 코드 생성. 어드민 `/admin/status`에서 현재 코드 확인.
- **DATA-01:** K-apt 부대시설 — 기존 `src/services/kapt.ts` 어댑터 활용. `facilities` 테이블 확장 또는 `complex_facilities` 신규 생성. 단지 상세 시설 탭에 표시.
- **NOTIF-01:** 주간 다이제스트 이메일 — 기존 Resend 패턴 활용 (`src/lib/notifications/deliver.ts`). 관심 단지(favorites) 기반 요약 이메일. GitHub Actions 주간 cron. Resend 3,000건/월 한도 고려.
- **NOTIF-02:** 알림 토픽 채널 구독 — `notification_topics(id, user_id, topic TEXT CHECK('high_price'|'presale'|'complex_update'), created_at)`. 프로필 설정 페이지에서 토픽 선택. 기존 push_subscriptions + Resend 이중 전달.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 아키텍처 규칙
- `CLAUDE.md` — 모든 쿼리 대원칙, RLS 필수, createSupabaseAdminClient() 경유, 서비스 어댑터 격리
- `.planning/STATE.md` — 프로젝트 결정 로그, Vercel Hobby 한도, GitHub Actions 5분 cron 패턴

### 요구사항 및 로드맵
- `.planning/REQUIREMENTS.md` — COMM-01~05, DATA-01~02, NOTIF-01~02 전체 요건 정의
- `.planning/ROADMAP.md` §Phase 4 — 목표, 성공 기준 5개

### DB 스키마 (기존)
- `supabase/migrations/20260430000016_reviews.sql` — `complex_reviews` 스키마 (`gps_verified BOOLEAN DEFAULT FALSE` 포함)
- `supabase/migrations/20260506000002_reports.sql` — `reports` 스키마 (`target_type` enum: review/user/ad — Phase 4에서 'comment' 추가)
- `supabase/migrations/20260430000006_notifications.sql` — `notifications` 스키마, 5분 워커 polling index
- `supabase/migrations/20260430000009_rls.sql` — RLS 정책 패턴 참조

### 기존 코드 패턴
- `src/services/kapt.ts` — K-apt 어댑터 패턴 (DATA-01 구현 참조)
- `src/lib/notifications/deliver.ts` — Resend + Web Push 전달 패턴 (NOTIF-01/02 구현 참조)
- `src/components/reviews/ReviewForm.tsx` — GPS 버튼 추가 대상 (COMM-02)
- `src/components/reviews/ReviewList.tsx` — GPS 배지 UI 이미 존재 (line 78)
- `src/app/api/worker/notify/route.ts` — 5분 cron 워커 패턴

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `complex_reviews.gps_verified` boolean: 준비됨. ReviewList.tsx line 78에 배지 UI 이미 존재. L1 검증 로직만 추가하면 됨.
- `reports` 테이블 + 어드민 신고 큐 UI: Phase 3에서 완성. target_type enum에 'comment' 추가만 필요.
- `src/lib/notifications/deliver.ts`: Resend + Web Push 이중 전달 이미 구현됨. 다이제스트 이메일 재활용 가능.
- `src/services/kapt.ts`: K-apt API 어댑터 존재. 부대시설 엔드포인트 추가 가능.

### Established Patterns
- **RLS 패턴**: public read + `auth.uid() = user_id` insert + owner update/delete (complex_reviews 참조)
- **Admin 패턴**: `exists (select 1 from profiles where id = auth.uid() and role in ('admin','superadmin'))` guard
- **Server Action**: `'use server'` + `requireAdmin()` 가드 (Phase 3 `src/lib/auth/admin-actions.ts`)
- **ISR 패턴**: `createReadonlyClient()` + `export const revalidate = 60`
- **GitHub Actions cron**: `.github/workflows/notify-worker.yml` 5분 패턴 → 주간 다이제스트용 주간 cron 추가

### Integration Points
- `comments` → `complex_reviews` (review_id FK)
- `presale_transactions` → `new_listings` (listing_id FK)
- `new_listings.complex_id` → `complexes` (nullable — 미매칭 신축 단지 허용)
- `notification_topics` → `profiles` (user_id FK)
- GPS Server Action → `complex_reviews.gps_verified` 업데이트

</code_context>

<specifics>
## Specific Ideas

- 분양 섹션은 랜딩 페이지 기존 nav의 `href="#"` 분양 링크를 `/presale`로 활성화하는 방식으로 연결
- GPS 배지는 ReviewList.tsx line 78 기존 UI 활용 — 추가 디자인 불필요
- 댓글 신고 UX는 후기 신고와 동일한 패턴 재사용 (ReportButton 컴포넌트)

</specifics>

<deferred>
## Deferred Ideas

- GPS L2+L3 인증 (다회 방문 패턴, 우편·관리비) → Phase 6 (AUTH-01)
- 카페 글 NLP 단지 매칭 → Phase 7 (DIFF-02)
- 분양 어드민 수동 입력 UI → 자동 연동으로 대체됨 (Claude's Discretion)
- 알림 토픽별 이메일 vs 웹 푸시 선택 → NOTIF-02 구현 시 Claude 재량

</deferred>

---

*Phase: 4-커뮤니티-기초*
*Context gathered: 2026-05-07*
