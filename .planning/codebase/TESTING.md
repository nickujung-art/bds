# Testing Patterns

**Analysis Date:** 2026-05-06

## Test Setup

**Runner:** Vitest
- Config: `vitest.config.ts` (project root)
- Environment: `happy-dom`
- Globals: `true` (no import needed for `describe`, `it`, `expect`)
- React plugin: `@vitejs/plugin-react`
- Path alias: `@/` → `src/`

**Coverage provider:** V8
- Reporters: `text`, `json`, `html`
- Thresholds: **80% for statements, branches, functions, and lines**
- Excludes: `node_modules/`, `src/app/sw.ts`, `**/*.d.ts`, `**/*.config.*`, `e2e/`

**E2E runner:** Playwright
- Config: `playwright.config.ts` (project root)
- Test directory: `./e2e` (currently empty — no E2E tests written yet)
- Browsers: Chromium, Firefox, WebKit
- Base URL: `http://localhost:3000`
- Retries: 2 on CI, 0 locally
- Web server: `npm run dev` auto-started

**Run commands:**
```bash
npm run test          # Vitest (unit + integration)
npm run test:e2e      # Playwright E2E
```

## Test File Organization

**Location:** All unit/integration tests live in `src/__tests__/`

**Naming convention:** `kebab-case.test.ts` matching the feature or step being tested
- `src/__tests__/ads.test.ts` — ad campaigns
- `src/__tests__/auth-actions.test.ts` — auth Server Actions
- `src/__tests__/complex-detail.test.ts` — complex detail data layer
- `src/__tests__/complex-matching-3b.test.ts` — complex name matching
- `src/__tests__/complex-search.test.ts` — search data layer
- `src/__tests__/complex-seed.test.ts` — seed data
- `src/__tests__/complexes-map.test.ts` — map data layer
- `src/__tests__/favorites.test.ts` — favorites feature
- `src/__tests__/molit-ingest.test.ts` — MOLIT ingest pipeline
- `src/__tests__/notify-worker.test.ts` — notification worker
- `src/__tests__/profile.test.ts` — user profile
- `src/__tests__/reviews.test.ts` — community reviews
- `src/__tests__/schema.integration.test.ts` — DB schema + RLS
- `src/__tests__/seed-region.test.ts` — region seed data
- `src/__tests__/setup.test.ts` — environment sanity check
- `src/__tests__/sitemap.test.ts` — sitemap generation
- `src/__tests__/supabase-clients.test.ts` — Supabase client configuration

**Test helpers:** `src/__tests__/helpers/db.ts`
- Exports `URL_`, `SKEY`, `AKEY` — Supabase connection constants defaulting to `http://127.0.0.1:54321`
- Exports `admin` — a `SupabaseClient<Database>` with service role key, auth disabled

**No co-located tests:** Tests are not placed next to the source files they test — all centralized under `src/__tests__/`.

## Unit Tests

**Scope:** Pure functions in the data and utility layers
- `makeDedupeKey` — deterministic key generation tested in `molit-ingest.test.ts`
- `withRetry` — retry logic in `src/lib/api/retry.ts` tested in `molit-ingest.test.ts`
- `searchComplexes` — empty query guard, sgg_code filtering
- Auth input validation — email format checks before Supabase call

**Pattern (pure function test):**
```ts
describe('makeDedupeKey', () => {
  const base = { sggCode: '48121', yearMonth: '202310', complexName: '래미안', ... }
  it('동일 입력 → 동일 키 (결정론적)', () => {
    expect(makeDedupeKey(base)).toBe(makeDedupeKey(base))
  })
  it('가격 다름 → 다른 키', () => {
    expect(makeDedupeKey(base)).not.toBe(makeDedupeKey({ ...base, price: 31000 }))
  })
})
```

## Integration Tests

**Approach:** Tests run against a live local Supabase instance (`supabase start`)
- Every test file that touches the DB imports `admin` from `src/__tests__/helpers/db.ts`
- Fixtures are inserted in `beforeAll`, cleaned up in `afterAll` using the admin client

