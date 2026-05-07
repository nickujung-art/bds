# Phase 5: 데이터 확장·운영 안정성 - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

단지 상세에 재건축 타임라인(DATA-03), 가성비 4분면 차트(DATA-04), 매물가 갭 라벨 인프라(DATA-05) 추가 + DB 백업 자동화(OPS-01) + 프로덕션 DB 마이그레이션·백필(danjiondo 신규 프로젝트에 테이블 없음).

V1.5 마일스톤 완성. 기존 `transactions` 대원칙(`cancel_date IS NULL AND superseded_by IS NULL`) 유지 필수.

**중요 발견:** 신규 danjiondo Supabase 프로젝트(auoravdadyzvuoxunogh)에 아직 테이블이 없음 — `supabase db push` + 10년치 MOLIT 재백필이 Phase 5 Wave 0에 반드시 포함되어야 함.

</domain>

<decisions>
## Implementation Decisions

### 가성비 4분면 차트 (DATA-04)
- **D-01:** 단지 상세 페이지(`src/app/complexes/[id]/page.tsx`) 인라인에 삽입. 별도 페이지 없음.
- **D-02:** 차트 데이터 = 같은 시·구의 모든 단지(미색 점) + 현재 단지(주황 하이라이트). 지역 비교 컨텍스트 제공.
- **D-03:** X축(평당가) · Y축(학군점수) 모두 해당 시·구의 중앙값 기준으로 4분할. 절대값 기준 아님.
- **D-04:** 4분면 라벨:
  - 좌상단(저평당가 + 높은 학군) = **가성비**
  - 우상단(고평당가 + 높은 학군) = **프리미엄**
  - 좌하단(저평당가 + 낮은 학군) = **현실적**
  - 우하단(고평당가 + 낮은 학군) = **주의**
- **D-05:** Recharts `ScatterChart` 사용 (이미 설치됨). ISR 페이지이므로 `'use client'` 차트 컴포넌트로 분리.

### 매물가 갭 인프라 (DATA-05)
- **D-06:** Phase 5 범위 = `listing_prices` 테이블 스키마 생성 + 어드민 수동 입력 UI만. UI 갭 라벨 표시는 Phase 6으로 defer (KB시세 API 연동 후).
- **D-07:** `listing_prices(id UUID PK, complex_id UUID FK complexes, price_per_py INT, recorded_date DATE, source TEXT, created_by UUID FK profiles, created_at TIMESTAMPTZ)`. 어드민 RLS: insert/update/delete는 admin role만.
- **D-08:** 갭 라벨 UI는 KB API 연동 완료 전까지 단지 상세에 표시하지 않음.

### DB 백업 자동화 (OPS-01)
- **D-09:** 백업 전용 별도 GitHub private repo 생성 (`nickujung-art/danjiondo-backup` 또는 유사).
- **D-10:** 인증: `SUPABASE_DB_URL`을 GitHub Secrets에 저장. Supabase Dashboard > Project Settings > Database > URI.
- **D-11:** GitHub Actions 주간 workflow — 매주 일요일 04:00 KST `pg_dump` 실행 → `.sql.gz` 파일로 backup repo에 push.
- **D-12:** 백업 파일명 패턴: `backup-{YYYY-MM-DD}.sql.gz`. 90일 보관 후 자동 삭제 (workflow 내 cleanup step).

### 프로덕션 DB 초기화 (신규 발견)
- **D-13:** danjiondo 프로젝트(auoravdadyzvuoxunogh)에 테이블 없음 확인. Phase 5 Wave 0에 `supabase db push` [BLOCKING] 포함.
- **D-14:** 10년치 실거래가 재백필: `scripts/backfill-realprice.ts`를 신규 DB에 대해 GitHub Actions 1회성 실행. MOLIT API 일 10,000회 한도 고려 — 지역별 청크 분할 실행.

