# Step 5 (1-launch): ranking-tabs

## 목표
랭킹 4종 산식을 구현하고 API와 캐시 cron을 설정한다.

## 전제 (Prerequisites)
- step4 완료 (ranking_pool)

## 적용 범위 (Scope)
- `src/lib/ranking/tabs.ts` — 4종 산식
- `src/app/api/ranking/[type]/route.ts` — 랭킹 API (ISR 1h)
- `src/app/api/ingest/ranking-snapshots/route.ts` — 1h cron

## 도메인 컨텍스트 / 가드레일
| 탭 | 산식 | 갱신 |
|---|---|---|
| new_high | 단지·평형별 7일 직전 최고가 대비 갱신폭 | 1h |
| volume_spike | 전월 대비 거래량 증가율 (최소 거래수 게이트) | 일 1회 |
| cafe_buzz | (V1.0은 즐겨찾기 급등으로 대체) | 1h |
| favorites_spike | 즐겨찾기 신규 7일 합계 | 일 1회 |

- 풀 안에서만 계산 (ranking_pool 참조)
- `cancel_date IS NULL AND superseded_by IS NULL` 거래만

## 작업 목록
1. `tabs.ts`: 4종 산식 SQL 함수 + `ranking_snapshots` upsert
2. `ranking/[type]/route.ts`: top 20 반환 + `revalidate = 3600`
3. 1h cron 등록 (`vercel.json`)
4. Vitest: new_high 산식 — 직전 최고가 대비 계산 정확성

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (산식 정확성)
- [ ] `/api/ranking/new_high` → 상위 20개 단지 반환
- [ ] `ranking_snapshots` 테이블에 타임스탬프별 스냅샷 저장

## Definition of Done
랭킹 API 완성. 랜딩 페이지(step6) 구현 가능.
