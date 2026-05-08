---
phase: "06"
plan: "03"
subsystem: ui-components
tags: [gap-label, district-stats, ai-chat-panel, roi-table, ad-copy-reviewer, admin-ui]
dependency_graph:
  requires:
    - "06-01 (getGapLabelData, getAdRoiStats, formatGap)"
    - "06-02 (POST /api/chat/complex, POST /api/admin/ad-copy-review)"
  provides:
    - "GapLabel (갭 라벨 배지 컴포넌트)"
    - "DistrictStatsCard (지역 통계 카드 컴포넌트)"
    - "AnalysisSection (가성비/지역통계 탭 컨테이너)"
    - "AiChatPanel (AI 상담 플로팅 패널)"
    - "AdRoiTable (광고 ROI 집계 테이블)"
    - "AdCopyReviewer (광고 카피 AI 검토 컴포넌트)"
    - "AdCreateForm (광고 등록 폼)"
    - "createAdCampaign Server Action"
  affects:
    - "src/app/complexes/[id]/page.tsx (갭 라벨·분석탭·AI패널 연결)"
    - "src/app/admin/ads/page.tsx (ROI 테이블 추가)"
    - "src/app/admin/ads/new/page.tsx (신규 생성)"
    - "src/types/database.ts (district_stats 타입 수동 추가)"
    - "src/lib/auth/ad-actions.ts (createAdCampaign 추가)"
tech_stack:
  added: []
  patterns:
    - "position:fixed 플로팅 패널 (AiChatPanel)"
    - "SSE 스트리밍 클라이언트 (ReadableStream + getReader)"
    - "role=dialog aria-modal ARIA 패턴"
    - "Promise.all 병렬 fetch (district_stats async IIFE)"
    - "Server Action + use client 폼 조합 (AdCreateForm)"
key_files:
  created:
    - src/components/complex/GapLabel.tsx
    - src/components/complex/DistrictStatsCard.tsx
    - src/components/complex/AnalysisSection.tsx
    - src/components/complex/AiChatPanel.tsx
    - src/components/admin/AdRoiTable.tsx
    - src/components/admin/AdCopyReviewer.tsx
    - src/components/admin/AdCreateForm.tsx
    - src/app/admin/ads/new/page.tsx
  modified:
    - src/app/complexes/[id]/page.tsx
    - src/app/admin/ads/page.tsx
    - src/lib/auth/ad-actions.ts
    - src/types/database.ts
decisions:
  - "district_stats 타입 database.ts 수동 추가 — 06-00 마이그레이션 미적용 환경 동일 패턴 (06-01과 동일)"
  - "district_stats 조회 .maybeSingle().then().catch() 대신 async IIFE — PromiseLike.catch() 타입 오류 회피"
  - "AnalysisSection use client — 탭 상태 관리 필요, ValueQuadrantChart는 이미 use client"
  - "AiChatPanel 'use client' — 메시지 상태·SSE 스트리밍 클라이언트에서만 가능"
  - "AdCreateForm Server Action 직접 바인딩 — form action 패턴, zod 없이 기존 코드 패턴 준수"
metrics:
  duration: "~30분"
  completed_date: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 4
---

# Phase 6 Plan 03: UI 컴포넌트 레이어 Summary

Wave 2 UI 컴포넌트 레이어 완료. Wave 1/2에서 구축한 백엔드 서비스와 AI API를 실제 사용자 인터페이스에 연결. 단지 상세 페이지 3개 UI 추가(갭 라벨·지역통계 탭·AI 상담 패널), 어드민 광고 페이지 2개 UI 추가(ROI 테이블·카피 검토), 광고 등록 페이지 신규 생성.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 갭 라벨 + 지역통계 탭 + AI 상담 패널 + 단지 상세 페이지 연결 | b94541f | GapLabel.tsx, DistrictStatsCard.tsx, AnalysisSection.tsx, AiChatPanel.tsx, page.tsx, database.ts |
| 2 | 광고 ROI 테이블 + 카피 AI 검토 + 광고 등록 폼 | c61b157 | AdRoiTable.tsx, AdCopyReviewer.tsx, AdCreateForm.tsx, admin/ads/page.tsx, admin/ads/new/page.tsx, ad-actions.ts |

## Artifacts

### src/components/complex/GapLabel.tsx

