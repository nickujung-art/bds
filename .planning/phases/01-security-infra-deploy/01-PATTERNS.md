# Phase 1: 보안·인프라·배포 - Pattern Map

**Mapped:** 2026-05-06
**Files analyzed:** 16
**Analogs found:** 13 / 16

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/ratelimit.ts` (신규) | utility | request-response | `src/lib/supabase/admin.ts` | role-match (singleton factory) |
| `src/app/api/ads/events/route.ts` (수정) | route handler | request-response | `src/app/api/worker/notify/route.ts` | exact |
| `src/app/admin/ads/page.tsx` (수정) | server component | request-response | 자기 자신 (inline → factory 교체) | exact |
| `src/app/api/worker/notify/route.ts` (수정) | route handler | request-response | 자기 자신 (inline → factory 교체) | exact |
| `src/lib/data/complexes-map.ts` (수정) | data layer | CRUD | 자기 자신 (필터 1줄 추가) | exact |
| `instrumentation.ts` (신규, 루트) | config | event-driven | 없음 (프로젝트 첫 instrumentation) | none |
| `instrumentation-client.ts` (신규, 루트) | config | event-driven | 없음 | none |
| `sentry.server.config.ts` (신규, 루트) | config | event-driven | 없음 | none |
| `sentry.edge.config.ts` (신규, 루트) | config | event-driven | 없음 | none |
| `next.config.ts` (수정) | config | — | 자기 자신 (withSentryConfig 래퍼 추가) | exact |
| `.github/workflows/ci.yml` (신규) | CI | — | `.github/workflows/notify-worker.yml` | role-match |
| `e2e/global-setup.ts` (신규) | test utility | request-response | `src/__tests__/notify-worker.test.ts` (admin.createUser 패턴) | partial |
| `e2e/global-teardown.ts` (신규) | test utility | request-response | `src/__tests__/notify-worker.test.ts` (afterAll deleteUser 패턴) | partial |
| `e2e/landing.spec.ts` 외 4종 (신규) | E2E test | request-response | 없음 (e2e/ 디렉토리 신규) | none |
| `playwright.config.ts` (수정) | config | — | 자기 자신 | exact |
| `.env.local.example` (수정) | config | — | 자기 자신 | exact |

---

## Pattern Assignments

### `src/lib/ratelimit.ts` (utility, singleton factory)

**Analog:** `src/lib/supabase/admin.ts`

**핵심 패턴:** 모듈 레벨 싱글턴 export + 환경변수 의존 + `server-only` import 없음 (라이브러리 래퍼이므로 불필요).

**Imports pattern** (`src/lib/supabase/admin.ts` lines 1-3):
```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```

**Singleton factory pattern** (`src/lib/supabase/admin.ts` lines 9-23):
```typescript
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase admin env vars missing: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```

**`ratelimit.ts`에 적용할 패턴:**
- `admin.ts`는 호출마다 새 클라이언트를 생성하는 함수이지만, `ratelimit.ts`는 모듈 로드 시 한 번만 초기화하는 **모듈 레벨 상수** 패턴을 사용한다.
- `Redis.fromEnv()`는 환경변수가 없으면 자동으로 throw하므로 별도 검증 불필요.
- `server-only` import는 불필요 (라이브러리 내부에서 처리).

**작성 대상 코드:**
```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const adEventRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: false,
  prefix: 'danji:ad:rl',
})
```

---

### `src/app/api/ads/events/route.ts` (route handler, request-response)

**Analog:** `src/app/api/worker/notify/route.ts`

**Imports pattern** (`src/app/api/ads/events/route.ts` lines 1-3, 현재):
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```

**수정 후 imports (교체):**
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { adEventRatelimit } from '@/lib/ratelimit'
import { createHash } from 'crypto'
```

**Runtime declaration** (`src/app/api/ads/events/route.ts` line 5):
```typescript
export const runtime = 'nodejs'
```
`createHash`는 Node.js 내장이므로 `runtime = 'nodejs'`가 반드시 있어야 한다. 기존 파일에 이미 있으므로 유지.

**Core handler pattern** (`src/app/api/worker/notify/route.ts` lines 9-25):
```typescript
export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(   // → createSupabaseAdminClient() 로 교체
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  // ...
  return NextResponse.json({ ... })
}
```

**Rate limit 적용 패턴** (신규 로직 — RESEARCH.md 기반):
```typescript
const forwarded = request.headers.get('x-forwarded-for')
const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'

const { success, reset } = await adEventRatelimit.limit(ip)
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

