---
phase: 02-ranking-landing-share
verified: 2026-05-06T10:00:00Z
status: human_needed
score: 10/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "랜딩 페이지(/)에 접속해 신고가 카드 3개 이상 노출 확인"
    expected: "오늘 신고가 섹션에 최소 3개의 단지 카드가 보이고, 단지명·위치·가격이 표시된다"
    why_human: "DB에 실제 최근 30일 거래 데이터가 있어야 카드가 노출됨. complex_rankings 테이블에 데이터가 없으면 탭에 '랭킹 데이터를 불러오는 중입니다.'가 표시됨 — ISR 캐시 상태도 함께 확인 필요"
  - test: "단지 상세 URL을 카카오톡으로 공유해 OG 이미지 카드 확인"
    expected: "/complexes/{valid-id}/opengraph-image 요청 시 단지명·위치가 담긴 1200x630 PNG가 반환되고, 카카오톡 공유 시 해당 카드가 노출된다"
    why_human: "Satori 한글 TTF 렌더링 결과물은 실제 브라우저/카카오 크롤러 환경에서만 확인 가능. 로컬 curl로 PNG 파일을 받아 시각 검증 필요"
  - test: "랭킹 cron 실행 후 ingest_runs 기록 확인"
    expected: "GitHub Actions rankings-cron.yml이 0 * * * * 스케줄로 실행되고, /api/cron/rankings 호출 후 ingest_runs 테이블에 source='rankings' 레코드가 생성된다"
    why_human: "data_sources 테이블에 'rankings' row가 없으면 FK 오류로 graceful skip됨. 실제 프로덕션 환경에서 ingest_runs 기록 여부 확인 필요"
---

# Phase 2: 랭킹·랜딩·공유 검증 보고서

**Phase Goal:** 사용자가 처음 방문했을 때 보는 화면(랜딩)과 카카오톡 공유 링크를 완성. 신규 유입의 첫 인상 결정.
**Verified:** 2026-05-06T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | complex_rankings 테이블이 Supabase DB에 존재하고 4종 rank_type CHECK 제약이 적용된다 | VERIFIED | `supabase/migrations/20260507000001_complex_rankings.sql` — `check (rank_type in ('high_price', 'volume', 'price_per_pyeong', 'interest'))` 확인 |
| 2  | complex_rankings 테이블에 public read RLS 정책이 적용된다 | VERIFIED | `supabase/migrations/20260507000002_complex_rankings_rls.sql` — `create policy "complex_rankings: public read" on public.complex_rankings for select using (true)` 확인 |
| 3  | public/fonts/PretendardSubset.ttf 파일이 존재하고 OG 이미지 렌더링에 사용 가능하다 | VERIFIED | 파일 존재 (2.6MB, 0바이트 아님). opengraph-image.tsx에서 `readFileSync(join(process.cwd(), 'public/fonts/PretendardSubset.ttf'))` 로 로드 |
| 4  | computeRankings()가 4종 랭킹 산식을 집계해 complex_rankings 테이블에 UPSERT한다 | VERIFIED | `src/lib/data/rankings.ts` — aggregateHighPrice/Volume/PricePerPyeong/Interest 4개 함수 + `.upsert(upsertRows, { onConflict: 'rank_type,complex_id,window_days' })` 구현 확인 |
| 5  | 각 거래 쿼리는 cancel_date IS NULL AND superseded_by IS NULL 조건을 포함한다 | VERIFIED | rankings.ts 78-79, 112-113, 143-144줄 — `.is('cancel_date', null).is('superseded_by', null)` 모든 3개 transactions 쿼리에 포함 |
| 6  | GET /api/cron/rankings는 CRON_SECRET Bearer 헤더가 없으면 401을 반환한다 | VERIFIED | `src/app/api/cron/rankings/route.ts` — `if (!process.env.CRON_SECRET || authHeader !== 'Bearer ${process.env.CRON_SECRET}') return new Response('Unauthorized', { status: 401 })` 확인 |
| 7  | GitHub Actions rankings-cron.yml이 0 * * * * 스케줄로 실행된다 | VERIFIED | `.github/workflows/rankings-cron.yml` — `cron: '0 * * * *'`, `timeout-minutes: 3`, GET + Authorization Bearer 패턴 확인 |
| 8  | page.tsx의 revalidate가 60으로 설정되어 ISR이 활성화된다 | VERIFIED | `src/app/page.tsx` line 11 — `export const revalidate = 60` 확인 |
| 9  | 랭킹 탭 4종(신고가·거래량·평당가·관심도)이 클라이언트 상태로 전환된다 | VERIFIED | `src/components/home/RankingTabs.tsx` — `'use client'`, `useState<RankType>('high_price')`, `TAB_LABELS` 4종, `onClick={() => setActiveTab(tab)}` 확인. page.tsx에서 `<RankingTabs initialData={rankingData} />` 연결 |
| 10 | 단지별 동적 OG 이미지가 1200x630 PNG로 반환된다 | VERIFIED | `src/app/complexes/[id]/opengraph-image.tsx` — `export const runtime = 'nodejs'`, `export const size = { width: 1200, height: 630 }`, `export const contentType = 'image/png'`, `ImageResponse` 반환 확인 |
| 11 | 단지 상세 페이지에 카카오톡·네이버·링크복사 공유 버튼이 표시되고 Kakao SDK 폴백이 동작한다 | VERIFIED | `src/components/complex/ShareButton.tsx` — `handleKakaoShare`/`handleCopyLink` named exports, `isInitialized()` 체크, `window.open('https://share.naver.com/...')` 네이버 공유, `navigator.clipboard.writeText` 링크 복사. `complexes/[id]/page.tsx` line 181에서 `<ShareButton complexId={id} complexName={...} location={...} />` 연결 |

