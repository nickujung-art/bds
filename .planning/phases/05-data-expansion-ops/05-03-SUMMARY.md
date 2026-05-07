---
phase: 05-data-expansion-ops
plan: "03"
subsystem: database
tags: [supabase, rls, postgres, server-actions, zod, admin-ui, listing-prices]

# Dependency graph
requires:
  - phase: 05-data-expansion-ops/05-00
    provides: complexes golden record table, profiles.role admin pattern

provides:
  - listing_prices table with public read + admin write RLS, DB-level CHECK constraint, unique index
  - upsertListingPrice Server Action (requireAdmin FIRST + onConflict upsert)
  - deleteListingPrice Server Action (requireAdmin FIRST + UUID validation)
  - /admin/listing-prices RSC page with FormData wrapper pattern
  - src/types/database.ts with listing_prices types

affects:
  - 05-04 (Phase 6 gap label feature will read listing_prices for price comparison)
  - Phase 6 KB시세 API 연동 (will populate listing_prices automatically)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireAdmin() FIRST pattern (before zod validation, prevents payload shape leak)"
    - "onConflict upsert with named unique index target"
    - "FormData inline wrapper pattern (RSC form action → object-argument Server Action)"
    - "eslint-disable block for adminClient as any (listing_prices not yet in typed Database)"

key-files:
  created:
    - supabase/migrations/20260507000005_phase5_listing_prices.sql
    - src/lib/actions/listing-price-actions.ts
    - src/app/admin/listing-prices/page.tsx
    - src/__tests__/listing-prices.test.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "D-08 honored: gap label UI (price vs transaction comparison) deferred to Phase 6 — only infra created here"
  - "requireAdmin() called BEFORE zod validation to prevent payload shape leaking to unauthenticated callers"
  - "createSupabaseAdminClient() used for all listing_prices writes — standard server client blocked by RLS WITH CHECK"
  - "onConflict='complex_id,recorded_date,source' enables idempotent upsert per source per date"
  - "FormData inline wrapper in page.tsx — listing-price-actions.ts object-argument signature preserved for testability"

patterns-established:
  - "Admin Server Action pattern: requireAdmin FIRST → zod validate → admin client DB write"
  - "Inline FormData wrapper: define async function inside RSC to bridge form action type system"

requirements-completed:
  - DATA-05

# Metrics
duration: 22min
completed: 2026-05-07
---

# Phase 5 Plan 03: 매물가 인프라 (listing_prices 테이블 + 어드민 UI) Summary

**listing_prices 테이블(DB-level CHECK + unique index + dual RLS), upsertListingPrice/deleteListingPrice Server Action(requireAdmin FIRST + onConflict upsert), 어드민 매물가 입력 페이지(FormData 인라인 래퍼)**

## Performance

- **Duration:** 22 min
- **Started:** 2026-05-07T08:33:00Z
- **Completed:** 2026-05-07T08:55:00Z
- **Tasks:** 3 (Task 1 RED, Task 2 GREEN+Migration, Task 3 Admin Page)
- **Files modified:** 5

## Accomplishments

- listing_prices 테이블 생성: CHECK(price_per_py BETWEEN 100 AND 99999), unique(complex_id, recorded_date, source), public read + admin write RLS 이중 정책
- upsertListingPrice/deleteListingPrice Server Action: requireAdmin() FIRST → zod validation → createSupabaseAdminClient() write (보안 설계 원칙 준수)
- /admin/listing-prices RSC 페이지: admin role 검증, FormData 인라인 래퍼, 단지 select(active 단지 500건), 최근 20건 목록, 삭제 기능

## Task Commits

1. **Task 1: TDD RED** - `54e2026` (test)
2. **Task 2: 마이그레이션 + Server Action + DB 타입** - `f3d13c1` (feat)
3. **Task 3: 어드민 페이지** - `f663671` (feat)

## Files Created/Modified

- `supabase/migrations/20260507000005_phase5_listing_prices.sql` - listing_prices 테이블, INDEX, UNIQUE INDEX, RLS 2개 정책
- `src/lib/actions/listing-price-actions.ts` - upsertListingPrice, deleteListingPrice Server Action (requireAdmin FIRST, zod, onConflict upsert)
- `src/app/admin/listing-prices/page.tsx` - 어드민 매물가 입력 RSC 페이지 (auth guard, FormData wrapper, table)
- `src/__tests__/listing-prices.test.ts` - 7개 TDD 테스트 (RED → GREEN)
- `src/types/database.ts` - listing_prices 타입 재생성 (supabase gen types --local 후 artifact 제거)

