---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-08T00:00:00Z"
last_activity: 2026-05-08 — Phase 5 COMPLETE (05-04 pg_dump backup + E2E fix)
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 24
  completed_plans: 24
  percent: 100
---

# Project State — 단지온도

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06)

**Core value:** 창원·김해 실수요자가 "이 단지 사도 되는지" 데이터와 이웃 의견으로 30분 안에 결정 짓게 한다.
**Current focus:** Phase 4 complete — Phase 5 (데이터 확장·운영 안정성) next

## Current Phase

**Phase 5: 데이터 확장·운영 안정성** ✅ Complete

Goal: 단지 데이터 깊이 확장 (재건축·가성비·갭) + 운영 백업 자동화로 V1.5 완성

Requirements: DATA-03~05, OPS-01

Plans: 5/5 complete (05-00 ~ 05-04) — verified 2026-05-08

---

**Phase 6: AI·차별화 기술** ⬜ Not Started

Goal: Claude API RAG 봇 + SGIS 통계 + 광고 고도화 + GPS L2/L3 인증

Requirements: DIFF-03, DATA-06~07, AD-01~02, AUTH-01

Next step: /gsd-discuss-phase 6

## Phase Progress

| # | Phase | Status |
|---|-------|--------|
| 1 | 보안·인프라·배포 | ✅ Complete |
| 2 | 랭킹·랜딩·공유 | ✅ Complete |
| 3 | 카드뉴스·법적·운영 | ✅ Complete (5/5 plans) |
| 4 | 커뮤니티 기초 | ✅ Complete |
| 5 | 데이터 확장·운영 안정성 | ✅ Complete |
| 6 | AI·차별화 기술 | ⬜ Not Started |
| 7 | 커뮤니티 심화·자동화 | ⬜ Not Started |

## Key Context for Agents

- **Brownfield**: V0.9 MVP 완성 (로컬). 인증은 Supabase Auth (`@supabase/ssr`) — NextAuth 없음
- **보안 우선**: CONCERNS.md에 Critical 3건 문서화 — Phase 1에서 전부 수정
- **Vercel Hobby 한도**: 1일 cron 1회. 5분 알림 워커는 GitHub Actions `.github/workflows/notify-worker.yml`
- **Golden Record**: `complexes` 테이블. 이름 단독 매칭 금지 — 항상 좌표+이름 복합
- **거래 쿼리**: `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함
- **광고 쿼리**: `now() BETWEEN starts_at AND ends_at AND status='approved'` 항상 포함
- **서비스 롤**: `createSupabaseAdminClient()` 단일 경유 — SEC-02 완료 후

## Decisions Log

| Date | Decision | Phase |
|------|----------|-------|
| 2026-05-06 | Supabase Auth 유지 (NextAuth 전환 안 함) | Init |
| 2026-05-06 | 카드뉴스 파이프라인 V1.0 포함 | Init |
| 2026-05-06 | 비교 모드·주간 다이제스트·DB 백업을 V1.5로 defer | Init |
| 2026-05-07 | JSX extracted from route.ts to CardnewsLayout.tsx for Vitest/esbuild compat | 03-03 |
| 2026-05-07 | cardnews.test.ts mocks @/lib/supabase/server (same pattern as consent-actions) | 03-03 |
| 2026-05-07 | visible h1 in SidePanel (not sr-only) — Playwright toBeVisible() requires non-zero bounding box | 03-05 |
| 2026-05-07 | global-setup warn-not-throw on Supabase unavailability — enables a11y tests without DB | 03-05 |
| 2026-05-07 | map page .catch(()=>[]) for Supabase errors — 200 with empty state vs 500 | 03-05 |
| 2026-05-07 | MOLIT 백필 workflow_dispatch 전용 (schedule 없음) — 1회성이므로 자동 실행 불필요 | 05-00 |
| 2026-05-07 | timeout-minutes: 300 — API 한도(일 10,000회)로 창원+김해 전체 3일 분할 실행 최대 5시간 | 05-00 |
| 2026-05-07 | MOLIT 백필 실행은 Wave 1과 병행하여 별도로 진행 — 05-00 COMPLETE, Wave 1 블로킹 해제 | 05-00 |

---
*Initialized: 2026-05-06*
