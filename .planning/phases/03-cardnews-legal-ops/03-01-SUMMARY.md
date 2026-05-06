---
phase: 03-cardnews-legal-ops
plan: 01
subsystem: database-schema
tags: [migration, schema, tdd, accessibility, supabase, typescript]
dependency_graph:
  requires: []
  provides:
    - profiles.deleted_at / terms_agreed_at / suspended_at
    - reports 테이블 + RLS 3정책
    - report_status / report_target_type enum
    - src/types/database.ts 갱신
    - RED 테스트 스캐폴드 5종
    - @axe-core/playwright devDependency
  affects:
    - Wave 1: consent-actions (terms_agreed_at, deleted_at)
    - Wave 2: admin-actions + cardnews API (reports, suspended_at)
    - Wave 3: E2E accessibility (AxeBuilder)
tech_stack:
  added:
    - "@axe-core/playwright": "^4.11.3"
  patterns:
    - Supabase RLS 3정책 (auth insert / admin read / admin update)
    - TDD RED 스캐폴드 (import 실패 = RED 상태)
    - database.ts 수동 갱신 (옵션 C 오프라인 fallback)
key_files:
  created:
    - supabase/migrations/20260506000001_profiles_consent_delete.sql
    - supabase/migrations/20260506000002_reports.sql
    - src/__tests__/cardnews.test.ts
    - src/__tests__/consent-actions.test.ts
    - src/__tests__/admin-actions.test.ts
    - src/__tests__/admin-status.test.ts
    - e2e/accessibility.spec.ts
  modified:
    - src/types/database.ts
    - package.json
    - package-lock.json
decisions:
  - "supabase db push 미실행: Docker 미구동 + SUPABASE_ACCESS_TOKEN 없음. 마이그레이션 파일은 완성. 로컬 환경에서 npm run db:start 후 npm run db:push 필요."
  - "database.ts 수동 갱신 (옵션 C): gen types --local 대신 수동 편집으로 신규 컬럼·테이블·enum 추가. tsc exit 0 확인."
  - "D-08 마이그레이션 미작성: complex_reviews.user_id ON DELETE SET NULL이 20260430000016_reviews.sql 라인 5에 이미 존재 확인."
metrics:
  duration: "~15분"
  completed: "2026-05-06"
  tasks: 4
  files_changed: 10
---

# Phase 3 Plan 01: DB 마이그레이션 + RED 테스트 스텁 Summary

Wave 0 기반 작업: profiles 3컬럼 + reports 테이블 마이그레이션, 5종 RED 테스트 스캐폴드, @axe-core/playwright 설치, database.ts 갱신.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `8adca23` | feat | profiles 컬럼 추가 + reports 테이블 마이그레이션 |
| `1ede2be` | test | RED 테스트 스캐폴드 5종 추가 |
| `2677ba5` | chore | @axe-core/playwright 4.11.3 devDependency 추가 |
| `0c4c1a7` | feat | types/database.ts에 신규 컬럼·테이블·enum 반영 |

## Task Results

### Task 1: 마이그레이션 파일 작성