## Decisions Made

- D-08 준수: 갭 라벨 UI(매물가 vs 실거래가 비교 표시)는 Phase 6로 defer. 이 플랜에서는 인프라(테이블+어드민 입력)만 구현
- requireAdmin() FIRST 원칙: zod validation 이전에 호출하여 비인증 사용자에게 payload shape 노출 방지
- FormData 인라인 래퍼: listing-price-actions.ts의 객체 인자 시그니처 보존 (테스트 가능성 유지)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] zod .errors → .issues (TypeScript strict mode)**
- **Found during:** Task 3 (build verification)
- **Issue:** listing-price-actions.ts에서 `parsed.error.errors[0]`가 strict TS에서 타입 오류 발생. zod v3 API는 `.issues`가 올바른 프로퍼티
- **Fix:** `.errors[0]` → `.issues[0]` 으로 수정 (2곳)
- **Files modified:** src/lib/actions/listing-price-actions.ts
- **Verification:** npm run build 통과
- **Committed in:** f663671 (Task 3 commit)

**2. [Rule 1 - Bug] database.ts 파일 아티팩트 제거**
- **Found during:** Task 3 (build verification)
- **Issue:** `npx supabase gen types --local 2>&1 >` 명령 사용 시 "Connecting to db 5432" stderr 메시지와 MCP 플러그인 태그가 파일에 포함됨
- **Fix:** 파일 시작의 "Connecting to db 5432" 줄 제거, 파일 끝의 `<claude-code-hint ...>` 태그 제거
- **Files modified:** src/types/database.ts
- **Verification:** ESLint 파싱 오류 해소, npm run build 통과
- **Committed in:** f663671 (Task 3 commit)

**3. [Rule 1 - Bug] form action 반환 타입 void 로 수정**
- **Found during:** Task 3 (build verification)
- **Issue:** Next.js form action은 `(formData: FormData) => void | Promise<void>` 시그니처 요구. 명시적 `Promise<{ error: string | null }>` 반환 타입이 타입 불일치
- **Fix:** 인라인 래퍼 함수에서 명시적 반환 타입 제거 (TypeScript 자동 추론으로 void 호환)
- **Files modified:** src/app/admin/listing-prices/page.tsx
- **Verification:** npm run build 통과
- **Committed in:** f663671 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (Rule 1 - Bug)
**Impact on plan:** 모두 TypeScript strict mode / 빌드 정확성을 위한 필수 수정. 스코프 확장 없음.

## Issues Encountered

- worktree 내 `public/fonts/` 디렉토리 없음 — .gitignore로 제외된 폰트 파일이 빌드에 필요. 주 레포에서 복사하여 해결 (실행 환경 특이사항)
- supabase gen types 명령의 stderr 출력이 파일에 포함됨 — 이후 `> file 2>/dev/null` 패턴 사용 권장

## User Setup Required

None - no external service configuration required. 마이그레이션은 `npm run db:push` 또는 Supabase dashboard에서 적용 필요.

## Next Phase Readiness

- listing_prices 테이블과 admin 입력 UI가 준비됨 — Phase 6 KB시세 API 연동 시 자동 populate 가능
- public read RLS가 이미 적용되어 Phase 6 갭 라벨 UI에서 SELECT 쿼리 즉시 사용 가능
- 갭 라벨 UI(단지 상세 페이지 표시)는 Phase 6(D-08)에서 구현 예정

---
*Phase: 05-data-expansion-ops*
*Completed: 2026-05-07*

## Self-Check: PASSED

- `src/__tests__/listing-prices.test.ts` - FOUND
- `supabase/migrations/20260507000005_phase5_listing_prices.sql` - FOUND
- `src/lib/actions/listing-price-actions.ts` - FOUND
- `src/app/admin/listing-prices/page.tsx` - FOUND
- `src/types/database.ts` (listing_prices type) - FOUND
- Commit `54e2026` (test RED) - FOUND
- Commit `f3d13c1` (feat GREEN) - FOUND
- Commit `f663671` (feat page) - FOUND
- `npm run test -- listing-prices` → 7 passed - VERIFIED
- `npm run build` → compile success - VERIFIED
