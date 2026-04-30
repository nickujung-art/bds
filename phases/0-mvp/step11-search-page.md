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
- **rate-limit**: IP 기반 60req/min — `src/middleware.ts` Edge에서 Upstash Redis rate-limit 또는 `src/lib/api/rate-limit.ts` 슬라이딩 윈도우 구현. 초과 시 429 + `Retry-After` 헤더 반환
- 검색 결과 카드: 단지명 + 주소 + 세대수·연식 + 최근 거래가·평형. **시군구·동 항상 표시** (동음이의 방지)
- ADR-007: 비회원 전체 공개
- **거래 데이터 조회 필수 조건** (CLAUDE.md 정책): `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함

### pg_trgm 확장 사전 확인
- `suggest/route.ts` 첫 실행 전: `SELECT 1 FROM pg_extension WHERE extname='pg_trgm'` 프리플라이트 체크
- 확장 미설치 시 → 500 + Sentry error. `supabase/migrations/0001_extensions.sql`에 `CREATE EXTENSION IF NOT EXISTS pg_trgm` 포함 필수

### 검색어 특수문자 이스케이핑
- pg_trgm `%%` 연산자 사용 시 `%`, `_`, `\` 는 특수 의미 없으나, LIKE 쿼리로 fallback 시 이스케이핑 필요
- 사용자 입력에서 `%_\` 문자 → pg query parameter로 전달 전 `replace('%', '\\%')` 처리
- zod 스키마: 검색어 최대 50자, 빈 문자열 거부 (API 레벨)

### 클라이언트 사이드 fetch 관리
- `SearchInput.tsx`: 디바운스 200ms + `AbortController`. 새 입력 시 이전 fetch `abort()` 호출 (메모리 누수 방지)
- 429 응답 수신 시: `Retry-After` 헤더 값만큼 대기 후 1회 재시도. 재시도도 429이면 "잠시 후 다시 시도해 주세요" 표시

## 작업 목록
1. `suggest/route.ts`: Edge + zod 파라미터 검증 (최대 50자, 빈 문자열 거부) + pg_trgm 프리플라이트 + Supabase 쿼리 + 200ms cache
2. `SearchInput.tsx`: 디바운스 200ms + AbortController, 드롭다운 강조표시, 키보드 탐색 (↑↓Enter), 429 Retry-After 처리
3. `search/page.tsx`: URL params 기반 SSR 쿼리 + 필터 (평형 구간·연식·거래 유형)
4. `DanjiCard.tsx`: 카드 컴포넌트 (UI_GUIDE 스펙 준수, 오렌지 액센트 없음 — 중립 카드)
5. Vitest: suggest API 응답 형식 + 필터 파라미터 검증 + 특수문자 입력 + 빈 문자열 거부
6. Playwright E2E: "창원 자이" 검색 → 결과 클릭 → 단지 상세 이동

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run test:e2e` 통과
- [ ] 자동완성 응답 ≤ 300ms (로컬 기준)
- [ ] "창원" + "김해" 지역 단지 검색 결과 정상 노출
- [ ] 필터 적용 시 URL querystring 반영 + SSR 재쿼리

## Definition of Done
검색 페이지 완성. 단지 상세(step12) 진입점 확보.
