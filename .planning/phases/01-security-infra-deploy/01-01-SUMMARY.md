---
phase: 01-security-infra-deploy
plan: "01"
subsystem: security
tags: [upstash, redis, rate-limiting, supabase, sha256, typescript]

requires: []
provides:
  - "Upstash Redis 기반 IP-per-minute rate limiter (adEventRatelimit, slidingWindow 100/1m)"
  - "sha256(ip:secret) IP hash 기록 in ad_events"
  - "createSupabaseAdminClient() 단일 경유 통합 (4개 파일)"
  - "status='active' 지도 쿼리 필터"
affects:
  - 01-security-infra-deploy/01-02
  - 01-security-infra-deploy/01-03

tech-stack:
  added:
    - "@upstash/ratelimit@2.0.8 — slidingWindow rate limiter"
    - "@upstash/redis@1.38.0 — HTTP-based Redis client"
  patterns:
    - "TDD Wave 0: 테스트 파일 선행 생성 후 구현 (RED→GREEN)"
    - "Upstash Redis.fromEnv() 싱글턴 패턴 (모듈 레벨 초기화)"
    - "createSupabaseAdminClient() 단일 팩토리 경유 (SEC-02 패턴)"

key-files:
  created:
    - src/lib/ratelimit.ts
    - src/app/api/ads/events/route.test.ts
    - src/lib/supabase/admin.test.ts
    - src/lib/data/complexes-map.test.ts
  modified:
    - src/app/api/ads/events/route.ts
    - src/app/admin/ads/page.tsx
    - src/app/api/worker/notify/route.ts
    - src/lib/auth/ad-actions.ts
    - src/lib/data/complexes-map.ts

key-decisions:
  - "Upstash @upstash/redis 직접 사용 (@vercel/kv deprecated 2024-12)"
  - "slidingWindow(100, '1 m') per IP — D-06 결정 준수"
  - "ip_hash = sha256(ip:RATE_LIMIT_SECRET) hex — PII 비저장"
  - "ad_events.ip_hash 컬럼 nullable 유지 (마이그레이션 불필요, 방안 B)"
  - "ad-actions.ts도 createSupabaseAdminClient()로 통합 (플랜 외 발견 — Rule 2 자동 적용)"

patterns-established:
  - "Rate limiter singleton: 모듈 레벨에서 한 번만 초기화, Redis.fromEnv() 사용"
  - "IP 처리: x-forwarded-for 헤더 파싱 → rate limit 카운팅, sha256 해싱 → DB 저장"
  - "Admin client: createSupabaseAdminClient() 단일 경유, import 'server-only' 보호"

requirements-completed:
  - SEC-01
  - SEC-02
  - SEC-03

duration: 15min
completed: 2026-05-06
---

# Phase 01 Plan 01: 보안 패치 3종 Summary

**Upstash Redis slidingWindow rate limiter(100req/min/IP) + sha256 IP hash + createSupabaseAdminClient() 단일 경유 통합 + status='active' 지도 필터 — 광고 클릭 사기·서비스 역할 키 노출·철거단지 핀 노출 3개 취약점 패치**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-06T02:48:00Z
- **Completed:** 2026-05-06T03:03:50Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 9 (3 신규 테스트 + 5 구현 수정 + 1 신규 구현)

## Accomplishments

- SEC-01: `/api/ads/events`에 Upstash Redis slidingWindow(100/1m) rate limiter 적용, 초과 시 429 + Retry-After 반환, sha256(ip:secret) ip_hash INSERT
- SEC-02: inline `createClient(URL!, KEY!)` 패턴을 `createSupabaseAdminClient()` 단일 경유로 통합 — route.ts, admin/ads/page.tsx, worker/notify/route.ts, auth/ad-actions.ts 4개 파일
- SEC-03: `getComplexesForMap`에 `.eq('status', 'active')` 체인 추가 — inactive/철거 단지 핀 노출 방지
- TDD: 3개 테스트 파일 신규 작성 (9 tests GREEN)

## Task Commits

1. **Task 1: SEC-01/02/03 테스트 파일 (TDD RED)** - `fc05233` (test)
2. **Task 2: SEC-01/02/03 구현 (TDD GREEN)** - `4fe5ffd` (feat)

## Files Created/Modified

