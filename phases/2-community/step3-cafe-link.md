# Step 3 (2-community): cafe-link

## 목표
단지 상세 페이지에서 네이버 카페 관련 게시글을 외부 링크로 연결한다. 카페 글 직접 임베드는 V2 보류 (ADR-004).

## 전제 (Prerequisites)
- 0-mvp step12 완료 (단지 상세 페이지)

## 적용 범위 (Scope)
- `src/components/danji/CafeLinkSection.tsx` — 카페 검색 링크 버튼

## 도메인 컨텍스트 / 가드레일
- ADR-004: V1에서 카페 글 직접 임베드 금지. 외부 링크만 제공
- 링크 형태: `https://cafe.naver.com/ArticleSearchList.nhn?search.query={단지명}+{동구}` 형식의 검색 링크
  - 단지명·동구는 `canonical_name` + `sgg_code` 기반. URL 인코딩 필수
  - **PII 누출 방지**: 사용자 정보를 쿼리파라미터에 포함하지 않음 (세션 쿠키는 외부 도메인에 전달 안 됨)
- 링크에 UTM 파라미터 부착 금지 (외부 도메인 네이버에 사이트 정보 노출 최소화)
- 카페 자동 크롤링·리다이렉트 금지 — 네이버 약관 위반 위험
- 버튼 레이블: "네이버 카페에서 이 단지 검색하기 ↗" (외부 이동 표시 필수)
- `target="_blank" rel="noopener noreferrer"` 필수

## 작업 목록
1. `CafeLinkSection.tsx`: 단지명 + 행정구 기반 카페 검색 URL 생성 → 버튼 렌더
2. URL 생성 로직 단위 테스트 (특수문자 단지명 URL 인코딩 확인)

## 수용 기준 (Acceptance Criteria)
- [ ] 단지 상세에 카페 링크 버튼 표시
- [ ] 링크 클릭 → 새 탭으로 네이버 카페 검색 결과 이동
- [ ] Vitest: 특수문자·공백 포함 단지명 URL 인코딩 정상

## Definition of Done
카페 외부 링크 연결 완료. 사용자가 카페 의견을 단지 상세에서 바로 탐색 가능.
