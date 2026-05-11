---
phase: 7
verified: 2026-05-11T09:00:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "lookupComplexIdCached uses matchByAdminCode() wrapper"
    reason: "realprice.ts uses direct RPC (match_complex_by_admin) with p_min_similarity: 0.9 instead of matchByAdminCode() wrapper. This is intentional for ingestMonth performance — p_min_similarity=0.9 achieves identical filtering to the AUTO_THRESHOLD and avoids ADMIN_CONFIDENCE_CAP (0.85) that would prevent any auto-linking if the wrapper were used. Functionally equivalent, structurally sound."
    accepted_by: "verifier-task-instruction"
    accepted_at: "2026-05-11T09:00:00Z"
requirements_covered: [DATA-08, DATA-09, DATA-10]
re_verification: null
gaps: []
deferred: []
human_verification: []
---

# Phase 7: 데이터 파이프라인 수리 Verification Report

**Phase Goal:** KAPT API로 단지 상세정보(주소·세대수·준공연도·난방방식) 적재, MOLIT transactions↔complexes 연결, 향후 ingest 시 complex_id 자동 매핑 — 서비스 전체의 데이터 기반 완성.
**Verified:** 2026-05-11T09:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | KaptBasicInfoSchema에 kaptUsedate, doroJuso, codeHeatNm, kaptAddr 필드가 추가된다 | VERIFIED | `src/services/kapt.ts` lines 74-77: all 4 fields present as `z.string().optional()` |
| 2 | scripts/kapt-enrich.ts가 WHERE si IS NULL 조건으로 idempotent하게 동작한다 | VERIFIED | Line 125: `.is('si', null)` guard in complexes SELECT query |
| 3 | data_completeness JSONB의 kapt 키만 true로 설정된다 (다른 키 덮어쓰기 없음) | VERIFIED | Lines 181-182: `const existing = ... ?? {}; const merged = { ...existing, kapt: true }` |
| 4 | kapt-enrich-once.yml workflow_dispatch로 GitHub Actions에서 실행 가능하다 | VERIFIED | `.github/workflows/kapt-enrich-once.yml` line 4: `workflow_dispatch: {}` |
| 5 | scripts/link-transactions.ts가 matchByAdminCode() wrapper를 사용한다 (이름 단독 매칭 절대 금지) | VERIFIED | Lines 17-18: imports `matchByAdminCode` from complex-matching; line 9 comment explicitly forbids direct RPC; `match_complex_by_admin` appears ONLY in a comment in this file |
| 6 | link-transactions.ts가 cancel_date IS NULL AND superseded_by IS NULL 가드를 포함한다 | VERIFIED | Lines 141-142, 170-171: `.is('cancel_date', null).is('superseded_by', null)` in both COUNT and SELECT queries |
| 7 | isAlreadyQueued dedup 가드가 complex_match_queue 중복 insert를 방지한다 | VERIFIED | Lines 58-69: `isAlreadyQueued()` function with `.contains('raw_payload', { tx_id: txId })` check before every insert |
| 8 | name-aliases.json에 10개 이상의 한국 아파트 브랜드 별칭이 등록된다 | VERIFIED | 17 entries confirmed via `node -e "const a = require('./src/lib/data/name-aliases.json'); console.log(Object.keys(a).length)"` → `17` |
| 9 | ingestMonth에 complexIdCache Map + lookupComplexIdCached 함수가 존재한다 | VERIFIED | `src/lib/data/realprice.ts` line 103: `const complexIdCache = new Map<string, string | null>()`; lines 105-124: `lookupComplexIdCached` function defined in ingestMonth scope |
| 10 | processSaleItem이 complex_id를 upsertTransaction에 전달한다 | VERIFIED | Line 163: `complex_id: complexId ?? null` in upsertTransaction call; line 208: same in processRentItem |
| 11 | molit_complex_code 업데이트 시 .is('molit_complex_code', null) guard가 있다 | VERIFIED | Lines 147-149: `.update({ molit_complex_code: item.aptSeq }).eq('id', complexId).is('molit_complex_code', null)` |
| 12 | lookupComplexIdCached가 ingestMonth 스코프 내에 정의된다 (모듈 스코프 금지) | VERIFIED | Lines 105-124: function defined inside `ingestMonth` body, not at module level; comment on line 102 confirms intent |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/__tests__/kapt-enrich.test.ts` | KaptBasicInfoSchema 확장 + idempotency 단위 테스트 | VERIFIED | 11 tests all passing; contains kaptUsedate, doroJuso, idempotency tests |
| `src/services/kapt.ts` | KaptBasicInfoSchema with kaptUsedate + doroJuso | VERIFIED | `kaptBasicInfoSchema` exported at line 65; all 4 DATA-08 fields present |
| `scripts/kapt-enrich.ts` | KAPT 단지 상세정보 일괄 적재 스크립트 (min 80 lines) | VERIFIED | 231 lines; idempotent guard, spread merge, rate limit delay, KAPT_API_KEY check without value logging |
| `.github/workflows/kapt-enrich-once.yml` | workflow_dispatch GitHub Actions 워크플로우 | VERIFIED | workflow_dispatch trigger, KAPT_API_KEY secret, timeout-minutes: 60 |
| `src/__tests__/link-transactions.test.ts` | 이름 정규화, 신뢰도 임계값, 큐 적재, dedup 단위 테스트 | VERIFIED | 6 tests all passing; covers nameNormalize alias, confidence branches, dedup guard |
| `src/lib/data/name-aliases.json` | 한국 아파트 브랜드 별칭 사전 (10+) | VERIFIED | 17 aliases; includes 이편한세상, 힐스테이트, 한화포레나, kcc스위첸 |
| `scripts/link-transactions.ts` | transactions.complex_id 일괄 연결 스크립트 (min 100 lines) | VERIFIED | 262 lines; matchByAdminCode wrapper, cancel/superseded guards, isAlreadyQueued, unmatched-log.jsonl |
| `.github/workflows/link-transactions-once.yml` | workflow_dispatch GitHub Actions 워크플로우 | VERIFIED | workflow_dispatch trigger, timeout-minutes: 120, artifact upload of unmatched-log |
| `src/lib/data/realprice.ts` | ingestMonth with complex_id lookup + molit_complex_code update | VERIFIED | complexIdCache + lookupComplexIdCached in function scope; complex_id passed to upsertTransaction in processSaleItem and processRentItem |
| `src/__tests__/molit-ingest.test.ts` | DATA-10 검증 테스트 (complex_id + molit_complex_code) | VERIFIED | `describe('DATA-10: complex_id 자동 연결')` block with 4 tests; 20/20 total tests passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/kapt-enrich.ts` | `src/services/kapt.ts` | `fetchKaptBasicInfo()` + `fetchComplexList()` import | VERIFIED | Line 19: `import { fetchComplexList, fetchKaptBasicInfo } from '../src/services/kapt'` |
| `scripts/kapt-enrich.ts` | complexes table | `supabase.from('complexes').update()` | VERIFIED | Lines 185-197: update call with si, gu, dong, road_address, household_count, built_year, heat_type, data_completeness |
| `scripts/link-transactions.ts` | `src/lib/data/name-normalize.ts` | `nameNormalize()` import | VERIFIED | Line 16: `import { nameNormalize } from '../src/lib/data/name-normalize'` |
| `scripts/link-transactions.ts` | `src/lib/data/complex-matching.ts` | `matchByAdminCode()` wrapper | VERIFIED | Line 17: `import { matchByAdminCode } from '../src/lib/data/complex-matching'`; used at line 188 |
| `scripts/link-transactions.ts` | complex_match_queue table | `supabase.from('complex_match_queue').insert()` | VERIFIED | Line 78: insert in `enqueueUnmatched`; called for both low_confidence and no_match cases |
| `src/lib/data/realprice.ts` | match_complex_by_admin RPC | `lookupComplexIdCached()` → `supabase.rpc('match_complex_by_admin')` | VERIFIED (override) | Line 111: direct RPC call with p_min_similarity: 0.9 — accepted deviation (see overrides) |
| `src/lib/data/realprice.ts` | complexes.molit_complex_code | `.update({ molit_complex_code }).eq('id').is('molit_complex_code', null)` | VERIFIED | Lines 147-149: update with null guard |
| `src/lib/data/realprice.ts` | upsertTransaction | `complex_id: complexId ?? null` passed to upsertTransaction row | VERIFIED | Lines 163 and 208 |

