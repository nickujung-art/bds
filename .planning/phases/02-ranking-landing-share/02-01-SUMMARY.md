---
phase: "02"
plan: "01"
subsystem: db-foundation
tags: [migration, rls, font, tdd, scaffold]
dependency_graph:
  requires: []
  provides:
    - complex_rankings 테이블 (Wave 1 UPSERT 대상)
    - PretendardSubset.ttf (Wave 2 OG 이미지 Satori 폰트)
    - rankings.test.ts 스캐폴드 (Wave 1 구현 후 GREEN)
    - share-button.test.ts 스캐폴드 (Wave 2 구현 후 GREEN)
  affects:
    - 02-02: complex_rankings UPSERT 대상 테이블 사용
    - 02-03: PretendardSubset.ttf OG 이미지 렌더링 사용
    - 02-04: ShareButton.tsx 구현 후 share-button.test.ts GREEN
tech_stack:
  added: []
  patterns:
    - Supabase 마이그레이션 분리 (DDL + RLS 별도 파일)
    - TDD RED 스캐폴드 (@ts-expect-error로 미구현 모듈 정적 오류 억제)
key_files:
  created:
    - supabase/migrations/20260507000001_complex_rankings.sql
    - supabase/migrations/20260507000002_complex_rankings_rls.sql
    - public/fonts/PretendardSubset.ttf
    - src/__tests__/rankings.test.ts
    - src/__tests__/share-button.test.ts
  modified:
    - .gitignore (public/fonts/ → public/fonts/*.woff2)
decisions:
  - TTF는 Satori WOFF2 미지원으로 필수, runtime='nodejs' 지정 예정
  - .gitignore에서 public/fonts/*.woff2만 무시하도록 변경 (TTF 커밋 허용)
  - @ts-expect-error로 미구현 모듈 오류 억제 (TDD RED 표준 패턴)
metrics:
  duration: "15분"
  completed: "2026-05-06"
  tasks: 3
  files: 6
---

# Phase 2 Plan 01: DB 기반 + 사전 준비 Summary

Wave 0 사전 준비 완료 — complex_rankings 테이블 마이그레이션, Pretendard TTF 폰트, 랭킹·ShareButton TDD 스캐폴드 2종 추가.

## What Was Built

### Task 1: complex_rankings 마이그레이션 SQL

- `20260507000001_complex_rankings.sql`: `complex_rankings` 테이블 DDL + 인덱스
  - 4종 rank_type CHECK 제약 (`high_price`, `volume`, `price_per_pyeong`, `interest`)
  - `(rank_type, complex_id, window_days)` UNIQUE 제약
  - `complex_rankings_type_rank_idx` 인덱스 (rank_type + rank 기준)
- `20260507000002_complex_rankings_rls.sql`: public read RLS 정책
  - 쓰기는 service_role 전용 (rankings cron은 createSupabaseAdminClient() 경유)

### Task 2: Pretendard TTF 폰트

- `public/fonts/PretendardSubset.ttf` 추가 (Pretendard Regular, 2.6MB)
- Satori (ImageResponse 내부)는 WOFF2 미지원 — TTF 필수
- `opengraph-image.tsx`에서 `export const runtime = 'nodejs'` 사용 예정 (Vercel Edge 1MB 한도 우회)
- `.gitignore`를 `public/fonts/*.woff2`로 변경하여 TTF 커밋 허용

### Task 3: TDD 테스트 스캐폴드 (RED 단계)

- `rankings.test.ts`: computeRankings, getRankingsByType, cron 401/200 테스트
- `share-button.test.ts`: Kakao SDK 없을 때 폴백 + clipboard.writeText 호출 테스트
- 두 파일 모두 `npm run lint` 통과 (`@ts-expect-error`로 미구현 모듈 오류 억제)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Docker 미실행으로 supabase db push 불가**
- **Found during:** Task 1 검증
- **Issue:** 로컬 Docker Desktop이 실행되지 않아 `npx supabase db push --local` 실패
- **Fix:** 마이그레이션 파일 SQL 구문을 정적 검증. 기존 마이그레이션 패턴과 일치 확인. 로컬 DB 적용은 Wave 1 테스트 실행 시 수행
- **Impact:** 마이그레이션 파일 자체는 완성. Wave 1 agent가 DB 기동 후 적용 가능

**2. [Rule 2 - Missing Critical] .gitignore가 public/fonts/ 전체를 무시**
- **Found during:** Task 2
- **Issue:** `.gitignore`에 `public/fonts/`가 등록되어 TTF 파일이 untracked 상태
- **Fix:** `public/fonts/` → `public/fonts/*.woff2`로 변경. postinstall 생성 WOFF2는 계속 무시하고 TTF만 커밋 허용
- **Files modified:** `.gitignore`

**3. [Rule 1 - Bug] 테스트 파일 TypeScript 타입 오류 (린트 실패)**
- **Found during:** Task 3 검증
- **Issue:** 미구현 모듈 import로 `tsc --noEmit`에서 TS2307 오류 발생
- **Fix:** `@ts-expect-error` 주석으로 RED 단계 임시 억제. Wave 1/2 구현 완료 후 제거 예정
- **Files modified:** `rankings.test.ts`, `share-button.test.ts`

## TDD Gate Compliance

Plan type은 `execute`이므로 전체 TDD gate는 적용되지 않음. Task 3는 `tdd="true"` 속성을 가지며:

- RED 커밋: `test(02-01)` — rankings.test.ts + share-button.test.ts (미구현 모듈로 런타임 실패 확인)
- GREEN: Wave 1 (rankings) / Wave 2 (ShareButton) 구현 완료 후

## Known Stubs

없음. 이 플랜은 DDL, 폰트, 테스트 스캐폴드만 포함. UI 컴포넌트 없음.

## Threat Flags

없음. 마이그레이션은 CHECK 제약 + RLS로 T-02-01, T-02-02 완화. TTF는 공식 GitHub Releases URL에서 다운로드.

## Self-Check: PASSED

- supabase/migrations/20260507000001_complex_rankings.sql: FOUND
- supabase/migrations/20260507000002_complex_rankings_rls.sql: FOUND
- public/fonts/PretendardSubset.ttf: FOUND (2.6MB)
- src/__tests__/rankings.test.ts: FOUND
- src/__tests__/share-button.test.ts: FOUND
- 커밋 a1d156f: FOUND
- 커밋 84efa0e: FOUND
- 커밋 4061025: FOUND
- 커밋 54e6736: FOUND
