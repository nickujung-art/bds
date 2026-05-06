---
phase: 01-security-infra-deploy
plan: "02"
subsystem: error-tracking
tags: [sentry, nextjs-instrumentation, sec-04, error-monitoring]
dependency_graph:
  requires: []
  provides: [sentry-error-tracking, instrumentation-hook]
  affects: [next.config.ts, build-pipeline]
tech_stack:
  added: ["@sentry/nextjs@^10.51.0"]
  patterns: [nextjs-instrumentation-hook, conditional-sentry-init, hoc-composition]
key_files:
  created:
    - instrumentation.ts
    - instrumentation-client.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
  modified:
    - next.config.ts
    - package.json
decisions:
  - "D-01: @sentry/nextjs 실제 설치 (플레이스홀더 제거 아님)"
  - "D-02: tracesSampleRate:0 — 성능 트레이싱 비활성화, 에러만 추적"
  - "D-03: NODE_ENV===production 조건부 활성화"
  - "NEXT_PUBLIC_SENTRY_DSN 단일 변수 통일 (서버+클라이언트 모두)"
  - "withSentryConfig(withSerwist(nextConfig)) 래퍼 순서 (Pitfall 3 방지)"
metrics:
  duration_minutes: 9
  completed_date: "2026-05-06"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
requirements:
  - SEC-04
---

# Phase 1 Plan 02: Sentry 에러 트래킹 초기화 Summary

**One-liner:** @sentry/nextjs 10.51.0 설치 + Next.js 15 instrumentation hook 패턴으로 서버/엣지/클라이언트 3-런타임 Sentry 초기화, NODE_ENV=production 조건부 활성화 + tracesSampleRate:0 (에러 전용)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | @sentry/nextjs 설치 + 4개 설정 파일 생성 | 93d27de | instrumentation.ts, instrumentation-client.ts, sentry.server.config.ts, sentry.edge.config.ts, package.json |
| 2 | next.config.ts withSentryConfig 래퍼 추가 | d3cdae6 | next.config.ts |

## What Was Built

### SEC-04: Sentry 에러 트래킹 초기화

4개 설정 파일을 프로젝트 루트에 생성하고 next.config.ts를 수정하여 `@sentry/nextjs`를 완전히 통합했다.

**파일 구조:**
- `instrumentation.ts` — Next.js 15 instrumentation hook. `NEXT_RUNTIME` 조건으로 nodejs/edge 런타임을 각각의 config 파일로 분기. `onRequestError = Sentry.captureRequestError` 익스포트로 요청 에러 자동 캡처.
- `sentry.server.config.ts` — 서버 런타임 Sentry 설정. `NODE_ENV===production` 조건부 활성화, `tracesSampleRate:0`, `debug:false`.
- `sentry.edge.config.ts` — Edge 런타임 Sentry 설정. 서버와 동일한 설정.
- `instrumentation-client.ts` — 브라우저 Sentry 초기화. `NEXT_PUBLIC_SENTRY_DSN` 사용 (클라이언트 번들에 인라인됨).
- `next.config.ts` — `withSentryConfig(withSerwist(nextConfig), ...)` 순서로 HOC 구성. withSerwist를 안쪽에 유지하여 Serwist PWA 동작 보존.

**핵심 결정 구현:**
- D-01: 실제 `@sentry/nextjs` 10.51.0 설치 (wizard 없이 수동 설정)
- D-02: `tracesSampleRate: 0` — 무료 티어 5K 에러/월 보존
- D-03: `enabled: process.env.NODE_ENV === 'production'` — 개발 환경 노이즈 없음
- `NEXT_PUBLIC_SENTRY_DSN` 단일 변수 (서버/클라이언트 모두)