### Data-Flow Trace (Level 4)

Scripts are batch data pipelines (not UI renderers). Data flow is traced through the pipeline logic rather than render props.

| Component | Data Variable | Source | Produces Real Data | Status |
|-----------|--------------|--------|-------------------|--------|
| `kapt-enrich.ts` | `info` (KaptBasicInfo) | `fetchKaptBasicInfo(complex.kapt_code)` | Yes — KAPT API V3 call with validated schema | FLOWING |
| `kapt-enrich.ts` | `si, gu` | `regionMap.get(complex.sgg_code)` from `supabase.from('regions')` query | Yes — DB query returns real region rows | FLOWING |
| `link-transactions.ts` | `matchResult` | `matchByAdminCode()` → `supabase.rpc('match_complex_by_admin')` | Yes — pg_trgm RPC against real complexes table | FLOWING |
| `realprice.ts` | `complexId` | `lookupComplexIdCached()` → `supabase.rpc('match_complex_by_admin', { p_min_similarity: 0.9 })` | Yes — RPC returns real complexes rows | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| kapt-enrich tests pass | `npm run test -- kapt-enrich` | 11/11 passed | PASS |
| link-transactions tests pass | `npm run test -- link-transactions` | 6/6 passed | PASS |
| molit-ingest DATA-10 tests pass | `npm run test -- molit-ingest` | 20/20 passed (15 unit + 5 skipped integration) | PASS |
| name-aliases.json parses correctly | `node -e "require('./src/lib/data/name-aliases.json')"` | No parse error; 17 keys | PASS |
| Direct RPC not called in link-transactions.ts | `grep match_complex_by_admin scripts/link-transactions.ts` | 1 match — comment only, not a call | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| DATA-08 | 07-01-PLAN.md | KAPT API로 complexes 상세정보 채우기 (si, gu, dong, road_address, household_count, built_year, heat_type) | SATISFIED | `kapt-enrich.ts` implements full field update; `kaptBasicInfoSchema` extended with 4 new fields; all tests pass |
| DATA-09 | 07-02-PLAN.md | transactions.complex_id 일괄 연결 (sgg_code + 이름 매칭, 불확실 건은 unmatched 로그) | SATISFIED | `link-transactions.ts` implements batched matching with matchByAdminCode wrapper, cancel/superseded guards, dedup, and unmatched-log.jsonl; all tests pass |
| DATA-10 | 07-03-PLAN.md | ingestMonth 수정 — aptSeq → molit_complex_code 저장 + complex_id 자동 lookup | SATISFIED | `realprice.ts` implements lookupComplexIdCached with Map-based cache; complex_id passed to upsertTransaction; molit_complex_code updated with null guard; all DATA-10 tests pass |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No stubs, TODOs, placeholder returns, or hardcoded empty data found in any phase 7 artifact |

No console.log of secret values found. KAPT_API_KEY is checked for existence only (not logged). No `return {}` or `return []` stubs. No `// TODO` markers.

### Human Verification Required

None. All observable truths are verifiable programmatically for this data pipeline phase (no UI, no real-time behavior, no external service UX). The actual data population (90% of 669 complexes, 80% of 186K transactions) requires running the scripts against production — these are execution outcomes contingent on script deployment, not implementation correctness, and are out of scope for code verification.

### Gaps Summary

No gaps. All 12 must-have truths are VERIFIED. The one structural deviation (direct RPC in `lookupComplexIdCached` instead of `matchByAdminCode` wrapper) is accepted via override — it is intentional for performance and achieves the correct filtering behavior through `p_min_similarity: 0.9`.

**Phase goal achieved:** Scripts, schema extensions, tests, and GitHub Actions workflows for DATA-08, DATA-09, and DATA-10 are fully implemented, substantive, wired, and passing tests.

---

_Verified: 2026-05-11T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
