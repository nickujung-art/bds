# Phase 4: 커뮤니티 기초 - Research

**Researched:** 2026-05-07
**Domain:** 커뮤니티 참여 기능 + K-apt/MOLIT 데이터 확장 + 알림 인프라
**Confidence:** HIGH (기존 코드 직접 확인) / MEDIUM (외부 API 필드)

---

## Summary

Phase 4는 신규 코드 작성보다 **기존 인프라를 최대한 재활용**하는 성격이 강하다. `complex_reviews`, `reports`, `notifications`, `deliver.ts`, `kapt.ts`, GitHub Actions cron 패턴 — 모두 Phase 1~3에서 완성됐다. 9개 요구사항(COMM-01~05, DATA-01~02, NOTIF-01~02) 중 순수 신규 개발이 필요한 부분은 댓글 시스템(COMM-01), GPS 서버 검증(COMM-02), 분양 API 어댑터(DATA-02), 알림 토픽 구독(NOTIF-02)이다.

핵심 위험 요소는 두 가지다. 첫째, `reports.target_type` enum에 'comment'를 추가하는 마이그레이션은 기존 RLS 정책도 함께 점검해야 한다(PostgreSQL enum 추가는 DDL ALTER 방식). 둘째, MOLIT 분양권전매 API는 기존 매매 API와 엔드포인트 구조가 유사하나 `new_listings` 테이블 매핑 로직(단지코드 없이 이름+지역으로 `complexes.id` 매칭)에서 골든레코드 원칙 충돌 위험이 있다.

**Primary recommendation:** Wave 0에서 모든 마이그레이션을 단일 파일로 처리 후 `supabase db push` → Wave 1~N에서 기능 구현. 댓글·GPS·어드민 SLA는 단지 상세 페이지 기반이므로 병렬 실행 가능. 분양/알림 토픽은 신규 페이지 생성이라 별도 Wave로 분리.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `comments` 테이블 신규: `(id UUID PK, review_id UUID FK complex_reviews, user_id UUID FK profiles, content TEXT CHECK(10~500자), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. parent_id 없는 1-depth flat.
- **D-02:** 댓글을 후기 카드 하단 인라인 표시. 기본 3개 → "댓글 N개 더 보기" 토글.
- **D-03:** RLS: public select, auth.uid() insert, owner update/delete.
- **D-04:** 댓글 신고 = `reports.target_type` enum에 'comment' 추가.
- **D-05:** GPS 버튼은 선택사항 — ReviewForm에 "현재 위치로 인증" 버튼.
- **D-06:** GPS 실패/거부 시 `gps_verified=false`로 제출 허용.
- **D-07:** 서버 검증: PostGIS `ST_DWithin(complex.location, ST_Point(lng, lat)::geography, 100)`.
- **D-08:** `new_listings` + `presale_transactions` 테이블 신규 (transactions 오염 없음).
- **D-09:** MOLIT API 자동 연동, `src/services/` 어댑터 패턴 준수.
- **D-10:** `/presale` ISR 페이지 + 랜딩 nav 분양 링크 활성화.
- **D-11:** 분양 카드: 단지명, 지역, 분양가범위, 총세대수, 입주예정일.
- **D-12:** 일배치 cron(`/api/cron/daily`)에 분양 API 통합.

### Claude's Discretion
- **COMM-03:** 네이버 카페 검색 URL (`https://cafe.naver.com/ArticleSearchList.nhn?search.query={단지명}`). 단지 상세 후기 섹션 상단 고정.
- **COMM-04:** 어드민 `/admin/reports`에 24h SLA 컬럼/배지 추가. 별도 알림 없음.
- **COMM-05:** `cafe_join_codes(id, code TEXT, week_start DATE, created_at)`. GitHub Actions 주간 cron.
- **DATA-01:** `src/services/kapt.ts` 어댑터 활용. `facility_kapt` 확장 또는 `complex_facilities` 신규. 단지 상세 시설 탭 표시.
- **NOTIF-01:** Resend 주간 다이제스트, `favorites` 기반. GitHub Actions 주간 cron. 3,000건/월 한도 고려.
- **NOTIF-02:** `notification_topics(id, user_id, topic TEXT CHECK(...), created_at)`. 프로필 설정 UI.

