# Technical Concerns

**Analysis Date:** 2026-05-06

---

## Critical Risks

### 1. Service Role Key Used Outside Centralized Admin Client

The `createSupabaseAdminClient()` in `src/lib/supabase/admin.ts` is the intended single factory for the service_role client, yet raw `createClient(URL!, SKEY!)` calls bypass it in three places:

- `src/app/admin/ads/page.tsx` lines 52–55 — inline `createClient` with service role
- `src/app/api/ads/events/route.ts` lines 24–28 — inline `createClient` with service role
- `src/app/api/worker/notify/route.ts` lines 15–18 — inline `createClient` with service role

Risk: These callers use the non-null assertion (`!`) on env vars without validation. If `SUPABASE_SERVICE_ROLE_KEY` is unset they will pass `undefined` silently instead of throwing. The admin factory validates env presence and throws explicitly.

Fix: Replace all inline service-role `createClient` calls with `createSupabaseAdminClient()`.

### 2. Ad Event Endpoint Has No Rate Limiting or Authentication

`POST /api/ads/events` at `src/app/api/ads/events/route.ts` accepts any `campaign_id` and `event_type` from any unauthenticated caller with no rate limit. This enables trivial impression/click fraud: a single IP can inflate metrics for any campaign.

- No auth check
- No IP-based throttle
- `ip_hash` column in `ad_events` schema exists but is never populated

Fix: Record `ip_hash` (sha256 of IP + secret) per insert; add Supabase rate-limiting or edge middleware for the endpoint.

### 3. Admin Role Check Performed at Application Layer Only

The admin guard in `src/lib/auth/ad-actions.ts` (`requireAdmin`) reads the `profiles.role` column to decide if the caller may use the service_role client. However, no RLS policy restricts write access to `ad_campaigns` for service_role callers — service_role bypasses RLS entirely. If `requireAdmin()` contains a bug or is bypassed (e.g., direct API call with a stolen service key), the privilege escalation is unchecked.

Also: `profiles: owner update` RLS allows `role in ('user')` on self-update, but there is no server-side guard preventing a user from setting their own `role` to `'user'` via direct Supabase API if they somehow craft a valid update payload.

Fix: Add a DB-level trigger or generated column to prevent `role` values above `'user'` from being set without service_role.

### 4. `complexes` Status Not Filtered in Map Query

`getComplexesForMap` in `src/lib/data/complexes-map.ts` has no filter on `status`. Demolished or inactive complexes (`status = 'demolished'` or any other non-active value) will appear as map markers.

- `src/lib/data/sitemap.ts` correctly filters `.eq('status', 'active')`
- `src/lib/data/complex-matching.ts` correctly filters `.neq('status', 'demolished')`
- `src/lib/data/complexes-map.ts` — no status filter

Fix: Add `.eq('status', 'active')` to the map query.

---

## Technical Debt

### Widespread `as any` Casts for Supabase Join Results

Multiple data layer files use `as any` to access nested join data because the generated types do not reflect the `!inner` join shape. Affected files:

- `src/lib/data/homepage.ts` lines 51, 92
- `src/lib/data/favorites.ts` line 37
- `src/lib/notifications/generate-alerts.ts` line 40
- `src/lib/notifications/deliver.ts` lines 41, 70, 75

The pattern `const r = row as any; const c = Array.isArray(r.complexes) ? r.complexes[0] : r.complexes` repeats in at least 4 files with no shared helper.

Fix: Define typed join result interfaces (e.g., `TransactionWithComplex`) and extract a `unwrapJoin<T>()` helper instead of repeating the `as any` pattern. Alternatively, use `.returns<Type[]>()` on the Supabase query builder.

### Naver OAuth `provider: 'naver' as any`

`src/lib/auth/actions.ts` line 29 casts `'naver'` as `any` because the Supabase SDK type does not include Naver as a supported provider. This will silently break if the `signInWithOAuth` API signature changes.

