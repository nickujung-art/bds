# Tech Stack

## Core Framework
- Next.js 15.3.1, App Router, RSC-first (Server Components default)
- React 19
- Rendering: SSR/SSG hybrid — server components for data fetching, minimal `'use client'`

## Language & Type System
- TypeScript 5.8.3
- `strict: true`, `noUncheckedIndexedAccess: true`
- Path alias: `@/` → `src/`

## Styling
- Tailwind CSS 3.4 with custom design tokens
- Brand color: orange `#ea580c`
- Font: Pretendard variable (Korean-optimized)
- Custom CSS variables for design tokens

## State Management
- **Server state**: RSC + Server Actions (primary pattern)
- **Client state**: None installed (Zustand/TanStack Query not yet added despite CLAUDE.md mention)
- **Form state**: react-hook-form + Zod 4.4.1
- **URL state**: Next.js searchParams

## Build & Tooling
- Bundler: Next.js (Turbopack in dev)
- Linter: ESLint with Next.js config
- Type checker: TypeScript compiler
- Package manager: npm

## Testing
- Unit/Integration: Vitest 2.1.9 (happy-dom environment)
  - 80% coverage threshold enforced
- E2E: Playwright (Chromium, Firefox, WebKit)

## PWA
- Serwist (service worker at `src/app/sw.ts`)
- VAPID web push via `web-push` ^3.6.7

## Deployment
- Platform: Vercel Hobby
- CI/CD: GitHub Actions
  - Daily cron (04:00 KST): trade data refresh
  - Every 5 min cron: notification delivery worker (Vercel Hobby can't do this — runs via GitHub Actions)
- Cron security: `CRON_SECRET` header required on all cron endpoints

## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.3.1 | Framework |
| react | 19 | UI runtime |
| typescript | 5.8.3 | Type system |
| tailwindcss | 3.4.x | Styling |
| @supabase/ssr | latest | Supabase server client |
| zod | 4.4.1 | Schema validation |
| react-hook-form | latest | Form state |
| recharts | latest | Data visualization |
| react-kakao-maps-sdk | latest | Map rendering |
| supercluster | latest | Map marker clustering |
| serwist | latest | PWA / service worker |
| web-push | 3.6.7 | VAPID push notifications |
| resend | 6.12.2 | Transactional email |
| vitest | 2.1.9 | Unit/integration testing |
| playwright | latest | E2E testing |