- `gap > 0`: `.badge.neg` (배경 `--bg-negative-tint`, 텍스트 `--fg-negative`) + ArrowUp SVG + "시세보다 {N} 높음"
- `gap < 0`: `.badge.pos` (배경 `--bg-positive-tint`, 텍스트 `--fg-positive`) + ArrowDown SVG + "시세보다 {N} 낮음"
- `gap === null || gap === 0`: null return (미렌더)
- `aria-label="매물 시세 비교: 시세보다 {N} {높음|낮음}"` 접근성
- `formatGap()` 사용 (06-01 구현)

### src/components/complex/DistrictStatsCard.tsx

- `role="region" aria-labelledby="district-stats-heading"` 접근성
- 데이터 있을 때: 인구수·세대수 2열 그리드 + SGIS 기준 출처 메타 레이블
- 데이터 없을 때: "해당 지역 통계 데이터가 아직 수집되지 않았습니다." 안내문 (center, fg-tertiary)

### src/components/complex/AnalysisSection.tsx

- `'use client'` — 탭 상태(activeTab) 관리
- Tab 1 "가성비 분석": ValueQuadrantChart 렌더 (또는 데이터 없음 안내)
- Tab 2 "지역 통계": DistrictStatsCard 렌더
- `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"` ARIA 패턴
- 활성 탭: `--dj-orange` 하단 밑줄, font 600; 비활성: font 500

### src/components/complex/AiChatPanel.tsx

- `'use client'` — 메시지 상태, 패널 열림/닫힘
- `position: fixed; bottom: 24px; right: 24px; z-index: 100` 플로팅 버튼
- 패널 열림: `position: fixed; top: 0; right: 0; width: min(400px, 100vw); height: 100vh; z-index: 200`
- SSE 스트리밍: `ReadableStream.getReader()` + `TextDecoder` + `content_block_delta` 파싱
- `role="dialog" aria-label="{complexName} AI 상담" aria-modal="true"`
- Escape 키 닫기, 포커스 트랩 (열릴 때 close 버튼, 닫힐 때 trigger 버튼)
- 면책 고지: `--bg-cautionary-tint` 스트립 "단지 DB 데이터 기반 응답입니다. 투자 조언이 아닙니다."
- isPending 중복 전송 방지

### src/components/admin/AdRoiTable.tsx

- `<caption class="sr-only">광고 ROI 현황</caption>` 스크린리더 접근성
- `<th scope="col">` 열 헤더 구조
- CTR%: `row.ctr.toFixed(1)%`, null 시 "—"
- 이상트래픽: `badge.caut aria-label="이상 트래픽 감지됨"` 또는 "—" (fg-tertiary)
- rows 빈 배열이면 null return (미렌더)

### src/components/admin/AdCopyReviewer.tsx

- `'use client'` — ReviewState `'idle' | 'loading' | 'result' | 'error'`
- `role="status" aria-live="polite" aria-busy={state === 'loading'}`
- `aria-label="광고 카피 AI 검토"` 버튼
- violations: `--fg-negative` 레이블 + `<ul>` 목록
- suggestions: `--fg-sec` 레이블 + `<ul>` 목록
- 빈 결과: "검토 결과 특이 사항이 없습니다." (`--fg-positive`)
- 오류: "AI 검토 요청에 실패했습니다. 직접 검토 후 등록하세요." — 비차단 경고

### src/app/complexes/[id]/page.tsx 수정

- `Promise.all()` 에 `getGapLabelData()` + `district_stats` async IIFE 추가
- `gap` 계산: `listingPricePerPy - avgTransactionPricePerPy`
- 실거래가 추이 카드 h3 헤더를 flex row로 변경 + `<GapLabel gap={gap} />` 우측 정렬
- `<ValueQuadrantChart>` 직접 렌더를 `<AnalysisSection quadrantData={...} districtStats={...} />` 로 교체
- `<AiChatPanel>` 페이지 최하단 (body div 닫기 전) 렌더

### src/app/admin/ads/page.tsx 수정

- `getAdRoiStats(adminClient)` Promise.all 추가
- `<AdRoiTable rows={roiStats} />` 캠페인 테이블 위에 렌더 (campaigns.length > 0 조건)

### src/app/admin/ads/new/page.tsx 신규

- 어드민 auth guard (auth.getUser + profiles.role 2단계)
- `<AdCreateForm />` 렌더