### Deferred Ideas (OUT OF SCOPE)
- GPS L2+L3 인증 → Phase 6
- 카페 글 NLP 단지 매칭 → Phase 7
- 분양 어드민 수동 입력 UI
- 알림 토픽별 이메일 vs 웹 푸시 선택 → NOTIF-02 구현 시 Claude 재량
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMM-01 | 후기 댓글 (단순 텍스트, RLS, 신고 가능) | comments 테이블 스키마 + RLS 패턴 (complex_reviews 대조) 확인 |
| COMM-02 | GPS L1 인증 배지 활성화 (단지 ±100m) | PostGIS ST_DWithin, complexes.location geography 타입 확인 |
| COMM-03 | 단지 페이지 → 카페 검색 외부 링크 | 네이버 카페 URL 패턴 확인 |
| COMM-04 | 신고 통합 큐 + SLA ≤ 24h | /admin/reports 기존 UI + created_at 기반 SLA 계산 방법 확인 |
| COMM-05 | 주간 회전 카페 가입 코드 시스템 | GitHub Actions 주간 cron + cafe_join_codes 테이블 설계 |
| DATA-01 | K-apt 부대시설 데이터 (단지 상세 시설 탭) | AptBasisInfoServiceV3 API 필드, facility_kapt 기존 테이블 확인 |
| DATA-02 | 신축 분양 정보 + 분양권 거래 분리 UI | MOLIT 분양권전매 API 엔드포인트, new_listings 스키마 설계 |
| NOTIF-01 | 주간 다이제스트 이메일 (관심 단지 요약) | deliver.ts 패턴 + Resend 3,000건/월 한도 처리 전략 |
| NOTIF-02 | 알림 토픽 채널 구독 (신고가·분양 등) | notification_topics 테이블 + 기존 push_subscriptions 통합 |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Category | Impact on Phase 4 |
|-----------|----------|-------------------|
| 모든 외부 API 호출은 `src/services/` 어댑터에서만 | Architecture | K-apt 부대시설 + MOLIT 분양 어댑터는 src/services/에 신규 파일 |
| Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만 | Architecture | 댓글 Client Component는 Server Action만 호출 |
| RLS 정책 필수 (`supabase/migrations/`에 포함) | Security | 5개 신규 테이블 모두 RLS 마이그레이션 포함 |
| `complexes` 골든 레코드 — 위치+이름 복합 매칭 | Data Integrity | new_listings.complex_id는 nullable FK + 좌표+이름 매칭 필수 |
| `cancel_date IS NULL AND superseded_by IS NULL` | Data Integrity | presale_transactions 쿼리에도 동일 원칙 적용 |
| 광고 쿼리 `now() BETWEEN starts_at AND ends_at AND status='approved'` | Security | Phase 4에서 광고 쿼리 없으므로 직접 영향 없음 |
| Vercel Hobby: 1일 cron 1회 | Infra | 일배치 `/api/cron/daily`에 분양 API 통합 (D-12) |
| GitHub Actions: 5분 cron 가능 | Infra | 주간 다이제스트/카페 코드는 GitHub Actions로 |
| AI 슬롭 금지 (backdrop-blur, gradient-text 등) | UI | 분양 페이지 · 댓글 UI 설계 시 준수 |
| TDD: 테스트 먼저 작성 후 구현 | Process | Wave 0에서 RED 테스트 스캐폴드 생성 |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 댓글 CRUD | API / Server Action | — | 쿼리는 서버에서만 (CLAUDE.md CRITICAL) |
| 댓글 인라인 표시 (기본 3개) | 서버 컴포넌트 (RSC) | Client 토글 | 첫 3개는 SSR, "더 보기"는 Client State |
| GPS 위치 캡처 | Browser / Client | — | `navigator.geolocation`은 브라우저 전용 |
| GPS 서버 검증 (ST_DWithin) | API / Server Action | — | 스푸핑 저항 필수. 클라이언트 신뢰 안 함 |
| K-apt 부대시설 페치 | API / Backend (cron) | — | src/services/kapt.ts 어댑터, 일배치 |
| MOLIT 분양 API 페치 | API / Backend (cron) | — | src/services/molit-presale.ts 신규 어댑터 |
| 분양 목록 렌더 | 프론트엔드 서버 (ISR) | — | `export const revalidate = 3600` 권장 |
| 신고 SLA 계산 | 프론트엔드 서버 (SSR) | — | `now() - created_at > 24h` 서버에서 계산 |
| 카페 가입 코드 생성 | GitHub Actions (cron) | — | Vercel Hobby 한도 외부 |
| 주간 다이제스트 발송 | GitHub Actions (cron) | Resend | Vercel Hobby 한도 외부 |
| 알림 토픽 선택 UI | Client Component | Server Action | 사용자 인터랙션 + DB 쓰기 |
| 알림 전달 (topics 기반) | GitHub Actions (worker) | — | 기존 5분 notify-worker 패턴 연장 |

---

## Standard Stack

### Core (기존 확정, 변경 없음)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| Next.js 15 App Router | 15.x | RSC, Server Actions, ISR | HIGH [VERIFIED: package.json] |
| Supabase Postgres + PostGIS | — | DB, RLS, ST_DWithin | HIGH [VERIFIED: migrations/] |
| @supabase/ssr | — | Server-side 쿠키 인증 | HIGH [VERIFIED: src/lib/supabase/] |
| Resend | — | 트랜잭션 이메일 | HIGH [VERIFIED: deliver.ts] |
| web-push | — | VAPID 웹 푸시 | HIGH [VERIFIED: deliver.ts] |
| Zod v4 | — | API 응답 스키마 검증 | HIGH [VERIFIED: kapt.ts] |
| Vitest + happy-dom | — | 단위 테스트 | HIGH [VERIFIED: vitest.config.ts] |
| Playwright | — | E2E 테스트 | HIGH [VERIFIED: .github/workflows/] |

### 신규 의존성 없음

Phase 4는 외부 신규 패키지 설치가 필요 없다. PostGIS, Resend, web-push, Zod 모두 이미 설치됨.

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser]
  GPS 캡처 버튼 → lat/lng
        ↓
[Server Action: submitReviewWithGps]
  ST_DWithin(complex.location, ST_Point(lng, lat)::geography, 100)
  → gps_verified = true/false
  → complex_reviews UPDATE
        ↓
[Supabase Postgres]
  complex_reviews.gps_verified 저장

[Browser]
  댓글 작성 폼 → content
        ↓
[Server Action: submitComment]
  comments INSERT (review_id FK)
        ↓
[RSC: ReviewCard 재렌더]
  댓글 기본 3개 서버 렌더
  + "N개 더 보기" Client 토글

[GitHub Actions: Weekly Digest]
  매주 월요일 09:00 KST
        ↓
[POST /api/worker/digest]
  favorites → 관심 단지 목록
  notifications 테이블 Insert (type='digest')
        ↓
[GitHub Actions: 5min notify-worker]
  notifications polling → Resend 이메일 전송

[GitHub Actions: Weekly Cafe Code]
  매주 월요일 09:05 KST
        ↓
[POST /api/worker/cafe-code]
  cafe_join_codes INSERT (nanoid 8자)

[GitHub Actions: Rankings Cron (기존)]
  매 시간 → /api/cron/rankings

[Vercel Cron: Daily (기존, D-12 통합)]
  매일 04:00 KST → /api/cron/daily
  → MOLIT 분양권전매 API fetch
  → new_listings UPSERT
  → presale_transactions UPSERT
