---
phase: 02-ranking-landing-share
plan: "04"
subsystem: og-image
tags: [next-og, satori, ttf, opengraph, share]

dependency_graph:
  requires:
    - phase: "02-01"
      provides: "PretendardSubset.ttf (Satori TTF 폰트)"
  provides:
    - src/app/complexes/[id]/opengraph-image.tsx (단지별 동적 OG 이미지 1200x630 PNG)
  affects:
    - 단지 상세 URL SNS 공유 시 og:image 메타태그 자동 주입

tech_stack:
  added: []
  patterns:
    - Next.js opengraph-image.tsx 파일 컨벤션 (generateMetadata 수동 연결 불필요)
    - runtime='nodejs' + readFileSync TTF 로드 패턴 (Edge 1MB 한도 우회)
    - Satori flex-only 레이아웃 제약 준수

key_files:
  created:
    - src/app/complexes/[id]/opengraph-image.tsx
  modified:
    - .gitignore (public/fonts/ → public/fonts/*.woff2)
    - public/fonts/PretendardSubset.ttf (worktree에 체크아웃)

key_decisions:
  - "runtime='nodejs' 선택 — Edge runtime은 1MB 한도로 2.6MB TTF 로드 불가"
  - "단지 미존재 시 기본 브랜드 이미지 반환 (404 미반환) — SNS 크롤러 대응"
  - "revalidate=86400 — 단지 기본정보 변경 빈도 낮음, 24시간 캐시 적절"
  - ".gitignore에서 public/fonts/*.woff2만 무시 (TTF 커밋 허용) — Wave 1 결정 재적용"

patterns_established:
  - "opengraph-image.tsx: params await + createReadonlyClient + getComplexById 조합"
  - "Satori 레이아웃: display:flex, grid 미사용, 수치 borderRadius"

requirements_completed:
  - SHARE-01

duration: 10min
completed: "2026-05-06"
---

# Phase 2 Plan 04: 단지별 동적 OG 이미지 Summary

**Next.js opengraph-image.tsx 파일 컨벤션으로 단지별 1200x630 PNG OG 이미지 구현 — Satori에 PretendardSubset.ttf 공급하여 한글 텍스트 렌더링, nodejs runtime으로 4MB TTF 파일 로드**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-06T07:07:00Z
- **Completed:** 2026-05-06T07:17:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `src/app/complexes/[id]/opengraph-image.tsx` 구현 — Next.js 파일 컨벤션으로 og:image 메타태그 자동 주입
- `export const runtime = 'nodejs'` 설정으로 2.6MB TTF 파일 로드 가능 환경 확보
- 단지 미존재 시 기본 브랜드 이미지 반환 (T-02-11: 악의적 UUID 조작 대응)
- `revalidate = 86400` 24시간 캐시로 DoS 부하 완화 (T-02-12)
- CLAUDE.md AI 슬롭 금지 준수: 오렌지 `#ea580c`, 흰 배경, gradient/blur/glow 없음
- 빌드 결과에서 `ƒ /complexes/[id]/opengraph-image` 라우트 정상 인식 확인

## Task Commits

1. **Task 1: opengraph-image.tsx 구현** - `47013f5` (feat)
   - `src/app/complexes/[id]/opengraph-image.tsx` 신규 생성
   - `public/fonts/PretendardSubset.ttf` worktree 체크아웃
   - `.gitignore` 수정 (public/fonts/*.woff2 패턴)

## Files Created/Modified

- `src/app/complexes/[id]/opengraph-image.tsx` — 단지별 동적 OG 이미지, 1200x630 PNG, nodejs runtime
- `public/fonts/PretendardSubset.ttf` — Satori 한글 렌더링용 TTF (Wave 1 커밋에서 체크아웃)
- `.gitignore` — `public/fonts/` → `public/fonts/*.woff2` (TTF 추적 허용)

## Decisions Made

- `runtime='nodejs'` 선택: Edge runtime은 1MB 한도로 2.6MB PretendardSubset.ttf 로드 불가
- 단지 미존재 시 404 미반환, 기본 브랜드 이미지 반환: SNS 크롤러가 잘못된 UUID로 접근해도 응답해야 함
- `revalidate = 86400`: 단지명·위치는 자주 변경되지 않으므로 24시간 캐시 적절

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .gitignore가 public/fonts/ 전체를 무시하여 TTF 추가 불가**
- **Found during:** Task 1 (폰트 스테이징)
- **Issue:** `.gitignore`에 `public/fonts/`가 등록되어 있어 `git add` 실패
- **Fix:** Wave 1에서 결정했지만 이 worktree에 미적용된 `.gitignore` 변경 재적용 (`public/fonts/` → `public/fonts/*.woff2`)
- **Files modified:** `.gitignore`
- **Verification:** `git add public/fonts/PretendardSubset.ttf` 성공
- **Committed in:** 47013f5

**2. [Rule 3 - Blocking] PretendardVariable.woff2 누락으로 빌드 실패**
- **Found during:** Task 1 검증 (`npm run build`)
- **Issue:** `layout.tsx`가 `public/fonts/PretendardVariable.woff2`를 참조하지만 worktree에 없음 (`.gitignore`로 추적 안 됨)
- **Fix:** 메인 repo (`/c/Users/jung/coding/bds/public/fonts/`)에서 직접 복사. git 추적 대상 아님 (`.woff2` 패턴 무시)
- **Files modified:** `public/fonts/PretendardVariable.woff2` (git 미추적)
- **Verification:** `npm run build` 성공
- **Committed in:** 해당 없음 (gitignore 대상)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 두 수정 모두 빌드 완료를 위한 필수 처리. 기능 범위 변경 없음.

## Issues Encountered

- Wave 1이 별도 worktree에서 실행되어 `PretendardSubset.ttf` 커밋(84efa0e)이 현재 worktree 브랜치에 없었음. `git checkout 84efa0e -- public/fonts/PretendardSubset.ttf`로 git 객체 저장소에서 직접 체크아웃하여 해결
- `.gitignore` Wave 1 수정이 이 worktree에 미반영되어 있어 재적용 필요

## Known Stubs

없음. OG 이미지는 `getComplexById` 실제 DB 조회 결과를 렌더링함.

## Threat Flags

없음. T-02-11(UUID 조작), T-02-12(반복 요청 DoS) 모두 구현에서 완화됨.

## Self-Check: PASSED

- src/app/complexes/[id]/opengraph-image.tsx: FOUND
- export const runtime = 'nodejs': FOUND
- PretendardSubset.ttf readFileSync: FOUND
- public/fonts/PretendardSubset.ttf: FOUND
- 커밋 47013f5: FOUND
- npm run build 성공: ƒ /complexes/[id]/opengraph-image 라우트 인식

---
*Phase: 02-ranking-landing-share*
*Completed: 2026-05-06*