**Score:** 11/11 truths verified (코드베이스 검증 기준)

단, 아래 3개 항목은 런타임 동작이 관련된 것으로 인간 검증이 필요합니다.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260507000001_complex_rankings.sql` | complex_rankings 테이블 DDL + 인덱스 | VERIFIED | `create table public.complex_rankings` + CHECK 제약 + UNIQUE + 인덱스 확인 |
| `supabase/migrations/20260507000002_complex_rankings_rls.sql` | complex_rankings RLS 정책 | VERIFIED | `enable row level security` + public read policy 확인 |
| `public/fonts/PretendardSubset.ttf` | OG 이미지용 한글 TTF 폰트 | VERIFIED | 파일 존재, 2.6MB (0바이트 아님) |
| `src/__tests__/rankings.test.ts` | 랭킹 기능 테스트 스캐폴드 | VERIFIED | `computeRankings`, `getRankingsByType`, cron 401/200 테스트 포함. mock 패턴으로 리팩터링 완료 |
| `src/__tests__/share-button.test.ts` | ShareButton 폴백 테스트 스캐폴드 | VERIFIED | `handleKakaoShare`, `handleCopyLink` named exports import. `@ts-expect-error` 제거됨 (GREEN 완료) |
| `src/lib/data/rankings.ts` | getRankingsByType + computeRankings 함수 | VERIFIED | 두 함수 모두 export 확인. `RankType`, `RankingRow` 타입 export. `import 'server-only'` 포함 |
| `src/app/api/cron/rankings/route.ts` | 랭킹 집계 cron API endpoint | VERIFIED | `export async function GET`, CRON_SECRET 검증, computeRankings() 호출, ingest_runs 기록 |
| `.github/workflows/rankings-cron.yml` | GitHub Actions 1h 랭킹 cron | VERIFIED | `0 * * * *` 스케줄, GET, Authorization Bearer, timeout-minutes: 3 |
| `src/app/page.tsx` | 랜딩 페이지 ISR 60s | VERIFIED | `revalidate = 60`, `getRankingsByType` 4종 Promise.all 호출, `<RankingTabs>`, `<HighRecordCard>` 렌더 |
| `src/components/home/RankingTabs.tsx` | 4종 랭킹 탭 클라이언트 컴포넌트 | VERIFIED | `'use client'`, `useState`, `RankingTabs` export, 탭 전환 로직 |
| `src/components/home/HighRecordCard.tsx` | 신고가 카드 RSC | VERIFIED | `'use client'` 없음, `HighRecordCard` export, `formatPrice/Pyeong/DealDate` import |
| `src/app/complexes/[id]/opengraph-image.tsx` | 단지별 동적 OG 이미지 | VERIFIED | `runtime = 'nodejs'`, `ImageResponse`, `readFileSync('PretendardSubset.ttf')`, `getComplexById` 연결 |
| `src/components/complex/ShareButton.tsx` | 카카오톡·네이버·링크복사 공유 버튼 | VERIFIED | `'use client'`, `handleKakaoShare`/`handleCopyLink` named exports, `ShareButton` export |
| `src/lib/format.ts` | formatPrice, formatPyeong, formatDealDate 유틸 | VERIFIED | 3개 함수 모두 export 확인 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/migrations/20260507000001_complex_rankings.sql` | `public.complexes` | FOREIGN KEY complex_id | VERIFIED | `uuid not null references public.complexes(id) on delete cascade` |
| `supabase/migrations/20260507000002_complex_rankings_rls.sql` | `public.complex_rankings` | RLS 정책 | VERIFIED | `on public.complex_rankings for select using (true)` |
| `src/app/api/cron/rankings/route.ts` | `src/lib/data/rankings.ts` | computeRankings() 호출 | VERIFIED | `import { computeRankings }`, `await computeRankings(supabase)` |
| `src/lib/data/rankings.ts` | `complex_rankings` (Supabase) | UPSERT on conflict | VERIFIED | `.upsert(upsertRows, { onConflict: 'rank_type,complex_id,window_days' })` |
| `.github/workflows/rankings-cron.yml` | `/api/cron/rankings` | curl GET + Authorization Bearer | VERIFIED | `"${{ secrets.SITE_URL }}/api/cron/rankings"`, `Authorization: Bearer ${{ secrets.CRON_SECRET }}` |
| `src/app/page.tsx` | `src/lib/data/rankings.ts` | getRankingsByType() Promise.all | VERIFIED | `import { getRankingsByType }`, `Promise.all([..., getRankingsByType(...) × 4])` |
| `src/app/page.tsx` | `src/components/home/RankingTabs.tsx` | initialData props | VERIFIED | `import { RankingTabs }`, `<RankingTabs initialData={rankingData} />` |
| `src/components/home/RankingTabs.tsx` | `src/lib/data/rankings.ts` | RankType, RankingRow 타입 import | VERIFIED | `import type { RankType, RankingRow } from '@/lib/data/rankings'` |
| `src/app/complexes/[id]/opengraph-image.tsx` | `public/fonts/PretendardSubset.ttf` | readFileSync | VERIFIED | `readFileSync(join(process.cwd(), 'public/fonts/PretendardSubset.ttf'))` |
| `src/app/complexes/[id]/opengraph-image.tsx` | Supabase complexes 테이블 | getComplexById(id, supabase) | VERIFIED | `import { getComplexById }`, `await getComplexById(id, supabase)` |
| `src/app/complexes/[id]/page.tsx` | `src/components/complex/ShareButton.tsx` | complexId, complexName props | VERIFIED | `import { ShareButton }`, `<ShareButton complexId={id} complexName={complex.canonical_name} location={...} />` |
| `src/components/complex/ShareButton.tsx` | `window.Kakao.Share` | 동적 SDK 로드 + sendDefault() | VERIFIED | `loadKakaoSdk()` then `window.Kakao.Share.sendDefault({...})`, `isInitialized()` 중복 방지 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/app/page.tsx` | `highRecords`, `rankHighPrice/Volume/PricePerPyeong/Interest` | `getRecentHighRecords()`, `getRankingsByType()` × 4 → Supabase DB | DB 쿼리 존재, `.catch(() => [])` 빈 배열 폴백 | FLOWING |
| `src/components/home/RankingTabs.tsx` | `initialData[activeTab]` | page.tsx에서 서버 측 props 전달 | 데이터 있으면 렌더, 없으면 '랭킹 데이터를 불러오는 중입니다.' 표시 | FLOWING |
| `src/components/home/HighRecordCard.tsx` | `record` prop | page.tsx에서 실제 DB 데이터 전달 | `record.price`, `record.complex.canonical_name` 등 DB 값 직접 렌더 | FLOWING |
| `src/app/complexes/[id]/opengraph-image.tsx` | `complex` | `getComplexById(id, supabase)` → Supabase DB | DB 쿼리 존재, null 시 기본 브랜드 이미지 반환 | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: 서버 시작 없이 정적 검증만 수행.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CRON_SECRET 없음 → 401 | 코드 정적 분석 | `authHeader !== 'Bearer ${process.env.CRON_SECRET}'` → 401 반환 로직 확인 | PASS |
| TTF 폰트 파일 존재 | `fs.statSync('public/fonts/PretendardSubset.ttf')` | 2,725,828 bytes (2.6MB) | PASS |
| RankingTabs 탭 전환 | 코드 정적 분석 | `useState`, `onClick(() => setActiveTab(tab))`, `initialData[activeTab]` 연결 확인 | PASS |
| ShareButton named exports | 코드 정적 분석 | `export function handleKakaoShare`, `export async function handleCopyLink` 확인 | PASS |
| opengraph-image runtime | 코드 정적 분석 | `export const runtime = 'nodejs'` 확인 — Edge 1MB 한도 우회 | PASS |
| 랜딩/OG 이미지 실제 렌더 결과 | 로컬 서버 실행 필요 | 서버 미실행 — skip | SKIP |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| RANK-01 | 02-01, 02-02 | 지역 인기 단지 풀 정의 SQL + 일배치 | SATISFIED | complex_rankings 마이그레이션 (20260507000001/2), rankings.ts ACTIVE_SGG_CODES 하드코딩 |
| RANK-02 | 02-02 | 랭킹 4종 산식 (신고가·거래량·평당가·관심도) + 1h cron | SATISFIED | rankings.ts 4종 집계 함수, rankings-cron.yml `0 * * * *` |
| RANK-03 | 02-03 | 랜딩 완성 — 오늘 신고가 카드 + 4종 랭킹 탭 (ISR 60s) | SATISFIED (코드 기준) | page.tsx revalidate=60, HighRecordCard, RankingTabs 연결. 실제 데이터 표시는 런타임 확인 필요 |
| SHARE-01 | 02-04 | 단지별 동적 OG 이미지 (next/og 내장) | SATISFIED (코드 기준) | opengraph-image.tsx ImageResponse 구현. 실제 PNG 렌더링은 런타임 확인 필요 |
| SHARE-02 | 02-05 | 카카오톡·네이버 공유 버튼 + 단지 상세 공유 UX | SATISFIED | ShareButton.tsx 3종 공유, complexes/[id]/page.tsx에 연결 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/cron/rankings/route.ts` | 71 | `console.error('computeRankings failed:', err)` | INFO | 서버 에러 로깅 — 프로덕션 로거 교체 권장이나 현재는 허용 수준 |
| `src/components/complex/ShareButton.tsx` | 202-203 | `void description` — description 변수가 실제 컴포넌트에서 사용되지 않음 | WARNING | handleKakaoShare에는 location만 전달됨. description 조합 로직이 컴포넌트에서 중복 계산되지만 카카오 공유 시 실제 전달되지 않음. 기능 영향 없음 |