const secret = process.env.RATE_LIMIT_SECRET ?? ''
const ip_hash = createHash('sha256').update(`${ip}:${secret}`).digest('hex')
```

**Error handling pattern** (`src/app/api/ads/events/route.ts` lines 9-12, 현재):
```typescript
try {
  body = await request.json()
} catch {
  return NextResponse.json({ error: 'invalid body' }, { status: 400 })
}
```
기존 try/catch 에러 처리 패턴을 유지한다.

**Admin client 교체 위치** (`src/app/api/ads/events/route.ts` lines 24-28):
```typescript
// 교체 전
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// 교체 후
const supabase = createSupabaseAdminClient()
```

---

### `src/app/admin/ads/page.tsx` (server component, CRUD)

**Analog:** 자기 자신 (SEC-02: inline → factory 교체)

**교체 대상** (lines 52-56):
```typescript
// 교체 전
const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// 교체 후
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
const adminClient = createSupabaseAdminClient()
```

**제거할 imports** (lines 4-5):
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```
`createSupabaseAdminClient` 내부에서 두 import를 이미 처리하므로 page.tsx에서는 제거.

**기존 auth guard 패턴** (lines 37-48) — 변경 없이 유지:
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login?next=/admin/ads')

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
  redirect('/')
}
```

---

### `src/app/api/worker/notify/route.ts` (route handler, request-response)

**Analog:** 자기 자신 (SEC-02: inline → factory 교체)

**교체 대상** (lines 2-3, 15-19):
```typescript
// 제거
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// 추가
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
```

```typescript
// 교체 전 (lines 15-19)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// 교체 후
const supabase = createSupabaseAdminClient()
```

**CRON_SECRET 검증 패턴** (lines 10-12) — 변경 없이 유지:
```typescript
const secret = request.headers.get('x-cron-secret')
if (!secret || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

### `src/lib/data/complexes-map.ts` (data layer, CRUD)

**Analog:** 자기 자신 (SEC-03: `.eq('status', 'active')` 1줄 추가)

**수정 대상** (lines 18-23):
```typescript
// 수정 전
const { data, error } = await supabase
  .from('complexes')
  .select('id, canonical_name, lat, lng, sgg_code')
  .in('sgg_code', sggCodes)
  .not('lat', 'is', null)
  .not('lng', 'is', null)

// 수정 후
const { data, error } = await supabase
  .from('complexes')
  .select('id, canonical_name, lat, lng, sgg_code')
  .in('sgg_code', sggCodes)
  .not('lat', 'is', null)
  .not('lng', 'is', null)
  .eq('status', 'active')    // ← 이 한 줄만 추가
```

**참고:** `sitemap.ts`와 `complex-matching.ts`는 이미 `status='active'` 필터를 사용 중. 동일 패턴 맞춤.

---

### `instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` (신규, 루트)

**Analog:** 없음 (프로젝트 첫 Sentry 설정 파일)

**참조 패턴:** RESEARCH.md의 SEC-04 섹션 (공식 문서 기반, HIGH confidence).

**`instrumentation.ts` 패턴** (프로젝트 루트 — `src/` 아님):
```typescript
import * as Sentry from '@sentry/nextjs'

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

**`sentry.server.config.ts` 패턴** (프로젝트 루트):
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
  debug: false,
})
```

**`sentry.edge.config.ts` 패턴** (프로젝트 루트):
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
})
```

**`instrumentation-client.ts` 패턴** (프로젝트 루트 — 브라우저):
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0,
})
```

**주의:** `SENTRY_DSN` (server-only)과 `NEXT_PUBLIC_SENTRY_DSN` (client)을 분리하지 않고 `NEXT_PUBLIC_SENTRY_DSN` 단일 변수로 통일한다 (RESEARCH.md Open Question 3 권장안).

---

### `next.config.ts` (수정)

**Analog:** 자기 자신 (withSentryConfig HOC 추가)

**기존 패턴** (`next.config.ts` lines 1-37):
```typescript
import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = { /* headers 설정 */ }

export default withSerwist(nextConfig)
```

**수정 후 — withSentryConfig 래퍼 순서** (Pitfall 3 방지):
```typescript
import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import { withSentryConfig } from '@sentry/nextjs'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = { /* 기존 headers 설정 그대로 */ }

export default withSentryConfig(
  withSerwist(nextConfig),   // withSerwist가 안쪽, withSentryConfig가 바깥
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
  },
)
```

---

### `.github/workflows/ci.yml` (신규)

**Analog:** `.github/workflows/notify-worker.yml`

**기존 workflow 구조** (lines 1-30):
```yaml
name: Notify Worker

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch: {}

jobs:
  notify:
    name: Poll & deliver notifications
    runs-on: ubuntu-latest
    timeout-minutes: 4

    steps:
      - name: Call notify worker
        run: |
          STATUS=$(curl -sSf -o /tmp/notify_response.json -w "%{http_code}" \
            -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/worker/notify")
```