Fix: Add a type augmentation or use a type assertion with a comment linking to the open upstream issue.

### `RESEND_FROM_EMAIL` Missing from `.env.local.example`

`src/lib/notifications/deliver.ts` line 25 uses `process.env.RESEND_FROM_EMAIL ?? 'danjiondo <onboarding@resend.dev>'` as a fallback. The default `onboarding@resend.dev` address is the Resend sandbox sender and will silently deliver emails using the wrong from address in production if `RESEND_FROM_EMAIL` is not set.

`RESEND_FROM_EMAIL` and `NEXT_PUBLIC_SITE_URL` are absent from `.env.local.example`.

Fix: Add both to `.env.local.example` and remove the fallback or make it only for development.

### `auth.admin.getUserById` Called via `as any` Cast

`src/lib/notifications/deliver.ts` line 75: `(supabase as any).auth.admin.getUserById(notif.user_id)` is used to look up user email addresses for email delivery. This bypasses TypeScript typing for a security-sensitive operation. If `@supabase/supabase-js` changes the `auth.admin` API, this will fail at runtime with no compile-time warning.

Fix: Use the typed `supabase.auth.admin.getUserById()` call available via the `@supabase/supabase-js` service role client types, or extract a typed wrapper.

### Homepage Ranking Query Is Unbounded by Date

`getTopComplexRankings` in `src/lib/data/homepage.ts` fetches the globally highest-priced sales ever with `.limit(limit * 6)` (48 rows max). As the transaction table grows, the most recent data may not be represented — a 10-year-old record could dominate rankings.

Fix: Add a date filter (e.g., last 12 months of data) or use a DB function that ranks by recent median, not all-time max.

---

## Incomplete Implementations

### E2E Test Suite Is Empty

`playwright.config.ts` points to an `./e2e` directory but that directory does not exist. No E2E tests are written despite the CLAUDE.md requirement and `npm run test:e2e` script.

Risk: Critical user flows (login, favorite, map rendering, ad display) have zero automated coverage.

### `ADMIN_IP_ALLOWLIST` Env Var Is Defined but Never Read

`.env.local.example` defines `ADMIN_IP_ALLOWLIST=127.0.0.1/32` but no code in `src/` reads or enforces it. The admin routes (`/admin/ads`, ad-actions Server Actions) check only `profiles.role`, not IP origin.

Fix: Implement IP allowlist check in `src/middleware.ts` for the `/admin/*` prefix, or remove the env var to avoid false confidence.

### `NEXTAUTH_SECRET` / `NEXTAUTH_URL` / Naver OAuth Env Vars Are Defined but NextAuth Is Not Installed

`.env.local.example` includes `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`. However, NextAuth is not in `package.json` and authentication is handled via Supabase Auth directly. These entries appear to be leftover from an earlier plan.

Fix: Remove unused NextAuth env vars from the example file, or clarify if they are reserved for Phase 1.

### `gps_verified` Column Is Unused

`complex_reviews.gps_verified` (migration `20260430000016_reviews.sql`) defaults to `false` and is noted in the migration as "V1.0에서 gps_verified 배지 활성화". No code sets it to `true`, and the UI does not display it. This is intentional for V0.9 but represents an expected debt item for launch.

---

## Performance Concerns

### Map Loads All Complexes in Covered SGG Codes at Once

`getComplexesForMap` in `src/lib/data/complexes-map.ts` fetches every complex with a non-null lat/lng for the configured SGG codes in a single query with no pagination. For the 6 창원·김해 codes this is manageable today, but as the dataset grows (or new regions are added) this query will become heavy.

Fix: Add a bounding-box spatial filter using PostGIS `ST_Within` or pass viewport bounds from the client, fetching only visible-area complexes.

### `getComplexReviewStats` Fetches All Ratings Without Aggregation

`src/lib/data/reviews.ts` lines 25–37: `getComplexReviewStats` selects all `rating` rows for a complex and computes `avg` in JavaScript. For a complex with thousands of reviews this pulls unnecessary rows.

