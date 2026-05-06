---
phase: 1
slug: security-infra-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (unit/integration) + Playwright 1.49.0 (E2E) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~30s (unit) / ~3-5min (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit), 5 minutes (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-SEC01-rate | 01 | 1 | SEC-01 | Ad click fraud | 100회 초과 POST → 429 반환 | integration | `npm run test -- src/app/api/ads/events/route.test.ts` | ❌ W0 | ⬜ pending |
| 1-SEC01-hash | 01 | 1 | SEC-01 | IP tracking w/o PII | ip_hash가 ad_events에 기록 | integration | `npm run test -- src/app/api/ads/events/route.test.ts` | ❌ W0 | ⬜ pending |
| 1-SEC02-admin | 01 | 1 | SEC-02 | Service role key leak | createSupabaseAdminClient() 팩토리가 env vars 존재 시 client를 반환하고 없으면 throw | unit | `npm run test -- src/lib/supabase/admin.test.ts` | ❌ W0 | ⬜ pending |
| 1-SEC03-filter | 01 | 1 | SEC-03 | 철거 단지 노출 | complexes-map 쿼리에 status='active' 포함 | unit | `npm run test -- src/lib/data/complexes-map.test.ts` | ❌ W0 | ⬜ pending |
| 1-SEC04-sentry | 02 | 1 | SEC-04 | 에러 추적 부재 | NODE_ENV=production에서만 Sentry.init 호출 | unit | `npm run test -- instrumentation.test.ts` | ❌ W0 | ⬜ pending |
| 1-E2E-landing | 03 | 2 | INFRA-03 | — | 랜딩 페이지 h1 및 콘텐츠 렌더 | E2E | `npm run test:e2e -- --grep "landing"` | ❌ W0 | ⬜ pending |
| 1-E2E-detail | 03 | 2 | INFRA-03 | — | 단지 상세 페이지 로드 및 가격 표시 | E2E | `npm run test:e2e -- --grep "complex detail"` | ❌ W0 | ⬜ pending |
| 1-E2E-map | 03 | 2 | INFRA-03 | — | 지도 로드 및 active 마커 노출 | E2E | `npm run test:e2e -- --grep "map"` | ❌ W0 | ⬜ pending |
| 1-E2E-search | 03 | 2 | INFRA-03 | — | 검색 결과 목록 표시 | E2E | `npm run test:e2e -- --grep "search"` | ❌ W0 | ⬜ pending |
| 1-E2E-review | 03 | 2 | INFRA-03 | — | 후기 작성 폼 제출 성공 (auth 필요) | E2E | `npm run test:e2e -- --grep "review"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/` 디렉토리 생성
- [ ] `e2e/.auth/.gitkeep` — `.gitignore`에 `e2e/.auth/user.json` 추가
- [ ] `e2e/global-setup.ts` — Supabase admin createUser + storageState 저장
- [ ] `e2e/global-teardown.ts` — 테스트 유저 cleanup (deleteUser)
- [ ] `e2e/landing.spec.ts` — 골든패스 1: 랜딩 페이지
- [ ] `e2e/complex-detail.spec.ts` — 골든패스 2: 단지 상세
- [ ] `e2e/map.spec.ts` — 골든패스 3: 지도
- [ ] `e2e/search.spec.ts` — 골든패스 4: 검색
- [ ] `e2e/review.spec.ts` — 골든패스 5: 후기 작성 (storageState 사용)
- [ ] `src/app/api/ads/events/route.test.ts` — SEC-01 rate limit + ip_hash 통합 테스트
- [ ] `src/lib/data/complexes-map.test.ts` — SEC-03 status 필터 단위 테스트
- [ ] `src/lib/supabase/admin.test.ts` — SEC-02 팩토리 반환 타입 + env vars 검증 테스트
- [ ] `playwright.config.ts` 수정 — globalSetup/globalTeardown + chromium-auth project 추가

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel 프로덕션 URL 접근 가능 | INFRA-01 | Vercel 대시보드 배포 확인 | 배포된 URL에서 단지 상세 페이지 렌더 확인 |
| GitHub branch protection 활성화 | INFRA-02 | GitHub API로 코드 설정 불가 | Settings → Branches → main 룰 확인 |
| Upstash Redis Vercel 연결 | SEC-01 | 외부 서비스 연결 | Vercel Storage 탭에서 KV 연결 상태 확인 |
| Sentry 이벤트 수신 | SEC-04 | 프로덕션 서비스 연결 | sentry.io 대시보드에서 이벤트 수신 확인 |
| `/api/ads/events` 429 응답 (실제 환경) | SEC-01 | 프로덕션 rate limit 확인 | `curl -X POST ... -I` 100회 이상 시 429 헤더 확인 |
| E2E 쿠키 이름 확인 | INFRA-03 | 브라우저 DevTools 직접 확인 필요 | `npm run dev` 후 로그인 → DevTools → Application → Cookies → `sb-*` 쿠키 이름 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
