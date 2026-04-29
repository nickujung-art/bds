# Step 4: ingest-molit-trade

## 목표
국토부 실거래가 API (아파트·오피스텔 매매)를 10년치 백필 + 일배치로 적재한다. 멱등성, 정정/취소 처리, rate-limit, 5회 재시도를 구현한다.

## 전제 (Prerequisites)
- Step 3b 완료 (단지 매칭 파이프라인)
- 사용자가 `.env.local`에 `MOLIT_API_KEY` 설정

## 적용 범위 (Scope)
- `src/services/molit.ts` — 국토부 API 어댑터 + zod 스키마
- `src/lib/api/rate-limit.ts` — token bucket
- `src/lib/data/realprice.ts` — 거래 upsert 도메인 함수
- `scripts/backfill-realprice.ts` — 백필 스크립트 (로컬/GitHub Actions)
- `src/app/api/ingest/molit-trade/route.ts` — Vercel Cron 일배치 엔드포인트
- `.github/workflows/backfill.yml` — 수동 dispatch 가능한 GitHub Actions

## 도메인 컨텍스트 / 가드레일
- ADR-022: dedupe_key = `{sgg_code}_{deal_ym}_{complex_code}_{deal_date}_{price}_{area_m2}` UNIQUE
- ADR-038: 정정 신고 = 새 row + `superseded_by`. 취소 = `cancel_date` 채움
- CLAUDE.md: cron endpoint는 `CRON_SECRET` 헤더 검증 필수
- 국토부 일 10,000회 한도 → 1초 sleep + jitter. 5회 재시도 지수 백오프 (1→32s)
- 백필 단위: 시군구 6개 × 12개월 × 10년 × 2종(아파트·오피스텔) = 1,440 호출
- 모든 거래 조회 쿼리: `WHERE cancel_date IS NULL AND superseded_by IS NULL`

## 작업 목록
1. `molit.ts` zod 스키마: API 응답 필드 → `Transaction` 도메인 타입 변환. 응답 스키마 변경 시 Sentry 알림
2. `rate-limit.ts`: token bucket (1req/s, burst 5)
3. `realprice.ts`: `upsertTransactions(rows)` — ON CONFLICT (dedupe_key) DO UPDATE (cancel_date, superseded_by 처리)
4. `backfill-realprice.ts`: 시군구·연월 큐 생성 → 진행상황 `ingest_runs` 기록 (재개 가능)
5. Cron route: `CRON_SECRET` 검증 → 최근 3개월 갱신 → `ingest_runs` 기록
6. GitHub Actions `backfill.yml`: `workflow_dispatch` 트리거, 실패 시 이메일 알림

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (molit 어댑터 zod 검증 + upsert 멱등성 테스트)
- [ ] 동일 dedupe_key로 2회 upsert → DB에 1건만 존재
- [ ] 취소 신고 = `cancel_date` 채움, `WHERE cancel_date IS NULL` 쿼리 시 제외됨
- [ ] `CRON_SECRET` 없이 POST /api/ingest/molit-trade → 401
- [ ] rate-limit 1req/s 검증 (Vitest 모킹)

## Definition of Done
매매 거래 10년치 백필 가능 + 일배치 cron 준비 완료.
