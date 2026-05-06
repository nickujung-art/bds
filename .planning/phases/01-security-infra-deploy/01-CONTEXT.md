# Phase 1: 보안·인프라·배포 - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

V0.9 로컬 MVP 코드를 프로덕션에서 안전하게 운영 가능한 상태로 전환한다.
보안 취약점 3종 패치(SEC-01~03) + 에러 트래킹 결정(SEC-04) + GitHub Actions CI + Playwright E2E 5종 + Vercel 프로덕션 배포.

새 기능(랭킹, 공유, 법적 페이지 등)은 이 Phase에 없다. 기존 코드의 보안·신뢰성 확보가 전부다.

</domain>

<decisions>
## Implementation Decisions

### Sentry 에러 트래킹 (SEC-04)

- **D-01:** `@sentry/nextjs` 설치하여 에러 트래킹 활성화 (플레이스홀더 제거가 아닌 실제 설치)
- **D-02:** `tracesSampleRate: 0` — 성능 트레이싱 비활성화, 에러만 추적 (무료 티어 5K 에러/월)
- **D-03:** `NODE_ENV === 'production'` 조건부 활성화 — 로컬·개발 환경에서 노이즈 없음
- **D-04:** Sentry DSN은 Sentry.io에서 신규 프로젝트 생성 후 환경변수로 주입

### Rate Limiting (SEC-01)

- **D-05:** Upstash Redis (`@vercel/kv`) 사용 — 분산 카운터 (serverless 재시작 시에도 정확)
- **D-06:** 한도: 1분 / IP당 100회 (ROADMAP Success Criteria: "1분 내 100회 이상 POST 시 429")
- **D-07:** IP hash = `sha256(x-forwarded-for + RATE_LIMIT_SECRET)` — ad_events 테이블 ip_hash 컬럼에 기록
- **D-08:** Upstash는 Vercel 마켓플레이스에서 무료 티어로 연결 (별도 계정 생성 없이 Vercel 대시보드에서 처리)

### E2E 테스트 전략 (INFRA-03)

- **D-09:** 골든패스 5종: 랜딩·단지 상세·지도·검색·후기 작성 (REQUIREMENTS.md 명시 기준)
- **D-10:** 인증 전략: Playwright `global-setup.ts`에서 `admin.createUser()` + `admin.generateLink()` 호출 → 세션 쿠키를 `storageState.json`으로 저장 → 후기 작성 테스트에서 재사용
- **D-11:** E2E 환경: 프로덕션 Supabase 연결 (로컬 Docker 스택 불필요) — `SUPABASE_SERVICE_ROLE_KEY`는 GitHub Secret으로 관리
- **D-12:** E2E 실행 시점: PR마다 GitHub Actions에서 자동 실행

### CI 게이트 (INFRA-02)

- **D-13:** GitHub branch protection — `main` 브랜치에 required status check 활성화
- **D-14:** Required 체크 4종: lint/typecheck + build + unit tests (Vitest) + E2E (Playwright)
- **D-15:** 이 4종 중 하나라도 실패하면 PR merge 버튼 비활성화

### 환경변수 정리 (INFRA-01)

