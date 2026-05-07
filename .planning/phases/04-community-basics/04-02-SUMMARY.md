---
phase: "04"
plan: "02"
subsystem: gps-verification
tags: [gps, server-action, postgis, security, client-component, tdd]
dependency_graph:
  requires:
    - 04-00 (check_gps_proximity PostGIS 함수, complex_reviews.gps_verified 컬럼)
  provides:
    - verifyGpsForReview Server Action (PostGIS RPC 기반 스푸핑 저항 GPS 검증)
    - ReviewForm GPS 버튼 (5상태: idle/loading/verified/failed/denied)
    - check_gps_proximity RPC TypeScript 타입 정의
  affects:
    - ReviewList.tsx line 78 GPS 배지 (이미 존재 — 이 플랜에서 활성화)
tech_stack:
  added: []
  patterns:
    - Server Action PostGIS RPC 검증 (클라이언트 좌표 신뢰 안 함 — D-07)
    - navigator.geolocation.getCurrentPosition → Server Action 연동
    - 5상태 GPS 버튼 UI (idle/loading/verified/failed/denied)
key_files:
  created: []
  modified:
    - src/lib/auth/review-actions.ts
    - src/components/reviews/ReviewForm.tsx
    - src/types/database.ts
decisions:
  - "reviewId optional prop 추가 — 후기 생성 전에도 GPS 버튼 렌더, 생성 후 reviewId 전달 시 DB 업데이트"
  - "gpsCoords state 제거 — 좌표를 state에 보관하지 않고 Server Action으로 직접 전달하는 단순 흐름 채택"
  - "check_gps_proximity 타입을 database.ts Functions 섹션에 수동 추가 — npx supabase gen types 미실행 환경 대응"
metrics:
  duration: "약 15분"
  completed_date: "2026-05-07"
  tasks_completed: 2
  files_created: 0
  files_modified: 3
---

# Phase 4 Plan 02: GPS L1 인증 배지 활성화 Summary

PostGIS 기반 서버 검증 GPS L1 인증 — ReviewForm에 선택적 GPS 인증 버튼 추가, 서버에서 check_gps_proximity RPC로 단지 ±100m 검증 후 gps_verified 플래그 저장.

## What Was Built

**Task 1: verifyGpsForReview Server Action**

`src/lib/auth/review-actions.ts` 하단에 `verifyGpsForReview` 함수를 추가했다. 클라이언트가 전달한 lat/lng를 PostGIS `check_gps_proximity` RPC로 서버에서만 검증한다. 클라이언트가 `gps_verified=true`를 직접 설정하는 경로가 없다 (D-07 스푸핑 저항). 본인 후기만 업데이트하도록 `.eq('user_id', user.id)` 조건 포함. review-actions.test.ts 3개 케이스 GREEN.

**Task 2: ReviewForm GPS 버튼**

`src/components/reviews/ReviewForm.tsx`에 GPS 인증 버튼을 추가했다. 5상태 (idle/loading/verified/failed/denied) 로 버튼 텍스트·색상·테두리가 변경된다. `handleGpsVerify`가 `navigator.geolocation.getCurrentPosition()`을 호출하고, 성공 시 `verifyGpsForReview` Server Action을 실행한다. GPS 인증은 선택사항 — 실패/거부 시에도 후기 제출 허용.

**타입 수정 (Rule 3 Auto-fix)**

`src/types/database.ts`의 Functions 섹션에 `check_gps_proximity` 타입을 수동 추가했다. TypeScript `tsc --noEmit`에서 `check_gps_proximity` 관련 오류가 제거됨.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: verifyGpsForReview | `98b578b` | feat(04-02): verifyGpsForReview Server Action |
| Task 2: GPS 버튼 + 타입 | `8f99e01` | feat(04-02): ReviewForm GPS 인증 버튼 + 타입 정의 |

## Success Criteria Verification

| Criterion | Status |
|-----------|--------|
| review-actions.test.ts GPS 테스트 3개 모두 GREEN | PASS |
| verifyGpsForReview가 check_gps_proximity RPC 호출 | PASS |
| ReviewForm에 GPS 버튼 5상태 렌더 | PASS |
| gps_verified 플래그가 서버에서만 설정 | PASS |
| ESLint 에러 없음 | PASS |
| TypeScript check_gps_proximity 타입 오류 해결 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] check_gps_proximity RPC TypeScript 타입 누락**
- **Found during:** Task 2 (npm run lint 실행 시)
- **Issue:** `src/types/database.ts`의 Functions 섹션에 `check_gps_proximity`가 없어 TypeScript 오류 발생 — `Argument of type '"check_gps_proximity"' is not assignable to parameter of type ...`
- **Fix:** `database.ts`의 Functions 섹션 끝(`updategeometrysrid` 앞)에 타입 정의 수동 추가
- **Files modified:** src/types/database.ts
- **Commit:** 8f99e01

**2. [Rule 1 - Bug] gpsCoords state 미사용 lint 오류**
- **Found during:** Task 2 (npm run lint 실행 시)
- **Issue:** `gpsCoords` state가 선언됐으나 JSX에서 사용되지 않아 `@typescript-eslint/no-unused-vars` 오류 발생
- **Fix:** `gpsCoords` state 제거. 좌표는 `verifyGpsForReview` 호출 시 직접 전달하는 단순 흐름으로 변경
- **Files modified:** src/components/reviews/ReviewForm.tsx
- **Commit:** 8f99e01 (동일 커밋에 포함)

### Design Decisions

- `reviewId` optional prop 추가: 계획의 GPS 핸들러가 `reviewId`를 사용하나 기존 ReviewForm은 생성 전용이라 reviewId가 없다. optional prop으로 추가해 생성 전 GPS 버튼도 동작(좌표 검증만 수행, DB 업데이트는 실제 reviewId 전달 시)하도록 설계.

## Known Stubs

없음 — GPS 버튼은 실제 `navigator.geolocation` API와 `verifyGpsForReview` Server Action을 연동한다. GPS 배지(`ReviewList.tsx` line 78)는 Wave 0 이전부터 존재했으며 `gps_verified=true`인 후기에 이미 표시된다.

## Threat Flags

없음 — 신규 네트워크 엔드포인트 없음. Server Action은 기존 Supabase 클라이언트 경유. GPS 검증 보안은 계획의 위협 모델대로 구현됨 (T-04-02-01, T-04-02-02, T-04-02-03).

## Self-Check: PASSED

- src/lib/auth/review-actions.ts: FOUND (verifyGpsForReview export 포함)
- src/components/reviews/ReviewForm.tsx: FOUND (handleGpsVerify, GPS 버튼 JSX 포함)
- src/types/database.ts: FOUND (check_gps_proximity 타입 포함)
- Commits 98b578b, 8f99e01: FOUND in git log
