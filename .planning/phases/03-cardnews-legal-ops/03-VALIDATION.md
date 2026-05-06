---
phase: 3
slug: cardnews-legal-ops
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (unit) + Playwright 1.49.0 (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) / ~2 minutes (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd-verify-work`:** `npm run lint && npm run build && npm run test && npm run test:e2e` all green
- **Max feedback latency:** 30 seconds (unit only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | SHARE-03 | — | N/A | unit stub | `npm run test` | ❌ W0 | ⬜ pending |
| 3-W0-02 | W0 | 0 | LEGAL-01,04 | — | N/A | unit stub | `npm run test` | ❌ W0 | ⬜ pending |
| 3-W0-03 | W0 | 0 | ADMIN-01~04 | — | N/A | unit stub | `npm run test` | ❌ W0 | ⬜ pending |
| 3-W0-04 | W0 | 0 | A11Y-01~03 | — | N/A | E2E stub | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 3-SHARE-03 | cardnews-api | 1 | SHARE-03 | T-cardnews-unauth | admin role 미보유 요청 → 401 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-SHARE-04 | cardnews-admin | 2 | SHARE-04 | T-cardnews-unauth | non-admin → redirect('/') | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-LEGAL-01 | consent | 1 | LEGAL-01 | T-consent-bypass | terms_agreed_at NULL → /consent redirect | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-LEGAL-04 | withdrawal | 1 | LEGAL-04 | T-deleted-relogin | deleted_at IS NOT NULL → /reactivate | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-ADMIN-01 | members | 2 | ADMIN-01 | T-priv-escalation | non-admin → redirect('/') | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-ADMIN-02 | ads | 2 | ADMIN-02 | T-priv-escalation | status 전환 — admin only | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-ADMIN-03 | reports | 2 | ADMIN-03 | T-self-report | reporter_id ≠ target_id | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-ADMIN-04 | status | 2 | ADMIN-04 | — | N/A | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 3-A11Y-01 | a11y | 3 | A11Y-01 | — | critical violations = 0 | E2E | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 3-A11Y-02 | a11y | 3 | A11Y-02 | — | keyboard Tab순서 정상 | E2E | `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 3-A11Y-03 | a11y | 3 | A11Y-03 | — | aria-label 존재 확인 | E2E | `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/cardnews.test.ts` — SHARE-03, SHARE-04 커버 (stub)
- [ ] `src/__tests__/consent-actions.test.ts` — LEGAL-01, LEGAL-04 커버 (stub)
- [ ] `src/__tests__/admin-actions.test.ts` — ADMIN-01, ADMIN-02, ADMIN-03 커버 (stub)
- [ ] `src/__tests__/admin-status.test.ts` — ADMIN-04 커버 (stub)
- [ ] `e2e/accessibility.spec.ts` — A11Y-01, A11Y-02, A11Y-03 커버 (stub)
- [ ] `npm install --save-dev @axe-core/playwright` — 패키지 설치

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 카드뉴스 PNG 시각 품질 | SHARE-03 | 이미지 렌더 결과는 사람이 확인 | `/api/cardnews/generate` 브라우저 접근 → PNG 다운로드 확인 |
| 법적 페이지 콘텐츠 적법성 | LEGAL-02~03 | 법무 검토 필요 | `/legal/terms`, `/legal/privacy`, `/legal/ad-policy` 접근 → "초안" 표기 확인 |
| 재활성화 UX 흐름 | LEGAL-04 | 30일 타이머 자동화 어려움 | `profiles.deleted_at`을 과거로 수동 설정 → 로그인 시도 → /reactivate 리다이렉트 확인 |
| axe-core 결과 수동 검토 | A11Y-01 | CI green ≠ 전체 접근성 완성 | 위반 목록 검토 → serious/moderate 항목 우선 처리 여부 판단 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
