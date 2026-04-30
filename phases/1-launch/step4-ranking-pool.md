# Step 4 (1-launch): ranking-pool

## 목표
"지역 인기 단지 풀"을 정의하는 SQL + 일배치를 구현한다. 랭킹 탭(step5)이 이 풀 안에서만 동작한다.

## 전제 (Prerequisites)
- 0-mvp 완료 (거래 데이터)
- 1-launch step2 완료 (즐겨찾기 — 풀 조건 중 하나)

## 적용 범위 (Scope)
- `src/lib/ranking/pool.ts` — 풀 산식 + upsert
- `src/app/api/ingest/ranking-pool/route.ts` — 일배치 cron (04:30 KST)
- `supabase/migrations/0011_ranking.sql` — ranking_pool, ranking_snapshots 테이블

## 도메인 컨텍스트 / 가드레일
- 풀 조건 (모두 충족):
  1. `household_count ≥ 100`
  2. 다음 중 하나: 최근 90일 거래량 ≥ 지역 중앙값 OR 즐겨찾기 ≥ M명
- 카페 신호(cafe_signal_score)는 운영자가 별도 관리 — V1.0은 거래량+즐겨찾기만 자동화
- `ranking_pool.eligibility_reasons` — 조건 충족 이유 배열 (디버깅용)
- 환경변수로 파라미터 조정 가능: `RANKING_POOL_MIN_HOUSEHOLDS`, `RANKING_POOL_MIN_FAVORITES`

## 작업 목록
1. `pool.ts`: SQL 집계 쿼리 → `ranking_pool` upsert (score, eligibility_reasons)
2. Cron route: `CRON_SECRET` 검증 + 풀 갱신
3. Vitest: 거래 0건 단지 → 풀 제외 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 풀 실행 후 `ranking_pool` 레코드 존재
- [ ] 100세대 미만 단지 → 풀 제외 확인

## Definition of Done
랭킹 풀 완성. step5 랭킹 탭 산식 진입 가능.