`void description` 분석: `ShareButton.tsx`에서 `description` 변수가 만들어지지만 `handleKakaoShare`는 `params.location`만 받아 자체적으로 description을 재조합합니다. 컴포넌트 레벨의 `description`은 실제로 전달되지 않습니다. `handleKakaoShare` 내부에서 `[location, '실거래가 확인'].filter(Boolean).join(' · ')`로 재계산합니다. 기능상 문제는 없으나 dead code입니다.

---

### Human Verification Required

#### 1. 랜딩 페이지 신고가 카드 ≥ 3개 표시

**Test:** 브라우저에서 `/` 접속 후 "오늘 신고가" 섹션 확인
**Expected:** 신고가 카드 3개 이상 표시 (단지명, 위치, 가격, 날짜), 랭킹 탭 4종이 데이터와 함께 렌더됨
**Why human:** DB에 `cancel_date IS NULL AND superseded_by IS NULL` 조건의 최근 30일 매매 거래가 있어야 카드 표시됨. ISR 캐시 상태(60s) 및 complex_rankings 테이블 데이터 유무도 확인 필요

#### 2. 단지 OG 이미지 카드 (카카오톡 공유)

**Test:** `curl -o /tmp/og.png "https://danjiondo.kr/complexes/{valid-id}/opengraph-image"` 후 이미지 열기. 또는 단지 URL을 카카오톡에서 직접 공유
**Expected:** 1200x630 PNG에 단지명(한글)과 위치가 Pretendard 폰트로 올바르게 렌더됨
**Why human:** Satori 한글 TTF 렌더링 결과는 실제 실행 환경에서만 확인 가능. 폰트 로드 성공 여부, 한글 렌더링 품질은 코드 정적 분석으로 검증 불가