Fix: Use a SQL aggregate: `.select('rating.avg(), rating.count()')` or a DB function.

### `kapt.ts` Fetch Has No `withRetry`

`src/services/kapt.ts` calls `fetch()` directly without `withRetry`. The MOLIT adapter (`src/services/molit.ts`) wraps its requests in `withRetry`. Inconsistent retry behavior means K-apt data seeding fails on transient errors with no recovery.

Fix: Wrap the `fetch` in `kapt.ts` with `withRetry`.

### Notification Delivery Processes One Record at a Time

`deliverPendingNotifications` in `src/lib/notifications/deliver.ts` loops over up to 50 pending notifications sequentially, calling `auth.admin.getUserById` and potentially `sendEmail` + `sendPushToUser` per notification serially. At 50 users this means up to 150 sequential async operations per invocation.

Fix: Batch email lookups and parallelize delivery with `Promise.allSettled`.

---

## Security Observations

### No Rate Limiting on Authentication Endpoints

`signInWithEmail` and `signInWithNaver` in `src/lib/auth/actions.ts` are Server Actions with no rate limiting. Magic link flows can be abused to send large volumes of emails to arbitrary addresses. Supabase has built-in auth rate limits but they are not explicitly configured.

Fix: Configure Supabase Auth rate limits in `supabase/config.toml` and document them.

### `ad_events` IP Hash Never Populated

The `ad_events` table has an `ip_hash` column designed to allow deduplication of impressions by IP. `src/app/api/ads/events/route.ts` never reads the request IP or writes `ip_hash`. This means ad fraud detection has no IP-based signal.

Fix: Extract IP from `request.headers.get('x-forwarded-for')`, hash it with a server secret, and insert into `ip_hash`.

### No CSRF Protection on Server Actions Beyond Auth

Server Actions in Next.js 15 have built-in CSRF protection when called from same-origin forms. However, the `POST /api/ads/events` REST endpoint accepts arbitrary cross-origin POST requests. The current CSP and CORS headers for this endpoint are not explicitly configured.

Fix: Add CORS restrictions to the ad events endpoint for production.

### Admin Client Created Inline in Server Components

`src/app/admin/ads/page.tsx` creates an admin Supabase client directly inside a Server Component. While Server Components are safe from client exposure, this pattern makes the admin client creation logic harder to audit. The `createSupabaseAdminClient` factory already exists for this purpose.

---

## Scalability Limits

### Vercel Hobby Cron Limit (1/day) Forces GitHub Actions Dependency

CLAUDE.md documents that the 5-minute notification worker runs via GitHub Actions because Vercel Hobby only permits 1 cron per day. This is a hard platform limit. If GitHub Actions becomes unavailable or the workflow is disabled, notifications stop entirely with no fallback.

Limit: GitHub Actions free tier gives 2,000 minutes/month. At 5-minute intervals across 24 hours × 30 days = 8,640 invocations × ~10s each ≈ 1,440 minutes/month. Currently within limits but leaves ~28% headroom.

### Supabase Free Tier DB: 500MB Cap

The 500MB database cap will be reached as historical transaction data accumulates. 10 years of Changwon + Gimhae data could reach millions of rows in the `transactions` table.

Mitigation path: Consider partitioning `transactions` by year or using cold storage for data older than 3 years.

### MOLIT API Daily Limit: 10,000 Requests

The ingest route at `src/app/api/ingest/molit-trade/route.ts` runs sequentially per region. At 6 active SGG codes × 2 deal types × (pages per code) = potentially hundreds of API calls per daily run. If backfill scripts run concurrently with the daily cron, the 10,000/day limit may be hit.

Fix: Add request counting to `ingest_runs` and expose a circuit breaker that aborts further pages if approaching the daily cap.

---

## Dependency Risks

### `zod/v4` Import Path (Non-Standard)

