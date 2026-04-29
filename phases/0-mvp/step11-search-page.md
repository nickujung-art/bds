# Step 11: search-page

## 목표
단지 검색 페이지를 구현한다. 자동완성(200ms 디바운스), 검색 결과 리스트, 필터(평형·연식·거래 유형)를 SSR로 제공한다.

## 전제 (Prerequisites)
- Step 3b (매칭), Step 6 (좌표)

## 적용 범위 (Scope)
- `src/app/(public)/search/page.tsx` — SSR 검색 결과
- `src/app/api/search/suggest/route.ts` — Edge runtime 자동완성
- `src/components/shared/SearchInput.tsx` — 디바운스 + 자동완성 드롭다운
- `src/components/danji/DanjiCard.tsx` — 검색 결과 카드

## 도메인 컨텍스트 / 가드레일
- 자동완성 쿼리: `name_normalized %% :q` (pg_trgm) ORDER BY similarity LIMIT 8
- Edge runtime: `src/app/api/search/suggest/route.ts`에 `export const runtime = 'edge'`
- rate-limit: IP 기반 60req/min (Edge Middleware)
- 검색 결과 카드: 단지명 + 주소 + 세대수·연식 + 최근 거래가·평형. **시군구·동 항상 표시** (동음이의 방지)
- ADR-007: 비회원 전체 공개

## 작업 목록
1. `suggest/route.ts`: Edge + zod 파라미터 검증 + Supabase pg_trgm 쿼리 + 200ms cache
2. `SearchInput.tsx`: 디바운스 200ms, 드롭다운 강조표시, 키보드 탐색 (↑↓Enter)
3. `search/page.tsx`: URL params 기반 SSR 쿼리 + 필터 (평형 구간·연식·거래 유형)
4. `DanjiCard.tsx`: 카드 컴포넌트 (UI_GUIDE 스펙 준수, 오렌지 액센트 없음 — 중립 카드)
5. Vitest: suggest API 응답 형식 + 필터 파라미터 검증
6. Playwright E2E: "창원 자이" 검색 → 결과 클릭 → 단지 상세 이동

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run test:e2e` 통과
- [ ] 자동완성 응답 ≤ 300ms (로컬 기준)
- [ ] "창원" + "김해" 지역 단지 검색 결과 정상 노출
- [ ] 필터 적용 시 URL querystring 반영 + SSR 재쿼리

## Definition of Done
검색 페이지 완성. 단지 상세(step12) 진입점 확보.
