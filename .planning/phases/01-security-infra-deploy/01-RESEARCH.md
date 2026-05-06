# Phase 1: 보안·인프라·배포 - Research

**Researched:** 2026-05-06
**Domain:** Security hardening, CI/CD, E2E testing, error tracking, rate limiting
**Confidence:** HIGH (기존 코드베이스 직접 확인 + 공식 문서 교차 검증)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sentry 에러 트래킹 (SEC-04)**
- D-01: `@sentry/nextjs` 설치하여 에러 트래킹 활성화
- D-02: `tracesSampleRate: 0` — 성능 트레이싱 비활성화, 에러만 추적 (무료 티어 5K 에러/월)
- D-03: `NODE_ENV === 'production'` 조건부 활성화 — 로컬·개발 환경에서 노이즈 없음
- D-04: Sentry DSN은 Sentry.io 신규 프로젝트 생성 후 환경변수로 주입

**Rate Limiting (SEC-01)**
- D-05: Upstash Redis (`@upstash/redis`) 사용 — 분산 카운터
- D-06: 한도: 1분 / IP당 100회 (`Ratelimit.slidingWindow(100, '1 m')`)
- D-07: IP hash = `sha256(x-forwarded-for + RATE_LIMIT_SECRET)` — ad_events 테이블 ip_hash 컬럼에 기록
- D-08: Upstash는 Vercel 마켓플레이스에서 무료 티어로 연결

**E2E 테스트 전략 (INFRA-03)**
- D-09: 골든패스 5종: 랜딩·단지 상세·지도·검색·후기 작성
- D-10: 인증 전략: `global-setup.ts`에서 `admin.createUser()` + password → `signInWithPassword()` → 세션 쿠키 추출 → `storageState.json` 저장
- D-11: E2E 환경: 프로덕션 Supabase 연결, `SUPABASE_SERVICE_ROLE_KEY`는 GitHub Secret
- D-12: E2E 실행: PR마다 GitHub Actions 자동 실행

**CI 게이트 (INFRA-02)**
- D-13: GitHub branch protection — `main` 브랜치 required status check
- D-14: Required 체크 4종: lint/typecheck + build + Vitest + Playwright
- D-15: 4종 중 하나라도 실패하면 PR merge 버튼 비활성화

**환경변수 정리 (INFRA-01)**
- D-16: NextAuth 관련 변수 제거 (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)
- D-17: 누락 변수 추가: `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `RATE_LIMIT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- D-18: `ADMIN_IP_ALLOWLIST` env var 제거

### Claude's Discretion

없음 — 모든 주요 결정은 D-01~D-18에서 고정됨

### Deferred Ideas (OUT OF SCOPE)

- `ADMIN_IP_ALLOWLIST` 구현 (미사용 env var만 제거)
- 알림 워커 병렬화 (`Promise.allSettled`)
- `as any` 타입 패턴 정리 (`unwrapJoin<T>()` 헬퍼 추출)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Vercel 프로덕션 배포 + 환경변수 검증 + `.env.local.example` 최신화 | 환경변수 현황 직접 확인 (CONCERNS.md 참조), 추가/삭제 목록 명시 |
| INFRA-02 | GitHub Actions CI — PR마다 lint/build/test 자동 실행 | 기존 `notify-worker.yml` 패턴 분석, pnpm+npm 중 npm 확인 |
| INFRA-03 | Playwright E2E — 골든패스 5종 자동화 | `playwright.config.ts` 분석, `./e2e` 디렉토리 없음 확인, admin auth 패턴 문서화 |
| SEC-01 | 광고 이벤트 rate limiting + IP hash | `route.ts` 코드 직접 확인, Upstash 2.0.8 + Redis 1.38.0 버전 검증 |
| SEC-02 | `createSupabaseAdminClient()` 통합 (3곳 inline 교체) | 3개 파일 코드 직접 확인 및 교체 위치 문서화 |
| SEC-03 | 지도 쿼리 `status='active'` 필터 | `complexes-map.ts` 코드 직접 확인, 1줄 수정으로 해결 |
| SEC-04 | Sentry 초기화 또는 플레이스홀더 제거 | `@sentry/nextjs` 10.51.0 현재 버전 확인, 파일 구조 문서화 |
</phase_requirements>

---

## Summary

Phase 1은 신규 기능이 없는 보안 강화·인프라 정착 Phase이다. 7개 요구사항 모두 기존 코드의 패치 또는 새 서비스 통합으로 해결된다.

**SEC-02와 SEC-03**은 단순 코드 교체/추가 (각 1~3줄). 위험 없음.

**SEC-01 (Upstash rate limit)**은 신규 서비스 연동이 필요하다. Vercel Marketplace에서 Upstash Redis를 설치하면 `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`이 자동 주입된다. `@vercel/kv`는 2024년 12월에 deprecated되었으므로 `@upstash/redis` + `@upstash/ratelimit`을 직접 사용한다.

**SEC-04 (Sentry)**는 `@sentry/nextjs` 10.51.0 (latest) 설치 + `instrumentation.ts` 생성 패턴이다. Next.js 15의 새 파일 구조는 `instrumentation.ts` (루트) + `instrumentation-client.ts` (루트)이며, `sentry.server.config.ts`와 `sentry.edge.config.ts`는 별도 파일로 관리한다.

**INFRA-02 (CI)**는 기존 `notify-worker.yml` 구조를 참조하여 `ci.yml`을 신규 작성. npm 사용 프로젝트이므로 pnpm 불필요.