```

### Recommended Project Structure (Phase 4 신규)

```
src/
├── services/
│   ├── kapt.ts              # 기존 (fetchComplexList) — fetchKaptBasicInfo 추가
│   └── molit-presale.ts     # 신규 — MOLIT 분양권전매 API 어댑터
├── lib/
│   ├── auth/
│   │   ├── review-actions.ts    # 기존 — submitReviewWithGps 추가
│   │   └── comment-actions.ts   # 신규
│   ├── notifications/
│   │   ├── deliver.ts           # 기존 — deliverPendingNotifications 유지
│   │   └── digest.ts            # 신규 — buildWeeklyDigest()
│   └── data/
│       ├── comments.ts          # 신규
│       └── presale.ts           # 신규
├── components/
│   └── reviews/
│       ├── ReviewForm.tsx       # 기존 — GPS 버튼 추가
│       ├── ReviewList.tsx       # 기존 — 댓글 인라인 추가
│       └── CommentSection.tsx   # 신규
├── app/
│   ├── presale/
│   │   └── page.tsx            # 신규 ISR
│   ├── profile/
│   │   └── page.tsx            # 기존 또는 신규 — 토픽 선택 UI 추가
│   └── api/
│       ├── cron/
│       │   └── daily/
│       │       └── route.ts    # 신규 (분양 포함)
│       └── worker/
│           ├── notify/route.ts  # 기존
│           ├── digest/route.ts  # 신규
│           └── cafe-code/route.ts # 신규
└── supabase/migrations/
    └── 20260507000003_phase4.sql  # 신규 (5개 테이블 + enum 추가)
```

---

## Domain Research Findings

### 1. K-apt 부대시설 API (DATA-01)

**기존 테이블 상황:** `facility_kapt` 테이블이 이미 존재함 (`20260430000004_facility.sql`). 현재 필드: `kapt_code, management_cost_m2, parking_count, data_month`.

**K-apt 기본정보 API:**
- 엔드포인트: `http://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3`
  [CITED: data.go.kr/data/15058453]
- 파라미터: `ServiceKey`, `kaptCode` (단지코드)
- 주요 응답 필드 (V1 → V3 공통 확인):
  - `kaptCode` — K-apt 단지코드
  - `kaptName` — 단지명
  - `kaptdaCnt` — 세대수
  - `kaptDongCnt` — 동수
  - `kaptMparea_60`, `kaptMparea_85`, `kaptMparea_135`, `kaptMparea_136` — 전용면적별 세대수
  - 난방방식, 관리방식, 분양형태, 건축면적, 연면적
  - **부대복리시설 전용 필드는 별도 명세 없음** — 주차대수(`parking_count`), 엘리베이터 정보는 기존 facility_kapt에 없는 필드를 API에서 추출해야 함 [ASSUMED]

**전략:** `facility_kapt` 테이블에 컬럼 추가 방식이 신규 테이블보다 간결함. 추가할 컬럼 후보: `elevator_count INT`, `heat_type TEXT`, `management_type TEXT`, `total_area NUMERIC`. [ASSUMED — V3 실제 응답 필드 현장 확인 필요]

**kapt.ts 확장 패턴:**
```typescript
// [VERIFIED: src/services/kapt.ts]
const KaptBasicInfoSchema = z.object({
  kaptCode: z.string(),
  kaptName: z.string(),
  kaptdaCnt: z.number().optional(),   // 세대수
  kaptDongCnt: z.number().optional(), // 동수
  // ... 추가 시설 필드
})

export async function fetchKaptBasicInfo(kaptCode: string): Promise<KaptBasicInfo | null> {
  const url = new URL('http://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3')
  url.searchParams.set('ServiceKey', process.env.KAPT_API_KEY!)
  url.searchParams.set('kaptCode', kaptCode)
  url.searchParams.set('_type', 'json')
  // ... fetch + parse
}
```

### 2. MOLIT 분양권전매 API (DATA-02)

**분양권전매 API (실거래):**
- 엔드포인트: `http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcSilvTrade`
  [CITED: data.go.kr/data/15126471]
- 파라미터: `serviceKey`, `LAWD_CD` (5자리 법정동코드), `DEAL_YMD` (YYYYMM)
- 응답 필드 (매매 API와 유사 구조):
  - `aptNm` — 단지명
  - `umdNm` — 법정동
  - `dealAmount` — 거래금액 (만원, 쉼표 포함 문자열)
  - `excluUseAr` — 전용면적
  - `floor` — 층
  - `dealYear`, `dealMonth`, `dealDay` — 거래일
  - `cdealType` — 해제여부 (Y면 취소)
  [CITED: github.com/WooilJeong/PublicDataReader/blob/main/assets/docs/portal/TransactionPrice.md]

**주의:** 분양권전매 데이터에는 단지코드(molit_complex_code)가 포함되지 않는다. 이름+지역으로만 `complexes` 매칭 필요 → 골든레코드 원칙상 반드시 좌표+이름 복합 매칭. complex_id는 nullable로 설계 (D-08에 이미 반영됨).

**new_listings 소스:** 청약홈 APT 분양정보 파일데이터 (15101046)는 API가 아닌 파일배포. MOLIT 분양권전매 API는 실거래 기록이지, 사전분양 공고 정보가 아님. D-08의 `new_listings`는 분양 공고 마스터 테이블이고, `presale_transactions`는 실거래. 공고 데이터는 청약홈 파일 또는 수동 입력이 현실적임. [ASSUMED — 계획 시 사용자 확인 권장]

**현실적 접근:** `/api/cron/daily`에서 MOLIT 분양권전매 API로 신규 분양권 전매 거래를 `presale_transactions`에 적재하고, `new_listings`는 분양권전매 거래에서 역방향으로 새 단지명이 나타날 때 UPSERT 방식으로 생성. [ASSUMED]

### 3. GPS PostGIS 검증 (COMM-02)

