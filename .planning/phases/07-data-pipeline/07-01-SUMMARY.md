---
phase: 07-data-pipeline
plan: "01"
subsystem: data-pipeline
tags: [kapt, enrichment, batch-script, tdd, schema-extension]
dependency_graph:
  requires: []
  provides: [kapt-enrich-script, kaptBasicInfoSchema-extended]
  affects: [complexes-table, scripts, github-actions]
tech_stack:
  added: []
  patterns: [batch-script, tdd-red-green, jsonb-spread-merge, idempotent-batch]
key_files:
  created:
    - src/__tests__/kapt-enrich.test.ts
    - scripts/kapt-enrich.ts
    - .github/workflows/kapt-enrich-once.yml
  modified:
    - src/services/kapt.ts
decisions:
  - "kaptBasicInfoSchema를 export하여 테스트 직접 접근 허용"
  - "data_completeness는 JavaScript spread merge 패턴으로 기존 키 보존 (07-02 병렬 실행 안전)"
  - "si/gu는 regions 테이블 조회, dong은 buildDongMap(fetchComplexList.as3)"
  - "heatType ?? codeHeatNm 폴백 패턴으로 V1/V3 API 필드명 차이 흡수"
metrics:
  duration: "~9분"
  completed: "2026-05-11"
  tasks_completed: 3
  files_changed: 4
---

# Phase 7 Plan 01: KAPT 단지 상세정보 적재 (DATA-08) Summary

KAPT API를 통해 complexes 테이블 669개 행의 si/gu/dong/road_address/household_count/built_year/heat_type를 일괄 적재하는 idempotent 배치 스크립트 구현 (TDD Red-Green 사이클 완료)

## What Was Built

### Task 1: TDD RED — kapt-enrich.test.ts

`src/__tests__/kapt-enrich.test.ts`에 KaptBasicInfoSchema 확장 검증 테스트 4개 (RED), extractBuiltYear 헬퍼 테스트 5개 (GREEN), idempotency 테스트 2개 (GREEN)를 작성했다.

- `kaptBasicInfoSchema.safeParse()` 호출로 kaptUsedate/doroJuso/codeHeatNm/kaptAddr 필드 파싱 검증
- `extractBuiltYear('20100615') → 2010` 등 built_year 추출 헬퍼 순수 단위 테스트
- `WHERE si IS NULL` 조건 필터 로직 시뮬레이션 (idempotency 검증)

### Task 2: GREEN — KaptBasicInfoSchema 확장

`src/services/kapt.ts`의 `KaptBasicInfoSchema`에 4개 필드 추가:
- `kaptUsedate: z.string().optional()` — 사용승인일 YYYYMMDD (준공연도 원천)
- `doroJuso: z.string().optional()` — 도로명주소
- `codeHeatNm: z.string().optional()` — 난방방식 명칭 (heatType 폴백용)
- `kaptAddr: z.string().optional()` — 법정동주소

`kaptBasicInfoSchema` export 추가로 테스트가 직접 스키마에 접근 가능하게 되어 Tests 1~4 GREEN.

### Task 3: scripts/kapt-enrich.ts + kapt-enrich-once.yml

**`scripts/kapt-enrich.ts`** (DATA-08 핵심):
- `WHERE kapt_code IS NOT NULL AND si IS NULL` — idempotent 조건 (재실행 안전)
- `buildDongMap()` — fetchComplexList를 sgg_code별 1회 호출 (총 6번), kaptCode → as3(dong) 매핑
- `regionMap` — regions 테이블에서 sgg_code → si/gu 파생 (100% 커버)
- `extractBuiltYear(kaptUsedate)` — YYYYMMDD 앞 4자리 추출
- `heatType ?? codeHeatNm ?? null` — V1/V3 API 필드명 차이 흡수
- `{ ...existing, kapt: true }` — data_completeness JSONB spread merge (07-02 병렬 실행 안전)
- 100ms rate limit delay (KAPT 일 100,000회 한도 방어)
- KAPT_API_KEY 존재 여부만 체크, 값 출력 금지 (T-07-01-01)

**`.github/workflows/kapt-enrich-once.yml`**:
- `workflow_dispatch: {}` — 수동 1회성 실행
- timeout-minutes: 60 (669개 × ~100ms ≈ 67초 + API 응답 여유)
- Node 22, npm ci, secrets.KAPT_API_KEY

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 65c507d | test | add failing kapt-enrich tests (TDD RED) |
| 06b5c77 | feat | extend KaptBasicInfoSchema with kaptUsedate, doroJuso, codeHeatNm, kaptAddr |
| 5e0509e | feat | add kapt-enrich.ts script and kapt-enrich-once.yml workflow |

## Deviations from Plan

### Auto-added: kaptBasicInfoSchema export

**Rule 2 (Auto-add missing critical functionality)**

- **Found during:** Task 1
- **Issue:** `KaptBasicInfoSchema`가 내부 const로만 선언되어 테스트에서 직접 접근 불가
- **Fix:** `kaptBasicInfoSchema` (camelCase)로 export 추가, 기존 내부 `KaptBasicInfoSchema`는 deprecated alias로 유지
- **Files modified:** `src/services/kapt.ts`
- **Impact:** 하위 호환성 유지 (fetchKaptBasicInfo 함수 내부 사용 무영향)

## Threat Model Compliance

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-07-01-01 | Mitigated | `KAPT_API_KEY` 존재 여부만 체크, `console.log(process.env.KAPT_API_KEY)` 없음 |
| T-07-01-02 | Mitigated | `.is('si', null)` guard로 이미 처리된 행 보호 |
| T-07-01-03 | Accepted | `${{ secrets.* }}` 패턴 사용 |
| T-07-01-04 | Mitigated | `{ ...existing, kapt: true }` JavaScript spread merge |

## Known Stubs

없음 — 스크립트는 실제 KAPT API를 호출하는 운영 코드이며, stub 없이 완전히 구현됨.

## Threat Flags

없음 — 새로운 trust boundary 없음. 기존 KAPT API 어댑터 패턴 확장.

## Self-Check: PASSED

- [x] `src/__tests__/kapt-enrich.test.ts` EXISTS
- [x] `src/services/kapt.ts` kaptUsedate/doroJuso 필드 존재
- [x] `scripts/kapt-enrich.ts` EXISTS (min_lines 80 충족: 160+줄)
- [x] `.github/workflows/kapt-enrich-once.yml` EXISTS
- [x] Commits: 65c507d, 06b5c77, 5e0509e — all on worktree-agent-aa0566978988fcecb
- [x] npm run test -- kapt-enrich PASS (11/11)
- [x] npm run lint PASS
- [x] STATE.md 수정 없음 (오케스트레이터가 처리)
- [x] ROADMAP.md 수정 없음 (오케스트레이터가 처리)
