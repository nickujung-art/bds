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

### 필드 유효성 검증 규칙 (zod)
국토부 API 응답은 null·0·미래일자 등 비정상 값을 반환할 수 있다. 다음 규칙을 zod 스키마에 반드시 포함:
- `price`: 양의 정수. 0 또는 음수 → 해당 row 건너뜀 + Sentry warn
- `area_m2`: 양의 실수. 0 이하 → 건너뜀
- `deal_date`: 과거 날짜만 허용 (`≤ today`). 미래 날짜 → 건너뜀 + Sentry warn
- `floor`: null 허용 (지상 구분 불명확 케이스 존재)
- `is_direct_deal`: null → `false`로 기본값 처리
- **스키마 변경 감지**: zod `safeParse` 실패율이 배치 내 5% 초과 시 Sentry alert + 해당 배치 중단 (API 스키마 변경 조기 감지)

### superseded_by 체인 방어
- `superseded_by`는 depth 1만 허용. 정정의 정정(체인) 감지 시: 최종 row가 이전 정정을 직접 supersede하도록 재링크 (`UPDATE ... SET superseded_by = :new_id WHERE id = :old_superseded`)
- 순환 참조 방지: INSERT 전 `superseded_by = self.id` 체크 → 차단

### 백필 재개(Restart) 정책
- `ingest_runs` 테이블에 `(sgg_code, year_month, page, status)` 저장
- 백필 중단 시 마지막 성공 `(sgg_code, year_month, page)` 이후부터 재개 (`--resume` 플래그)
- 전체 재실행 시 `--force` 플래그 필요 (의도치 않은 재실행 방지)

## 작업 목록
1. `molit.ts` zod 스키마: 위 필드 유효성 규칙 포함. `safeParse` 실패율 5% 초과 시 Sentry alert + 배치 중단
2. `rate-limit.ts`: token bucket (1req/s, burst 5)
3. `realprice.ts`: `upsertTransactions(rows)` — ON CONFLICT (dedupe_key) DO UPDATE. `superseded_by` 체인 depth 체크 포함
4. `backfill-realprice.ts`: `ingest_runs` 기반 `--resume` / `--force` 플래그. 마지막 성공 페이지부터 재개
5. Cron route: `CRON_SECRET` 검증 → 최근 3개월 갱신 → `ingest_runs` 기록
6. GitHub Actions `backfill.yml`: `workflow_dispatch` 트리거, 실패 시 이메일 알림

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (molit 어댑터 zod 검증 + upsert 멱등성 테스트)
- [ ] 동일 dedupe_key로 2회 upsert → DB에 1건만 존재
- [ ] 취소 신고 = `cancel_date` 채움, `WHERE cancel_date IS NULL` 쿼리 시 제외됨
- [ ] `CRON_SECRET` 없이 POST /api/ingest/molit-trade → 401
- [ ] rate-limit 1req/s 검증 (Vitest 모킹)
- [ ] price=0인 row → skip + Sentry warn (Vitest)
- [ ] 미래 deal_date row → skip (Vitest)
- [ ] zod 실패율 > 5% → Sentry alert + 배치 중단 (Vitest)
- [ ] `--resume` 플래그: 중단된 지점부터 재개, 이전 완료 row 재처리 없음 (Vitest)

## Definition of Done
매매 거래 10년치 백필 가능 + 일배치 cron 준비 완료.