**complexes.location 타입 확인:**
```sql
-- [VERIFIED: supabase/migrations/20260430000002_complexes.sql line 26-30]
location geography(Point, 4326) generated always as (
  case
    when lat is not null and lng is not null
    then st_setsrid(st_makepoint(lng, lat), 4326)::geography
  end
) stored,
```

`location`은 `geography(Point, 4326)` 타입. ST_DWithin의 `distance` 파라미터는 geography 타입에서 **미터 단위**로 동작함. [VERIFIED: PostGIS docs]

**Server Action 패턴:**
```typescript
// [VERIFIED: 기존 패턴 기반, supabase/migrations/20260430000001_extensions.sql 확인]
// src/lib/auth/review-actions.ts 확장
export async function verifyGpsForReview(
  reviewId: string,
  lat: number,
  lng: number,
  complexId: string,
): Promise<{ gps_verified: boolean; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { gps_verified: false, error: '로그인 필요' }

  // PostGIS 검증: complexes.location과 제출된 좌표의 거리 계산
  const { data } = await supabase.rpc('check_gps_proximity', {
    p_complex_id: complexId,
    p_lat: lat,
    p_lng: lng,
    p_distance_m: 100,
  })

  const verified = data === true
  if (verified) {
    await supabase
      .from('complex_reviews')
      .update({ gps_verified: true })
      .eq('id', reviewId)
      .eq('user_id', user.id)
  }
  return { gps_verified: verified, error: null }
}
```

**SQL 함수 (마이그레이션 포함):**
```sql
-- 20260507000003_phase4.sql에 포함
create or replace function public.check_gps_proximity(
  p_complex_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_distance_m integer default 100
) returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.complexes
    where id = p_complex_id
      and location is not null
      and st_dwithin(
        location,
        st_point(p_lng, p_lat)::geography,
        p_distance_m
      )
  )
$$;
```

**대안:** `supabase.rpc()` 대신 직접 SQL 실행 가능하나, RPC 함수 방식이 타입 안전성과 재사용성 면에서 우수. [VERIFIED: Supabase RPC 패턴]

### 4. 댓글 시스템 (COMM-01)

**스키마 (D-01 기반):**
```sql
-- 20260507000003_phase4.sql
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.complex_reviews(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  content     text not null check (char_length(content) between 10 and 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index comments_review_id_idx on public.comments(review_id, created_at);
create index comments_user_id_idx   on public.comments(user_id);

create trigger comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();
```

**RLS (complex_reviews 패턴 대조):**
```sql
-- [VERIFIED: supabase/migrations/20260430000016_reviews.sql 패턴 대조]
alter table public.comments enable row level security;

create policy "comments: public read"
  on public.comments for select using (true);

create policy "comments: auth insert"
  on public.comments for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "comments: owner update"
  on public.comments for update
  using (user_id = auth.uid());

create policy "comments: owner or admin delete"
  on public.comments for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
```

**인라인 댓글 UI 패턴 (D-02):**
- RSC(ReviewList)에서 각 리뷰의 최초 3개 댓글을 함께 fetch (JOIN 또는 N+1 주의)
- "더 보기" 클릭은 Client Component `CommentSection`이 처리
- 실시간 업데이트 불필요 — SSR + revalidatePath가 충분 (댓글은 즉각성 중요도 낮음)

**N+1 방지 쿼리:**
```typescript
// 후기 + 최초 3개 댓글 한번에 fetch
const { data } = await supabase
  .from('complex_reviews')
  .select(`
    *,
    comments(id, content, created_at, user_id)
  `)
  .eq('complex_id', complexId)
  .order('created_at', { ascending: false })
  .limit(20)
// comments는 이미 joined되므로 추가 쿼리 없음
// 단, 프론트에서 .slice(0, 3) 처리
```

### 5. 신고 SLA (COMM-04)

**기존 /admin/reports 구조:** `[VERIFIED: src/app/admin/reports/page.tsx]`
- 현재 컬럼: 일시, 대상, 대상 ID, 사유, 상태, 액션
- `target_type: 'review' | 'user' | 'ad'` — 'comment' 추가 필요

**SLA 배지 추가 방법:**
```typescript
// 24h 경과 계산: 서버에서 계산 후 prop으로 전달
const isOverdue = (createdAt: string): boolean => {
  return Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
}

// 테이블에 SLA 컬럼 추가:
// 'SLA'컬럼 → 24h 이내: 정상, 초과: 빨간 뱃지
```

**target_type enum 변경 SQL:**
```sql
-- PostgreSQL enum 값 추가 (기존 값 유지)
ALTER TYPE public.report_target_type ADD VALUE IF NOT EXISTS 'comment';
```
`IF NOT EXISTS`는 PostgreSQL 9.3+에서 지원되나 Supabase는 문제 없음. [VERIFIED: PostgreSQL docs]

**타입 정의 업데이트:** `ReportRow.target_type`에 `'comment'` 추가 필요.

### 6. 카페 가입 코드 (COMM-05)

**UUID vs readable code:** UUID는 너무 길어 카페 가입 코드로 부적합. 8자 alphanumeric 랜덤 코드 권장.

**코드 생성:**
```sql
-- PostgreSQL에서 8자 랜덤 코드 생성
select upper(substr(md5(random()::text), 1, 8));
-- 예: 'A3F9B2C1'
```

**cafe_join_codes 스키마:**
```sql
create table public.cafe_join_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  week_start  date not null unique,  -- 주 중복 방지
  created_at  timestamptz not null default now()
);

alter table public.cafe_join_codes enable row level security;

-- admin만 읽기
create policy "cafe_join_codes: admin read"
  on public.cafe_join_codes for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));
```

**GitHub Actions 주간 cron:**
```yaml
# .github/workflows/cafe-code-weekly.yml
name: Cafe Code Weekly
on:
  schedule:
    - cron: '5 0 * * 1'  # 매주 월요일 09:05 KST (UTC 00:05)
  workflow_dispatch: {}
jobs:
  generate-code:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Generate cafe join code
        run: |
          curl -sSf -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/worker/cafe-code"
```

