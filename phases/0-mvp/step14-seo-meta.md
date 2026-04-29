# Step 14: seo-meta

## 목표
단지 상세 페이지에 OpenGraph 메타, schema.org 구조화 데이터, sitemap을 구현한다. 검색엔진 유입(시나리오 S3) 최적화.

## 전제 (Prerequisites)
- Step 12 완료 (단지 상세 SSG)

## 적용 범위 (Scope)
- `src/app/(public)/danji/[id]/opengraph-image.tsx` — `@vercel/og` OG 이미지
- `src/app/sitemap.ts` — 동적 sitemap (모든 단지)
- `src/app/robots.ts`
- 각 페이지 `generateMetadata` 함수

## 도메인 컨텍스트 / 가드레일
- OG 이미지: 단지명 + 최근 거래가 + 갱신폭 표시. 액센트 `#ea580c`. AI 슬롭 금지
- schema.org: `RealEstateListing` 또는 `Place` 타입
- sitemap: ISR 페이지 `changefreq: weekly`, 랜딩 `daily`
- 비회원 전체 공개 (ADR-007) → robots.txt allow all

## 작업 목록
1. `generateMetadata` in `danji/[id]/page.tsx`: title, description, OG
2. `opengraph-image.tsx`: `@vercel/og` JSX → PNG (단지명·거래가·갱신폭·단지온도 로고)
3. `sitemap.ts`: Supabase에서 모든 단지 ID 조회 → URL 배열
4. `robots.ts`: allow all + sitemap 위치
5. 랜딩·검색 `generateMetadata`

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run build` 통과
- [ ] `/danji/[id]` OG 이미지 응답 200 + Content-Type: image/png
- [ ] `/sitemap.xml` 응답 200 + 단지 URL 포함
- [ ] Google Rich Results Test (수동): schema.org 오류 없음

## Definition of Done
SEO 기반 완성. 비회원 검색 유입 채널 준비됨.