**INFRA-03 (E2E)**는 가장 복잡하다. `./e2e` 디렉토리가 없고, global-setup.ts도 없다. 프로덕션 Supabase 연결 방식이므로 테스트용 유저 생성/삭제 cleanup 로직이 필수다.

**Primary recommendation:** SEC-02, SEC-03을 먼저 처리 (단순, 무위험) → SEC-01 (Upstash 서비스 설정 필요) → SEC-04 (Sentry 계정 필요) → INFRA-02 (CI YAML) → INFRA-03 (E2E 구현) → INFRA-01 (배포 + 환경변수 최신화) 순으로 진행.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rate limiting (SEC-01) | API / Backend (Node.js Route Handler) | — | IP 기반 제한은 요청을 받는 서버 계층에서 처리. middleware.ts(Edge)도 가능하나 Route Handler가 이미 `runtime = 'nodejs'`이므로 일관성 유지 |
| Admin client 통합 (SEC-02) | API / Backend | — | service_role은 서버 전용; 3개 파일 모두 서버 컴포넌트/Route Handler |
| Map status filter (SEC-03) | API / Backend (data layer) | — | `src/lib/data/complexes-map.ts`는 서버 전용 데이터 레이어 |
| Sentry 초기화 (SEC-04) | API/Backend + Client + Edge | — | 3개 런타임 모두에 Sentry 초기화 필요 (instrumentation.ts, instrumentation-client.ts, sentry.edge.config.ts) |
| E2E 인증 (INFRA-03) | Database / Storage (Supabase Auth) | Frontend (Playwright) | admin.createUser는 Supabase Auth, 세션 저장은 Playwright storageState |
| CI workflow (INFRA-02) | CI / Infra | — | GitHub Actions — 코드와 분리된 인프라 계층 |
| 환경변수 (INFRA-01) | All tiers | — | Vercel 대시보드 + .env.local.example 동기화 필요 |

---

## Standard Stack

### Core (신규 설치 필요)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@upstash/ratelimit` | 2.0.8 (latest) | Sliding window rate limiting | 서버리스·Edge 환경 전용 설계, HTTP 기반 connectionless |
| `@upstash/redis` | 1.38.0 (latest) | Upstash Redis HTTP 클라이언트 | `@vercel/kv` deprecated(2024-12); Upstash 공식 대체 패키지 |
| `@sentry/nextjs` | 10.51.0 (latest) | 에러 트래킹 | Next.js 공식 Sentry SDK, App Router instrumentation 지원 |

[VERIFIED: npm registry — 2026-05-06]

### 기존 (이미 설치됨)

| Library | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | ^1.49.0 | E2E 테스트 프레임워크 |
| `vitest` | ^2.1.9 | 단위 테스트 |
| `@supabase/supabase-js` | ^2.105.1 | Supabase admin client |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@upstash/redis` | `@vercel/kv` | @vercel/kv는 2024-12에 deprecated, 신규 프로젝트 사용 불가 |
| `@upstash/ratelimit` in Route Handler | `@upstash/ratelimit` in middleware.ts | Route Handler가 더 단순; middleware는 Edge 전용이라 Node.js crypto API 없음 |
| `@sentry/nextjs` wizard | 수동 설정 | wizard는 sentry.server.config.ts 등 파일을 자동 생성하지만 next.config.ts 수정이 필요 — 이 Phase에서는 수동 설정 권장 (next.config.ts 충돌 위험) |

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis @sentry/nextjs
```

---

## Architecture Patterns

### System Architecture Diagram

```
[POST /api/ads/events]
        |
        v
[Route Handler: runtime='nodejs']
  1. Parse body (campaign_id, event_type)
  2. Extract IP: request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  3. Rate check: Ratelimit.slidingWindow(100,'1 m').limit(ip)
        |-- BLOCKED --> 429 { error: 'Too many requests' }
        |
  4. Compute ip_hash: sha256(ip + RATE_LIMIT_SECRET) [hex]
  5. Insert: ad_events { campaign_id, event_type, ip_hash }
        via createSupabaseAdminClient()
        |
        v
  [Supabase ad_events table]

[Sentry Error Flow]
  instrumentation.ts (NEXT_RUNTIME check)
    |-- nodejs --> sentry.server.config.ts
    |-- edge   --> sentry.edge.config.ts
  instrumentation-client.ts (browser)
    --> NODE_ENV === 'production' 조건부 init
    --> tracesSampleRate: 0 (에러만, 성능 트레이싱 없음)

[GitHub Actions CI: ci.yml]
  on: pull_request
    --> job: ci
          lint + typecheck
          build (환경변수 필요)
          vitest (unit)
          playwright (e2e, 프로덕션 Supabase)
    --> required status checks (4종)
```