**빌드 검증:**
- Webpack 컴파일 성공 (`✓ Compiled successfully in 28.7s`)
- `public/sw.js` 생성 확인 (Serwist PWA 동작 유지, Pitfall 3 검증)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing public/fonts/PretendardVariable.woff2**
- **Found during:** Task 2 (npm run build)
- **Issue:** `postinstall` 스크립트가 워크트리 환경에서 실행되지 않아 `public/fonts/` 디렉토리가 없었음. `next build`가 `src/app/layout.tsx`의 폰트 import를 찾지 못해 실패.
- **Fix:** `node scripts/copy-fonts.mjs` 수동 실행하여 `pretendard` 패키지에서 `PretendardVariable.woff2`를 `public/fonts/`로 복사.
- **Files modified:** `public/fonts/PretendardVariable.woff2` (생성됨, git-ignored)
- **Outcome:** 빌드가 webpack 컴파일 단계를 통과함.

### Known Pre-existing Issues (Out of Scope)

이하 이슈는 이 Plan의 변경과 무관한 기존 문제로, `deferred-items.md`에 기록:

1. **ESLint 워크트리 충돌**: 워크트리 내 `package-lock.json`이 부모 레포의 ESLint 설정과 충돌. `Plugin "@next/next" was conflicted` 경고. 워크트리 구조 문제로 수정 범위 외.
2. **TypeScript 타입 에러 (테스트 파일)**: `src/__tests__/` 내 4개 테스트 파일에서 `status` 컬럼 타입 불일치 에러. 이 Plan과 무관한 기존 부채.
3. **Supabase URL 없는 빌드**: CI 환경변수 없이 `npm run build` 실행 시 `/sitemap.xml` prerender 실패. INFRA-01 (환경변수 정리) Plan에서 처리 예정.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | instrumentation-client.ts | NEXT_PUBLIC_SENTRY_DSN이 클라이언트 번들에 노출됨. 설계 상 의도된 공개값 (T-02-02: accepted) |

## Known Stubs

없음. 모든 환경변수는 `process.env.NEXT_PUBLIC_SENTRY_DSN`으로 참조되며, 실제 Sentry DSN은 Sentry.io에서 신규 프로젝트 생성 후 Vercel 환경변수로 주입 예정 (D-04, user_setup 참조).

## User Setup Required

Sentry 에러 트래킹이 실제로 동작하려면 사용자가 다음을 완료해야 한다:

1. **sentry.io → 신규 Next.js 프로젝트 생성**
   - Projects → Create Project → Next.js
   - Settings → Client Keys (DSN)에서 DSN 복사

2. **환경변수 설정** (로컬: `.env.local`, Vercel: 대시보드):
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   SENTRY_ORG=<조직-슬러그>
   SENTRY_PROJECT=<프로젝트-슬러그>
   ```

3. **선택: 소스맵 업로드** (스택 트레이스 가독성 향상):
   ```
   SENTRY_AUTH_TOKEN=<token>
   ```

## Self-Check

### Check created files exist:
- [x] instrumentation.ts — EXISTS
- [x] instrumentation-client.ts — EXISTS
- [x] sentry.server.config.ts — EXISTS
- [x] sentry.edge.config.ts — EXISTS
- [x] next.config.ts — MODIFIED

### Check commits exist:
- [x] 93d27de — feat(01-02): install @sentry/nextjs + create 4 Sentry config files
- [x] d3cdae6 — feat(01-02): add withSentryConfig wrapper to next.config.ts

### Acceptance criteria verification:
- [x] `grep -c "NEXT_RUNTIME" instrumentation.ts` = 2
- [x] `grep -c "tracesSampleRate: 0" sentry.server.config.ts` = 1
- [x] `grep -c "tracesSampleRate: 0" sentry.edge.config.ts` = 1
- [x] `grep -c "tracesSampleRate: 0" instrumentation-client.ts` = 1
- [x] `grep -c "NODE_ENV === 'production'" sentry.server.config.ts` = 1
- [x] `grep -c "sentry/nextjs" package.json` = 1
- [x] `grep -c "withSentryConfig" next.config.ts` = 2
- [x] `grep -A3 "withSentryConfig(" next.config.ts | grep -c "withSerwist"` = 1
- [x] `grep -c "Content-Security-Policy" next.config.ts` = 1
- [x] `test -f public/sw.js` — PASS (Serwist 동작 유지)
- [x] Webpack 컴파일 성공 (`✓ Compiled successfully in 28.7s`)

## Self-Check: PASSED
