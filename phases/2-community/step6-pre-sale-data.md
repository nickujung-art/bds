# Step 6 (2-community): pre-sale-data

## 목표
신축 분양 정보 운영자 수동 등록 UI와 분양권·입주권 거래의 별도 UI를 구현한다. ADR-036·ADR-040 반영.

## 전제 (Prerequisites)
- 0-mvp step16 완료 (어드민 콘솔 + complexes CRUD)
- `complexes.status` enum에 `pre_sale`, `under_construction` 포함 확인 (0-mvp step2)

## 적용 범위 (Scope)
- `src/app/(admin)/admin/complexes/pre-sale/` — 분양 단지 등록·편집 어드민 UI
- `src/components/danji/PreSaleBanner.tsx` — 분양 단지 안내 배너
- `src/components/danji/DealSubtypeFilter.tsx` — 거래 유형 필터 (매매/입주권/분양권 분리)

## 도메인 컨텍스트 / 가드레일
- ADR-036: `transactions.deal_subtype enum(sale, occupancy_right, pre_sale_right)`. 입주권·분양권은 실거래 API에서 별도로 집계되므로 UI에서 명확히 분리
- ADR-040: 분양 단지 자동 적재는 V2 보류. V1.5는 어드민 수동 등록
- `complexes.status = 'pre_sale'` 단지: K-apt·학군 데이터 없음 → `data_completeness` 반영. AI 추정 불가 (참고 단지 연식 조건 미충족 가능)
- 분양가(예정) 필드: `complexes` 에 `pre_sale_price_min`, `pre_sale_price_max` (만원 단위) 컬럼 추가
- 분양 단지 상세에 "분양 중" 배너 + 분양가 표시. 실거래가 그래프는 `거래 데이터 없음` 표시

## 작업 목록
1. `supabase/migrations/0016_pre_sale_fields.sql`: `complexes`에 `pre_sale_price_min`, `pre_sale_price_max` 컬럼 추가
2. 어드민 분양 단지 등록 폼: status=pre_sale, 분양가 범위, 분양 일정, 공급 가구수, 평형 목록
3. `PreSaleBanner.tsx`: 황색 배너 "분양 중 단지 — 실거래 데이터 없음"
4. `DealSubtypeFilter.tsx`: 거래 목록·그래프 상단 필터 (매매 / 입주권 / 분양권)
5. 단지 상세 거래 표에 deal_subtype 컬럼 추가 + 필터 연동
6. Vitest: deal_subtype 필터 쿼리 조건 단위 테스트

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 어드민에서 분양 단지 등록 → 단지 상세 `pre_sale` 배너 표시
- [ ] 거래 목록에서 deal_subtype 필터 작동
- [ ] 분양 단지 AI 추정: 유사 단지 0건 → 섹션 숨김 (step17 fallback 확인)

## Definition of Done
분양 단지 정보 제공 + 거래 유형 분리 완성. 분양 광고와 데이터 연동 기반 확보.
