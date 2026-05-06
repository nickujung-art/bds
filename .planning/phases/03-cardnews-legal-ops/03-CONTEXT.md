# Phase 3: 카드뉴스·법적·운영 - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

V1.0 정식 출시에 필요한 4개 기능 블록 완성:
1. **카드뉴스 파이프라인** — 주간 신고가 TOP5 1080×1080 PNG 자동 생성 + 어드민 1-click 다운로드 (SHARE-03~04)
2. **법적 요건** — 이용약관·개인정보·광고 정책 페이지 + 첫 로그인 동의 흐름 + 탈퇴 플로우 30일 grace (LEGAL-01~05)
3. **어드민 확장** — 회원 관리·광고 검수 UI·신고 큐·시스템 모니터링 대시보드 (ADMIN-01~04)
4. **접근성** — axe-core CI + 키보드 탐색 + 스크린리더 검증 (A11Y-01~03)

</domain>

<decisions>
## Implementation Decisions

### 카드뉴스 (SHARE-03~04)
- **D-01:** 데이터 소스 — 주간 신고가 TOP5 (지난 7일, complex_rankings 테이블 + transactions 쿼리)
- **D-02:** 이미지 크기 — 1080×1080 정사각형 PNG (카카오톡 채팅·카페 게시글 최적)
- **D-03:** 배포 방식 — 브라우저 PNG 다운로드 (`<a download>` attribute). Supabase Storage 불필요.
- **D-04:** 어드민 1-click — `/admin/cardnews` 페이지에서 "생성 + 다운로드" 버튼. 생성 API는 `/api/cardnews/generate` (서버 사이드 ImageResponse). Recharts는 Satori 미지원이므로 순수 CSS/SVG flex 레이아웃으로 대체.
- **D-05:** 카드뉴스 라우트 — `src/app/api/cardnews/generate/route.ts` → `ImageResponse` (next/og 내장, runtime='nodejs')

### 탈퇴 플로우 (LEGAL-04)
- **D-06:** Grace 기간 동안 로그인 차단 + 30일 이내 재활성화 가능. 로그인 시 `profiles.deleted_at IS NOT NULL`이면 재활성화 안내 페이지로 리다이렉트.
- **D-07:** Hard delete — 기존 Vercel cron (일일 04:00 KST)에서 `deleted_at < now() - interval '30 days'` 조건으로 `supabase.auth.admin.deleteUser()` 호출. 별도 cron 불필요.
- **D-08:** 후기(complex_reviews) 처리 — hard delete 시 `user_id = NULL` (SET NULL), 게시글은 "탈퇴한 사용자" 익명으로 유지. `complex_reviews.user_id FK → ON DELETE SET NULL` 마이그레이션 필요.
- **D-09:** 마이그레이션 — `profiles` 테이블에 `deleted_at timestamptz` 컬럼 추가.

### 가입 동의 흐름 (LEGAL-01)
- **D-10:** 첫 로그인 후 auth 콜백(`/auth/callback`)에서 `profiles.terms_agreed_at IS NULL`이면 `/consent` 페이지로 리다이렉트.
- **D-11:** 기존 회원 소급 처리 — 배포 후 첫 로그인 시 동일하게 `/consent` 리다이렉트. 별도 마이그레이션 불필요 (terms_agreed_at 기본값 NULL).
- **D-12:** 저장 — `profiles.terms_agreed_at timestamptz` 컬럼 추가. NULL = 미동의, 값 = 동의 일시.
- **D-13:** 동의 항목 — 이용약관(필수) + 개인정보처리방침(필수). 광고 수신 동의는 옵셔널 (별도 처리 불필요).

### 어드민 시스템 모니터링 (ADMIN-04)
- **D-14:** `/admin/status` 페이지에 3개 섹션:
  1. **DB 현황** — 회원 수, 단지 수, 거래 데이터 수, 발행 광고 수 (SQL COUNT)
  2. **Cron 실행 이력** — `ingest_runs` 테이블 최근 10건 (source, status, created_at)
  3. **대기 항목** — 신고 큐 미인 수 + 광고 검토 대기(pending) 수 + 약관 미동의 회원 수
- **D-15:** `revalidate = 0` (매 요청마다 갱신, 캐시 없음). ISR 불필요.

### 법적 페이지 (LEGAL-02~03, LEGAL-05)
- **D-16:** 이용약관·개인정보처리방침·광고 정책 — 정적 마크다운 콘텐츠로 `src/app/legal/` 하위 페이지 생성. CMS 불필요.
- **D-17:** Footer에 법적 페이지 링크 추가 (이용약관, 개인정보처리방침, 광고 정책).
- **D-18:** 이메일 지원 채널 — `SUPPORT_EMAIL` 환경변수 + footer/문의 페이지에 mailto 링크.

