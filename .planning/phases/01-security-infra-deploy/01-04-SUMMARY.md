---
phase: 01-security-infra-deploy
plan: "04"
subsystem: testing
tags: [playwright, e2e, global-setup, storageState, supabase-auth, golden-path]

requires:
  - phase: 01-security-infra-deploy/01-01
    provides: "Supabase admin client 패턴 + createSupabaseAdminClient()"
  - phase: 01-security-infra-deploy/01-02
    provides: "Sentry 에러 트래킹 초기화"

provides:
  - "Playwright E2E 골든패스 5종: landing, complex-detail, map, search, review"
  - "globalSetup: admin.createUser + signInWithPassword + storageState 생성"
  - "globalTeardown: admin.deleteUser (테스트 유저 cleanup)"
  - "chromium-auth project: storageState 기반 인증 세션 주입"
  - "playwright.config.ts: NEXT_PUBLIC_SITE_URL baseURL + globalSetup/Teardown"
  - "e2e/.auth/user.json gitignore 보호 (T-04-01)"

affects:
  - 01-security-infra-deploy/01-03
  - CI/CD 파이프라인 (GitHub Actions E2E job)

tech-stack:
  added: []
  patterns:
    - "Playwright globalSetup/globalTeardown: 테스트 전후 Supabase admin 유저 생성/삭제"
    - "storageState 기반 인증: chromium-auth project에서 세션 쿠키 주입"
    - "UUID-based dynamic navigation: 랜딩 페이지 첫 번째 단지 링크로 복합 상세 접근"
    - "waitForSelector 결정론적 대기 (waitForTimeout 금지)"

key-files:
  created:
    - e2e/global-setup.ts
    - e2e/global-teardown.ts
    - e2e/landing.spec.ts
    - e2e/complex-detail.spec.ts
    - e2e/map.spec.ts
    - e2e/search.spec.ts
    - e2e/review.spec.ts
    - e2e/.auth/.gitkeep
  modified:
    - playwright.config.ts
    - .gitignore

key-decisions:
  - "complex ID를 하드코딩하지 않고 랜딩 페이지 링크로 동적 탐색 (UUID DB 의존성 해결)"
  - "@supabase/ssr 0.10.x 쿠키 이름: sb-{ref}-auth-token 형식 확인 + 로그 출력"
  - "firefox/webkit 프로젝트 제거 — CI 속도 최적화, chromium 단일 실행"
  - "검색 라우트가 /search가 아닌 /map?q= 임을 확인 후 search.spec 수정"
  - "storageState를 test.use()로 선언 + playwright.config.ts chromium-auth project로 이중 보호"

patterns-established:
  - "E2E 인증 흐름: global-setup admin.createUser → signInWithPassword → 쿠키 주입 → storageState 저장 → global-teardown deleteUser"
  - "UUID 단지 ID 처리: 하드코딩 금지, 랜딩/맵 페이지에서 첫 번째 복합 링크를 동적으로 찾아 이동"
  - "조건부 test.skip(): DB에 데이터 없는 CI 초기 상태를 graceful하게 처리"

requirements-completed:
  - INFRA-03

duration: 8min
completed: 2026-05-06
---

# Phase 01 Plan 04: Playwright E2E 골든패스 5종 Summary

**Playwright globalSetup/Teardown(admin.createUser+deleteUser) + chromium-auth storageState 인증 + 골든패스 5종(랜딩·단지상세·지도·검색·후기작성) 36개 테스트, uuid 기반 동적 단지 탐색으로 DB 의존성 해결**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-06T03:18:00Z
- **Completed:** 2026-05-06T03:26:00Z
- **Tasks:** 2
- **Files modified:** 10 (8 신규 + 2 수정)

## Accomplishments

- INFRA-03: Playwright E2E 골든패스 5종 구현 — 36개 테스트 (`npx playwright test --list` 확인)
- globalSetup: `admin.createUser` + `signInWithPassword` + Playwright 쿠키 주입으로 storageState 생성
- globalTeardown: `admin.deleteUser`로 매 실행 후 테스트 유저 삭제 (T-04-02 프로덕션 DB 오염 방지)
- `e2e/.auth/user.json` gitignore 추가 (T-04-01 세션 토큰 git 커밋 차단)
- chromium-auth Playwright project로 인증 필요 spec 격리 실행
- complex-detail/review spec: 단지 UUID 하드코딩 없이 랜딩 페이지에서 동적으로 첫 번째 단지 링크 탐색

## Task Commits

1. **Task 1: playwright.config.ts + globalSetup/Teardown** - `5d2e5f4` (feat)
2. **Task 2: E2E 골든패스 5종 spec 파일** - `7d13dc8` (feat)

## Files Created/Modified