### src/lib/auth/ad-actions.ts 수정

- `createAdCampaign(formData: FormData)` Server Action 추가
- 필수 필드 검증, `status: 'pending'` 으로 INSERT
- `revalidatePath('/admin/ads')` 적용

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] district_stats 테이블 타입 미등록 (TypeScript 오류)**

- **발견 위치:** Task 1 lint 검증 중
- **문제:** `database.ts`에 `district_stats` 테이블 타입이 없어 `supabase.from('district_stats')` 호출 시 TS2769 오류
- **원인:** 06-00 마이그레이션 미적용 환경 (로컬 DB pull 불가) — 06-01과 동일 상황
- **수정:** `database.ts`에 `district_stats` 테이블 Row/Insert/Update 타입 수동 추가
- **영향:** TypeScript 컴파일 오류 해소
- **Commit:** b94541f

**2. [Rule 1 - Bug] district_stats 조회 `.catch()` 타입 오류**

- **발견 위치:** Task 1 lint 검증 중
- **문제:** Supabase `.maybeSingle()` 반환 타입이 `PromiseLike`로 `.catch()` 메서드 없음 (TS2339)
- **수정:** `async IIFE + try/catch` 패턴으로 교체
- **파일:** `src/app/complexes/[id]/page.tsx`
- **Commit:** b94541f

## Known Stubs

없음. 모든 UI 컴포넌트는 실제 API와 연결됨:
- GapLabel: `getGapLabelData()` 실제 DB 쿼리 (06-01)
- DistrictStatsCard: `district_stats` 실제 DB 쿼리
- AiChatPanel: `POST /api/chat/complex` 실제 RAG 엔드포인트 (06-02)
- AdRoiTable: `getAdRoiStats()` 실제 DB 쿼리 (06-01)
- AdCopyReviewer: `POST /api/admin/ad-copy-review` 실제 Claude API 엔드포인트 (06-02)

단, 런타임 동작은 06-00 DB 마이그레이션 완료 후 가능.

## Threat Flags

없음. 계획된 위협 모델(T-06-03-01~04) 구현 확인:
- T-06-03-01: AiChatPanel에서 messages 배열 role 검증 — `user/assistant`만 서버로 전송. 클라이언트에서 임의 role 주입 불가 (fetch body 구성 시 role 필드만 추출)
- T-06-03-02: 면책 고지 disclaimer strip 항상 표시 (패널 열림 직후 header 아래 고정)
- T-06-03-03: isPending 상태로 UI 레벨 중복 전송 방지. 서버 rate limit은 Wave 2 /api/chat/complex route에서 처리 (06-02)
- T-06-03-04: AdCopyReviewer form submit 차단 없음 — advisory only (D-10)

## Self-Check: PASSED

- [x] `src/components/complex/GapLabel.tsx` — 생성됨, gap>0 badge.neg, gap<0 badge.pos, null return
- [x] `src/components/complex/DistrictStatsCard.tsx` — 생성됨, role=region, 데이터 없음 안내문
- [x] `src/components/complex/AnalysisSection.tsx` — 생성됨, 탭 컨테이너
- [x] `src/components/complex/AiChatPanel.tsx` — 생성됨, position:fixed, role=dialog aria-modal, SSE 스트리밍
- [x] `src/components/admin/AdRoiTable.tsx` — 생성됨, caption sr-only, badge.caut
- [x] `src/components/admin/AdCopyReviewer.tsx` — 생성됨, 4상태, violations/suggestions
- [x] `src/components/admin/AdCreateForm.tsx` — 생성됨, AdCopyReviewer 연결
- [x] `src/app/admin/ads/new/page.tsx` — 생성됨, admin guard
- [x] `src/app/complexes/[id]/page.tsx` — GapLabel, AnalysisSection, AiChatPanel 연결
- [x] `src/app/admin/ads/page.tsx` — AdRoiTable 추가
- [x] `src/types/database.ts` — district_stats 타입 추가
- [x] `src/lib/auth/ad-actions.ts` — createAdCampaign 추가
- [x] Commit b94541f — git log 확인됨 (Task 1)
- [x] Commit c61b157 — git log 확인됨 (Task 2)
- [x] `npm run lint` — 오류 없음
- [x] `npm run build` — ✓ Compiled successfully