### 7. Resend 주간 다이제스트 (NOTIF-01)

**3,000건/월 한도 처리:**
- 월 3,000건 = 일 ~100건 = 주 ~750건
- 창원·김해 실수요자 서비스 초기 단계에서 750명/주 구독자 초과 가능성 낮음
- 초과 시: batch 전송 주기를 나눠서 처리 (월요일 오전 + 오후 분할 발송) [ASSUMED]

**기존 deliver.ts 패턴 활용:**
```typescript
// src/lib/notifications/digest.ts (신규)
export async function buildWeeklyDigest(
  supabase: SupabaseClient<Database>,
): Promise<{ inserted: number }> {
  // 1. 관심 단지 있는 사용자 조회
  const { data: users } = await supabase
    .from('favorites')
    .select('user_id, complex_id')

  // 2. unique user_id별 관심 단지 묶기
  // 3. 각 단지 최근 거래 조회 (N+1 주의 — 단지 ID batch 조회)
  // 4. notifications 테이블에 type='digest' INSERT
  //    (dedupe_key = week 번호로 중복 방지)
}
```

**GitHub Actions 주간 cron:**
```yaml
# .github/workflows/weekly-digest.yml
name: Weekly Digest
on:
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일 09:00 KST (UTC 00:00)
  workflow_dispatch: {}
jobs:
  send-digest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Trigger digest worker
        run: |
          curl -sSf -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/worker/digest"
```

**이미 존재하는 5분 notify-worker가 digest notifications를 처리**: `notifications.type` 체크에 'digest'가 있으면 자동 처리됨 (현재 `notifications.type`은 `'price_alert', 'comment', 'reply', 'system'` — 'digest' 추가 필요).

### 8. 알림 토픽 구독 (NOTIF-02)

**notification_topics 스키마:**
```sql
create table public.notification_topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  topic       text not null check (topic in ('high_price', 'presale', 'complex_update')),
  created_at  timestamptz not null default now(),
  unique(user_id, topic)
);

alter table public.notification_topics enable row level security;

create policy "notification_topics: owner all"
  on public.notification_topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**기존 push_subscriptions와의 관계:** push_subscriptions는 Web Push 구독 정보(endpoint, p256dh, auth). notification_topics는 사용자가 어떤 카테고리 알림을 받을지 선택. 두 테이블은 독립적 — 토픽 선택과 상관없이 Web Push를 받으려면 push_subscriptions가 존재해야 함.

**알림 생성 로직 확장:** 기존 `generatePriceAlerts()`에 토픽 체크 추가:
```typescript
// topic='high_price'를 선택한 사용자만 신고가 알림 수신
// topic='presale'를 선택한 사용자에게 신규 분양 등록 알림
```

**프로필 설정 페이지:** 프로필 페이지 존재 여부 확인 필요 [ASSUMED — Phase 3에서 구현 여부 불명확]. 없으면 `/profile` 신규 생성.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostGIS 거리 계산 | 직접 Haversine 공식 | `ST_DWithin(geography)` | 이미 설치된 PostGIS, 미터 단위 정확도 |
| 이메일 일괄 발송 | 자체 SMTP | Resend (기존) | 이미 구현된 `deliver.ts` 패턴 활용 |
| 코드 생성 | 직접 암호화 로직 | PostgreSQL `md5(random()::text)` | 충분한 엔트로피, 서버 사이드 생성 |
| 중복 알림 방지 | 별도 중복 체크 로직 | `notifications.UNIQUE(user_id, event_type, target_id, dedupe_key)` | 이미 설계된 dedupe 제약 활용 |
| 실시간 댓글 업데이트 | WebSocket/Supabase Realtime | SSR + revalidatePath | 댓글은 즉각성 불필요, Realtime 복잡도 회피 |

---

## Schema Migration Strategy

**신규 마이그레이션 파일:** `supabase/migrations/20260507000003_phase4.sql`

**마이그레이션 순서 (단일 파일 처리):**

```
1. ALTER TYPE report_target_type ADD VALUE 'comment'
2. CREATE TABLE comments (... FK → complex_reviews, profiles)
3. RLS 정책 (comments)
4. CREATE TABLE new_listings (... FK → complexes NULLABLE)
5. CREATE TABLE presale_transactions (... FK → new_listings)
6. RLS 정책 (new_listings, presale_transactions: public read / service_role write)
7. CREATE TABLE notification_topics (... FK → profiles)
8. RLS 정책 (notification_topics)
9. CREATE TABLE cafe_join_codes
10. RLS 정책 (cafe_join_codes)
11. ALTER TABLE facility_kapt ADD COLUMN ... (부대시설 추가 컬럼)
12. CREATE FUNCTION check_gps_proximity(...)
13. ALTER TABLE notifications ALTER COLUMN type — 'digest' 추가
    → CHECK 제약 변경: DROP + ADD