**20260506000001_profiles_consent_delete.sql**
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at / terms_agreed_at / suspended_at`
- 부분 인덱스 2종: `profiles_deleted_at_idx` (soft delete cron용), `profiles_terms_not_agreed_idx` (admin status용)
- COMMENT 3종 추가

**20260506000002_reports.sql**
- `CREATE TYPE public.report_target_type AS ENUM ('review', 'user', 'ad')`
- `CREATE TYPE public.report_status AS ENUM ('pending', 'accepted', 'rejected')`
- `reports` 테이블: PK uuid, reporter_id/resolved_by FK ON DELETE SET NULL
- CHECK 제약: `char_length(reason) BETWEEN 5 AND 200`
- CHECK 제약: `reports_no_self_report` (자기 자신 신고 금지)
- RLS 3정책: auth insert / admin read / admin update
- 인덱스 2종: status+created_at 부분 인덱스, target_type+target_id 인덱스

**D-08 중복 방지:** `complex_reviews.user_id ON DELETE SET NULL`은 `20260430000016_reviews.sql` 라인 5에 이미 존재. 추가 마이그레이션 없음.

### Task 2: RED 테스트 스캐폴드 5종

| 파일 | 요건 | RED 원인 |
|------|------|---------|
| `src/__tests__/cardnews.test.ts` | SHARE-03, SHARE-04 | `@/app/api/cardnews/generate/route` 미구현 |
| `src/__tests__/consent-actions.test.ts` | LEGAL-01, LEGAL-04 | `@/lib/auth/consent-actions` 미구현 |
| `src/__tests__/admin-actions.test.ts` | ADMIN-01, ADMIN-03 | `@/lib/auth/admin-actions` 미구현 |
| `src/__tests__/admin-status.test.ts` | ADMIN-04 | `reports` 테이블 타입 없음 (Task 4로 해결) |
| `e2e/accessibility.spec.ts` | A11Y-01, A11Y-02, A11Y-03 | `@axe-core/playwright` 미설치 (Task 3로 해결) |

### Task 3: @axe-core/playwright 설치 + .env.local.example 확인

- `npm install --save-dev @axe-core/playwright@4.11.3` 설치 완료
- `package.json` devDependencies: `"@axe-core/playwright": "^4.11.3"`
- `node_modules/@axe-core/playwright/package.json` 존재 확인
- `.env.local.example` 라인 49 `SUPPORT_EMAIL=` 이미 존재 (변경 없음)

### Task 4: types/database.ts 갱신 (오프라인 fallback)

**Docker 미구동 + SUPABASE_ACCESS_TOKEN 없음 → supabase db push 실행 불가**

옵션 C(수동 갱신) 적용:

**profiles 테이블 (Row/Insert/Update)에 추가:**
- `deleted_at: string | null` (nullable timestamptz)
- `terms_agreed_at: string | null` (nullable timestamptz)
- `suspended_at: string | null` (nullable timestamptz)

**reports 테이블 신규 추가 (Row/Insert/Update + Relationships):**
- reporter_id, resolved_by → profiles FK
- target_type: `Database["public"]["Enums"]["report_target_type"]`
- status: `Database["public"]["Enums"]["report_status"]`

**Enums 추가:**
- `report_status: "pending" | "accepted" | "rejected"`
- `report_target_type: "review" | "user" | "ad"`
- Constants.public.Enums에도 동일 추가

**결과:** `npx tsc --noEmit` exit 0. `admin-status.test.ts`의 `reports` from() 타입 오류 해소.

## Deviations from Plan

### Auto-handled Issues

**1. [Rule 3 - Blocking] supabase db push 실패 → 옵션 C 적용**
- **Found during:** Task 4
- **Issue:** Docker Desktop 미구동, SUPABASE_ACCESS_TOKEN 없음, supabase project link 없음 → `supabase db push` 실행 불가
- **Fix:** Plan에서 허용하는 옵션 C(오프라인 fallback) 적용 — database.ts 직접 편집
- **Files modified:** `src/types/database.ts`
- **Commit:** `0c4c1a7`

**2. [Rule 3 - Blocking] next lint Plugin conflict (pre-existing)**
- **Found during:** Task 3 검증
- **Issue:** 워크트리 이중 lockfile로 인한 ESLint plugin conflict → `next lint` exit 1
- **Pre-existing:** `git stash`로 확인 결과 task 파일 추가 전에도 동일 오류 발생
- **Action:** 워크트리 환경 특성으로 scope 외부. `deferred-items.md`에 기록.

## Action Required: supabase db push

마이그레이션은 완성되었으나 DB에 미적용 상태. 후속 Wave 실행 전에 아래 작업 필요:

```bash
# 1. Docker Desktop 시작 후
npm run db:start

# 2. 마이그레이션 적용
npm run db:push
# 출력 확인: "Applying migration 20260506000001_profiles_consent_delete.sql..."
# 출력 확인: "Applying migration 20260506000002_reports.sql..."

# 3. 타입 재생성 (선택적 — 이미 수동 갱신됨)
npx supabase gen types typescript --local > src/types/database.ts
```

## Interfaces for Wave 1/2/3

```typescript
// profiles 추가 컬럼 (D-09, D-12, ADMIN-01)
profiles.deleted_at: string | null      // 30일 grace soft delete
profiles.terms_agreed_at: string | null // NULL = 미동의 → /consent 리다이렉트
profiles.suspended_at: string | null    // NULL = 정상 계정

// reports 테이블 (ADMIN-03)
reports.target_type: "review" | "user" | "ad"
reports.status: "pending" | "accepted" | "rejected"
// RLS: auth insert (reporter_id = auth.uid())
//      admin read / admin update

// 모듈 경로 (Wave 1/2 구현 대상)
import { agreeToTerms, deleteAccount, reactivateAccount } from '@/lib/auth/consent-actions'
import { suspendMember, reactivateMember, resolveReport } from '@/lib/auth/admin-actions'
import { GET } from '@/app/api/cardnews/generate/route'
```

## Threat Surface Scan

이번 plan에서 추가된 보안 관련 surface:

| Flag | File | Description |
|------|------|-------------|
| threat_flag: rls-policy | 20260506000002_reports.sql | reports 테이블 신규 RLS 정책 3종 |
| threat_flag: self-report-constraint | 20260506000002_reports.sql | reporter_id <> target_id CHECK 제약 |

T-03-01 ~ T-03-04 위협 모델 완전 구현:
- T-03-01 (reporter_id 위변조): `with check (reporter_id = auth.uid())` RLS
- T-03-02 (자기 자신 신고): `reports_no_self_report` CHECK 제약
- T-03-03 (비-admin reports 조회): select 정책 admin/superadmin 한정
- T-03-04 (reason 긴 문자열): `char_length BETWEEN 5 AND 200`

## Self-Check: PASSED

| Item | Status |
|------|--------|
| supabase/migrations/20260506000001_profiles_consent_delete.sql | FOUND |
| supabase/migrations/20260506000002_reports.sql | FOUND |
| src/__tests__/cardnews.test.ts | FOUND |
| src/__tests__/consent-actions.test.ts | FOUND |
| src/__tests__/admin-actions.test.ts | FOUND |
| src/__tests__/admin-status.test.ts | FOUND |
| e2e/accessibility.spec.ts | FOUND |
| Commit 8adca23 (migration) | FOUND |
| Commit 1ede2be (test scaffold) | FOUND |
| Commit 2677ba5 (axe-core) | FOUND |
| Commit 0c4c1a7 (database.ts) | FOUND |
| database.ts: deleted_at ≥3 | 3 |
| database.ts: reports: | 1 |
| database.ts: report_status | 5 |
