---
phase: 05-data-expansion-ops
plan: "04"
subsystem: ops
tags: [github-actions, pg_dump, backup, cron, secrets]

# Dependency graph
requires:
  - phase: 05-data-expansion-ops/05-00
    provides: DB initialized, supabase linked

provides:
  - .github/workflows/db-backup.yml: 주간 pg_dump 자동화 + dump 크기 검증 + 90일 cleanup

affects:
  - OPS-01 완료 → V1.5 완성 조건 충족

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub Actions schedule cron + workflow_dispatch 병행"
    - "Fine-grained PAT으로 백업 repo push (최소 권한 원칙)"
    - "set -e + 파일 크기 검증으로 silent pg_dump 실패 방지"
    - "90일 rolling cleanup: git rm + commit으로 이력 보존"

key-files:
  created:
    - .github/workflows/db-backup.yml
  modified: []

key-decisions:
  - "cron '0 19 * * 6' — 토요일 19:00 UTC = 일요일 04:00 KST (D-11 준수)"
  - "dump 파일 크기 1000바이트 미만 시 exit 1 — 빈 파일 커밋 방지 (M-6)"
  - "BACKUP_PAT: Fine-grained PAT 권장 (danjiondo-backup repo Contents write만)"
  - "SUPABASE_DB_URL: Direct connection URI — Transaction Pooler URL은 pg_dump 비호환"

requirements-completed:
  - OPS-01

# Metrics
duration: included in 05-04 commit
completed: 2026-05-08
---

# Phase 5 Plan 04: DB 백업 자동화 (pg_dump + GitHub Actions) Summary

**매주 일요일 04:00 KST pg_dump → nickujung-art/danjiondo-backup private repo. dump 크기 검증 + 90일 rolling cleanup.**

## Performance

- **Completed:** 2026-05-08
- **Commit:** `7e7df3a` (feat(05-04))
- **Files modified:** 1 (+ 5 test type fixes)

## Accomplishments

- `.github/workflows/db-backup.yml` 생성: 주간 pg_dump 자동화
  - `cron: '0 19 * * 6'` — 토요일 19:00 UTC = 일요일 04:00 KST
  - `workflow_dispatch: {}` — 수동 테스트 트리거 지원
  - `timeout-minutes: 15`
  - postgresql-client apt-get 설치 step
  - `SUPABASE_DB_URL` GitHub Secrets 참조 (log 출력 없음)
  - dump 파일 크기 검증 (1000바이트 미만 시 exit 1)
  - `BACKUP_PAT` GitHub Secrets 참조로 danjiondo-backup repo push
  - 90일 이전 `backup-*.sql.gz` 자동 git rm + cleanup commit
- Phase 5 테스트 타입 오류 수정 (DB 타입 재생성 후 발생):
  - `status: 'active' as const` (complex-search, complex-matching-3b 픽스처)
  - `status: 'invalid_status' as any` (schema integration test)
  - `as unknown` cast (consent-actions mock helpers)
  - `import type Database` (ads.test.ts)

## Task Commits

1. **Task 1: 사전 준비** — 운영자 수동 작업 (GitHub Secrets, backup repo 생성)
2. **Task 2: db-backup.yml 생성 + 타입 픽스** — `7e7df3a`

## Files Created/Modified

- `.github/workflows/db-backup.yml` — pg_dump 워크플로우 (cron + workflow_dispatch)
- `src/__tests__/ads.test.ts` — import type 픽스
- `src/__tests__/complex-matching-3b.test.ts` — status as const 픽스
- `src/__tests__/complex-search.test.ts` — status as const 픽스
- `src/__tests__/consent-actions.test.ts` — as unknown cast 픽스
- `src/__tests__/schema.integration.test.ts` — as any 픽스

## Decisions Made

- D-11: cron `'0 19 * * 6'` — 6=토요일, 19:00 UTC + 9h = 일요일 04:00 KST. `'0 19 * * 0'`은 월요일 04:00 KST (오류)
- D-12: 파일명 `backup-YYYY-MM-DD.sql.gz`, 90일 보관 후 자동 삭제
- M-6: dump 크기 1000바이트 미만 = pg_dump 실패로 간주, exit 1

## User Setup Required

운영자가 직접 완료해야 하는 사전 작업:
1. `nickujung-art/danjiondo-backup` GitHub private repo 생성 (README.md 초기화 포함)
2. `SUPABASE_DB_URL` GitHub Secrets 등록 (Direct connection URI — Transaction Pooler 아님)
3. `BACKUP_PAT` GitHub Secrets 등록 (Fine-grained PAT — danjiondo-backup Contents write만)
4. GitHub Actions → "DB Backup" → "Run workflow" 수동 1회 실행으로 검증

## 복구 런북

1. `nickujung-art/danjiondo-backup`에서 최근 `backup-YYYY-MM-DD.sql.gz` 다운로드
2. `gunzip backup-YYYY-MM-DD.sql.gz`
3. `psql "$TARGET_DB_URL" < backup-YYYY-MM-DD.sql`
4. `npx supabase migration list --linked` 으로 마이그레이션 상태 확인

## Next Phase Readiness

- OPS-01 완료 → V1.5 완성 조건 충족
- Phase 5 전체 완료 → Phase 6 (AI·차별화 기술) 진입 가능

---
*Phase: 05-data-expansion-ops*
*Completed: 2026-05-08*
