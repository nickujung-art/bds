# Coding Conventions

**Analysis Date:** 2026-05-06

## TypeScript Patterns

**Strictness:**
- `strict: true` + `noUncheckedIndexedAccess: true` in `tsconfig.json`
- Array indexing always returns `T | undefined` — all index access must be guarded (e.g. `arr[0]!` or nullish checks)
- `@typescript-eslint/no-explicit-any` enforced as error; use `unknown` or proper generics
- `@typescript-eslint/consistent-type-imports` enforced — always use `import type` for type-only imports

**Interface vs Type:**
- `interface` for domain object shapes: `ComplexDetail`, `ComplexSearchResult`, `MonthlyPriceSummary` in `src/lib/data/`
- `interface` for component props: `interface Props { ... }` pattern used in all components
- `type` for literals/unions not observed yet but follows project rules

**Return types on public functions:**
- All exported data functions have explicit return types: `Promise<ComplexDetail | null>`, `Promise<ComplexSearchResult[]>`
- Server Actions return `Promise<{ error: string | null }>` — consistent result envelope

**No `React.FC`:**
- Components defined as plain `function Name({ prop }: Props)` or arrow functions without FC annotation

**SupabaseClient injection pattern:**
- Data layer functions accept `supabase: SupabaseClient` as a parameter rather than importing a singleton
- This enables test injection with the admin client: `searchComplexes(query, codes, admin)`
- Example: `src/lib/data/complex-search.ts`, `src/lib/data/complex-detail.ts`, `src/lib/data/ads.ts`

## Component Patterns

**`'use client'` directive:**
- Added only to components that need browser APIs or React hooks
- All `src/components/` that use `useState`, `useTransition`, `useRouter` etc. are client components
- Server components (pages in `src/app/`) never import Supabase client directly

**Client component pattern (mutation):**
```tsx
'use client'
const [isPending, startTransition] = useTransition()
const handleAction = () => {
  startTransition(async () => {
    const { error } = await serverAction(args)
    if (!error) setLocalState(newValue)
  })
}
```
Used in: `src/components/complex/FavoriteButton.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/reviews/ReviewForm.tsx`

**Server component data fetching:**
- Parallel fetches via `Promise.all([...])` at the page level
- Example in `src/app/complexes/[id]/page.tsx`:
  ```ts
  const [complex, saleData, sidebarAds, reviews] = await Promise.all([...])
  ```

**Props interface naming:**
- Always named `Props` (not `ComponentNameProps`) at the top of each file
- Sub-component props use inline or named interfaces within same file

**Icon components:**
- Inline SVG icon components defined as plain functions within the same file
- Named with `Icon` suffix: `FireIcon`, `BellIcon`, `ShareIcon`
- No icon library dependency

**Small helper components:**
- `BookmarkIcon` in `FavoriteButton.tsx`, icons in page files — co-located not extracted

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g. `FavoriteButton.tsx`, `ReviewForm.tsx`)
- Data functions: `kebab-case.ts` (e.g. `complex-search.ts`, `complex-detail.ts`)
- Server actions: `kebab-case.ts` in `src/lib/auth/` (e.g. `review-actions.ts`, `favorite-actions.ts`)
- API routes: `route.ts` inside `src/app/api/[path]/`
- Test files: `kebab-case.test.ts` under `src/__tests__/`

**Functions:**
- `camelCase` for all functions
- Data functions: `get` prefix for reads (e.g. `getComplexById`, `getActiveAds`, `getComplexReviews`)
- Server Actions: verb prefix (e.g. `signInWithEmail`, `submitReview`, `addFavorite`, `removeFavorite`)
- Boolean-returning functions: `is` prefix (e.g. `isFavorited`)

**Variables:**
- `camelCase` throughout
- Pending state: `isPending` (from `useTransition`)
- Local error state: `error` typed as `string | null`

**Constants:**
- Module-level: `UPPER_SNAKE_CASE` (e.g. `EMAIL_RE`, `CRON`, `FAKE_ID`, `SITE`, `LABELS`)
- Design tokens as CSS custom properties in `src/app/globals.css`

**Types/Interfaces:**
- `PascalCase` (e.g. `ComplexDetail`, `MonthlyPriceSummary`, `SubmitReviewInput`)

## Import Organization

**Path alias:**
- `@/` maps to `src/` — used consistently throughout, never relative `../../`
- Configured in both `tsconfig.json` and `vitest.config.ts`

**Import order (observed pattern):**
1. `'use server'` or `'use client'` directive (first line when present)
2. Framework imports: `next/navigation`, `next/cache`, `next/headers`, `react`
3. Internal library imports with `@/lib/...`
4. Internal component imports with `@/components/...`
5. Internal type imports with `@/types/...`

**Type imports:**
- ESLint enforces `import type { ... }` for type-only imports
- Example: `import type { SupabaseClient } from '@supabase/supabase-js'`

**No barrel files:**
- Each module imported directly from its file path, no `index.ts` re-exports observed

## Error Handling

**Server Action return convention:**
- All Server Actions return `Promise<{ error: string | null }>` — never throw to client
- Success = `{ error: null }`, failure = `{ error: 'human-readable Korean message' }`
- Example in `src/lib/auth/review-actions.ts`, `src/lib/auth/favorite-actions.ts`

**Data layer throw convention:**
- Data functions (not Server Actions) throw `Error` on DB failure:
  ```ts
  if (error) throw new Error(`getComplexById failed: ${error.message}`)
  ```