### Recommended Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── ads/events/route.ts   # SEC-01 rate limit + SEC-02 admin client
│   ├── admin/ads/page.tsx        # SEC-02 admin client
│   └── api/worker/notify/route.ts # SEC-02 admin client
├── lib/
│   ├── supabase/admin.ts         # SEC-02: 단일 팩토리 (기존 유지)
│   └── data/complexes-map.ts     # SEC-03: status filter 추가
├── instrumentation.ts            # SEC-04: 서버/엣지 Sentry 등록 (신규)
├── instrumentation-client.ts     # SEC-04: 클라이언트 Sentry 초기화 (신규)
├── sentry.server.config.ts       # SEC-04: 서버 설정 (신규)
└── sentry.edge.config.ts         # SEC-04: 엣지 설정 (신규)
e2e/
├── global-setup.ts               # INFRA-03: 테스트 유저 생성 + storageState
├── global-teardown.ts            # INFRA-03: 테스트 유저 삭제 cleanup
├── landing.spec.ts               # 골든패스 1: 랜딩
├── complex-detail.spec.ts        # 골든패스 2: 단지 상세
├── map.spec.ts                   # 골든패스 3: 지도
├── search.spec.ts                # 골든패스 4: 검색
└── review.spec.ts                # 골든패스 5: 후기 작성 (auth 필요)
.github/
└── workflows/
    ├── notify-worker.yml         # 기존 (변경 없음)
    └── ci.yml                    # INFRA-02: 신규