```

**[BLOCKING] `supabase db push` 필요:** 마이그레이션 실행 전 로컬 DB 적용 및 검증.

**마이그레이션 주의사항:**
- `ALTER TYPE ... ADD VALUE`는 트랜잭션 내에서 실행 불가 (PostgreSQL 제약). 단독 실행 필요.
  → 마이그레이션 파일 분리 고려: `20260507000003_phase4_enum.sql`, `20260507000004_phase4_tables.sql`
- `notifications.type CHECK` 제약 변경 시 기존 데이터 타입 값 보존 확인.

---

## Common Pitfalls

### Pitfall 1: enum 마이그레이션 트랜잭션 오류
**What goes wrong:** `ALTER TYPE report_target_type ADD VALUE 'comment'`를 다른 DDL과 같은 트랜잭션에 묶으면 Supabase 마이그레이션이 실패함.
**Why it happens:** PostgreSQL은 enum ADD VALUE를 트랜잭션 내에서 허용하지 않음 (12버전 미만; Supabase는 14+이지만 `BEGIN`/`COMMIT` 블록 안에서 실행되는 마이그레이션 구조가 충돌할 수 있음).
**How to avoid:** enum 변경을 별도 마이그레이션 파일로 분리하거나, Supabase `-- noqa: disable=all` 주석으로 트랜잭션 분리.
**Warning signs:** `ERROR: cannot add a new enum label inside a block`

### Pitfall 2: GPS 클라이언트 신뢰 (스푸핑)
**What goes wrong:** 클라이언트가 제출한 lat/lng를 그대로 `gps_verified=true`로 저장.
**Why it happens:** 브라우저 좌표를 신뢰하는 설계.
**How to avoid:** D-07 원칙 준수 — Server Action에서 PostGIS 검증 후 저장. 클라이언트 `gps_verified` 직접 전달 거부.
**Warning signs:** 프론트에서 `gps_verified=true`를 body에 포함해 submitReview를 호출하는 구조.

### Pitfall 3: N+1 쿼리 (댓글 로딩)
**What goes wrong:** 후기 목록 fetch 후 각 후기의 댓글을 개별 쿼리로 fetch.
**Why it happens:** 단순 구현 시 `reviews.map(r => getComments(r.id))`.
**How to avoid:** Supabase `select('*, comments(...)')` 관계 JOIN 또는 comment_counts 집계 별도 쿼리.
**Warning signs:** 20개 후기 조회 시 21개 쿼리 발생.

### Pitfall 4: MOLIT 분양권전매 데이터 중복 적재
**What goes wrong:** 매일 cron이 같은 달 데이터를 중복 INSERT.
**Why it happens:** DEAL_YMD 기준 현재월 데이터를 반복 fetch.
**How to avoid:** `presale_transactions` UPSERT (ON CONFLICT DO NOTHING) 또는 unique 제약 설계. `transactions` 테이블의 `superseded_by` 패턴 참조.
**Warning signs:** 거래 건수가 cron 실행마다 증가.

### Pitfall 5: Resend 월 한도 초과
**What goes wrong:** 구독자 급증 시 3,000건/월 초과.
**Why it happens:** 주간 다이제스트에 전체 구독자 일괄 발송.
**How to avoid:** `notification_topics` 테이블에서 'high_price' 구독자만 대상으로 제한. 한도 도달 시 Resend API 오류 처리 후 skipped 기록.
**Warning signs:** Resend 대시보드 quota 경고.

---

## Code Examples

### GPS 검증 Server Action (전체 패턴)

```typescript
// src/lib/auth/review-actions.ts 확장
// [VERIFIED: 기존 submitReview 패턴 + PostGIS 추가]
'use server'

export async function submitReviewWithGps(input: {
  complexId: string
  content: string
  rating: number
  lat?: number
  lng?: number
}): Promise<{ error: string | null; reviewId?: string }> {
  const { complexId, content, rating, lat, lng } = input

  if (content.length < 10 || content.length > 500)
    return { error: '후기는 10자 이상 500자 이하로 작성해주세요.' }
  if (rating < 1 || rating > 5 || !Number.isInteger(rating))
    return { error: '평점은 1~5 사이의 정수여야 합니다.' }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // GPS 검증 (선택적)
  let gps_verified = false
  if (lat !== undefined && lng !== undefined) {
    const { data: proximity } = await supabase.rpc('check_gps_proximity', {
      p_complex_id: complexId,
      p_lat: lat,
      p_lng: lng,
      p_distance_m: 100,
    })
    gps_verified = proximity === true
  }

  const { data, error } = await supabase
    .from('complex_reviews')
    .insert({ complex_id: complexId, user_id: user.id, content: content.trim(), rating, gps_verified })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null, reviewId: data.id }
}
```

### 댓글 Server Action

```typescript
// src/lib/auth/comment-actions.ts (신규)
'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitComment(input: {
  reviewId: string
  complexId: string
  content: string
}): Promise<{ error: string | null }> {
  const { reviewId, complexId, content } = input

  // auth-first 패턴: 인증 확인 먼저 (기존 review-actions.ts 패턴 일치)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (content.length < 10 || content.length > 500)
    return { error: '댓글은 10자 이상 500자 이하로 작성해주세요.' }

  const { error } = await supabase
    .from('comments')
    .insert({ review_id: reviewId, user_id: user.id, content: content.trim() })

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}
```

### MOLIT 분양권전매 어댑터 스켈레톤

```typescript
// src/services/molit-presale.ts (신규)
// [CITED: data.go.kr/data/15126471]
import { z } from 'zod/v4'

const BASE_URL = 'http://openapi.molit.go.kr/OpenAPI_ToolInstallPackage/service/rest/RTMSOBJSvc/getRTMSDataSvcSilvTrade'

const PresaleTradeSchema = z.object({
  aptNm:       z.string(),
  umdNm:       z.string(),
  dealAmount:  z.string(),  // "15,000" 형식
  excluUseAr:  z.coerce.number().optional(),
  floor:       z.coerce.number().optional(),
  dealYear:    z.string(),
  dealMonth:   z.string(),
  dealDay:     z.string(),
  cdealType:   z.string().optional(), // 'Y'면 취소
})

export type PresaleTrade = z.infer<typeof PresaleTradeSchema>