#### 3. ingest_runs 기록 확인 (cron 실행 후)

**Test:** GitHub Actions에서 rankings-cron.yml 수동 실행(`workflow_dispatch`) 후 Supabase `ingest_runs` 테이블 조회
**Expected:** `source_id='rankings'` 레코드가 생성되거나, data_sources FK 미존재 시 graceful skip 동작 확인 + API 응답 `ok: true`
**Why human:** `data_sources` 테이블에 'rankings' row 존재 여부에 따라 ingest_runs 기록 방식이 달라짐. 실제 프로덕션 DB 상태 의존

---

### Gaps Summary

코드베이스 레벨에서 모든 must-have 아티팩트와 키 링크가 검증되었습니다. ROADMAP Phase 2 성공 기준 4개 중 코드로 확인 가능한 항목은 모두 구현되어 있습니다.

잔여 항목은 런타임 데이터 의존 항목 3개로, 이는 기능 구현 부재가 아닌 실행 환경 확인이 필요한 사항입니다:
- DB에 실제 거래 데이터 존재 여부 (신고가 카드 ≥ 3개)
- Satori TTF 한글 렌더링 품질 (OG 이미지)
- data_sources 테이블 'rankings' 엔트리 (ingest_runs 기록)

---

## ROADMAP Success Criteria 대조

| # | ROADMAP 성공 기준 | 코드 검증 | 런타임 확인 필요 |
|---|------------------|-----------|-----------------|
| 1 | 랜딩 페이지에 오늘 신고가 카드 ≥ 3개가 표시된다 | 코드 구현 완료 (HighRecordCard, getRecentHighRecords) | DB 데이터 의존 — 인간 확인 필요 |
| 2 | 랭킹 탭 4종이 데이터와 함께 정상 렌더된다 (ISR 60s 확인) | 코드 구현 완료 (RankingTabs, revalidate=60) | complex_rankings 테이블 데이터 의존 — 인간 확인 필요 |
| 3 | 단지 URL을 카카오톡으로 공유 시 단지명·가격이 담긴 OG 카드가 노출된다 | 코드 구현 완료 (opengraph-image.tsx, ShareButton) | 실제 카카오 크롤러 렌더링 — 인간 확인 필요 |
| 4 | 랭킹 cron이 1시간마다 데이터를 갱신한다 (ingest_runs 기록 확인) | 코드 구현 완료 (rankings-cron.yml, route.ts) | GitHub Actions 실행 + ingest_runs 기록 — 인간 확인 필요 |

---

_Verified: 2026-05-06T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