supabase/migrations/
└── 20260507000001_ad_events_ip_hash_not_null.sql  # SEC-01: ip_hash NOT NULL 제약 고려
```

---

## SEC-01: Rate Limiting 구현 패턴

### Upstash Redis 초기화

```typescript
// src/lib/ratelimit.ts (신규)
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Redis.fromEnv()는 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN 자동 읽기
export const adEventRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: false,  // 무료 티어 데이터 절약
  prefix: 'danji:ad:rl',
})
```
[CITED: upstash.com/blog/nextjs-ratelimiting, upstash/ratelimit-js GitHub README]

### Route Handler 적용 패턴

```typescript
// src/app/api/ads/events/route.ts (교체)
import { NextResponse } from 'next/server'
import { createSubabaseAdminClient } from '@/lib/supabase/admin'
import { adEventRatelimit } from '@/lib/ratelimit'
import { createHash } from 'crypto'  // Node.js 내장 (runtime = 'nodejs')

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  // 1. IP 추출
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'

  // 2. Rate limit 체크 (ip 원본으로 카운터)
  const { success, remaining, reset } = await adEventRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  // 3. ip_hash 생성 (PII 비저장)
  const secret = process.env.RATE_LIMIT_SECRET ?? ''
  const ip_hash = createHash('sha256').update(ip + secret).digest('hex')

  // ... body 파싱 및 검증 ...

  // 4. admin client로 INSERT
  const supabase = createSupabaseAdminClient()
  await supabase.from('ad_events').insert({
    campaign_id: b.campaign_id as string,
    event_type:  b.event_type as string,
    ip_hash,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

**중요 결정**: Rate limit 식별자는 ip 원본 (카운팅용), ip_hash는 DB 저장용으로 구분. [ASSUMED]

### Upstash 환경변수 이름

Vercel Marketplace에서 Upstash Redis 통합 설치 시 자동 주입되는 변수:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

`Redis.fromEnv()`는 이 두 변수를 자동으로 읽는다. [CITED: upstash.com/docs/redis/howto/vercelintegration]

> **주의:** `@vercel/kv`는 2024년 12월에 deprecated됨. 신규 프로젝트는 Vercel Marketplace → Upstash Redis 통합을 직접 사용해야 함. [VERIFIED: vercel.com/docs/redis]

---

## SEC-02: Admin Client 통합 패턴

3개 파일에서 inline `createClient(URL!, KEY!)` 패턴을 `createSupabaseAdminClient()`로 교체:

```typescript
// 교체 전 (3개 파일 공통 패턴)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// 교체 후
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
const supabase = createSupabaseAdminClient()
```

**파일별 교체 위치:**
- `src/app/admin/ads/page.tsx` lines 52-56: `const adminClient = createClient<Database>(...)` → `const adminClient = createSupabaseAdminClient()`
- `src/app/api/ads/events/route.ts` lines 24-28: 이미 SEC-01에서 교체됨
- `src/app/api/worker/notify/route.ts` lines 15-19: `const supabase = createClient<Database>(...)` → `const supabase = createSupabaseAdminClient()`

`admin/ads/page.tsx`에서 `import { createClient } from '@supabase/supabase-js'`와 `import type { Database } from '@/types/database'` 제거. [VERIFIED: 코드베이스 직접 확인]

---

## SEC-03: Map Status Filter

```typescript
// src/lib/data/complexes-map.ts — 수정 전
const { data, error } = await supabase
  .from('complexes')
  .select('id, canonical_name, lat, lng, sgg_code')
  .in('sgg_code', sggCodes)
  .not('lat', 'is', null)
  .not('lng', 'is', null)

// 수정 후 — .eq('status', 'active') 추가
const { data, error } = await supabase
  .from('complexes')
  .select('id, canonical_name, lat, lng, sgg_code')
  .in('sgg_code', sggCodes)
  .not('lat', 'is', null)
  .not('lng', 'is', null)
  .eq('status', 'active')      // ← 이 한 줄 추가
```

`sitemap.ts`와 `complex-matching.ts`는 이미 필터링 중. [VERIFIED: 코드베이스 직접 확인]

---

## SEC-04: Sentry 초기화 패턴

### 파일 구조

Next.js 15 App Router에서 `@sentry/nextjs` 10.x가 사용하는 파일 구조: [CITED: docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/]

```typescript
// instrumentation.ts (프로젝트 루트)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
```

```typescript
// sentry.server.config.ts (프로젝트 루트)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,      // 성능 트레이싱 비활성화 (에러만)
  debug: false,
})
```

```typescript
// sentry.edge.config.ts (프로젝트 루트)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
})
```

```typescript
// instrumentation-client.ts (프로젝트 루트) — 브라우저
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
})
```

### next.config.ts 수정

```typescript
// next.config.ts
import withSentryConfig from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({ ... })

const nextConfig: NextConfig = { /* 기존 설정 */ }

export default withSentryConfig(
  withSerwist(nextConfig),
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // 소스맵은 .sentryclirc 또는 env로 설정 (SENTRY_AUTH_TOKEN)
    silent: !process.env.CI,
  }
)
```

**중요 사항:**
- `SENTRY_DSN`은 server-side only (PUBLIC 아님)
- `NEXT_PUBLIC_SENTRY_DSN`은 client-side 별도 env 필요
- CONTEXT.md에서 `D-03: NODE_ENV === 'production'` 조건부 활성화가 결정됨 [LOCKED]
- `instrumentation.ts`는 `src/` 안이 아닌 프로젝트 루트에 위치해야 함 (Next.js 15 규칙)

---

## INFRA-02: GitHub Actions CI Workflow 패턴

### ci.yml 구조

기존 `notify-worker.yml` 패턴 참조 + npm 기반 프로젝트 확인 [VERIFIED: package.json — npm scripts 사용]:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_KAKAO_JS_KEY: ${{ secrets.NEXT_PUBLIC_KAKAO_JS_KEY }}

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_KAKAO_JS_KEY: ${{ secrets.NEXT_PUBLIC_KAKAO_JS_KEY }}
          NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${{ secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY }}

  unit-test:
    name: Unit Tests (Vitest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: [build]  # build 성공 후에만 실행
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NEXT_PUBLIC_KAKAO_JS_KEY: ${{ secrets.NEXT_PUBLIC_KAKAO_JS_KEY }}
          NEXT_PUBLIC_SITE_URL: ${{ secrets.NEXT_PUBLIC_SITE_URL }}
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**주의 사항:**
- E2E는 로컬 Next.js 서버 (`npm run dev`)를 구동하므로 `playwright.config.ts`의 `webServer.command` 확인 필요
- 프로덕션 Supabase에 직접 연결 (D-11) → `SUPABASE_SERVICE_ROLE_KEY` 필요
- `workers: 1` (CI 환경)은 `playwright.config.ts`에 이미 설정됨 [VERIFIED]

---

## INFRA-03: Playwright E2E Global Setup 패턴

### global-setup.ts 구현

프로덕션 Supabase를 사용하므로 admin API로 테스트 유저를 생성하고 테스트 후 삭제한다.

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TEST_USER_EMAIL = `e2e-test-${Date.now()}@danjiondo.test`
const TEST_USER_PASSWORD = `TestPw${Date.now()}!`

export default async function globalSetup(config: FullConfig) {
  // 1. Admin client로 테스트 유저 생성
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: { user }, error } = await supabase.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true,   // 이메일 인증 없이 즉시 활성화
  })
  if (error || !user) throw new Error(`Test user creation failed: ${error?.message}`)

  // 2. storageState를 위해 브라우저에서 실제 로그인
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  await page.goto(`${baseURL}/login`)

  // Supabase Auth 매직 링크 대신 이 Phase에서는 로그인 폼 사용
  // (또는 REST API로 세션 토큰 획득 → 쿠키 직접 주입)
  // 방법: signInWithPassword를 통해 access_token 획득 후 쿠키 주입
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })
  if (signInError || !sessionData.session) {
    throw new Error(`Test user sign-in failed: ${signInError?.message}`)
  }

  // 3. @supabase/ssr 쿠키 이름 패턴: sb-<ref>-auth-token
  // 실제 쿠키 이름은 NEXT_PUBLIC_SUPABASE_URL의 ref 코드에서 유래
  const supabaseRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]
  const cookieName = `sb-${supabaseRef}-auth-token`

  await context.addCookies([
    {
      name: cookieName,
      value: JSON.stringify([
        sessionData.session.access_token,
        sessionData.session.refresh_token,
      ]),
      domain: new URL(baseURL).hostname,
      path: '/',
      httpOnly: true,
      secure: baseURL.startsWith('https'),
      sameSite: 'Lax',
    },
  ])

  // 4. storageState 저장
  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()

  // 5. 테스트 유저 ID를 환경변수로 전달 (teardown에서 삭제용)
  process.env.E2E_TEST_USER_ID = user.id
}
```

### global-teardown.ts

```typescript
// e2e/global-teardown.ts
import { createClient } from '@supabase/supabase-js'