- `src/lib/ratelimit.ts` — Upstash Redis 기반 adEventRatelimit 싱글턴
- `src/app/api/ads/events/route.ts` — rate limit + ip_hash + createSupabaseAdminClient()
- `src/app/admin/ads/page.tsx` — inline createClient → createSupabaseAdminClient()
- `src/app/api/worker/notify/route.ts` — inline createClient → createSupabaseAdminClient()
- `src/lib/auth/ad-actions.ts` — inline createClient → createSupabaseAdminClient()
- `src/lib/data/complexes-map.ts` — .eq('status', 'active') 추가
- `src/app/api/ads/events/route.test.ts` — SEC-01 rate limit + ip_hash 통합 테스트 (4 tests)
- `src/lib/supabase/admin.test.ts` — SEC-02 팩토리 계약 검증 테스트 (3 tests)
- `src/lib/data/complexes-map.test.ts` — SEC-03 status 필터 체인 확인 테스트 (2 tests)

## Decisions Made

- **@upstash/redis 직접 사용**: @vercel/kv는 2024-12에 deprecated. Upstash 공식 패키지 직접 설치.
- **ip_hash nullable 유지**: 마이그레이션 없이 코드 변경만으로 해결 (방안 B). 기존 NULL 레코드는 "rate limit 도입 이전 데이터"로 처리.
- **RATE_LIMIT_SECRET 미설정 시 빈 문자열 fallback**: T-01-05 위협을 accept로 분류 (운영 배포 전 env 설정 필수).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] src/lib/auth/ad-actions.ts SEC-02 통합**
- **Found during:** Task 2 (SEC-02 구현) — 계획에 없던 4번째 파일 발견
- **Issue:** `src/lib/auth/ad-actions.ts`의 `requireAdmin()` 함수가 `createClient(URL!, KEY!)` inline 패턴 사용 중 — `grep -rn "SUPABASE_SERVICE_ROLE_KEY!" src/` 검증에서 발견
- **Fix:** `createSupabaseAdminClient()` 단일 경유로 교체, 반환 타입을 `ReturnType<typeof createSupabaseAdminClient>`로 업데이트
- **Files modified:** `src/lib/auth/ad-actions.ts`
- **Verification:** `grep -rn "SUPABASE_SERVICE_ROLE_KEY!" src/ --include="*.ts" --include="*.tsx"` 출력 = 0건 (admin.ts는 `!` 없이 명시적 null check 사용)
- **Committed in:** `4fe5ffd` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical security)
**Impact on plan:** SEC-02 성공 기준 완전 충족을 위해 필수. 범위 확대 없음.

## Issues Encountered

- **worktree lint 충돌**: 워크트리 환경의 중복 `package-lock.json`으로 인해 ESLint 플러그인 충돌 발생 (`npm run lint` exit 1). 이는 워크트리 환경 고유의 pre-existing 이슈이며, 본 플랜의 코드 변경으로 인한 오류가 아님. TypeScript 체크(`tsc --noEmit`)는 변경된 파일들에서 오류 없음 확인.
- **통합 테스트 실패**: `src/__tests__/` 하위 통합 테스트들이 로컬 Supabase 인스턴스 미실행으로 인해 실패 — pre-existing 환경 이슈, 본 플랜과 무관.

## User Setup Required

Upstash Redis 서비스 연결이 필요합니다. 프로덕션 배포 전 다음을 완료해야 합니다:

1. Vercel Dashboard → Storage → Create Database → Upstash Redis (무료 티어)
2. 연결 후 자동 주입되는 환경변수 확인:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. `RATE_LIMIT_SECRET` 환경변수 생성: `openssl rand -hex 32`

## Next Phase Readiness

- SEC-01/02/03 패치 완료 — 광고 이벤트 rate limiting, admin client 통합, 지도 필터 적용
- 다음 플랜(01-02)은 Sentry 에러 트래킹(SEC-04) 구현 예정
- Upstash Redis 서비스 연결 없이는 `/api/ads/events` 엔드포인트가 `Redis.fromEnv()` 초기화 실패로 오류 발생 — 운영 배포 전 Vercel Marketplace 연결 필수

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| 없음 | — | 신규 네트워크 엔드포인트, 인증 경로, 파일 접근 패턴, 스키마 변경 없음 |

## Self-Check: PASSED

- `src/lib/ratelimit.ts` — FOUND
- `src/app/api/ads/events/route.test.ts` — FOUND
- `src/lib/supabase/admin.test.ts` — FOUND
- `src/lib/data/complexes-map.test.ts` — FOUND
- Commits `fc05233`, `4fe5ffd` — FOUND

---
*Phase: 01-security-infra-deploy*
*Completed: 2026-05-06*
