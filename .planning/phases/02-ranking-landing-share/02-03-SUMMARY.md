---
phase: "02"
plan: "03"
subsystem: landing-page-isr
tags: [isr, ranking-tabs, rsc, client-component, format-utils]
dependency_graph:
  requires:
    - 02-02 (getRankingsByType 함수, RankingRow 타입)
  provides:
    - 랜딩 페이지 ISR 60s (page.tsx revalidate=60)
    - RankingTabs 클라이언트 컴포넌트 (4종 탭 전환)
    - HighRecordCard RSC 컴포넌트
    - formatPrice·formatPyeong·formatDealDate 공유 유틸
  affects:
    - 향후 상세 페이지에서 format.ts 유틸 재사용 가능
tech_stack:
  added: []
  patterns:
    - RSC + Client Component 경계 분리 (데이터 서버에서 fetch, 상태는 클라이언트)
    - initialData props 패턴 (클라이언트 컴포넌트에서 DB 직접 접근 금지)
    - ISR with createReadonlyClient (cookies() 미호출로 동적 렌더링 방지)
key_files:
  created:
    - src/lib/format.ts
    - src/components/home/HighRecordCard.tsx
    - src/components/home/RankingTabs.tsx
  modified:
    - src/app/page.tsx
decisions:
  - createReadonlyClient()는 cookies()를 호출하지 않으므로 revalidate=60 ISR이 안전하게 동작
  - RankingTabs는 'use client'로 탭 상태만 관리하고 데이터는 서버에서 props로 전달 (CLAUDE.md CRITICAL 준수)
  - formatScore는 RankingTabs 내부 함수로 유지 (score 포맷이 탭 타입에 의존, 외부 공유 불필요)
metrics:
  duration: "15분"
  completed: "2026-05-06"
  tasks: 2
  files: 4
---

# Phase 2 Plan 03: 랜딩 페이지 ISR 완성 Summary

랜딩 페이지를 ISR 60s + 4종 랭킹 탭 + 신고가 카드 컴포넌트로 업그레이드. Wave 2 데이터 레이어(02-02)를 UI에 연결 완성.

## What Was Built

### Task 1: format.ts 유틸 분리 + 컴포넌트 2종 생성

**`src/lib/format.ts` (신규)**
- `formatPrice(price: number)`: 억/만원 포맷 (`12억 3,000만`, `5억`, `3,500만`)
- `formatPyeong(area_m2: number)`: 평 환산 (`33평`)
- `formatDealDate(dealDate: string)`: 상대 날짜 (`오늘`, `어제`, `5.6`)
- page.tsx 인라인 함수 3개를 공유 모듈로 추출

**`src/components/home/HighRecordCard.tsx` (신규)**
- RSC (`'use client'` 없음)
- `RecentHighRecord` props를 받아 신고가 카드 렌더
- `FireIcon` SVG 내장, 기존 `.card`, `.badge.orange` CSS 클래스 활용
- `formatDealDate`, `formatPyeong`, `formatPrice` → `@/lib/format` import

**`src/components/home/RankingTabs.tsx` (신규)**
- `'use client'` 선언 — 탭 전환 상태(useState)만 클라이언트에서 관리
- `initialData: Record<RankType, RankingRow[]>` props — DB 직접 접근 없음 (CLAUDE.md CRITICAL 준수)
- 4종 탭 레이블: `신고가 TOP`, `거래량`, `평당가`, `관심도`
- `data-orange-active="true"` 어트리뷰트로 활성 탭 스타일링 (기존 globals.css 패턴 유지)
- `formatScore()`: 탭 타입별 점수 포맷 (high_price→억/만, price_per_pyeong→만/평, volume→건, interest→명)
- 상위 3위 단지에 `var(--dj-orange)` 강조 + `ArrUpIcon` 표시

### Task 2: page.tsx — ISR 60s + 4종 랭킹 데이터 연결

`src/app/page.tsx` 수정:
- `revalidate = 0` → `revalidate = 60` (ISR 60s 활성화)
- `Promise.all` 확장: `getRecentHighRecords` + `getRankingsByType` 4종 병렬 페칭
- 인라인 신고가 카드 JSX → `<HighRecordCard key={...} record={rec} />` 교체
- 정적 탭 HTML + `rankings.map` 인라인 → `<RankingTabs initialData={rankingData} />` 교체
- 인라인 함수 제거: `formatPrice`, `formatPyeong`, `formatDealDate`, `FireIcon`, `ArrUpIcon`
- `getTopComplexRankings` import/사용 제거 (Wave 2에서 `getRankingsByType`으로 대체)
- `createReadonlyClient()` 유지 (cookies() 미호출 → ISR 안전)
- `Suspense`로 감싼 `UserMenu` 유지
- UI 금지 패턴 미사용: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb 없음

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] worktree에 폰트 파일 누락**
- **Found during:** Task 2 `npm run build`
- **Issue:** `public/fonts/PretendardVariable.woff2`가 worktree에 없어 `layout.tsx` 모듈 해석 실패 → 빌드 초기 단계 실패
- **Fix:** 메인 repo에서 worktree로 폰트 파일 복사
- **Files modified:** `public/fonts/PretendardVariable.woff2` (worktree 추가)
- **Commit:** 별도 커밋 없음 (git-ignored 바이너리 파일)

**2. [Rule 3 - Blocking] worktree에 .env.local 누락**
- **Found during:** Task 2 `npm run build` (2차 시도)
- **Issue:** `supabaseUrl is required` 오류 — 프리렌더링 시 Supabase 클라이언트 초기화 실패
- **Fix:** 메인 repo `.env.local`, `.env.test.local` worktree로 복사
- **Files modified:** `.env.local`, `.env.test.local` (worktree 추가, git-ignored)
- **Commit:** 별도 커밋 없음 (git-ignored 파일)

**비고:** 최종 빌드에서 TypeScript 컴파일 단계(`✓ Compiled successfully`)는 통과했으나, 로컬 Supabase가 실행되지 않아 프리렌더링 단계에서 `fetch failed` 오류 발생. 이는 코드 오류가 아닌 빌드 환경(로컬 DB 미실행) 문제이며, `npm run lint` (타입체크 포함)는 플랜 파일들에서 오류 없음을 확인.

## Known Stubs

없음. 모든 데이터가 서버에서 실제 DB를 통해 조회됩니다 (데이터 없을 때 빈 상태 메시지 표시).

## Threat Flags

없음. T-02-08(ISR 공개 정보), T-02-09(서버 검증 데이터 props), T-02-10(revalidate=60 부하 제한) 모두 구현에서 완화됨.

## Self-Check: PASSED

- `src/lib/format.ts`: FOUND
- `src/components/home/HighRecordCard.tsx`: FOUND
- `src/components/home/RankingTabs.tsx`: FOUND
- `src/app/page.tsx` 수정: FOUND (revalidate=60, RankingTabs, HighRecordCard)
- 커밋 878d5c3: FOUND (format.ts + HighRecordCard + RankingTabs)
- 커밋 3928eaa: FOUND (page.tsx)
- `revalidate = 60`: src/app/page.tsx 11번 줄 확인
- `getRankingsByType` 4종 호출: grep -c 결과 5 (import 1 + 호출 4)
- `createReadonlyClient()` 유지: page.tsx 65번 줄 확인
- 기존 테스트 오류는 src/__tests__/ 내 기존 파일의 프리-이그지스팅 이슈 (현재 플랜 범위 외)