export default async function globalTeardown() {
  const userId = process.env.E2E_TEST_USER_ID
  if (!userId) return

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  await supabase.auth.admin.deleteUser(userId)
}
```

### playwright.config.ts 수정

```typescript
// playwright.config.ts — 수정 사항
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // auth가 필요 없는 테스트 (랜딩, 단지 상세, 지도, 검색)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // auth가 필요한 테스트 (후기 작성)
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  // ...
})
```

**쿠키 주입 방식의 위험:**  
`@supabase/ssr`의 쿠키 이름 및 값 형식은 버전에 따라 변경될 수 있다. [ASSUMED]  
대안: E2E 전용 로그인 페이지를 Playwright로 실제 UI를 통해 로그인하는 방식이 더 안정적이나 느리다.

**더 안전한 대안 패턴:**
```typescript
// UI를 통한 로그인 (느리지만 안정적)
await page.goto(`${baseURL}/login`)
await page.getByLabel('이메일').fill(TEST_USER_EMAIL)
await page.getByLabel('이메일').press('Enter')
// 매직 링크 방식이면 OTP 대기 불필요 — password 방식 사용
await page.context().storageState({ path: 'e2e/.auth/user.json' })
```

### 골든패스 5종 테스트 구조

| 파일 | URL | Auth 필요 | 핵심 검증 |
|------|-----|----------|----------|
| `landing.spec.ts` | `/` | 없음 | h1 타이틀, 랭킹 섹션 표시 |
| `complex-detail.spec.ts` | `/complexes/[id]` | 없음 | 단지명, 가격 차트, 후기 섹션 |
| `map.spec.ts` | `/map` | 없음 | 카카오 지도 로드, 마커 노출 |
| `search.spec.ts` | `/?q=창원` 또는 검색 UI | 없음 | 검색 결과 목록 표시 |
| `review.spec.ts` | `/complexes/[id]` | 필요 | 후기 작성 폼 제출 성공 |

---

## INFRA-01: 환경변수 정리

### .env.local.example 변경 사항

**제거 (D-16, D-18):**
```bash
# 삭제 대상
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
ADMIN_IP_ALLOWLIST=127.0.0.1/32
```

**추가 (D-17):**
```bash
# Resend
RESEND_FROM_EMAIL=단지온도 <no-reply@danjiondo.com>

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

### Vercel 환경변수 검증 체크리스트

배포 전 Vercel 대시보드에서 다음 확인:

| 변수 | 범위 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | 필수 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | All | 필수 |
| `KAKAO_REST_API_KEY` | Server only | 필수 |
| `MOLIT_API_KEY` | Server only | 필수 |
| `CRON_SECRET` | Server only | 필수 |
| `RESEND_API_KEY` | Server only | 필수 |
| `RESEND_FROM_EMAIL` | Server only | 필수 (신규) |
| `NEXT_PUBLIC_SITE_URL` | All | 필수 (신규) |
| `VAPID_PRIVATE_KEY` | Server only | 필수 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | All | 필수 |
| `UPSTASH_REDIS_REST_URL` | Server only | 필수 (신규) |
| `UPSTASH_REDIS_REST_TOKEN` | Server only | 필수 (신규) |
| `RATE_LIMIT_SECRET` | Server only | 필수 (신규) |
| `SENTRY_DSN` | Server only | 필수 (신규) |
| `NEXT_PUBLIC_SENTRY_DSN` | All | 필수 (신규) |

---

## Supabase Migration: ip_hash 컬럼 NOT NULL 제약

### 현황 분석

`ad_events` 테이블의 `ip_hash` 컬럼은 이미 `20260430000007_ads.sql`에 `text` (nullable)로 존재한다. [VERIFIED: 코드베이스 직접 확인]

SEC-01 구현 후에는 모든 신규 INSERT에 `ip_hash`가 반드시 포함된다. 단, 마이그레이션이 필요한 경우:

**방안 A: NOT NULL 제약 추가 (권장하지 않음)**
기존 레코드(ip_hash가 NULL인 레코드)가 있으면 실패. 프로덕션에 이미 데이터가 있을 경우 위험.

**방안 B: 컬럼 유지 nullable (권장)**
코드에서 ip_hash를 항상 입력하도록 보장. 마이그레이션 불필요.
기존 NULL 레코드는 "rate limit 도입 이전 데이터"로 처리.

**방안 C: DEFAULT 추가 (선택적)**
```sql
-- supabase/migrations/20260507000001_ad_events_ip_hash_default.sql
ALTER TABLE public.ad_events
  ALTER COLUMN ip_hash SET DEFAULT 'legacy';
```

**권장: 방안 B** — 마이그레이션 없이 코드 변경만으로 해결. 기존 데이터 안전.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distributed rate limiting | 인메모리 카운터 or DB 기반 카운터 | `@upstash/ratelimit` slidingWindow | Serverless 재시작 시 인메모리 초기화; DB 카운터는 경쟁 조건 발생 |
| Error aggregation | console.error + 수동 Vercel 로그 확인 | `@sentry/nextjs` | 스택 트레이스, 사용자 컨텍스트, alerting 포함 |
| E2E auth session | 매 테스트마다 로그인 | Playwright storageState | 테스트 속도 및 격리성 향상 |
| SHA-256 해싱 | 직접 구현 | Node.js `crypto.createHash('sha256')` | 내장 모듈, zero dependency |

---

## Common Pitfalls

### Pitfall 1: @vercel/kv 사용

**What goes wrong:** D-05에서 "Upstash Redis (`@vercel/kv`)"라고 명시되어 있으나 `@vercel/kv`는 2024-12에 deprecated됨.  
**Why it happens:** CONTEXT.md 작성 시 시점의 정보 반영.  
**How to avoid:** `@upstash/redis` + `@upstash/ratelimit` 직접 사용. `Redis.fromEnv()`는 `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`을 읽음.  
**Warning signs:** `npm install @vercel/kv` 시 deprecation notice 출력.

### Pitfall 2: Sentry instrumentation.ts 위치 오류

**What goes wrong:** `src/instrumentation.ts`로 생성 시 Next.js가 인식하지 못함.  
**Why it happens:** Next.js 15에서 `instrumentation.ts`는 프로젝트 루트에 위치해야 함 (src 없이).  
**How to avoid:** 루트에 `instrumentation.ts` 생성. `src/` 사용 프로젝트도 동일.  
**Warning signs:** Sentry 이벤트가 수신되지 않음.

