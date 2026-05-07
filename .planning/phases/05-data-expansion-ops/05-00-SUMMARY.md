---
phase: 05-data-expansion-ops
plan: "00"
subsystem: infra
tags: [github-actions, supabase, molit, backfill, workflow-dispatch]

requires:
  - phase: 04-community
    provides: 완성된 DB 스키마 22개 마이그레이션 (supabase/migrations/)

provides:
  - ".github/workflows/molit-backfill-once.yml — workflow_dispatch 수동 트리거 백필 워크플로우"
  - "프로덕션 Supabase DB 마이그레이션 적용 체크포인트 (운영자 수동 실행 필요)"

affects:
  - 05-01-DATA-03
  - 05-02-DATA-04
  - 05-03-DATA-05

tech-stack:
  added: []
  patterns:
    - "workflow_dispatch 전용 1회성 GitHub Actions 워크플로우 패턴"
    - "--resume 플래그로 ingest_runs 테이블 기반 중단 후 재개 패턴"

key-files:
  created:
    - ".github/workflows/molit-backfill-once.yml"
  modified: []

key-decisions:
  - "MOLIT 백필 워크플로우는 schedule 없이 workflow_dispatch 전용으로 설계 — 1회성 작업이므로 자동 실행 불필요"
  - "timeout-minutes: 300 설정 — MOLIT API 일 10,000회 한도로 창원+김해 전체 수집 시 최대 5시간 소요 가능"
  - "sgg_codes를 입력으로 받아 하루 3-5개씩 분할 실행 — API 한도 초과 방지"

patterns-established:
  - "workflow_dispatch inputs 패턴: 운영자가 직접 파라미터 입력하는 1회성 운영 워크플로우"
  - "--resume + ingest_runs 패턴: API 한도 초과 또는 중단 후 중복 없이 재개"

requirements-completed:
  - DATA-03
  - DATA-04
  - DATA-05
  - OPS-01

duration: 10min
completed: 2026-05-07
---

# Phase 5 Plan 00: Wave 0 — 프로덕션 DB 초기화 + MOLIT 백필 워크플로우 Summary

**GitHub Actions workflow_dispatch 전용 MOLIT 10년치 백필 워크플로우 생성 + 프로덕션 Supabase 마이그레이션 적용 체크포인트**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-07T07:26:00Z
- **Completed:** 2026-05-07T07:36:28Z
- **Tasks:** 2/3 (Task 1 운영자 수동 실행 대기, Task 2 완료, Task 3 검증 대기)
- **Files modified:** 1

## Accomplishments

- `.github/workflows/molit-backfill-once.yml` 생성 — sgg_codes 입력 기반 MOLIT 백필 수동 트리거 워크플로우
- `--resume` 플래그로 ingest_runs 테이블 기반 중단 후 재개 가능 구조
- timeout-minutes: 300 설정으로 MOLIT API 일 10,000회 한도 내 창원+김해 전 지역 수집 지원

## Task Commits

1. **Task 2: molit-backfill-once.yml 생성** - `373d747` (feat)

**Plan metadata:** 별도 docs 커밋 예정

## Files Created/Modified

- `.github/workflows/molit-backfill-once.yml` — workflow_dispatch 전용 MOLIT 백필 워크플로우 (secrets 기반 환경변수, --resume --sgg 플래그)

## Decisions Made

- workflow_dispatch 전용 (schedule 없음) — 1회성 백필이므로 자동 실행 불필요. 운영자 직접 트리거
- timeout-minutes: 300 — 창원+김해 전체를 3일에 나눠 실행해도 하루 최대 5시간 소요 가능
- sgg_codes를 input으로 받아 지역별 분할 실행 — MOLIT API 일 10,000회 한도 초과 방지

## Deviations from Plan

None — 계획대로 정확히 실행됨.

워크플로우 파일 내용은 PLAN에 명시된 YAML과 100% 동일하게 생성.

## Issues Encountered

None.

## User Setup Required

**Task 1 — 프로덕션 Supabase 마이그레이션 적용 (운영자 수동 실행 필요):**

```bash
# Step 1: 프로젝트 연결 (이미 링크되어 있으면 skip)
npx supabase link --project-ref auoravdadyzvuoxunogh

# Step 2: Dry-run 확인
npx supabase db push --linked --dry-run

# Step 3: 실제 마이그레이션 적용
npx supabase db push --linked

# Step 4: 검증
npx supabase migration list --linked | grep -c APPLIED
# → 22 이상이어야 함
```

**Task 3 — MOLIT 백필 실행 (Wave 1과 병행 가능):**

1. GitHub → Actions → "MOLIT Backfill (1회성)" → Run workflow
2. Day 1: sgg_codes = `48121,48123,48125` (창원 의창·성산·마산합포)
3. Day 2: sgg_codes = `48127,48129,48131` (창원 마산회원·진해·나머지)
4. Day 3: sgg_codes = `48250` (김해)
5. 각 실행 후 Supabase Dashboard → transactions 테이블 row 수 확인

**GitHub Secrets 설정 필요 (백필 실행 전):**
- `MOLIT_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Next Phase Readiness

- **Wave 1 시작 조건:** Task 1 (db push) 완료 후 Wave 1 실행 가능
- `.github/workflows/molit-backfill-once.yml` 커밋 완료 — GitHub Actions에서 즉시 트리거 가능
- MOLIT 백필은 Wave 1과 병행 실행 가능 (ingest_runs 테이블로 중복 방지)

---
*Phase: 05-data-expansion-ops*
*Completed: 2026-05-07*

## Self-Check: PASSED

- `.github/workflows/molit-backfill-once.yml` — FOUND
- Commit `373d747` — FOUND