- **D-16 (Claude 재량):** `.env.local.example`에서 미사용 NextAuth 관련 변수(`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) 및 미사용 Naver OAuth 변수 제거 — NextAuth 미설치 확인됨
- **D-17 (Claude 재량):** 누락 변수 추가: `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `RATE_LIMIT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **D-18 (Claude 재량):** `ADMIN_IP_ALLOWLIST` env var — Phase 1에서 구현하지 않고 제거 (미사용 변수가 주는 거짓 보안 신뢰 제거)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 보안 문제 현황

- `.planning/codebase/CONCERNS.md` — Critical Risks 4건 상세 기록. Phase 1 SEC 요구사항과 1:1 매핑됨. 플래닝 전 필독.
- `.planning/codebase/ARCHITECTURE.md` — 4-tier Supabase client 구조 + 아키텍처 불변식(ad/transaction 쿼리 조건)

### SEC-02 대상 파일 (inline service-role createClient 교체)

- `src/app/admin/ads/page.tsx` lines 52–55 — inline createClient with service role
- `src/app/api/ads/events/route.ts` lines 24–28 — inline createClient with service role
- `src/app/api/worker/notify/route.ts` lines 15–18 — inline createClient with service role
- `src/lib/supabase/admin.ts` — `createSupabaseAdminClient()` 팩토리 (교체 대상 함수)

### SEC-01 대상 파일 (rate limiting 추가)

- `src/app/api/ads/events/route.ts` — rate limit + ip_hash 기록 대상 엔드포인트

### SEC-03 대상 파일 (status 필터 추가)

- `src/lib/data/complexes-map.ts` — `.eq('status', 'active')` 필터 없음. sitemap.ts는 올바르게 필터링 중.

### 기존 GitHub Actions 패턴 참조

- `.github/workflows/notify-worker.yml` — CRON_SECRET 헤더 검증 패턴, GitHub Actions cron 구조 참조용

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`): SEC-02의 교체 대상 팩토리. 환경변수 존재 검증 + `import 'server-only'` 포함. 3개 파일의 inline 호출을 이 함수로 교체.
- `src/middleware.ts`: 기존 세션 갱신 미들웨어. Upstash rate limit 로직을 이 파일 또는 별도 Edge 함수에 추가.
- `.github/workflows/notify-worker.yml`: GitHub Actions workflow 구조 참조용. CI workflow 작성 시 패턴 재사용.

### Established Patterns

- **4-tier Supabase client**: server(auth-aware RSC) / readonly(ISR) / client(브라우저 실시간) / admin(service_role). SEC-02 완료 후 admin은 반드시 `createSupabaseAdminClient()`만 경유.
- **CRON_SECRET 검증**: 기존 notify 워커에 구현됨. CI workflow에서 GitHub Secret으로 주입하는 패턴 동일하게 사용.
- **E2E admin 세션**: `admin.createUser()` 패턴은 CONCERNS.md의 `(supabase as any).auth.admin.getUserById` 주석에 언급됨. 타입 안전 방식 사용 권장.

### Integration Points

- **Upstash Redis**: 새 서비스. Vercel Dashboard → Storage → @vercel/kv 생성 후 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 자동 주입됨.
- **Sentry**: 새 서비스. sentry.io에서 Next.js 프로젝트 생성 → `SENTRY_DSN` 환경변수 주입 → `npx @sentry/wizard@latest -i nextjs`로 설정 파일 생성.
- **GitHub branch protection**: 코드로 설정 불가 — Vercel 배포 완료 후 GitHub 설정에서 수동 활성화 필요.

</code_context>

<specifics>
## Specific Ideas

- E2E `global-setup.ts`에서 테스트 완료 후 생성한 테스트 유저/데이터를 cleanup하는 로직 필요 (프로덕션 Supabase 사용이므로 오염 방지)
- Sentry wizard 실행 시 생성되는 `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` 중 client/edge는 `tracesSampleRate: 0` 설정 확인
- Upstash rate limit은 `@upstash/ratelimit` 패키지의 `Ratelimit.slidingWindow(100, '1 m')` 알고리즘 사용 권장 (sliding window가 fixed window보다 burst 공격에 강함)

</specifics>

<deferred>
## Deferred Ideas

- `ADMIN_IP_ALLOWLIST` 구현 — 어드민 IP 화이트리스트는 Phase 1 SEC 요구사항에 없음. 미사용 env var만 제거하고 구현은 미룸.
- 알림 워커 병렬화 (`Promise.allSettled`) — CONCERNS.md 기술 부채이나 Phase 1 범위 외. Phase 4~5에서 커뮤니티 기능 확장 시 재검토.
- `as any` 타입 패턴 정리 (`unwrapJoin<T>()` 헬퍼 추출) — 기술 부채이나 이 Phase의 목표(보안·배포)와 무관. 나중에 별도로.

</deferred>

---

*Phase: 1-보안·인프라·배포*
*Context gathered: 2026-05-06*
