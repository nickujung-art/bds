---
phase: 7
slug: data-pipeline
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-T1 | 01 | 1 | DATA-08 | T-07-01-01 | Zod schema rejects invalid KAPT response | unit | `npm run test -- kapt-enrich` | ❌ W0 (TDD task creates it) | ⬜ pending |
| 07-01-T2 | 01 | 1 | DATA-08 | — | N/A | grep verify | `grep -n "kaptUsedate" src/services/kapt.ts` | ✅ (modified) | ⬜ pending |
| 07-01-T3 | 01 | 1 | DATA-08 | T-07-01-02/03 | Service-role key only; WHERE si IS NULL guard | integration | `npm run lint` | ❌ W0 (task creates it) | ⬜ pending |
| 07-02-T1 | 02 | 1 | DATA-09 | T-07-02-01 | Alias JSON applied before confidence calc | unit | `npm run test -- link-transactions` | ❌ W0 (TDD task creates it) | ⬜ pending |
| 07-02-T2 | 02 | 1 | DATA-09 | — | N/A | node verify | `node -e "const a=require('./src/lib/data/name-aliases.json'); console.log(Object.keys(a).length)"` | ✅ (modified) | ⬜ pending |
| 07-02-T3 | 02 | 1 | DATA-09 | T-07-02-05 | Dedup guard prevents queue re-insertion | integration | `npm run lint` | ❌ W0 (task creates it) | ⬜ pending |
| 07-03-T1 | 03 | 1 | DATA-10 | — | N/A | unit (RED) | `npm run test -- molit-ingest` | ✅ (extended) | ⬜ pending |
| 07-03-T2 | 03 | 1 | DATA-10 | T-07-03-01/02 | Per-call cache; complex_id populated; molit_complex_code guard | unit/integration | `npm run test -- molit-ingest` | ✅ (extended) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/kapt-enrich.test.ts` — unit tests for kaptUsedate/doroJuso schema + idempotency (created by 07-01-T1)
- [ ] `src/__tests__/link-transactions.test.ts` — integration tests for name normalization, confidence thresholds, queue logic, dedup guard (created by 07-02-T1)
- [x] `src/__tests__/molit-ingest.test.ts` — pre-existing; DATA-10 assertions added by 07-03-T1

*All Wave 0 gaps are covered by TDD tasks within Wave 1 plans. No external Wave 0 plan required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KAPT V3 field names match schema | DATA-08 | Cannot verify without live API call | Run `kapt-enrich.ts --debug` on first execution, compare raw response to schema; adjust field names if V3 differs from V1 |
| ≥80% transactions linked | DATA-09 | Count requires live DB inspection | After link-transactions.ts: `SELECT COUNT(*) FROM transactions WHERE complex_id IS NOT NULL` — expect ≥149,412 (80% of 186,765) |
| 단지 상세 페이지 표시 확인 | DATA-08 | UI verification | Open any complex detail page, verify household_count and built_year render |
| AI 채팅 실거래 포함 답변 | DATA-09/10 | End-to-end flow | After DATA-09 runs, re-embed complexes and test AI chat response includes transaction data |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (07-01-T1, 07-02-T1, 07-03-T1)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-11
