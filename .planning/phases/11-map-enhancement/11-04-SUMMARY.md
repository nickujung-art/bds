---
phase: 11-map-enhancement
plan: "04"
subsystem: map-ui, complex-detail, cron
tags: [map, side-panel, view-count, server-action, cron, tdd]
dependency_graph:
  requires: ["11-03"]
  provides: ["map-side-panel", "view-count-tracker", "price-stats-cron"]
  affects: ["src/components/map", "src/app/complexes/[id]", "src/app/api/cron/daily"]
tech_stack:
  added: []
  patterns: ["slide-in panel", "bottom sheet", "session storage dedup", "server action rpc"]
key_files:
  created:
    - src/components/map/MapSidePanel.tsx
    - src/app/complexes/[id]/actions.ts
    - src/app/complexes/[id]/ViewCountTracker.tsx
  modified:
    - src/components/map/KakaoMap.tsx
    - src/app/complexes/[id]/page.tsx
    - src/app/complexes/[id]/actions.test.ts
    - src/app/api/cron/daily/route.ts
decisions:
  - "actions.ts uses (supabase as any).rpc() to bypass Supabase generated types — increment_view_count not yet in DB type snapshot but is granted EXECUTE to anon role by migration"
  - "Test mock uses 'unknown as ReturnType<>' double-cast to satisfy strict TypeScript while keeping mock simple"
  - "MapSidePanel renders two DOM elements (PC + mobile) simultaneously using className='hidden md:flex' / 'flex md:hidden' — avoids JS-based breakpoint detection"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-15"
  tasks_completed: 2
  files_count: 7
---

# Phase 11 Plan 04: MapSidePanel + view_count Server Action Summary

One-liner: PC 우측 슬라이드인 + 모바일 바텀 시트 MapSidePanel, sessionStorage 기반 view_count Server Action, daily cron refresh_complex_price_stats 연결 완성.

## Tasks Completed

| Task | Name | Status | Key Files |
|------|------|--------|-----------|
| 1 | MapSidePanel.tsx + KakaoMap 연결 | Done | MapSidePanel.tsx, KakaoMap.tsx |
| 2 | view_count Server Action + 일배치 cron 연결 | Done | actions.ts, ViewCountTracker.tsx, page.tsx, route.ts, actions.test.ts |

## What Was Built

### Task 1: MapSidePanel

`src/components/map/MapSidePanel.tsx` — 마커 클릭 시 단지 정보 패널.

- PC (`className="hidden md:flex"`): `position:fixed, right:0, top:0, width:360, height:100%`, border-left + box-shadow. `transform: isOpen ? translateX(0) : translateX(100%)`, `transition: 200ms cubic-bezier(0.16,1,0.3,1)`.
- 모바일 (`className="flex md:hidden"`): `position:fixed, bottom:0, left:0, right:0, height:60vh`, border-radius `12px 12px 0 0`. `transform: isOpen ? translateY(0) : translateY(100%)`.
- 두 패널 모두 `role="dialog" aria-modal="true"`.
- `isOpen` 시 오버레이 div 렌더 (onClick=onClose).
- `useEffect`: selectedComplexId 변경 시 `/api/complexes/{id}/map-panel` fetch.
- 데이터: 위치(si+gu), 평당가 카드, 세대수/준공 InfoChip 그리드, 최근 거래 목록, 학원등급 배지 (non-null만), "단지 상세 보기" Link 버튼.
- AI 슬롭 없음: backdrop-blur/gradient/glow/보라/인디고 없음.

`src/components/map/KakaoMap.tsx` 수정:
- `import { MapSidePanel } from './MapSidePanel'` 추가.
- `eslint-disable-line @typescript-eslint/no-unused-vars` 제거 (setSelectedComplexId가 이제 MapSidePanel에 실제로 전달됨).
- Placeholder 주석을 `<MapSidePanel selectedComplexId={selectedComplexId} onClose={() => setSelectedComplexId(null)} />` 로 교체.

### Task 2: view_count Server Action + cron 연결

`src/app/complexes/[id]/actions.ts`:
- `'use server'` 선언.
- `createReadonlyClient()` 사용 (increment_view_count RPC는 anon GRANT EXECUTE).
- `(supabase as any).rpc('increment_view_count', { p_complex_id: complexId })` — DB 타입 스냅샷에 없는 RPC이므로 any 캐스트.

`src/app/complexes/[id]/ViewCountTracker.tsx`:
- `'use client'` 선언.
- `useEffect`: `sessionStorage.getItem('vc_${complexId}')` 확인 → 없으면 set 후 `incrementViewCount(complexId)` 호출.
- 오류는 무시 (비즈니스 크리티컬 아님).

`src/app/complexes/[id]/page.tsx`:
- `import { ViewCountTracker } from './ViewCountTracker'` 추가.
- JSX 최상단 `<div>` 바로 안에 `<ViewCountTracker complexId={id} />` 삽입.

`src/app/api/cron/daily/route.ts`:
- `return Response.json(...)` 직전에 `refresh_complex_price_stats` RPC 호출 블록 추가.
- 에러 시 `errors` 배열에 push.

`src/app/complexes/[id]/actions.test.ts`:
- Wave 0 placeholder 테스트 2개를 실제 검증으로 교체.
- Test 1: `mockRpc`가 `'increment_view_count'` + `{ p_complex_id: '...' }` 로 호출됨 확인.
- Test 2: rpc가 error 반환해도 `incrementViewCount` 가 resolve to undefined (throw 없음) 확인.
- 두 테스트 모두 GREEN.

## Verification Results

- TypeScript: `npx tsc --noEmit` — 오류 없음 (0 errors)
- Tests: `actions.test.ts` 2/2 GREEN
- Build: `✓ Compiled successfully in 20.2s` + `✓ Linting and checking validity of types` 통과. `/presale` prerender 오류는 pre-existing (supabaseUrl 미설정, out of scope).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript `rpc` 호출 타입 불일치 (actions.ts)**
- **Found during:** Task 2 TypeScript check
- **Issue:** `increment_view_count`가 Supabase 생성 타입에 없어 TS2345 오류 발생
- **Fix:** `(supabase as any).rpc(...)` + eslint-disable 주석
- **Files modified:** `src/app/complexes/[id]/actions.ts`

**2. [Rule 1 - Bug] Test mock 타입 캐스트 오류 (actions.test.ts)**
- **Found during:** Task 2 TypeScript check
- **Issue:** `{ rpc: mockFn } as ReturnType<typeof createReadonlyClient>` — 타입 오버랩 부족으로 TS2352 오류
- **Fix:** `as unknown as ReturnType<typeof createReadonlyClient>` 이중 캐스트
- **Files modified:** `src/app/complexes/[id]/actions.test.ts`

## Known Stubs

None. MapSidePanel은 실제 `/api/complexes/{id}/map-panel` API를 fetch하며, ViewCountTracker는 실제 Server Action을 호출한다.

## Self-Check: PASSED

- `src/components/map/MapSidePanel.tsx` — FOUND
- `src/app/complexes/[id]/actions.ts` — FOUND
- `src/app/complexes/[id]/ViewCountTracker.tsx` — FOUND
- `src/components/map/KakaoMap.tsx` — modified (MapSidePanel import + component)
- `src/app/complexes/[id]/page.tsx` — modified (ViewCountTracker import + component)
- `src/app/complexes/[id]/actions.test.ts` — 2/2 tests GREEN
- `src/app/api/cron/daily/route.ts` — refresh_complex_price_stats added
