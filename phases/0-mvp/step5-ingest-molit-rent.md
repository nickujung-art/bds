# Step 5: ingest-molit-rent

## 목표
국토부 전월세 API (아파트·오피스텔)를 step4와 동일한 패턴으로 적재한다. step4 인프라를 재사용하고 전월세 전용 zod 스키마만 추가한다.

## 전제 (Prerequisites)
- Step 4 완료 (매매 ingest 패턴 확립)

## 적용 범위 (Scope)
- `src/services/molit.ts` — 전월세 엔드포인트 + zod 스키마 추가
- `src/app/api/ingest/molit-rent/route.ts` — 전월세 cron 엔드포인트
- `scripts/backfill-realprice.ts` — 전월세 큐 추가 (--type 옵션)

## 도메인 컨텍스트 / 가드레일
- `transactions.deal_type` enum: sale(매매), jeonse(전세), monthly(월세)
- 월세는 `price`(보증금) + `monthly_rent` 컬럼 분리
- dedupe_key 구조 동일 (가격 = 보증금 기준). 순수 월세(보증금=0) 케이스에서도 dedupe 충돌 없는지 Vitest로 검증 필수
- step4 `realprice.ts` `upsertTransactions` 재사용
- **CRON_SECRET 가드 필수**: 모든 ingest cron route는 `Authorization: Bearer ${CRON_SECRET}` 헤더 검증 (CLAUDE.md 필수 정책)

## 작업 목록
1. `molit.ts` 전월세 엔드포인트 zod 스키마 (보증금·월세 분리)
2. Cron route (매매와 동일 패턴, deal_type만 다름)
3. 백필 스크립트 `--type rent` 옵션

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 전월세 upsert 멱등성 확인
- [ ] 월세 거래: `monthly_rent` 컬럼 값 존재 확인
- [ ] Vitest: 보증금=0 순수 월세 dedupe_key 충돌 없음 확인
- [ ] CRON_SECRET 없는 요청 → 401 반환 확인

## Definition of Done
전월세 ingest 완료. 단지 상세의 전세/월세 그래프 데이터 준비됨.
