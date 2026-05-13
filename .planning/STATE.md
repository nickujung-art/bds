---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-13T00:00:00Z"
last_activity: 2026-05-13 — Phase 8 COMPLETE (7/7 plans — Wave 0~3 완료, V2.0 커뮤니티 심화)
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 34
  completed_plans: 34
  percent: 95
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

**Phase 6: AI·차별화 기술** 📋 Planned

Goal: Claude API RAG 봇 + SGIS 통계 + 광고 고도화 + GPS L2/L3 인증

Requirements: DIFF-03, DATA-06~07, AD-01~02, AUTH-01

Plans: 5 plans ready (06-00 ~ 06-04) — planned 2026-05-08

Next step: /gsd-execute-phase 6 (start with Wave 0: 06-00-PLAN.md)

---

**Phase 7: 데이터 파이프라인 수리** ✅ Complete

Goal: KAPT 단지정보 적재 + transactions↔complexes 연결 + ingestMonth 수정 — 서비스 데이터 기반 완성

Requirements: DATA-08~10

Plans: 3/3 complete (07-01 ~ 07-03) — verified 2026-05-11

---

**Phase 8: 커뮤니티 심화·자동화** ✅ Complete

Goal: 게이미피케이션 + 카페 NLP 연동 + 카카오톡 채널 + 비교 모드 + 카페 자동 발행. V2.0 완성.

Requirements: DIFF-01~02, DIFF-04~06, OPS-02

Plans: 7/7 complete (08-00 ~ 08-06) — completed 2026-05-13

Waves:
- Wave 0: 08-00 (DB 마이그레이션) ✅
- Wave 1: 08-01 (TierBadge), 08-03 (비교 모드) ✅
- Wave 2: 08-02 (알림 우선순위), 08-04 (Naver 카페 NLP), 08-05 (카카오 채널 구독) ✅
- Wave 3: 08-06 (어드민 복사 버튼) ✅

## Phase Progress

| # | Phase | Status |
|---|-------|--------|
| 1 | 보안·인프라·배포 | ✅ Complete |
| 2 | 랭킹·랜딩·공유 | ✅ Complete |
| 3 | 카드뉴스·법적·운영 | ✅ Complete (5/5 plans) |
| 4 | 커뮤니티 기초 | ✅ Complete |
| 5 | 데이터 확장·운영 안정성 | ✅ Complete |
| 6 | AI·차별화 기술 | 📋 Planned |
| 7 | 데이터 파이프라인 수리 | ✅ Complete |
| 8 | 커뮤니티 심화·자동화 | ✅ Complete (7/7 plans) |

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