### Claude's Discretion
아래 영역은 사용자가 논의하지 않았으므로 Claude가 기존 패턴에 맞게 구현:
- **DATA-03 타임라인 UI**: `redevelopment_projects` 테이블(10단계 enum) 활용. 단지 상세 페이지에 수평 step 시퀀스 표시 — 현재 단계 강조, 완료된 단계 채움, 미래 단계 미색. 재건축 단지(`status='in_redevelopment'`)에만 표시.
- **DATA-03 어드민 입력**: 신규 `/admin/redevelopment` 페이지. `createSupabaseAdminClient()` 경유. 단지 검색 → 단계 선택 → notes 입력 → upsert.
- **DATA-03 RLS**: `redevelopment_projects`에 admin write 정책 추가 (현재 public read만 있음).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 아키텍처 규칙
- `CLAUDE.md` — 모든 쿼리 대원칙, RLS 필수, createSupabaseAdminClient() 경유, 서비스 어댑터 격리
- `.planning/STATE.md` — Vercel Hobby 한도, GitHub Actions cron 패턴, Golden Record 원칙

### 요구사항 및 로드맵
- `.planning/REQUIREMENTS.md` — DATA-03~05, OPS-01 전체 요건 정의
- `.planning/ROADMAP.md` §Phase 5 — 목표, 성공 기준 4개

### DB 스키마 (기존)
- `supabase/migrations/20260430000009_rls.sql` — `redevelopment_projects` + `redevelopment_phase` enum (10단계), RLS 정책 패턴
- `supabase/migrations/20260430000002_complexes.sql` — `complexes.status` 필드 (`'in_redevelopment'` 포함)

### 기존 코드 패턴
- `src/components/complex/TransactionChart.tsx` — Recharts 사용 패턴 (ScatterChart 추가 참조)
- `src/app/complexes/[id]/page.tsx` — 단지 상세 페이지 구조 (4분면 차트·타임라인 삽입 위치)
- `scripts/backfill-realprice.ts` — MOLIT 백필 스크립트 (신규 DB에 재실행)
- `.github/workflows/cafe-code-weekly.yml` — GitHub Actions cron 패턴 (OPS-01 참조)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `redevelopment_projects` 테이블 + `redevelopment_phase` enum: 이미 존재. admin write RLS 추가만 필요.
- `TransactionChart.tsx`: Recharts LineChart 패턴. ScatterChart는 같은 라이브러리에서 추가 가능.
- `scripts/backfill-realprice.ts`: MOLIT 백필 스크립트. 신규 DB URL로 환경 변수만 바꿔 재실행 가능.
- GitHub Actions cron 패턴 (`.github/workflows/`): `cafe-code-weekly.yml`, `weekly-digest.yml` 참조.

### Established Patterns
- **ISR 패턴**: `createReadonlyClient()` + `export const revalidate = N` — 단지 상세 페이지 이미 적용
- **Admin 패턴**: `createSupabaseAdminClient()` + admin role guard
- **차트 컴포넌트 분리**: `'use client'` 컴포넌트로 RSC에서 분리 (TransactionChart 패턴)
- **GitHub Actions 주간 cron**: `on: schedule: - cron: '0 19 * * 0'` (KST 일요일 04:00)

### Integration Points
- 4분면 차트 → `complexes` 테이블 평당가 + 학군점수 집계 쿼리 (시·구 필터)
- 재건축 타임라인 → `redevelopment_projects.phase` → 단지 상세 페이지 조건부 표시
- listing_prices → `complexes` (complex_id FK)
- pg_dump 백업 → GitHub backup repo (별도 생성)

</code_context>

<specifics>
## Specific Ideas

- 4분면 라벨 정확히: 좌상=가성비, 우상=프리미엄, 좌하=현실적, 우하=주의 (한국 부동산 용어)
- 백업 파일명: `backup-{YYYY-MM-DD}.sql.gz`, 90일 후 자동 삭제
- `listing_prices` 테이블은 Phase 5에서 스키마만 만들고 UI는 Phase 6 (KB시세 API 연동 후 갭 라벨 표시)
- 프로덕션 DB 초기화는 Wave 0에서 [BLOCKING] supabase db push + 이후 1회성 백필

</specifics>

<deferred>
## Deferred Ideas

- 갭 라벨 UI 표시 (매물가 vs 실거래가) → Phase 6 (KB시세 API 연동 후)
- KB시세 API 자동 연동 → Phase 6 (제휴 후 `listing_prices` 자동 수집)
- 가성비 차트 별도 /analysis 지역 비교 페이지 → Phase 7 이후
- 구 MVP 프로젝트 데이터 ETL (스키마 다름) → MOLIT 재백필로 대체함

</deferred>

---

*Phase: 5-데이터확장운영안정성*
*Context gathered: 2026-05-07*