- Callers (server components/pages) handle via `notFound()` or error boundaries

**Auth guard pattern:**
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: '로그인이 필요합니다.' }
```
Used in all mutation Server Actions before performing DB writes.

**Client-side error display:**
- `useState<string | null>(null)` for error messages
- Conditional rendering with Korean error strings
- No toast library — inline `<p>` or `<span>` elements

**Next.js redirect:**
- `redirect()` from `next/navigation` throws internally (not a real error)
- Tests account for this: `await expect(fn()).rejects.toThrow('REDIRECT:/path')`

## Data Fetching Patterns

**Server Components (primary):**
- Pages fetch all data server-side with `createReadonlyClient()` or `createSupabaseServerClient()`
- No TanStack Query or SWR in current codebase — all data comes from RSC data fetching
- `export const revalidate = 86400` on static-ish pages, `revalidate = 0` on dynamic

**Supabase client selection:**
- `createReadonlyClient()` (`src/lib/supabase/readonly.ts`) — for read-only server component queries
- `createSupabaseServerClient()` (`src/lib/supabase/server.ts`) — for auth-aware server queries (Server Actions)
- `createSupabaseAdminClient()` (`src/lib/supabase/admin.ts`) — service role, internal workers only
- `src/lib/supabase/client.ts` — client-side only, real-time subscriptions only (not general querying)

**RPC calls:**
- Complex queries go through Postgres functions via `.rpc()`:
  ```ts
  supabase.rpc('search_complexes', { p_query: q, p_sgg_codes: sggCodes, p_limit: limit })
  supabase.rpc('complex_monthly_prices', { p_complex_id, p_deal_type, p_months })
  ```

**`revalidatePath` after mutations:**
- All Server Actions that mutate data call `revalidatePath('/complexes/${complexId}')` after success

## Form Handling

**No react-hook-form in current code:**
- Forms use controlled local state (`useState`) + `useTransition` for Server Action calls
- Manual validation before calling the action (e.g. rating check in `ReviewForm.tsx`)
- Zod not observed in component code — validation happens inside Server Actions

**Pattern in `ReviewForm.tsx`:**
```tsx
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!rating) { setError('평점을 선택해주세요.'); return }
  startTransition(async () => {
    const result = await submitReview({ complexId, content, rating })
    if (result.error) setError(result.error)
    else { resetForm(); onSuccess?.() }
  })
}
```

**Server-side validation:**
- Length constraints, enum checks done in Server Action before DB insert
- DB-level constraints serve as final guard (CHECK constraints, UNIQUE)

## State Management Patterns

**Client state — minimal and local:**
- `useState` for UI-only state: pending messages, toggled values, hover states
- `useTransition` for async Server Action calls (built-in loading state)
- No Zustand, Jotai, or Redux observed

**URL as state:**
- `SearchInput.tsx` syncs search query to URL params via `router.replace()` with 300ms debounce
- Uses `useSearchParams()` + `usePathname()` + `useRouter()` from `next/navigation`

**No TanStack Query observed:**
- Despite being listed in CLAUDE.md stack, not used in current implementation
- All server state comes from RSC data fetching + `revalidatePath` invalidation

**Server state authority:**
- Server components own initial data; client components receive it as props (`initialFavorited`, `initialReviews`, `initialStats`)
- Optimistic updates done manually: set local state immediately, roll back on error

## CSS/Styling Patterns

**Design system approach:**
- CSS custom properties defined in `src/app/globals.css` as design tokens
- Brand color: `--dj-orange: #ea580c`
- Foreground scale: `--fg-pri`, `--fg-sec`, `--fg-tertiary`
- Backgrounds: `--bg-canvas`, `--bg-surface`, `--bg-surface-2`
- Radius scale: `--radius-md` (8px) through `--radius-3xl` (24px)

**Global utility classes (not Tailwind):**
- `.btn`, `.btn-sm`, `.btn-md`, `.btn-lg` — button base + sizes
- `.btn-orange`, `.btn-secondary`, `.btn-ghost`, `.btn-primary` — button variants
- `.card`, `.card-flat` — surface containers
- `.badge`, `.chip` — inline labels
- `.input` — form input baseline
- `.tabs`, `.tab` — tab navigation
- `.tnum`, `.num` — tabular numeral rendering

**Tailwind usage:**
- Used for spacing/layout utilities (`flex`, `gap-4`, `rounded-lg`, `text-sm`, etc.) in some components
- Mixed pattern: some components use Tailwind utilities (e.g. `LoginForm.tsx`), others use inline `style={{}}` (e.g. page files)
- Tailwind `theme.extend` adds: `accent: #ea580c`, `'accent-tint': #FFF1E8`, `canvas: #F7F7F8`

**Inline styles:**
- Heavy use of inline `style={{}}` in page components (`src/app/complexes/[id]/page.tsx`, `src/app/page.tsx`)
- Typography specified inline: `font: '700 28px/1.25 var(--font-sans)'` shorthand
- Layout specified inline: `display: 'grid'`, `gridTemplateColumns: '1fr 360px'`

**Font:**
- Pretendard Variable loaded via `next/font/local` in `src/app/layout.tsx`
- CSS variable `--font-pretendard` exposed and referenced in `--font-sans` token

**AI slop prohibited (per CLAUDE.md):**
- No `backdrop-blur`, gradient text, glow animations, purple/indigo brand colors, background gradient orbs

---

*Convention analysis: 2026-05-06*