export async function fetchPresaleTrades(
  lawdCd: string,
  dealYmd: string, // YYYYMM
): Promise<PresaleTrade[]> {
  const apiKey = process.env.MOLIT_API_KEY
  if (!apiKey) throw new Error('MOLIT_API_KEY not set')

  const url = new URL(BASE_URL)
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('LAWD_CD', lawdCd)
  url.searchParams.set('DEAL_YMD', dealYmd)
  url.searchParams.set('numOfRows', '1000')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/xml' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`MOLIT API ${res.status}`)

  // XML 파싱 필요 (MOLIT API는 XML만 반환)
  // DOMParser 또는 fast-xml-parser 사용
  // ... parse logic
  return []
}
```

**주의:** MOLIT API 응답은 XML. `fast-xml-parser` 패키지가 없으므로 Node.js 내장 `DOMParser` 또는 간단한 정규식 파싱이 필요. [ASSUMED — 패키지 추가 또는 내장 파싱 결정 필요]

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + happy-dom |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMM-01 | submitComment 성공/실패/미로그인 | unit | `npm run test -- --run src/lib/auth/comment-actions.test.ts` | ❌ Wave 0 |
| COMM-02 | check_gps_proximity RPC 호출 + gps_verified 저장 | unit | `npm run test -- --run src/lib/auth/review-actions.test.ts` | ❌ Wave 0 (기존 파일 확장) |
| COMM-03 | 카페 링크 URL 생성 함수 | unit | `npm run test -- --run src/lib/data/cafe-link.test.ts` | ❌ Wave 0 |
| COMM-04 | isOverdue 24h 계산 | unit | `npm run test -- --run src/components/admin/SlaUtils.test.ts` | ❌ Wave 0 |
| COMM-05 | cafe-code worker POST 200 | integration | `npm run test -- --run src/app/api/worker/cafe-code/route.test.ts` | ❌ Wave 0 |
| DATA-01 | fetchKaptBasicInfo 파싱 | unit | `npm run test -- --run src/services/kapt.test.ts` | ❌ Wave 0 |
| DATA-02 | fetchPresaleTrades 파싱 + UPSERT | unit | `npm run test -- --run src/services/molit-presale.test.ts` | ❌ Wave 0 |
| NOTIF-01 | buildWeeklyDigest 구독자 조회 | unit | `npm run test -- --run src/lib/notifications/digest.test.ts` | ❌ Wave 0 |
| NOTIF-02 | notification_topics CRUD Server Action | unit | `npm run test -- --run src/lib/auth/topic-actions.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (해당 테스트 파일만)
- **Per wave merge:** `npm run test && npm run lint`
- **Phase gate:** `npm run test && npm run build && npm run test:e2e`

### Wave 0 Gaps
- [ ] `src/lib/auth/comment-actions.test.ts` — COMM-01
- [ ] `src/lib/auth/review-actions.test.ts` — COMM-02 (GPS 검증 케이스 추가)
- [ ] `src/lib/data/cafe-link.test.ts` — COMM-03 (카페 링크 URL 생성 함수)
- [ ] `src/components/admin/SlaUtils.test.ts` — COMM-04 (SLA 24h 계산)
- [ ] `src/services/kapt.test.ts` — DATA-01
- [ ] `src/services/molit-presale.test.ts` — DATA-02
- [ ] `src/lib/notifications/digest.test.ts` — NOTIF-01
- [ ] `src/lib/auth/topic-actions.test.ts` — NOTIF-02

---

## Wave Separation Strategy

**의존성 분석:**

```
Wave 0: [BLOCKING] DB 마이그레이션 + RED 테스트 스캐폴드
  - supabase/migrations/20260507000003_phase4_enum.sql (enum 변경)
  - supabase/migrations/20260507000004_phase4_tables.sql (테이블 신규)
  - supabase db push
  - 모든 테스트 파일 skeleton 생성 (RED)
  - [BLOCKING] 완료 후 Wave 1~N 병렬 가능

Wave 1 (병렬 실행 가능 — 단지 상세 페이지 기반):
  - 04-01-PLAN: 댓글 시스템 (COMM-01) — comments 테이블 + Server Action + UI
    [files_modified: ReviewList+CommentSection, comment-actions, comments]
  - 04-02-PLAN: GPS L1 인증 (COMM-02) — ReviewForm 버튼 + check_gps_proximity
    [files_modified: ReviewForm, review-actions]
  [충돌 없음: 04-01과 04-02는 서로 다른 파일만 수정]

Wave 2 (blocked on Wave 1):
  - 04-03-PLAN: 카페 링크 + SLA 배지 (COMM-03, COMM-04) — Wave 2로 이동
    [depends_on: 04-01 — ReviewList.tsx를 04-01이 먼저 수정한 후 04-03이 CafeLink 추가]
    [files_modified: ReviewList+admin/reports/page]
  - 04-04-PLAN: K-apt 부대시설 (DATA-01) — kapt.ts 확장 + facility_kapt 컬럼 + 단지 상세 탭
  - 04-05-PLAN: MOLIT 분양 (DATA-02) — molit-presale.ts + new_listings + /presale 페이지
  [04-03, 04-04, 04-05는 서로 다른 파일을 수정하므로 병렬 가능]

Wave 3 (blocked on Wave 1 + 2):
  - 04-06-PLAN: 카페 가입 코드 (COMM-05) — cafe-code worker + GitHub Actions
  - 04-07-PLAN: 주간 다이제스트 (NOTIF-01) — digest.ts + weekly digest worker + GitHub Actions
  - 04-08-PLAN: 알림 토픽 구독 (NOTIF-02) — notification_topics + 프로필 설정 UI
    [Wave 3 내 병렬 가능 — files_modified 무중복 확인 필요]
```

---

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| KAPT_API_KEY | DATA-01 | ✓ (기존 사용 중) | — |
| MOLIT_API_KEY | DATA-02 | ? [ASSUMED: 기존 거래 API 키 재사용 가능] | 환경변수 신규 추가 |
| RESEND_API_KEY | NOTIF-01 | ✓ (기존 사용 중) | — |
| CRON_SECRET | COMM-05, NOTIF-01 | ✓ (기존 사용 중) | — |
| PostGIS extension | COMM-02 | ✓ (20260430000001_extensions.sql) | — |
| GitHub Actions Secrets | COMM-05, NOTIF-01 | ✓ (기존 워크플로우 사용 중) | — |

