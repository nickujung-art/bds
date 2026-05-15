---
phase: 10
plan: "02"
subsystem: edu-enhancement
tags: [facility-school, is-assignment, spatial-join, kindergartens, hagwon-percentile]
dependency-graph:
  requires: [10-01]
  provides: [is_assignment flags, kindergartens field, si-based hagwon percentile]
  affects: [facility-edu.ts, EducationCard consumers]
tech-stack:
  added: []
  patterns: [ST_Within spatial join, PostgreSQL UPDATE subquery pattern]
key-files:
  created:
    - scripts/update-assignment-flags.ts
  modified:
    - src/lib/data/facility-edu.ts
    - src/lib/data/facility-edu.test.ts
    - src/app/complexes/[id]/page.tsx
decisions:
  - "PostgreSQL UPDATE FROM alias 제한 우회: UPDATE target alias를 FROM JOIN ON에서 직접 참조 불가 → 서브쿼리로 fs_id 목록 먼저 생성 후 WHERE fs.id = matched.fs_id 패턴 사용"
  - "isKindergarten 헬퍼 함수로 daycare 분류 로직 DRY화"
  - "noUncheckedIndexedAccess 준수: 배열 인덱스 접근을 .at(0)?. 패턴으로 변경"
metrics:
  duration: "15m"
  completed: "2026-05-15"
  tasks: 2
  files: 4
---

# Phase 10 Plan 02: is_assignment 갱신 스크립트 + facility-edu kindergartens 분리 Summary

ST_Within 공간 조인으로 배정학교 플래그를 DB에 적용하고, daycare POI를 유치원/어린이집으로 분리하며 학원 백분위를 시(si) 기반으로 전환.

## What Was Built

### Task 1: scripts/update-assignment-flags.ts

- `--dry-run` 플래그: ST_Within 조인 대상 목록 50건 미리보기 (DB 미실행)
- 실제 실행: 3단계 (reset → spatial UPDATE → verify)
- PostgreSQL `UPDATE ... FROM` 에서 타겟 테이블 alias를 FROM JOIN ON에서 참조 불가한 제한을 서브쿼리 패턴으로 우회
- 결과: elementary 303건, middle 812건, high 795건 (is_assignment = true)
- 고등학교 0건이 나와도 정상 처리 (평준화 지역 안내 메시지)
- SQL을 임시 파일로 작성 후 `--file` 플래그 사용 — 자격증명을 stdout에 노출하지 않음

### Task 2: src/lib/data/facility-edu.ts 수정

- `FacilityEduData` 인터페이스에 `kindergartens: PoiItem[]` 추가
- daycare POI를 `isKindergarten()` 헬퍼로 분류:
  - `유치원` 또는 `병설` 포함 → `kindergartens`
  - 나머지 → `daycares`
- `complexes` 쿼리에 `si` 컬럼 추가
- `hagwon_score_percentile_by_si(target_score, p_si)` RPC 사용 (si 존재 시)
- page.tsx catch fallback에 `kindergartens: []` 추가

## Test Results

- facility-edu.test.ts: 4/4 GREEN
- `npm run lint`: 통과 (ESLint + TypeScript typecheck)
- `npm run build`: 환경변수 부재(Supabase URL)로 인한 pre-existing 빌드 실패 — 내 변경과 무관 (git stash로 확인)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PostgreSQL UPDATE FROM alias 참조 제한**
- **Found during:** Task 1 실제 실행
- **Issue:** `UPDATE facility_school fs ... FROM ... JOIN sds ON sds.school_name = fs.school_name` — PostgreSQL은 UPDATE 대상 테이블 alias를 FROM의 JOIN ON 조건에서 참조 불가 (error 42P01)
- **Fix:** FROM 절에 서브쿼리를 추가해 먼저 `fs2`(별칭)로 조인 결과의 `id` 목록을 생성, `WHERE fs.id = matched.fs_id`로 업데이트 대상 특정
- **Files modified:** scripts/update-assignment-flags.ts
- **Commit:** 7b142f2

**2. [Rule 1 - Bug] noUncheckedIndexedAccess TypeScript 오류**
- **Found during:** npm run lint (tsc --noEmit)
- **Issue:** `result.kindergartens[0].poi_name` — strict TypeScript 설정에서 배열 인덱스 접근 시 `undefined` 가능성 오류
- **Fix:** `result.kindergartens.at(0)?.poi_name` 패턴으로 변경
- **Files modified:** src/lib/data/facility-edu.test.ts
- **Commit:** 7b142f2

## DB Verification

```
elementary  303건
middle      812건
high        795건
```

고등학교 결과 795건 (평준화 지역이지만 school_districts 데이터 존재 시 매칭됨 — 정상).

## Self-Check: PASSED

- scripts/update-assignment-flags.ts: FOUND
- src/lib/data/facility-edu.ts: kindergartens field FOUND
- hagwon_score_percentile_by_si string: FOUND
- facility-edu.test.ts: 4/4 PASSED
- Commit 7b142f2: FOUND
