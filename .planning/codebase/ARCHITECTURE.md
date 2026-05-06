# Architecture

## Pattern
Next.js 15 App Router monolith deployed on Vercel. No microservices, no separate backend service.

## Rendering Strategy
| Route | Strategy | Revalidation |
|-------|----------|-------------|
| Homepage (`/`) | SSR dynamic | `revalidate = 0` |
| Map view (`/map`) | SSR dynamic | `revalidate = 0` |
| Complex detail (`/complexes/[id]`) | ISR | `revalidate = 86400` (24h) |
| Auth-gated pages (`/favorites`, `/profile`, `/admin`) | SSR | Middleware-protected |
| Login (`/login`) | SSR | — |

## Data Flow
```
RSC Page
  → src/lib/data/*.ts        (Supabase query functions, server-only)
    → Supabase Postgres      (RLS enforced for anon client)
    → External APIs          (via src/services/ adapters only)

Mutations (forms, favorites, push, reviews, ad approval)
  → Server Action ('use server' in src/lib/auth/)
    → createSupabaseServerClient() — verifies auth via cookies
    → Supabase write (RLS enforces ownership)

Ingest / admin operations
  → admin client (service_role, bypasses RLS)
  → Only used in: src/lib/data/realprice.ts, cron API routes
```

## Auth Architecture
- **Provider**: Supabase Auth (not NextAuth — CLAUDE.md lists NextAuth but code uses `@supabase/ssr`)
- **Methods**: Email Magic Link (OTP) + Naver OAuth
- **Sessions**: Cookie-based via `@supabase/ssr`; refreshed on every request in `src/middleware.ts`
- **Four Supabase client variants**:
  | Client | File | Use Case |
  |--------|------|---------|
  | `server` | `src/lib/supabase/server.ts` | Auth-aware RSC/actions (reads cookies) |
  | `readonly` | `src/lib/supabase/readonly.ts` | ISR-safe pages (anon, no cookies) |
  | `client` | `src/lib/supabase/client.ts` | Browser — realtime subscriptions only |
  | `admin` | `src/lib/supabase/admin.ts` | service_role, RLS bypass — `import 'server-only'` |

## API Design
- **Server Actions** (primary): All mutations — auth, favorites, push subscriptions, reviews, ad approval
- **API Routes** (narrow use): Cron endpoints (`/api/ingest/molit-trade`, `/api/worker/notify`) + ad tracking (`/api/ads/events`) + health check
- **Postgres RPC**: Complex queries use `.rpc()` calls — `search_complexes`, `complex_monthly_prices`
- No REST API for client-side data fetching — all reads go through RSC props

## Notification Pipeline
```
GitHub Actions cron (*/5 * * * *)
  → POST /api/worker/notify  (CRON_SECRET header required)
    → generate-alerts.ts     (price threshold checks)
    → deliver.ts             (Resend email + web-push VAPID)
```
Note: Vercel Hobby limits cron to 1/day — notification worker runs via GitHub Actions instead.

## Caching Strategy
- ISR for complex detail pages (86400s)
- No explicit Redis or in-memory cache layer
- Supabase query results are not additionally cached beyond Next.js fetch cache

## Key Architectural Decisions
1. **RSC-first**: `'use client'` only where truly needed (map, interactive forms, push toggle)
2. **No client state library**: Data flows from server; no Zustand/TanStack Query installed
3. **Four Supabase client tiers**: Strict separation between ISR-safe, auth-aware, browser, and admin access
4. **`complexes` as Golden Record (ADR-033)**: External sources accumulate in `complex_aliases`; complex matching always requires coordinates + name (never name alone)
5. **Transaction query invariant**: All trade queries must include `WHERE cancel_date IS NULL AND superseded_by IS NULL`
6. **Ad safety invariant**: All ad queries must include `now() BETWEEN starts_at AND ends_at AND status='approved'`
7. **GitHub Actions for 5-min cron**: Vercel Hobby limitation forces notification worker off-platform
8. **`src/services/` boundary**: All external HTTP calls isolated here; components and data layer never call external APIs directly