### 접근성 (A11Y-01~03)
- **D-19:** axe-core CI — 기존 Playwright E2E에 `@axe-core/playwright` 추가. critical 0건 조건.
- **D-20:** 키보드 탐색·스크린리더 — 기존 컴포넌트 심사 후 aria-label, role, tabIndex 보완. 새로 작성하는 컴포넌트는 시맨틱 HTML 우선.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 맥락
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/ROADMAP.md` §Phase 3 — 13개 requirements 및 Success Criteria
- `CLAUDE.md` — 아키텍처 규칙, AI 슬롭 금지 목록

### 기존 코드 패턴
- `src/app/admin/ads/page.tsx` — Admin 접근 제어 패턴 (`profiles.role` 체크), 어드민 UI 패턴
- `src/app/complexes/[id]/opengraph-image.tsx` — ImageResponse + runtime='nodejs' + TTF 폰트 패턴 (카드뉴스에 동일 적용)
- `src/app/auth/callback/route.ts` — Auth 콜백 패턴 (동의 리다이렉트 삽입 위치)
- `src/app/profile/page.tsx` — 탈퇴 플로우 진입점 위치
- `src/lib/supabase/admin.ts` — `createSupabaseAdminClient()` (hard delete에 사용)

### DB 스키마
- `supabase/migrations/20260430000005_users.sql` — profiles 테이블 스키마 (deleted_at, terms_agreed_at 컬럼 추가 대상)
- `supabase/migrations/20260430000009_rls.sql` — 기존 RLS 정책 패턴

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/complexes/[id]/opengraph-image.tsx` — `ImageResponse` + `readFileSync(PretendardSubset.ttf)` 패턴을 카드뉴스 생성 API에 그대로 재사용
- `src/app/admin/ads/page.tsx` — Admin role 체크 패턴 (`profiles.role in ['admin','superadmin']`) 모든 admin 페이지에 공통 적용
- `src/lib/data/rankings.ts` — `getRankingsByType(supabase, 'high_price', 5)` 로 카드뉴스 데이터 조회 가능
- `src/components/home/HighRecordCard.tsx` — 신고가 카드 디자인 참조 (카드뉴스 시각적 일관성)
- `.github/workflows/rankings-cron.yml` — GitHub Actions cron 패턴 참조
- `src/app/api/ingest/molit-trade/route.ts` — Vercel cron endpoint 패턴 (CRON_SECRET 검증)

### Established Patterns
- **Admin 접근 제어**: Server Component에서 `profiles.role` 체크 → non-admin이면 `redirect('/')`
- **ISR**: `export const revalidate = 60` + `createReadonlyClient()` (cookies() 미호출)
- **Server Action 우선**: 폼 submit·mutation은 Server Action. Admin 액션도 동일
- **AI 슬롭 금지**: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb 모두 금지 (CLAUDE.md)
- **트랜잭션 쿼리**: `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함

### Integration Points
- **카드뉴스** → `src/lib/data/rankings.ts` (getRankingsByType) + `public/fonts/PretendardSubset.ttf`
- **탈퇴 플로우** → `src/app/api/cron/` (기존 MOLIT cron에 hard delete 로직 추가) + `src/app/profile/page.tsx` (탈퇴 버튼)
- **동의 흐름** → `src/app/auth/callback/route.ts` (리다이렉트 분기 추가)
- **어드민 확장** → `src/app/admin/` 하위 새 페이지들, `supabase/migrations/` (신규 컬럼)
- **A11Y** → `playwright.config.ts` + `@axe-core/playwright` 패키지

</code_context>

<specifics>
## Specific Ideas

- 카드뉴스 배경: 흰 배경 + 오렌지(`#ea580c`) 브랜드 컬러 (OG 이미지와 일관성)
- Recharts는 Satori 렌더러에서 미지원 → CSS flex bar chart로 대체 (OG 이미지와 동일 방식)
- 탈퇴 버튼 위치: `src/app/profile/page.tsx` 하단 위험 구역
- `/consent` 페이지: 체크박스 2개(이용약관 필수, 개인정보 필수) + 확인 버튼. Server Action으로 `terms_agreed_at` 업데이트.
- 법적 페이지 콘텐츠: 한국 법률 최소 요건 준수 (개인정보보호법, 표시광고법). 실제 법무 검토 전 "초안" 명시.

</specifics>

<deferred>
## Deferred Ideas

- 광고 수신 동의 (마케팅 이메일) — 현재 Resend 3,000건/월 한도로 마케팅 발송 계획 없음. Phase 4 주간 다이제스트 시 추가.
- 탈퇴 후 익명 후기 "탈퇴한 사용자" 표시 UI — V1.0 출시 후 실제 탈퇴 케이스 발생 시 처리.
- 카드뉴스 여러 템플릿 (거래량·평당가·관심도) — V1.0은 신고가 1종. Phase 4 이후 확장.

</deferred>

---

*Phase: 3-카드뉴스·법적·운영*
*Context gathered: 2026-05-06*
