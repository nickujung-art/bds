# Step 1 (3-extras): cafe-text-matching

## 목표
카페 게시글에서 단지 언급을 NLP로 탐지해 단지 페이지와 연결한다. ADR-004: V2에서 카페 약관 개정 + 회원별 동의 후 진행.

## 전제 (Prerequisites)
- **카페 약관 검토 완료 + 카페 운영자 동의** — 법무 게이트 통과 필수
- 2-community step0 완료 (reviews — NLP 파이프라인과 데이터 흐름 유사)
- `cafe_post_queue` 테이블 (ARCHITECTURE.md에 정의됨) 존재 확인

## 법무·약관 게이트 (구현 전 필수 확인)

| 항목 | 확인 방법 |
|---|---|
| 네이버 카페 API 사용 가능 여부 | 네이버 개발자 센터 카페 API 약관 검토 |
| 카페 회원 동의 방식 | 카페 공지 + 사이트 약관 업데이트 |
| 게시글 저작권 | 작성자 동의 범위 명시 (요약·링크만 or 전문 임베드) |
| 개인정보 처리 (닉네임·내용) | 개인정보처리방침 처리위탁 추가 |

## 적용 범위 (Scope)
- `src/services/naver-cafe.ts` — 카페 API 어댑터 (API 제공 시) 또는 운영자 수동 업로드 파서
- `src/lib/nlp/complex-extractor.ts` — 단지 언급 탐지 NLP
- `supabase/migrations/0021_cafe_posts.sql` — `cafe_posts`, `cafe_post_complex_links` 테이블

## NLP 파이프라인 (V2 통계 기반)

```
1. 게시글 텍스트 → 형태소 분리 (한국어: compromise.js 또는 서버 Python 호출)
2. 단지명 후보 추출 (complexes.name_normalized 대상 trigram 매칭, threshold ≥ 0.8)
3. 문맥 검증: 단지명 ±20어절 내 "시세", "매물", "이사", "살고" 등 부동산 키워드 존재 여부
4. 신뢰도 ≥ 0.85 → 자동 링크. 미만 → 운영자 검토 큐
```

## 도메인 컨텍스트 / 가드레일
- ADR-004: 카페 글 직접 임베드는 요약+출처 링크만 허용. 전문 게시 금지
- **NLP 정확도 gate**: 매칭 precision ≥ 85% (human eval 100건). 미달 시 threshold 상향
- `cafe_posts.author_nickname`은 해시 처리 (PII). 원본 닉네임 저장 금지
- 카페 API 미제공 시 대안: 운영자가 카페 URL 목록 수동 등록 → 크롤링 허용 범위 내 파싱

## 작업 목록
1. 약관·동의 게이트 통과 확인 (코드 작성 전)
2. `0021_cafe_posts.sql`: `cafe_posts(id, source_url, title, summary, posted_at, author_hash)` + `cafe_post_complex_links(post_id, complex_id, confidence)`
3. `complex-extractor.ts`: trigram 매칭 + 키워드 문맥 검증
4. 카페 글 수집 파이프라인 (API or 수동 업로드)
5. 단지 상세에 "카페 관련 글" 섹션 (요약 + 출처 링크)
6. 어드민: NLP 매칭 큐 (미확신 케이스 검토)
7. Vitest: NLP 추출 precision 측정 (테스트셋 100건 필요)

## 수용 기준 (Acceptance Criteria)
- [ ] 법무·약관 게이트 통과 문서 존재
- [ ] `npm run test` 통과 (NLP precision ≥ 85%)
- [ ] 단지 상세 카페 글 섹션 표시 (≥ 1건)
- [ ] 작성자 닉네임 해시 저장 확인 (원본 노출 없음)

## Definition of Done
카페 글 단지 연결 완성. 사이트 핵심 차별화 — "카페 의견 + 실거래 데이터" 통합.
