---
phase: 07-data-pipeline
plan: "03"
subsystem: data-pipeline
tags:
  - ingestMonth
  - complex-id-linking
  - molit-complex-code
  - caching
  - tdd
dependency_graph:
  requires:
    - "match_complex_by_admin RPC (migration 20260430000012)"
    - "complexes.molit_complex_code column (migration 20260430000002)"
    - "src/lib/data/name-normalize.ts (nameNormalize)"
  provides:
    - "ingestMonth with complex_id auto-link at write time"
    - "complexes.molit_complex_code set from aptSeq on first confident match"
    - "DATA-10 test coverage (4 new tests)"
  affects:
    - "src/lib/data/realprice.ts"
    - "src/__tests__/molit-ingest.test.ts"
tech_stack:
  added: []
  patterns:
    - "캐시 Map per ingestMonth call — 중복 RPC 방지"
    - "TDD RED/GREEN cycle"
    - "p_min_similarity=0.9 자동 연결 신뢰 임계값"
key_files:
  created: []
  modified:
    - "src/lib/data/realprice.ts"
    - "src/__tests__/molit-ingest.test.ts"
decisions:
  - "complexIdCache는 ingestMonth 함수 스코프 내 정의 — 모듈 스코프 금지 (호출 간 캐시 오염 방지)"
  - "p_min_similarity=0.9 자동 연결 임계값 — 낮은 신뢰도 매칭은 null 처리 (T-07-03-02)"
  - ".is('molit_complex_code', null) guard — UNIQUE 제약 보호 + 덮어쓰기 방지 (T-07-03-01)"
  - "전월세(processRentItem)에는 molit_complex_code 업데이트 불필요 — MolitRentItem에 aptSeq 없음"
metrics:
  duration: "약 7분"
  completed_date: "2026-05-11"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 07 Plan 03: DATA-10 complex_id 자동 연결 Summary

**One-liner:** ingestMonth에 complexIdCache + lookupComplexIdCached 추가로 향후 거래 수집 시 complex_id 자동 연결 및 molit_complex_code 1회 저장 구현 (TDD RED/GREEN)

## What Was Built

`ingestMonth` 함수에 DATA-10 요구사항을 구현하여 향후 일배치 cron이 신규 거래를 수집할 때 `complex_id`가 자동으로 채워지고, `molit_complex_code`가 `complexes` 테이블에 설정된다.

### 핵심 구현 (`src/lib/data/realprice.ts`)

1. **`nameNormalize` import 추가** — `./name-normalize` 경로

2. **`complexIdCache: Map<string, string | null>`** — `ingestMonth` 함수 스코프 내 정의
   - key: `"${sggCode}:${nameNormalized}"`
   - 동일 단지명 반복 처리 시 RPC 중복 호출 차단

3. **`lookupComplexIdCached(sggCode, nameNormalized)`** — 캐시 우선 조회
   - Cache miss: `supabase.rpc('match_complex_by_admin', { p_min_similarity: 0.9 })`
   - trgm_sim >= 0.9 → complexId 반환; < 0.9 → null (T-07-03-02)
   - 오류 발생 시 null 반환 후 진행 (ingest 실패 방지)

4. **`processSaleItem` 수정**
   - `nameNormalize(item.aptNm)` → `lookupComplexIdCached()`
   - aptSeq + complexId 있으면 `complexes.update({ molit_complex_code }).eq('id').is('molit_complex_code', null)` (T-07-03-01)
   - `upsertTransaction`에 `complex_id: complexId ?? null` 전달

5. **`processRentItem` 수정**
   - `complex_id: complexId ?? null` 전달 (molit_complex_code UPDATE 없음 — aptSeq 부재)

### 테스트 (`src/__tests__/molit-ingest.test.ts`)

`describe('DATA-10: complex_id 자동 연결')` 블록 4개 테스트 추가:

| 테스트 | 검증 내용 |
|--------|---------|
| Test 1 | confidence>=0.9 시 match_complex_by_admin RPC 호출 검증 |
| Test 2 | confidence<0.9 (trgm_sim=0.75) 시 null 처리 검증 |
| Test 3 | aptSeq + 매칭 성공 시 complexes.update(molit_complex_code) 호출 검증 |
| Test 4 | 동일 단지명 2건 처리 시 RPC 1회만 호출 (캐시 검증) |

## Task Commits

| Task | Name | Commit | Phase |
|------|------|--------|-------|
| 1 | DATA-10 테스트 추가 (RED) | dd61565 | RED |
| 2 | ingestMonth complex_id 구현 (GREEN) | 5c5fa24 | GREEN |

## Test Results

```
Tests: 15 passed | 5 skipped (20 total)
- 기존 테스트: 11개 통과 유지
- DATA-10 신규: 4개 추가 (GREEN)
- integration 테스트: 5개 skip (SKEY 없음 — 정상)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint no-unused-vars 오류 수정**
- **Found during:** Task 2 lint 실행
- **Issue:** Test 1에서 `upsertArg` 변수가 할당만 되고 사용되지 않음
- **Fix:** `upsertArg` 할당 라인 제거 (해당 assertion은 이미 `rpc` 호출 검증으로 충분)
- **Files modified:** `src/__tests__/molit-ingest.test.ts`
- **Commit:** 5c5fa24 (Task 2 커밋에 포함)

### 빌드 오류 (기존 문제 — 범위 외)

`npm run build` 실행 시 `PretendardVariable.woff2` 파일 누락으로 빌드 실패가 발생하나, 이는 내 변경사항 이전부터 존재하던 문제 (git stash로 확인). TypeScript strict 컴파일(`tsc --noEmit`)은 오류 없음. ESLint도 통과.

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-07-03-01 | `.is('molit_complex_code', null)` guard | 구현됨 |
| T-07-03-02 | p_min_similarity=0.9 임계값 | 구현됨 |
| T-07-03-03 | complexIdCache Map per ingestMonth 호출 | 구현됨 |

## Known Stubs

없음. 모든 구현 완료.

## Self-Check: PASSED

- [x] `src/lib/data/realprice.ts` 수정됨 — complexIdCache, lookupComplexIdCached, molit_complex_code UPDATE 포함
- [x] `src/__tests__/molit-ingest.test.ts` 수정됨 — DATA-10 4개 테스트 포함
- [x] Commit dd61565 존재 (RED)
- [x] Commit 5c5fa24 존재 (GREEN)
- [x] `npm run test -- molit-ingest` 15 passed
- [x] `npm run lint` 통과 (ESLint + tsc --noEmit)