**MOLIT_API_KEY 확인 필요:** 기존 `MOLIT_API_KEY`가 `.env.local`에 있는지 확인 [ASSUMED]. 없으면 `KAPT_API_KEY`와 동일 공공데이터포털 계정으로 별도 신청.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| 단순 flag 저장 | PostGIS ST_DWithin 서버 검증 | GPS 스푸핑 저항 |
| 댓글 별도 fetch | Supabase 관계 JOIN | N+1 방지 |
| 수동 cron 관리 | GitHub Actions YAML | Vercel Hobby 한도 우회 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | K-apt V3 API 부대복리시설 필드 구체적 명세 미확인 | DATA-01 | facility_kapt 추가 컬럼 설계 변경 필요 |
| A2 | new_listings를 분양권전매 거래에서 역방향 UPSERT | DATA-02 | D-08의 new_listings 소스가 MOLIT 분양권전매 API가 아닐 수 있음 — 청약홈 파일 별도 필요 |
| A3 | MOLIT API 응답이 XML only (JSON 불가) | DATA-02 | fast-xml-parser 패키지 추가 vs 내장 파싱 결정 영향 |
| A4 | MOLIT_API_KEY 기존 KAPT 키와 동일 계정 사용 가능 | DATA-02 | 별도 API 신청 필요 시 계획 지연 |
| A5 | /profile 페이지 미존재 (Phase 3에서 미구현) | NOTIF-02 | 신규 생성 vs 기존 페이지 확장 결정 |
| A6 | Resend 3,000건/월 초기에는 초과 없음 | NOTIF-01 | 구독자 폭발 시 발송 한도 로직 추가 필요 |

---

## Open Questions

1. **new_listings 데이터 소스** [RESOLVED]
   - RESOLVED: 분양권전매 역방향 UPSERT로 new_listings 생성.
     - price_min/price_max는 deal price 기반 (min=max=deal price 만원 단위).
     - total_units와 move_in_date는 null 허용 (V1.5 scope 축소 — PresaleCard에서 '미정'으로 표시).
     - complex_id는 nullable 허용 (골든레코드 원칙 유지 — MOLIT 분양권전매 API에 좌표 정보 없어 자동 매칭 불가. Phase 5에서 어드민 수동 매칭 UI 예정).
     - 04-05-PLAN: PresaleCard는 complex_id 있을 때만 단지 링크 활성화, 없을 때 단순 카드 표시.

2. **XML 파싱 라이브러리** [RESOLVED]
   - RESOLVED: 내장 정규식 파싱 사용 (Node.js 18+ 내장 regex 기반 parseXmlItems 함수). fast-xml-parser 의존성 추가 불필요.

3. **/profile 페이지 존재 여부** [RESOLVED]
   - RESOLVED: src/app/profile/page.tsx 신규 생성. Phase 3에서 일반 사용자 프로필 페이지 미구현 확인.

---
## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth + `auth.getUser()` (기존) |
| V3 Session Management | yes | @supabase/ssr 쿠키 (기존) |
| V4 Access Control | yes | RLS 정책 (모든 신규 테이블) |
| V5 Input Validation | yes | Zod + DB CHECK 제약 |
| V6 Cryptography | no | GPS 검증은 좌표 비교, 암호화 불필요 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| GPS 좌표 스푸핑 | Tampering | Server Action PostGIS 검증 (D-07) |
| 댓글 스팸 | DoS | RLS auth insert + 500자 CHECK 제약 |
| 신고 남용 (자기 신고) | Spoofing | `reports_no_self_report CHECK` (기존) |
| cron endpoint 무단 호출 | Elevation | `x-cron-secret` 헤더 검증 (기존 패턴) |
| MOLIT API key 노출 | Information Disclosure | `process.env.MOLIT_API_KEY` (서버만) |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: `supabase/migrations/20260430000002_complexes.sql`] — `complexes.location geography(Point, 4326)` 타입 확인
- [VERIFIED: `supabase/migrations/20260430000016_reviews.sql`] — RLS 패턴 (public read, auth insert, owner update/delete)
- [VERIFIED: `supabase/migrations/20260506000002_reports.sql`] — `report_target_type` enum 현재 값
- [VERIFIED: `supabase/migrations/20260430000006_notifications.sql`] — notifications 스키마, type CHECK 제약
- [VERIFIED: `src/services/kapt.ts`] — K-apt 어댑터 패턴, `_type=json` 파라미터
- [VERIFIED: `src/lib/notifications/deliver.ts`] — Resend + web-push 전달 패턴
- [VERIFIED: `.github/workflows/notify-worker.yml`] — GitHub Actions 5분 cron 패턴
- [VERIFIED: `src/components/reviews/ReviewList.tsx` line 78] — GPS 배지 UI 이미 존재
- [VERIFIED: `src/app/admin/reports/page.tsx`] — 기존 신고 큐 UI 구조

### Secondary (MEDIUM confidence)
- [CITED: data.go.kr/data/15058453] — K-apt 기본정보 API 엔드포인트 URL
- [CITED: data.go.kr/data/15126471] — MOLIT 분양권전매 API
- [CITED: github.com/WooilJeong/PublicDataReader] — 분양권전매 API 응답 필드 구조

### Tertiary (LOW confidence)
- K-apt V3 API 부대복리시설 응답 필드 — 온라인 명세 확인 불가, 실제 응답 확인 필요

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 기존 코드베이스에서 직접 확인
- Architecture: HIGH — 기존 패턴 (RLS, Server Action, cron) 기반
- DB Schema: HIGH — 기존 마이그레이션 파일 직접 확인
- K-apt 부대시설 필드: LOW — API 명세 직접 접근 불가
- MOLIT 분양 API 응답: MEDIUM — PublicDataReader 문서 기반
- Wave 분리 전략: HIGH — 파일 의존성 분석 기반

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (안정 스택, 단 MOLIT/K-apt API 스펙은 공식 문서 확인 권장)