### Pitfall 3: Sentry withSentryConfig가 withSerwist를 덮어씀

**What goes wrong:** `next.config.ts`에서 래퍼 순서를 잘못 적용 시 Serwist(PWA) 설정이 제거됨.  
**Why it happens:** 두 HOC가 next.config를 래핑하는 구조.  
**How to avoid:** `withSentryConfig(withSerwist(nextConfig), sentryOptions)` 순서 유지.  
**Warning signs:** `npm run build` 후 `public/sw.js`가 생성되지 않음.

### Pitfall 4: Playwright E2E — Supabase 세션 쿠키 이름 불일치

**What goes wrong:** `@supabase/ssr` 쿠키 이름이 `sb-{supabaseRef}-auth-token`이 아닌 다른 형식일 수 있음.  
**Why it happens:** `@supabase/ssr` 버전 및 설정에 따라 쿠키 이름이 달라짐.  
**How to avoid:** 로컬에서 직접 로그인 후 `document.cookie` 또는 DevTools Network 탭으로 실제 쿠키 이름 확인.  
**Alternative:** UI 기반 로그인 방식(Playwright form fill)이 쿠키 이름 의존성 없이 더 안정적.

### Pitfall 5: E2E 테스트 유저가 프로덕션 DB에 남음

**What goes wrong:** `globalTeardown`이 실행되지 않거나 삭제 실패 시 테스트 유저 누적.  
**Why it happens:** CI 실패 시 teardown 스킵.  
**How to avoid:** 이메일에 타임스탬프 포함 (`e2e-test-{timestamp}@...`) + 주기적 cleanup 스크립트. `@danjiondo.test` 도메인은 실제 사용자가 없어야 함.  
**Warning signs:** `auth.users` 테이블에 `e2e-test-` 접두사 유저 누적.

### Pitfall 6: GitHub Actions에서 NEXT_PUBLIC_ 변수 누락으로 build 실패

**What goes wrong:** `npm run build`가 `NEXT_PUBLIC_SUPABASE_URL` 없이 실패.  
**Why it happens:** Next.js가 빌드 타임에 `NEXT_PUBLIC_` 변수를 번들에 인라인.  
**How to avoid:** CI yaml의 build job에 모든 `NEXT_PUBLIC_*` 변수 포함.  
**Warning signs:** `Error: Missing required environment variable` 빌드 에러.

---

## Code Examples

### Upstash Redis + ratelimit 전체 예시

```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 싱글턴 패턴 — 모듈 레벨에서 한 번만 초기화
export const adEventRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),   // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'danji:ad:rl',
})
```
[CITED: github.com/upstash/ratelimit-js]

### sha256 IP 해싱

```typescript
import { createHash } from 'crypto'

function hashIp(ip: string, secret: string): string {
  return createHash('sha256').update(`${ip}:${secret}`).digest('hex')
}
```
[ASSUMED: Node.js crypto API 표준 사용법 — 검증 불필요]

### Supabase admin.createUser TypeScript

```typescript
const { data, error } = await supabase.auth.admin.createUser({
  email: 'test@example.com',
  password: 'securepassword123!',
  email_confirm: true,  // 이메일 인증 건너뜀
})
// data.user.id 사용 가능
```
[CITED: supabase.com/docs/reference/javascript/auth-admin-createuser]

---

## Runtime State Inventory

> 이 Phase는 Rename/Refactor가 아닌 코드 패치이므로 대부분 해당 없음. 단, Supabase 마이그레이션 관련 항목만 기록.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `ad_events.ip_hash` 컬럼 이미 존재 (nullable) | 마이그레이션 불필요 — 코드에서 항상 삽입하도록 수정 |
| Live service config | Upstash Redis 신규 — Vercel Marketplace 연결 필요 | Vercel Dashboard 수동 설정 (코드 외 작업) |
| Live service config | Sentry 프로젝트 생성 필요 | sentry.io에서 수동 생성 후 DSN 환경변수 설정 |
| OS-registered state | 없음 — 확인됨 | 없음 |
| Secrets/env vars | `.env.local.example`에 누락 변수 5개 | D-17 에서 추가 |
| Build artifacts | 없음 | 없음 |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CI/build | CI: ubuntu-latest에 포함 | 20 (LTS) | — |
| npm | CI | CI: Node.js와 함께 포함 | — | — |
| Playwright browsers | INFRA-03 E2E | CI에서 설치 필요 (`npx playwright install`) | 1.49.0 | — |
| Upstash Redis | SEC-01 | 미연결 (신규 서비스) | — | 없음 — Vercel Marketplace 설치 필요 |
| Sentry DSN | SEC-04 | 미설정 (신규 서비스) | — | 없음 — sentry.io 계정 생성 필요 |
| GitHub branch protection | INFRA-02 | 미설정 | — | 코드로 설정 불가, GitHub UI 수동 설정 |

**Missing dependencies with no fallback:**
- Upstash Redis — Vercel Dashboard → Storage → Upstash Redis 연결 후 환경변수 자동 주입
- Sentry DSN — sentry.io에서 Next.js 프로젝트 생성 필요 (무료 티어 가능)
- GitHub branch protection — 배포 완료 후 GitHub 설정에서 수동 활성화

