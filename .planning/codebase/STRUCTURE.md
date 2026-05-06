# Directory Structure

## Top-Level Layout
```
bds/
├── src/                    # Application source
├── supabase/               # DB migrations + seed data
├── scripts/                # Standalone ingest/seed scripts
├── e2e/                    # Playwright E2E tests
├── phases/                 # GSD implementation phase docs
├── docs/                   # ADR, PRD, architecture, UI guide
├── public/                 # Static assets, PWA manifest, sw.js
├── .github/workflows/      # notify-worker.yml (5-min cron)
├── next.config.ts          # Serwist PWA + security headers
├── CLAUDE.md               # Project rules for AI agents
└── package.json
```

## Source Structure (src/)
```
src/
├── app/                            # Next.js App Router
│   ├── page.tsx                    # Homepage (SSR, revalidate=0)
│   ├── layout.tsx                  # Root layout: Kakao SDK, Pretendard font
│   ├── complexes/[id]/             # Complex detail (ISR, revalidate=86400)
│   ├── map/                        # Map view with search (SSR)
│   ├── favorites/                  # Auth-gated favorites list
│   ├── profile/                    # User profile + push toggle
│   ├── login/                      # Login form
│   ├── admin/ads/                  # Admin campaign management
│   ├── auth/callback/              # OAuth authorization code exchange
│   └── api/
│       ├── ingest/molit-trade/     # Daily batch cron endpoint
│       ├── worker/notify/          # 5-min notification delivery worker
│       ├── ads/events/             # Impression/click tracking
│       └── health/                 # Health check
├── components/                     # UI components organized by domain
│   ├── ads/                        # AdBanner, AdminCampaignActions
│   ├── auth/                       # LoginForm, UserMenu
│   ├── complex/                    # DealTypeTabs, FavoriteButton, TransactionChart
│   ├── map/                        # KakaoMap, MapView, ClusterMarker, ComplexMarker
│   ├── profile/                    # PushToggle
│   ├── reviews/                    # ReviewForm, ReviewList, NeighborhoodOpinion
│   └── search/                     # ComplexList, SearchInput, SidePanel
├── lib/                            # Domain logic (server-only unless noted)
│   ├── api/retry.ts                # Exponential retry for external fetches
│   ├── auth/                       # Server Actions ('use server')
│   │   ├── actions.ts              # signIn / signOut
│   │   ├── ad-actions.ts           # Admin ad approval
│   │   ├── favorite-actions.ts     # Favorite add/remove
│   │   ├── push-actions.ts         # Push subscription management
│   │   └── review-actions.ts       # Review CRUD
│   ├── data/                       # Supabase query functions (server-only)
│   │   ├── ads.ts                  # Ad selection with time/status guard
│   │   ├── complex-detail.ts       # Single complex + transactions
│   │   ├── complexes-map.ts        # Map viewport query
│   │   ├── complex-matching.ts     # Location + name matching logic
│   │   ├── complex-search.ts       # Search (pg_trgm + PostGIS)
│   │   ├── favorites.ts            # User favorites
│   │   ├── homepage.ts             # Homepage aggregates
│   │   ├── profile.ts              # User profile data
│   │   ├── realprice.ts            # Transaction upsert + ingestMonth
│   │   ├── reviews.ts              # Neighborhood reviews
│   │   ├── sitemap.ts              # Sitemap generation queries
│   │   ├── name-normalize.ts       # Complex name normalization
│   │   └── name-aliases.json       # Name alias lookup table
│   ├── notifications/
│   │   ├── generate-alerts.ts      # Price threshold alert generation
│   │   └── deliver.ts              # Resend + web-push VAPID delivery
│   └── supabase/                   # Client factory functions
│       ├── admin.ts                # service_role client (import 'server-only')
│       ├── client.ts               # Browser client (realtime only)
│       ├── readonly.ts             # Anon client, no cookies (ISR-safe)
│       └── server.ts               # Auth-aware server client (reads cookies)
├── services/                       # External API adapters (HTTP only, no DB)
│   ├── molit.ts                    # 국토부 실거래 API + Zod schemas
│   └── kapt.ts                     # K-apt apartment complex API
├── types/
│   └── database.ts                 # Supabase-generated TypeScript DB types
├── middleware.ts                    # Auth guard + session refresh (runs on every request)
└── __tests__/                      # Vitest test files
```

## Key Files
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Auth session refresh + route protection |
| `src/lib/supabase/admin.ts` | Service-role client — only for ingest/admin ops |
| `src/lib/data/realprice.ts` | Core transaction ingest and upsert logic |
| `src/lib/data/complex-matching.ts` | Location + name composite matching (Golden Record) |
| `src/lib/notifications/deliver.ts` | Email + push notification delivery |
| `src/services/molit.ts` | MOLIT API adapter with Zod validation |
| `supabase/migrations/` | 16 sequential SQL files (schema + RLS) |
| `next.config.ts` | Serwist PWA config + security headers |
| `.github/workflows/notify-worker.yml` | 5-min GitHub Actions cron |
| `scripts/backfill-realprice.ts` | 10-year historical trade data ingest |

## Module Boundaries
| Directory | Owns | Must NOT |
|-----------|------|---------|
| `src/services/` | External HTTP calls (MOLIT, Kakao, K-apt) | Access Supabase DB |
| `src/lib/data/` | Supabase queries | Call external APIs |
| `src/lib/auth/` | Server Actions with `'use server'` | Skip auth verification |
| `src/lib/supabase/admin.ts` | service_role operations | Be imported in components |
| `src/components/` | UI rendering | Direct Supabase calls |
| `src/app/api/` | Cron + event endpoints | Business logic (delegate to lib/) |

## Naming Conventions
- **Files**: `kebab-case.ts` for utilities; `PascalCase.tsx` for components
- **Components**: `PascalCase` (e.g., `ComplexMarker`, `AdBanner`)
- **Server Actions files**: `*-actions.ts` suffix
- **Data query files**: noun-based, no suffix (e.g., `ads.ts`, `favorites.ts`)
- **Routes**: Next.js App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`)
- **Tests**: co-located in `src/__tests__/` or alongside files as `*.test.ts`