- `playwright.config.ts` — globalSetup/Teardown 추가, NEXT_PUBLIC_SITE_URL baseURL, chromium-auth project, firefox/webkit 제거
- `.gitignore` — `e2e/.auth/user.json` 제외 규칙 추가
- `e2e/global-setup.ts` — admin.createUser + signInWithPassword + sb-{ref}-auth-token 쿠키 주입 + storageState 저장
- `e2e/global-teardown.ts` — admin.deleteUser cleanup (E2E_TEST_USER_ID env 경유)
- `e2e/.auth/.gitkeep` — .auth 디렉토리 플레이스홀더
- `e2e/landing.spec.ts` — h1 표시, header nav, 검색 input, main 콘텐츠 (4 tests)
- `e2e/complex-detail.spec.ts` — 동적 UUID 탐색, h1 표시, main 렌더 (2 tests)
- `e2e/map.spec.ts` — /map 라우트 로드, 에러 없음, 지도 컨테이너, 검색 폼 /map?q= 이동 (4 tests)
- `e2e/search.spec.ts` — 검색 input 활성화, /map?q= 이동, 직접 접근, 빈 검색 (4 tests)
- `e2e/review.spec.ts` — auth guard, 후기 쓰기 버튼, textarea+submit, 폼 제출 (4 tests)

## Decisions Made

- **검색 라우트 확인**: 검색은 `/search?q=`가 아닌 `/map?q=`로 이동. 랜딩 페이지 `form action="/map"` 확인 후 search.spec 수정
- **complex ID 동적 탐색**: DB UUID를 하드코딩하면 CI에서 깨짐 → 랜딩 페이지 첫 번째 `/complexes/` 링크를 Playwright로 동적 탐색
- **@supabase/ssr 0.10.x 쿠키 이름**: `sb-{ref}-auth-token` 형식. NEXT_PUBLIC_SUPABASE_URL 호스트에서 ref 추출. global-setup.ts에서 로그 출력으로 불일치 감지 가능
- **firefox/webkit 제거**: 골든패스는 chromium 단일 실행으로 CI 속도 최적화

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] complex-detail.spec.ts 타입 오류 수정**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `Parameters<typeof test>[1]` 타입이 `Page`가 아닌 `TestDetails`를 반환 — `page.goto` 등 메서드 접근 불가
- **Fix:** `import { type Page } from '@playwright/test'`로 명시적 타입 임포트 + 함수 반환 타입 `Promise<boolean>` 추가
- **Files modified:** `e2e/complex-detail.spec.ts`
- **Verification:** `npx tsc --noEmit e2e/*.ts` 오류 없음

**2. [Rule 1 - Bug] map.spec.ts 주석에 waitForTimeout 문자열 제거**
- **Found during:** Task 2 acceptance criteria 검증
- **Issue:** `grep -c "waitForTimeout" e2e/map.spec.ts` = 1 (주석에 포함)
- **Fix:** 주석 문구 수정 (waitForTimeout → 시간 기반 대기)
- **Files modified:** `e2e/map.spec.ts`

**3. [Rule 1 - Clarification] 검색 라우트 /search → /map?q= 수정**
- **Found during:** Task 2 (소스 코드 확인)
- **Issue:** 플랜 spec 예시가 `/search?q=창원`을 사용했으나 실제 app은 `/map?q=창원`으로 라우팅
- **Fix:** search.spec.ts의 모든 URL을 `/map?q=` 기반으로 수정

## Known Stubs

없음. storageState 파일은 런타임 생성 파일로 gitignore 처리됨. 환경변수(`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`)는 CI GitHub Secrets 주입 예정 (user_setup 참조).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | e2e/global-setup.ts | E2E_TEST_USER_ID를 process.env로 globalTeardown에 전달 — 단일 프로세스 내 전달이므로 노출 위험 없음 (T-04-04: accepted) |

## Self-Check

### Check created files exist:

- `e2e/global-setup.ts` — FOUND
- `e2e/global-teardown.ts` — FOUND
- `e2e/landing.spec.ts` — FOUND
- `e2e/complex-detail.spec.ts` — FOUND
- `e2e/map.spec.ts` — FOUND
- `e2e/search.spec.ts` — FOUND
- `e2e/review.spec.ts` — FOUND
- `e2e/.auth/.gitkeep` — FOUND

### Check commits exist:

- `5d2e5f4` — FOUND (Task 1)
- `7d13dc8` — FOUND (Task 2)

### Acceptance criteria verification:

- `grep -c "globalSetup" playwright.config.ts` = 1 — PASS
- `grep -c "globalTeardown" playwright.config.ts` = 1 — PASS
- `grep -c "chromium-auth" playwright.config.ts` = 1 — PASS
- `grep -c "NEXT_PUBLIC_SITE_URL" playwright.config.ts` = 2 (주석+값) — PASS
- `grep -c "admin.createUser" e2e/global-setup.ts` = 1 — PASS
- `grep -c "Cookie name used" e2e/global-setup.ts` = 1 — PASS
- `grep -c "admin.deleteUser" e2e/global-teardown.ts` = 1 — PASS
- `grep -c "e2e/.auth/user.json" .gitignore` = 1 — PASS
- `test -f e2e/.auth/.gitkeep` — PASS
- `grep -c "storageState" e2e/review.spec.ts` >= 1 — PASS (4)
- `grep -c "locator.*h1" e2e/landing.spec.ts` >= 1 — PASS (1)
- `grep -c "waitForTimeout" e2e/map.spec.ts` = 0 — PASS
- `grep -c "창원" e2e/search.spec.ts` >= 1 — PASS (5)
- `grep -c "textarea\|submit" e2e/review.spec.ts` >= 2 — PASS (19)
- `npx playwright test --list` → 36 tests in 5 files — PASS
- TypeScript check (e2e/*.ts) — PASS (no errors)

## Self-Check: PASSED

---
*Phase: 01-security-infra-deploy*
*Completed: 2026-05-06*
