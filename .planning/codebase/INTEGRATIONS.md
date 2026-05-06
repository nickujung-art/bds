# External Integrations

## Authentication
- **Provider**: Supabase Auth
- **Methods**: Email Magic Link (OTP) + Naver OAuth
- **Session**: `@supabase/ssr` cookie-based sessions
- **Middleware**: `src/middleware.ts` — session refresh on every request
- **Client tiers**:
  - Server client (cookie-based, RLS-enforced)
  - Readonly client
  - Admin client (service_role, bypasses RLS — server-only)

## Database
- **Engine**: Supabase Postgres 15 + PostGIS + pg_trgm
- **ORM**: Supabase JS client (raw SQL via `.rpc()` and query builder)
- **RLS**: All user data tables require explicit RLS policies in `supabase/migrations/`
- **Schema source of truth**: `complexes` table (Golden Record)
  - External source aliases stored in `complex_aliases`
  - Matching always requires location (coordinates) + name — never name alone

## External APIs

| Service | Purpose | Limit | Adapter Location |
|---------|---------|-------|-----------------|
| MOLIT (국토부) Real Estate | Actual transaction prices | 10K req/day | `src/services/` |
| K-apt | Apartment complex list | Unknown | `src/services/` |
| School Info API (학교알리미) | Nearby school data | Unknown | `src/services/` |
| Kakao Maps JS SDK | Map rendering | 100K req/day | `react-kakao-maps-sdk` |
| Kakao Local REST API | Geocoding, place search | 100K req/day | `src/services/` |

**Rule**: All external API calls go through `src/services/` adapters only. Direct calls from components or routes are forbidden.

## Storage
- Supabase Storage (via Supabase project)
- No separate blob storage provider

## Email / Notifications
- **Email**: Resend (`resend` ^6.12.2)
  - Limit: 3,000 emails/month (free tier)
  - Templates: React Email components
- **Push Notifications**: Web Push VAPID (`web-push` ^3.6.7)
  - Delivery worker runs via GitHub Actions cron every 5 minutes
  - Polls `notifications` table for pending items

## Analytics / Monitoring
- **Error Tracking**: Sentry — DSN configured in env vars, referenced in CSP headers, but package not yet installed in node_modules
- **Analytics**: PostHog — configured in env vars but not yet integrated in code
- **Status**: Both are env-var-only references; actual SDK integration is incomplete

## Payment
- None configured

## Cron / Scheduled Jobs
- **Trade data refresh**: Vercel Cron — daily at 04:00 KST
- **Notification delivery**: GitHub Actions cron — every 5 minutes (Vercel Hobby tier limitation: 1 cron/day max)
- **Security**: All cron endpoints require `CRON_SECRET` header validation
