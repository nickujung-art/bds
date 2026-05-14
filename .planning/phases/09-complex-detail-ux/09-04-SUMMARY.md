---
phase: 09-complex-detail-ux
plan: "04"
subsystem: ui
tags: [management-cost, seasonal-average, kapt, react, tailwind]

requires:
  - phase: 09-01
    provides: getSeasonalAverages 함수 (management-cost.ts)

provides:
  - ManagementCostCard 계절별 UI (하절기/동절기 나란히 + 데이터 부족 fallback)

affects: []

tech-stack:
  added: []
  patterns: ["seasonal comparison UI", "data sufficiency gate (N >= 4)", "fallback view pattern"]

key-files:
  created: []
  modified:
    - src/components/complex/ManagementCostCard.tsx

key-decisions:
  - "summerCount + winterCount >= 4 조건으로 계절 비교 표시 gate — D-08 '4개월 이상' 명세 준수"
  - "count === 0 분기로 데이터 부족 표시 — avg가 null이어도 count 기준으로 판정 (Pitfall 4)"
  - "SeasonalView / FallbackTotalsView / SeasonBlock 서브컴포넌트 분리 — 단일 책임 원칙"
  - "월별 합계 추이 섹션 유지 — 계절 비교 위 아래 모두 표시하여 신뢰성 보강"

patterns-established:
  - "Data gate pattern: hasSeasonalData = totalCount >= N → 조건부 뷰 분기"
  - "SeasonBlock: count === 0 → '데이터 부족' 텍스트 표시, count > 0 → 평균값 표시"

requirements-completed: [UX-04]

duration: 12min
completed: "2026-05-14"
---

# Phase 9 Plan 04: 관리비 카드 계절별 표시 재작성 Summary

**ManagementCostCard를 COST_LABELS 13개 항목 상세 제거하고 하절기(6~9월)/동절기(10~3월) 월평균 + 세대당 평균 비교 표시로 전면 재작성 — 데이터 부족 시 fallback view 포함**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-14T02:48:00Z
- **Completed:** 2026-05-14T03:00:00Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- ManagementCostCard.tsx에서 COST_LABELS (13개 상세 항목: 공용관리비, 인건비, 청소비, 경비비, 승강기유지비, 수선비, 위탁관리수수료, 개별사용료, 전기료, 수도료, 난방비, 가스료, 장기수선충당금) 완전 제거
- 하절기(6~9월) / 동절기(10~3월) 월평균을 2-column grid로 나란히 표시 (SeasonalView)
- 각 계절 블록: 단지 합계 월평균(fmtWon) + 세대당 약 N만원 + N개월 평균 표시 (SeasonBlock)
- count === 0 시 "데이터 부족" 텍스트 표시 (Pitfall 4 처리)
- summerCount + winterCount < 4 시 FallbackTotalsView: 최근 단지 합계 + "계절 비교는 4개월 이상 데이터가 쌓이면 표시됩니다" 안내
- 월별 합계 추이 섹션 유지 (참고용 — 항상 표시)
- 09-01에서 구현된 getSeasonalAverages 함수 import + 호출 연결

## Task Commits

1. **Task 1: ManagementCostCard.tsx 전체 재작성 — 계절별 표시 + 상세 항목 제거** - `35e06b6` (feat)

## Files Created/Modified

- `src/components/complex/ManagementCostCard.tsx` — COST_LABELS 제거, SeasonalView/SeasonBlock/FallbackTotalsView 3개 서브컴포넌트 구조로 전면 재작성 (219 lines, +156/-100)

## Decisions Made

- `count === 0` 기준으로 "데이터 부족" 표시: `avg`가 null인지가 아니라 실제 row 개수가 0인지로 판정 — getSeasonalAverages의 avg는 subset이 비어있으면 null을 반환하므로 동일한 결과지만, count가 더 명확한 의도 표현
- SeasonBlock을 독립 컴포넌트로 추출: 하절기/동절기 표시 로직이 동일하므로 props 기반 재사용
- FallbackTotalsView에서 최신 row (rows[0])의 total만 표시: 계절 비교 불가 상황에서 최근 값 1개가 가장 신뢰할 수 있는 단일 지표
- AI 슬롭 금지 (CLAUDE.md): var(--dj-orange) 토큰만 강조색 사용, backdrop-blur/gradient/보라/인디고 완전 배제

## Deviations from Plan

### Auto-fixed Issues

없음 — 계획에 명시된 구현을 정확히 실행.

단, git stash 중 09-02 에이전트가 이미 수정한 사항 확인:
- `page.tsx`의 `jeonseData → _jeonseData` 변경 (커밋 6820e79)
- `.eslintrc.json`의 `varsIgnorePattern: "^_"` 추가 (커밋 6820e79)

이 변경들이 내 실행 중 lint 통과에 필요했으나 이미 병렬 에이전트(09-02)가 처리 완료. 내가 추가로 적용한 불필요한 eslint-disable 주석은 stash 충돌로 최종 파일에 포함되지 않음.

**Total deviations:** 0 (계획 정확히 실행)

## Issues Encountered

**빌드 환경 `supabaseUrl is required` 에러:** `/presale` 등 페이지 정적 생성 시 Supabase 환경변수 미설정으로 발생하는 기존 문제. 내 변경과 무관 — 변경 전 git stash 테스트로 동일 에러 재현 확인. `npm run lint` (TypeScript typecheck 포함)는 통과.

## Known Stubs

없음 — getSeasonalAverages가 실제 DB rows를 집계하며 UI가 실제 값을 표시.

## Threat Flags

없음 — 표시 전용 컴포넌트, 외부 IO 없음. rows prop은 RSC가 RLS public read 데이터로 전달.

## Next Phase Readiness

- Wave 2 완료: 09-02 (TransactionChart), 09-03 (FacilitiesCard), 09-04 (ManagementCostCard)
- 수동 검증 checkpoint 준비됨: `npm run dev` → 관리비 데이터 단지 상세 → 하절기/동절기 블록 표시 확인

---
*Phase: 09-complex-detail-ux*
*Completed: 2026-05-14*

## Self-Check

파일 존재 확인:
- src/components/complex/ManagementCostCard.tsx: FOUND (219 lines)

커밋 존재 확인:
- 35e06b6: FOUND (feat(09-04): ManagementCostCard 계절별 표시 재작성)

검증 스크립트: OK (getSeasonalAverages, SeasonalView, FallbackTotalsView, summerCount, winterCount, 하절기, 동절기, 데이터 부족 모두 포함 / COST_LABELS, 인건비, 청소비 없음 / AI slop 없음)

lint: ✔ No ESLint warnings or errors

## Self-Check: PASSED