**RLS testing:** `schema.integration.test.ts` creates both anon and admin clients to verify row-level security:
```ts
const anon = createClient(URL_, AKEY)
// RLS test: anon cannot read favorites
const { data } = await anon.from('favorites').select('*')
expect(data).toHaveLength(0)
```

**API route testing (inline import):**
```ts
const { POST } = await import('@/app/api/ads/events/route')
const req = new Request('http://localhost/api/ads/events', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ campaign_id: FAKE_ID, event_type: 'impression' }),
})
const res = await POST(req)
expect(res.status).toBe(201)
```
Routes are imported dynamically and invoked directly — no HTTP server needed.

**Server Action testing:**
- Next.js modules (`next/headers`, `next/cache`, `next/navigation`) mocked with `vi.mock`
- `server-only` package mocked to allow import in test environment
- Env vars set with `vi.stubEnv` in `beforeAll`

**Test fixture pattern (integration):**
```ts
let testComplexId: string
let testUserId: string

beforeAll(async () => {
  const { data: complex } = await admin.from('complexes').insert({ ... }).select('id').single()
  testComplexId = (complex as { id: string }).id

  const { data: userRes } = await admin.auth.admin.createUser({ email: `test_${Date.now()}@test.local`, ... })
  testUserId = userRes.user.id
})

afterAll(async () => {
  await admin.from('complexes').delete().eq('id', testComplexId)
  await admin.auth.admin.deleteUser(testUserId)
})
```

## E2E Tests

**Framework:** Playwright (configured, browsers defined)
**Status:** No tests written yet — `e2e/` directory does not exist

The `playwright.config.ts` is fully configured and ready:
- Chromium, Firefox, WebKit
- `trace: 'on-first-retry'`
- `retries: 2` on CI

## Coverage

**Enforced thresholds (vitest.config.ts):**
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

**View coverage:**
```bash
npm run test -- --coverage
# HTML report generated at coverage/index.html
```

**Current state:** Coverage is defined but actual percentage unknown without running the full suite against a live Supabase instance.

## Mocking Strategy

**`vi.mock` for Next.js internals (required in every test file using Server Actions):**
```ts
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
```

**`vi.stubEnv` for environment variables:**
```ts
beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
  vi.stubEnv('CRON_SECRET', 'test-cron-secret-xyz')
})
```

**`vi.mock` for external services:**
```ts
// Resend (email)
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }) },
  })),
}))

// web-push
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn().mockResolvedValue({}) },
}))
```

**Partial mock (preserve real module, mock only fetch):**
```ts
vi.mock('@/services/molit', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return { ...actual, fetchSalePage: vi.fn(), fetchRentPage: vi.fn() }
})
```

**What is NOT mocked:**
- The Supabase database itself — integration tests run against real local DB
- Business logic in `src/lib/` — tested directly, not mocked

## Missing Coverage

**E2E flows — entirely absent:**
- No Playwright tests for any user journey (login, search, favorite, review, map)
- Critical flows untested end-to-end: magic link login, Naver OAuth callback, PWA push subscription

**Component rendering — not tested:**
- No component-level rendering tests (React Testing Library or Playwright component tests)
- `LoginForm.tsx`, `ReviewForm.tsx`, `FavoriteButton.tsx`, `SearchInput.tsx` — zero render tests

**Map components — no tests:**
- `src/components/map/KakaoMap.tsx`, `MapView.tsx`, `ClusterMarker.tsx`, `ComplexMarker.tsx` — untested
- Kakao Maps SDK integration has no mock or test coverage

**Error boundary behavior:**
- How pages handle `getComplexById` returning `null` → `notFound()` is tested implicitly but not explicitly

**Admin UI:**
- `src/app/admin/ads/page.tsx` — ad campaign management page not tested

---

*Testing analysis: 2026-05-06*