**ci.yml에 적용할 패턴:**
- `on: pull_request + push` (notify는 schedule — trigger가 다름)
- `actions/checkout@v4`, `actions/setup-node@v4` — 동일 액션 버전 사용
- `npm ci` — notify-worker.yml이 npm 기반임을 간접 확인 (curl만 사용하지만 package.json에서 npm 확인됨)
- secrets 참조 패턴: `${{ secrets.변수명 }}`
- `needs:` 로 job 의존성 선언

**Node.js + npm 설정 패턴** (기존 workflow에서 유추, package.json npm scripts 확인됨):
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
- run: npm ci
```

**artifact 업로드 패턴** (CI에서 실패 시 리포트 보존):
```yaml
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

---

### `e2e/global-setup.ts` (신규)

**Analog:** `src/__tests__/notify-worker.test.ts` (admin.createUser 패턴)

**admin.createUser 패턴** (`src/__tests__/notify-worker.test.ts` lines 64-78):
```typescript
const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
  email:         `notify_test_${Date.now()}@test.local`,
  password:      'test1234!',
  email_confirm: true,
})
if (uErr) throw new Error(`user create 실패: ${uErr.message}`)
testUserId = userRes.user.id
```

**Cleanup 패턴** (`src/__tests__/notify-worker.test.ts` lines 80-88):
```typescript
afterAll(async () => {
  if (testUserId) {
    await admin.from('notifications').delete().eq('user_id', testUserId)
    await admin.from('favorites').delete().eq('user_id', testUserId)
    await admin.from('transactions').delete().eq('complex_id', testComplexId)
  }
  if (testComplexId) await admin.from('complexes').delete().eq('id', testComplexId)
  if (testUserId)   await admin.auth.admin.deleteUser(testUserId)
})
```

**admin 클라이언트 초기화 패턴** (`src/__tests__/helpers/db.ts` lines 1-10):
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const URL_  = process.env.TEST_SUPABASE_URL  ?? 'http://127.0.0.1:54321'
export const SKEY  = process.env.TEST_SUPABASE_SKEY ?? ''
export const AKEY  = process.env.TEST_SUPABASE_AKEY ?? ''

export const admin = createClient<Database>(URL_, SKEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

**`global-setup.ts`에 적용할 패턴:**
- `createClient`는 `createSupabaseAdminClient()` 대신 직접 사용 (`server-only` import가 없는 환경 = Playwright Node.js 프로세스)
- 타임스탬프 접미사로 이메일 유니크화: `e2e-test-${Date.now()}@danjiondo.test`
- `email_confirm: true` — 이메일 인증 생략
- `process.env.E2E_TEST_USER_ID` 에 userId 저장하여 teardown에 전달

---

### `e2e/global-teardown.ts` (신규)

**Analog:** `src/__tests__/notify-worker.test.ts` lines 80-88 (afterAll deleteUser 패턴)

**삭제 패턴:**
```typescript
if (testUserId) await admin.auth.admin.deleteUser(testUserId)
```

**`global-teardown.ts`에 적용:**
- `process.env.E2E_TEST_USER_ID`에서 userId 읽기
- `admin.auth.admin.deleteUser(userId)` 호출
- userId가 없으면 early return (no-op)

---

### `e2e/*.spec.ts` 5종 (신규)

**Analog:** 없음 (e2e/ 디렉토리 신규). RESEARCH.md 골든패스 테이블 + Playwright 공식 패턴 사용.

**테스트 구조 참고 패턴** (`src/__tests__/complexes-map.test.ts` lines 44-72 — AAA 구조):
```typescript
describe('getComplexesForMap', () => {
  it('좌표 있는 단지만 반환', async () => {
    const items = await getComplexesForMap(['48121'], admin)
    const ids = items.map((c) => c.id)
    expect(ids).toContain(withCoordId)      // Assert
  })
})
```

**E2E Playwright 패턴 (RESEARCH.md 기반):**
```typescript
import { test, expect } from '@playwright/test'

test('랜딩 페이지 로드', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})
```

**Auth 필요 테스트 패턴 (`review.spec.ts`):**
```typescript
// playwright.config.ts의 'chromium-auth' project 사용
// storageState: 'e2e/.auth/user.json' 자동 적용
test.use({ storageState: 'e2e/.auth/user.json' })
```

---

### `playwright.config.ts` (수정)

**Analog:** 자기 자신

**기존 패턴** (lines 1-24):
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // ...
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**수정 사항:**
- `globalSetup: './e2e/global-setup.ts'` 추가
- `globalTeardown: './e2e/global-teardown.ts'` 추가
- `use.baseURL`을 `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`으로 교체
- `projects`에 auth 프로젝트 추가:
```typescript
{
  name: 'chromium-auth',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'e2e/.auth/user.json',
  },
},
```
- 기존 firefox/webkit 프로젝트는 골든패스 5종에서는 chromium만으로 충분하므로 CI에서 제거 가능

---

### `.env.local.example` (수정)

**Analog:** 자기 자신

**현재 파일 전체** (lines 1-47):
제거 대상 (D-16, D-18):
```bash
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
ADMIN_IP_ALLOWLIST=127.0.0.1/32
```

추가 대상 (D-17):
```bash
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Resend
RESEND_FROM_EMAIL=단지온도 <no-reply@danjiondo.com>

# Rate Limiting
RATE_LIMIT_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

기존에 이미 `SENTRY_DSN=`이 있으므로 → `NEXT_PUBLIC_SENTRY_DSN=`으로 교체 (단일 변수 통일 전략).

---

## Shared Patterns

### Supabase Admin Client 교체 (SEC-02)

**Source:** `src/lib/supabase/admin.ts` lines 9-23
**Apply to:** `src/app/api/ads/events/route.ts`, `src/app/admin/ads/page.tsx`, `src/app/api/worker/notify/route.ts`

```typescript
// 이 3개 파일에서 모두 동일하게 적용
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// inline createClient(...) 블록 제거 후:
const supabase = createSupabaseAdminClient()
```

**규칙:** `createClient`를 직접 호출하는 파일은 위 3개가 전부다. 교체 완료 후 코드베이스 내 `SUPABASE_SERVICE_ROLE_KEY!` 패턴이 `admin.ts` 외에 존재하면 안 된다.

### 환경변수 검증 패턴

**Source:** `src/lib/supabase/admin.ts` lines 10-14

```typescript
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Supabase admin env vars missing: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
}
```

**Apply to:** `src/lib/ratelimit.ts` — `Redis.fromEnv()`가 자동으로 throw하므로 명시적 검증 불필요.

### Route Handler 에러 처리 패턴

**Source:** `src/app/api/ads/events/route.ts` lines 9-18

```typescript
try {
  body = await request.json()
} catch {
  return NextResponse.json({ error: 'invalid body' }, { status: 400 })
}