**수동 작업 목록 (코드 작업 전/후 필요):**
1. Vercel Marketplace → Upstash Redis 통합 설치 (SEC-01 전)
2. sentry.io → 신규 프로젝트 생성 → DSN 복사 (SEC-04 전)
3. Vercel 대시보드 → 환경변수 설정 (INFRA-01)
4. GitHub → Settings → Branches → branch protection rule 추가 (INFRA-02 후)

---

## Validation Architecture

> `workflow.nyquist_validation: true` — 이 섹션 필수.

### Test Framework

| Property | Value |
|----------|-------|
| Unit Framework | Vitest 2.1.9 |
| E2E Framework | Playwright 1.49.0 |
| Unit Config | `vitest.config.ts` (또는 `vite.config.ts`) |
| E2E Config | `playwright.config.ts` |
| Quick unit run | `npm run test` |
| Full E2E run | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | 100회 초과 시 429 반환 | integration | `npm run test -- src/app/api/ads/events/route.test.ts` | ❌ Wave 0 |
| SEC-01 | ip_hash가 ad_events에 기록됨 | integration | 위와 동일 | ❌ Wave 0 |
| SEC-02 | createSupabaseAdminClient() 호출 확인 | unit | `npm run test -- src/lib/supabase/admin.test.ts` | ❌ Wave 0 |
| SEC-03 | status='active' 쿼리 포함 확인 | unit | `npm run test -- src/lib/data/complexes-map.test.ts` | ❌ Wave 0 |
| SEC-04 | NODE_ENV=production에서만 Sentry.init 호출 | unit | `npm run test -- src/sentry.*.test.ts` | ❌ Wave 0 |
| INFRA-03 | 랜딩 페이지 로드 | E2E | `npm run test:e2e -- --grep "landing"` | ❌ Wave 0 |
| INFRA-03 | 단지 상세 페이지 로드 | E2E | `npm run test:e2e -- --grep "complex detail"` | ❌ Wave 0 |
| INFRA-03 | 지도 페이지 로드 | E2E | `npm run test:e2e -- --grep "map"` | ❌ Wave 0 |
| INFRA-03 | 검색 동작 | E2E | `npm run test:e2e -- --grep "search"` | ❌ Wave 0 |
| INFRA-03 | 후기 작성 (인증) | E2E | `npm run test:e2e -- --grep "review"` | ❌ Wave 0 |
| INFRA-02 | CI workflow 실행 성공 | CI smoke | GitHub Actions 실행 결과 | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test` (Vitest unit — 30초 이내)
- **Per wave merge:** `npm run test && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `e2e/` 디렉토리 생성 (현재 없음 — CONCERNS.md 명시)
- [ ] `e2e/global-setup.ts` — Supabase admin auth
- [ ] `e2e/global-teardown.ts` — 테스트 유저 cleanup
- [ ] `e2e/landing.spec.ts`, `complex-detail.spec.ts`, `map.spec.ts`, `search.spec.ts`, `review.spec.ts`
- [ ] `e2e/.auth/` 디렉토리 생성 + `.gitignore`에 추가 (storageState.json 커밋 금지)
- [ ] `src/app/api/ads/events/route.test.ts` — SEC-01 rate limit unit test
- [ ] `src/lib/data/complexes-map.test.ts` — SEC-03 status filter test

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (기존 구현), E2E test user 관리 |
| V3 Session Management | yes | @supabase/ssr cookie-based, httpOnly 쿠키 |
| V4 Access Control | yes | createSupabaseAdminClient() 단일 경유 (SEC-02) |
| V5 Input Validation | yes | Zod (기존), rate limit identifier 검증 |
| V6 Cryptography | yes | sha256(ip + secret) — Node.js crypto 내장 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Ad click fraud (임프레션/클릭 인플레이션) | Spoofing, Tampering | slidingWindow(100,'1m') + ip_hash (SEC-01) |
| Service role key 노출 | Information Disclosure | createSupabaseAdminClient() 단일 경유 + server-only import (SEC-02) |
| 철거 단지 핀 클릭 → 잘못된 데이터 | Tampering | status='active' 필터 (SEC-03) |
| 에러 로그 부재 → 운영 블라인드 | Repudiation | Sentry 에러 트래킹 (SEC-04) |
| RATE_LIMIT_SECRET 미설정 | Spoofing | 시작 시 환경변수 검증 (fallback '' 금지) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Rate limit 식별자로 raw IP 사용, DB에는 ip_hash만 저장 | SEC-01 패턴 | 낮음 — 업계 표준 패턴 |
| A2 | `@supabase/ssr`의 쿠키 이름 형식이 `sb-{ref}-auth-token` | INFRA-03 global-setup | 높음 — 버전 따라 다를 수 있음. 배포 전 실제 쿠키 이름 확인 필요 |
| A3 | `instrumentation.ts`는 `src/` 없이 루트에 위치 | SEC-04 | 중간 — Next.js 15 문서 기준이나 프로젝트 구조 확인 필요 |
| A4 | `SENTRY_ORG`와 `SENTRY_PROJECT` 환경변수가 소스맵 업로드에 필요 | SEC-04 | 낮음 — optional이므로 누락 시 소스맵 미업로드만 발생 |
| A5 | E2E CI에서 `webServer.command: 'npm run dev'`가 충분히 빠름 | INFRA-02/03 | 중간 — 느리면 `npm run build && npm run start` 패턴으로 전환 필요 |

