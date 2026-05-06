---
phase: 01-security-infra-deploy
plan: "03"
subsystem: infra
tags: [github-actions, ci, playwright, vitest, env, upstash, sentry]

requires:
  - phase: 01-security-infra-deploy/01-01
    provides: "Upstash Redis rate limiter + createSupabaseAdminClient() + SEC-01/02/03 패치"
  - phase: 01-security-infra-deploy/01-02
    provides: "@sentry/nextjs instrumentation + NEXT_PUBLIC_SENTRY_DSN 변수 통일"
provides:
  - "GitHub Actions CI 4-job 파이프라인 (lint-typecheck, build, unit-test, e2e)"
  - "e2e needs: [build] 의존성 — build 실패 시 e2e 미실행"
  - ".env.local.example 최신화 — 미사용 NextAuth/ADMIN_IP_ALLOWLIST 제거, Upstash/Sentry/Rate Limit/Site 추가"
affects:
  - 01-security-infra-deploy/01-04
  - 01-security-infra-deploy/01-05

tech-stack:
  added: []
  patterns:
    - "GitHub Actions 4-job CI: lint-typecheck, build, unit-test, e2e (build 선행 의존)"
    - "NEXT_PUBLIC_* 환경변수 GitHub Secrets 주입 패턴"
    - "Playwright artifact 업로드 (failure 시 7일 보관)"

key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - .env.local.example

key-decisions:
  - "e2e job에 needs: [build] 설정 — build 실패 시 E2E 실행 방지 (D-14, D-15)"
  - "unit-test는 build와 병렬 실행 (독립적, build 실패에 영향받지 않음)"
  - ".env.local.example SENTRY_DSN → NEXT_PUBLIC_SENTRY_DSN 통일 (01-02 결정 반영)"
  - "ADMIN_IP_ALLOWLIST 제거 (D-18) — 미구현 상태에서 미사용 변수가 주는 거짓 보안 신뢰 제거"

patterns-established:
  - "CI 시크릿 주입: ${{ secrets.변수명 }} 패턴 — notify-worker.yml과 동일한 규칙"
  - "E2E Playwright artifact: failure 시 playwright-report/ 7일 보관"

requirements-completed:
  - INFRA-02
  - INFRA-01

duration: 10min
completed: 2026-05-06
---

# Phase 01 Plan 03: GitHub Actions CI + .env.local.example 정리 Summary

**GitHub Actions 4-job CI 파이프라인(lint/build/unit-test/e2e, e2e는 build 의존) 신규 생성 + .env.local.example에서 미사용 NextAuth·ADMIN_IP_ALLOWLIST 제거 및 Upstash Redis·Sentry·Rate Limit·Site URL 변수 추가**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-06T03:08:00Z
- **Completed:** 2026-05-06T03:18:04Z
- **Tasks:** 2
- **Files modified:** 2 (1 신규 생성 + 1 수정)

## Accomplishments

- INFRA-02: `.github/workflows/ci.yml` 신규 생성 — 4-job CI 파이프라인 (lint-typecheck, build, unit-test, e2e)
- e2e job에 `needs: [build]` 설정 — build 실패 시 E2E 미실행 (D-14, D-15 이행)
- INFRA-01 부분: `.env.local.example` 정리 — D-16(NextAuth 제거), D-17(Upstash/Sentry/Site 추가), D-18(ADMIN_IP_ALLOWLIST 제거)

## Task Commits

1. **Task 1: GitHub Actions CI 워크플로우 생성** - `2a9290b` (feat)
2. **Task 2: .env.local.example 환경변수 정리** - `3ab08f2` (chore)

## Files Created/Modified

- `.github/workflows/ci.yml` — 4-job CI 파이프라인. push/PR on main 트리거. lint-typecheck, build, unit-test 병렬 실행, e2e는 build 완료 후 실행. Playwright artifact 업로드(failure 시 7일).
- `.env.local.example` — NextAuth 4개 변수 제거, ADMIN_IP_ALLOWLIST 제거, RESEND_FROM_EMAIL/NEXT_PUBLIC_SITE_URL/RATE_LIMIT_SECRET/UPSTASH_REDIS_REST_{URL,TOKEN}/NEXT_PUBLIC_SENTRY_DSN/SENTRY_{ORG,PROJECT} 추가.

## Decisions Made

- **e2e needs: [build]**: build 성공 후에만 e2e 실행 — 빌드 실패 시 불필요한 E2E 실행 비용 방지 (D-14, D-15)
- **unit-test 병렬**: unit-test는 build와 독립적이므로 병렬 실행 — CI 전체 소요 시간 단축
- **Playwright chromium only in CI**: `npx playwright install chromium --with-deps` — CI 비용·속도 최적화. Firefox/Safari는 로컬 개발자가 수동 실행
- **NEXT_PUBLIC_SENTRY_DSN 통일**: 01-02 SUMMARY의 결정 반영, 단일 변수로 서버+클라이언트 모두 처리

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

### GitHub Secrets 설정 (PR merge 전 필수)

GitHub Actions CI가 실제로 동작하려면 GitHub 리포지토리에 다음 Secrets를 등록해야 한다:

**GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret 이름 | 값 출처 |
|------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (service_role key) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | Kakao Developers → 앱 → 앱 키 → JavaScript 키 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` 출력 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → Settings → Projects → [프로젝트] → Client Keys |
| `NEXT_PUBLIC_SITE_URL` | 프로덕션 도메인 (e.g., `https://danjiondo.com`) |

### Branch Protection 설정 (D-13)

GitHub → Repository → Settings → Branches → Add branch protection rule:
- Branch name pattern: `main`
- Require status checks: `Lint & Typecheck`, `Build`, `Unit Tests (Vitest)`, `E2E Tests (Playwright)` 4종 체크
- Require branches to be up to date before merging: 체크

## Next Phase Readiness

- CI 파이프라인 준비 완료 — PR 생성 시 4종 자동 검증
- GitHub Secrets 및 Branch Protection 설정은 사용자 수동 작업 필요 (코드로 설정 불가)
- 다음 플랜(01-04)은 Playwright E2E 5종 골든패스 테스트 구현 예정

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | .github/workflows/ci.yml | SUPABASE_SERVICE_ROLE_KEY가 e2e job에 포함 — GitHub Secrets 암호화 저장, fork PR에서 secrets 접근 불가 (T-03-01: mitigated) |

## Known Stubs

없음 — 생성된 파일에 플레이스홀더 또는 하드코딩된 빈 값 없음.

## Self-Check: PASSED

- `.github/workflows/ci.yml` — EXISTS
- `.env.local.example` — MODIFIED
- Commit `2a9290b` — FOUND (feat: CI workflow)
- Commit `3ab08f2` — FOUND (chore: .env.local.example 정리)
- `needs: [build]` in e2e job — VERIFIED
- UPSTASH_REDIS_REST_URL, NEXT_PUBLIC_SENTRY_DSN, RATE_LIMIT_SECRET in .env.local.example — VERIFIED
- NEXTAUTH_SECRET, ADMIN_IP_ALLOWLIST absent from .env.local.example — VERIFIED

---
*Phase: 01-security-infra-deploy*
*Completed: 2026-05-06*
