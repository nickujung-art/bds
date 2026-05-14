# Phase 9: 단지 상세 UX 고도화 — Validation

**Phase:** 09-complex-detail-ux
**Generated:** 2026-05-14
**Source:** 09-RESEARCH.md Validation Architecture

---

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + happy-dom |
| Config file | `vitest.config.ts` (루트) |
| Quick run command | `npm run test -- --reporter=verbose src/__tests__/phase9-ux.test.ts` |
| Full suite command | `npm run test` |

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Created In |
|--------|----------|-----------|-------------------|------------|
| UX-01 | IQR 이상치 계산 정확성 — Q1/Q3/IQR × 1.5 경계 | unit | `npm run test -- src/lib/utils/iqr.test.ts` | Wave 0 |
| UX-01 | 기간 필터 client-side slice — 1y/3y/5y/all 각 cutoff | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-02 | 평형 그룹 추출 — Math.round(area_m2) 그룹화, 최다 거래 기본값 | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-03 | 주차 세대당 계산 — parking_count / household_count, null 처리 | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-04 | 계절별 평균 계산 — 하절기(6~9월) / 동절기(10~3월) 분리 | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |
| UX-04 | limit=6 데이터 하절기/동절기 혼재 + 4개월 미만 fallback | unit | `npm run test -- src/__tests__/phase9-ux.test.ts` | Wave 0 |

---

## Sampling Rate

| Gate | Command |
|------|---------|
| Per task commit | `npm run test -- src/__tests__/phase9-ux.test.ts src/lib/utils/iqr.test.ts -x` |
| Per wave merge | `npm run test` |
| Phase gate | `npm run lint && npm run build && npm run test` |

---

## Wave 0 Test Files (RED scaffold)

| File | Status | Tests |
|------|--------|-------|
| `src/lib/utils/iqr.test.ts` | To create in Wave 0 | IQR 계산 유틸리티 단위 테스트 (UX-01) |
| `src/__tests__/phase9-ux.test.ts` | To create in Wave 0 | 기간 필터 slice, 평형 그룹, 주차 계산, 계절 평균 (UX-01~04) |

---

## Wave 2 Verification (Build Gate)

Plans 09-02 and 09-03 have no automated unit tests (tdd=false). Minimum gate for Wave 2:

```bash
npm run lint && npm run build
```

`npm run build` catches TypeScript errors in the rewritten DealTypeTabs, TransactionChart, and FacilitiesCard components.