`src/services/molit.ts` and `src/services/kapt.ts` import from `'zod/v4'`:

```typescript
import { z } from 'zod/v4'
```

The Zod v4 sub-path export is available in `zod@^4.x`, and `package.json` specifies `"zod": "^4.4.1"`. This is intentional, but if downgraded to `zod@^3` (e.g., a dependency forces it), these imports will fail at runtime with a misleading module-not-found error.

Fix: Add a note or CI check that `zod >= 4.0.0` is required and watch for semver conflicts.

### `@supabase/ssr` at `^0.10.2` — Active Development Package

`@supabase/ssr` is used for server-side session handling throughout the app. At `^0.10.x` the API is stable but Supabase has shipped breaking changes in minor versions historically. Cookie handling code in `src/middleware.ts` and `src/lib/supabase/server.ts` would need updating on a major SSR package change.

### `web-push@^3.6.7` — No Longer Actively Maintained

The `web-push` npm package has had no releases since 2023. The Web Push Protocol it implements is stable, but long-term security patches may not arrive. Consider migrating to the VAPID-first `@web-push-libraries/vapid` or vendor the relevant VAPID signing logic.

---

## Missing Infrastructure

### No Error Tracking (Sentry DSN Is Defined but Never Initialized)

`.env.local.example` defines `SENTRY_DSN` and `NEXT_PUBLIC_POSTHOG_KEY`, but neither Sentry nor PostHog is installed in `package.json` and neither is initialized in `src/app/layout.tsx` or any instrumentation file. Errors in production Server Components, API routes, and the notification worker are not reported anywhere other than Vercel's log drain.

Fix: Add `@sentry/nextjs` and initialize it with `SENTRY_DSN`; or remove the env var placeholder if not planned for V0.9.

### No CI Lint / Type-Check Pipeline

The only CI automation present is `.github/workflows/notify-worker.yml` which is a scheduled cron, not a pull request check. There is no GitHub Actions workflow for running `npm run lint`, `npm run build`, or `npm run test` on pull requests.

Fix: Add `.github/workflows/ci.yml` with lint, type-check, and unit test steps triggered on `push` and `pull_request`.

### `console.error` Is the Only Error Logging Mechanism

`src/app/api/ingest/molit-trade/route.ts` line 49 is the only structured error log in the codebase:

```typescript
console.error(`ingestMonth failed for ${sgg_code}:`, err)
```

All other errors are either thrown (bubbling to Vercel's generic error handler) or silently swallowed in catch blocks (`catch { failed++ }` in `deliver.ts`). There is no structured logging, alerting, or error aggregation.

Fix: Adopt a structured logger (e.g., `pino`) for server-side code; integrate with Sentry or a similar error tracker.

---

## Recommended Priorities

1. **HIGH — Ad event endpoint rate limiting and IP hash** (`src/app/api/ads/events/route.ts`): No authentication + no rate limit + missing `ip_hash` enables trivial click fraud. Fix before the ad system goes live.

2. **HIGH — Replace inline `createClient` service-role calls** (`src/app/admin/ads/page.tsx`, `src/app/api/ads/events/route.ts`, `src/app/api/worker/notify/route.ts`): Consolidate to `createSupabaseAdminClient()` to get startup validation and a single auditable surface.

3. **HIGH — Add CI pipeline**: No automated lint/type/test on PRs means regressions in TypeScript types and business logic can merge undetected. Add `.github/workflows/ci.yml`.

4. **MEDIUM — Fix demolished complex leakage in map** (`src/lib/data/complexes-map.ts`): Add `.eq('status', 'active')` to prevent demolished complexes from appearing as clickable map markers.

5. **MEDIUM — Initialize Sentry or remove placeholder**: The `SENTRY_DSN` env var creates false confidence that errors are tracked. Either install `@sentry/nextjs` or remove the placeholder and document the gap.

---

*Concerns audit: 2026-05-06*