if (!b.campaign_id) {
  return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
}
```

**Apply to:** `src/app/api/ads/events/route.ts` — 기존 패턴 유지 (rate limit 로직은 이 검증 앞에 삽입).

### CRON_SECRET 인증 패턴

**Source:** `src/app/api/worker/notify/route.ts` lines 10-12

```typescript
const secret = request.headers.get('x-cron-secret')
if (!secret || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Apply to:** `src/app/api/worker/notify/route.ts` — 변경 없이 유지. CI workflow의 E2E job에서도 이 패턴을 참조하지 않음 (E2E는 Supabase Auth 사용).

### Vitest 테스트 파일 구조

**Source:** `src/__tests__/ads.test.ts`, `src/__tests__/notify-worker.test.ts`

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, AKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})
```

**Apply to:**
- `src/__tests__/complexes-map.test.ts` — SEC-03 status 필터 테스트 케이스 추가 시 이 패턴 사용 (파일 이미 존재)
- `src/app/api/ads/events/route.test.ts` (신규) — SEC-01 rate limit 테스트. `@upstash/ratelimit` mock 필요:
```typescript
vi.mock('@/lib/ratelimit', () => ({
  adEventRatelimit: {
    limit: vi.fn().mockResolvedValue({ success: true, remaining: 99, reset: Date.now() + 60000 }),
  },
}))
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `instrumentation.ts` (루트) | config | event-driven | 프로젝트 첫 Sentry instrumentation. Next.js 15 App Router 전용 파일 |
| `instrumentation-client.ts` (루트) | config | event-driven | 동일. 브라우저 전용 Sentry 초기화 |
| `sentry.server.config.ts` (루트) | config | event-driven | 동일. 서버 런타임 설정 |
| `sentry.edge.config.ts` (루트) | config | event-driven | 동일. Edge 런타임 설정 |
| `e2e/landing.spec.ts` 외 4종 | E2E test | request-response | e2e/ 디렉토리 자체가 신규. Playwright 공식 문서 패턴 사용 |

**플래너 지침:** 위 파일들은 RESEARCH.md의 SEC-04 섹션과 INFRA-03 섹션의 코드 예시를 직접 참조하여 구현한다.

---

## Metadata

**Analog search scope:** `src/`, `.github/workflows/`, `playwright.config.ts`, `next.config.ts`, `vitest.config.ts`
**Files scanned:** 20
**Pattern extraction date:** 2026-05-06