---

## Open Questions

1. **Supabase 세션 쿠키 실제 이름**
   - What we know: `@supabase/ssr 0.10.x`는 `sb-{ref}-auth-token` 패턴 사용
   - What's unclear: 0.10.2 버전의 정확한 쿠키 이름 (chunked 쿠키 여부)
   - Recommendation: Wave 0에서 로컬 환경으로 실제 로그인 후 쿠키 이름 확인 → global-setup.ts에 반영. 불확실하면 UI 기반 로그인 방식(form fill)으로 대체.

2. **E2E에서 프로덕션 Supabase URL**
   - What we know: D-11에서 프로덕션 연결로 결정
   - What's unclear: `playwright.config.ts`의 `baseURL`을 `http://localhost:3000`(dev 서버)으로 할지 프로덕션 URL로 할지
   - Recommendation: CI에서는 dev 서버(로컬), `NEXT_PUBLIC_SITE_URL`로 오버라이드 가능하도록 설정.

3. **NEXT_PUBLIC_SENTRY_DSN vs SENTRY_DSN**
   - What we know: Sentry DSN은 public(브라우저에서 사용)이므로 `NEXT_PUBLIC_` 접두사가 필요함
   - What's unclear: 서버/엣지 설정에도 동일 값 사용 가능 여부
   - Recommendation: `NEXT_PUBLIC_SENTRY_DSN` 단일 변수로 통일. 서버 설정에서도 `process.env.NEXT_PUBLIC_SENTRY_DSN` 사용.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/kv` | `@upstash/redis` + Vercel Marketplace 통합 | 2024-12 | @vercel/kv 설치 불가; 직접 Upstash 패키지 사용 |
| `sentry.server.config.ts` (단독) | `instrumentation.ts` + `instrumentation-client.ts` + config 파일들 | @sentry/nextjs 8.x+ | Next.js 15 App Router의 공식 instrumentation hook 사용 |
| Playwright `globalSetup` function | Playwright `projects` + `.setup.ts` 파일 | Playwright 1.40+ | setup을 project 의존성으로 선언하면 병렬 테스트와 통합 가능 |

**Deprecated/outdated:**
- `@vercel/kv`: deprecated 2024-12, 신규 설치 불가
- `sentry.server.config.ts` 단독 사용: Next.js 15에서는 `instrumentation.ts` 방식 권장

---

## Project Constraints (from CLAUDE.md)

- CRITICAL: 모든 외부 API 호출은 `src/services/` 어댑터에서만 (Upstash Redis는 라이브러리이므로 서비스 레이어 불필요)
- CRITICAL: Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만 (rate limit + admin client 모두 서버 전용 — 준수)
- CRITICAL: 모든 사용자 데이터 테이블은 RLS 정책 명시 (ad_events는 이미 RLS 정책 있음)
- CRITICAL: 광고 게재 쿼리는 `now() BETWEEN starts_at AND ends_at AND status='approved'` 포함 (이 Phase에서 광고 쿼리 수정 없음)
- 커밋 메시지: `feat(phase-step): 설명` 형식
- 새 기능 구현 시 TDD 필수 (Wave 0 테스트 파일 생성 선행)
- `npm run lint && npm run build && npm run test` 통과 후 commit

---

## Sources

### Primary (HIGH confidence)
- 코드베이스 직접 확인: `src/app/api/ads/events/route.ts`, `src/lib/supabase/admin.ts`, `src/lib/data/complexes-map.ts`, `src/middleware.ts`, `next.config.ts`, `package.json`, `playwright.config.ts`, `.env.local.example`, `.github/workflows/notify-worker.yml`
- `supabase/migrations/20260430000007_ads.sql` — ad_events 스키마 확인
- npm registry: `@upstash/ratelimit@2.0.8`, `@upstash/redis@1.38.0`, `@sentry/nextjs@10.51.0` 버전 확인

### Secondary (MEDIUM confidence)
- [vercel.com/docs/redis](https://vercel.com/docs/redis) — @vercel/kv deprecated 확인
- [docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) — instrumentation 파일 구조
- [playwright.dev/docs/auth](https://playwright.dev/docs/auth) — storageState 패턴
- [playwright.dev/docs/ci-intro](https://playwright.dev/docs/ci-intro) — GitHub Actions 패턴
- [upstash.com/blog/nextjs-ratelimiting](https://upstash.com/blog/nextjs-ratelimiting) — Upstash ratelimit 패턴
- [github.com/upstash/ratelimit-js](https://github.com/upstash/ratelimit-js) — API 확인

### Tertiary (LOW confidence — [ASSUMED] 태그 항목)
- Supabase @supabase/ssr 쿠키 이름 형식 (A2)
- Playwright E2E에서 dev 서버 시작 시간 (A5)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — npm registry 직접 확인
- Architecture: HIGH — 기존 코드 직접 분석
- SEC-01~03 패턴: HIGH — 기존 코드 + 공식 문서 교차 검증
- SEC-04 Sentry: MEDIUM — 공식 문서 확인, wizard 없이 수동 설정 필요
- INFRA-02 CI: HIGH — 기존 workflow 패턴 재사용
- INFRA-03 E2E auth cookie: MEDIUM-LOW — 쿠키 이름 형식 [ASSUMED]

**Research date:** 2026-05-06
**Valid until:** 2026-06-05 (안정적 스택; Upstash/Sentry API는 30일간 유효)
