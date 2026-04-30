# Step 2: db-schema

## 목표
모든 핵심 테이블 + 인덱스 + RLS 정책을 마이그레이션 파일로 생성한다. 이 step이 끝나면 `supabase db push`로 로컬 DB에 스키마가 적용되고, Vitest로 RLS 정책이 검증된다.

## 전제 (Prerequisites)
- Step 1 완료 (Supabase 연결)

## 적용 범위 (Scope)
```
supabase/migrations/
  0001_init_complexes.sql          -- complexes, complex_aliases, complex_match_queue
  0002_transactions.sql           -- transactions (deal_subtype, superseded_by, dedupe_key)
  0003_facility.sql               -- facility_school, facility_kapt, facility_poi
  0004_users.sql                  -- profiles, favorites, push_subscriptions
  0005_notifications.sql          -- notifications
  0006_ads.sql                    -- ad_campaigns, ad_events
  0007_data_sources.sql           -- data_sources, data_source_runs, ingest_runs
  0008_admin.sql                  -- audit_logs, ai_estimates, redevelopment_projects(구조만)
  0009_indexes.sql                -- 핵심 인덱스 + RLS 정책 전체
```
- `src/types/db.ts` — Supabase CLI `gen types` 자동 생성

## 도메인 컨텍스트 / 가드레일
- ADR-033: complexes = Golden Record. `complex_aliases` 별칭 학습 구조 필수
- ADR-022: `transactions.dedupe_key UNIQUE` — 6필드 복합 키
- ADR-038: `transactions.superseded_by`, `cancel_date` 컬럼 필수
- ADR-035: `complexes.status` enum 6단계 + `predecessor_id`/`successor_id` self-FK
- ADR-025: `ad_campaigns.status` enum (draft→pending→approved→ended)
- RLS (CLAUDE.md):
  - `favorites`, `notifications`, `push_subscriptions`: `auth.uid() = user_id`만
  - `complexes`, `transactions`, `facility_*`: 전체 SELECT. INSERT/UPDATE = service_role
  - `ad_campaigns`: advertiser = 본인만. status='approved'만 일반 SELECT
  - `ad_events`: 일반 = INSERT만

## 작업 목록
1. **0001**: `complexes` — uuid PK, 6단계 status enum, predecessor_id/successor_id FK, PostGIS geometry, name_normalized, data_completeness jsonb
2. **0001**: `complex_aliases` — source enum, confidence, UNIQUE(complex_id, source, alias_name)
3. **0001**: `complex_match_queue` — reason enum, status enum
4. **0002**: `transactions` — deal_type/deal_subtype enum, cancel_date, superseded_by FK, dedupe_key UNIQUE, source_run_id FK
5. **0003**: 시설 3종 테이블 — PRIMARY KEY 구조
6. **0004**: `profiles` (auth.users 확장) + `favorites` + `push_subscriptions`
7. **0005**: `notifications` — UNIQUE(user_id, event_type, target_id, dedupe_key)
8. **0006**: `ad_campaigns` + `ad_events` — status 머신, ip_hash 컬럼
9. **0007**: `data_sources`, `data_source_runs`, `ingest_runs` — status enum, consecutive_failures
10. **0008**: `audit_logs`, `ai_estimates` (status enum), `redevelopment_projects` (phase enum)
11. **0009**: 모든 인덱스 + RLS 정책
12. `supabase gen types typescript --local > src/types/db.ts`
13. Vitest integration test: 비인증 사용자가 `favorites`에 SELECT 시도 → 차단 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run db:push` 에러 없음
- [ ] `npm run lint` + `npm run build` + `npm run test` 통과
- [ ] `src/types/db.ts` 생성됨 (Supabase 타입 자동 생성)
- [ ] Vitest RLS 테스트: `favorites` 비인증 SELECT → 0건 반환 (Row Level Security 작동)
- [ ] Vitest: `transactions`에 동일 `dedupe_key` 두 번 insert → 두 번째 UNIQUE 오류
- [ ] `complexes.status` enum 6개 값 유효성 검증

## Definition of Done
모든 마이그레이션 적용 완료. step3 이후 ingest 작업을 위한 테이블 구조 준비 완료.
