---
phase: 10
slug: edu-enhancement
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-15
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test -- --reporter=dot src/lib/hagwon-category.test.ts src/lib/data/facility-edu.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --reporter=dot src/lib/hagwon-category.test.ts src/lib/data/facility-edu.test.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | EDU-01 | T-10-01 | school_districts RLS no SELECT for anon | migration | `supabase db push` | ❌ W0 | ⬜ pending |
| 10-00-02 | 00 | 0 | EDU-02/03/05 | — | N/A | unit stub | `npm run test -- --reporter=dot src/lib/hagwon-category.test.ts` | ❌ W0 | ⬜ pending |
| 10-00-03 | 00 | 0 | EDU-02/03 | — | N/A | unit stub | `npm run test -- --reporter=dot src/lib/data/facility-edu.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-01 | 01 | 1 | EDU-01 | T-10-03/04 | WKT from local SHP only, no user input | script | `npx tsx scripts/import-school-districts.ts --dry-run 2>&1 \| head -30` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | EDU-01 | T-10-04 | No SUPABASE_DB_URL in stdout | db query | `supabase db query --linked "SELECT school_level, COUNT(*) FROM public.school_districts GROUP BY school_level"` | — | ⬜ pending |
| 10-02-01 | 02 | 2 | EDU-01 | T-10-05 | is_assignment updated via service_role script only | db query | `supabase db query --linked "SELECT school_type, COUNT(*) FROM public.facility_school WHERE is_assignment = true GROUP BY school_type"` | — | ⬜ pending |
| 10-02-02 | 02 | 2 | EDU-02/03 | T-10-06 | si from server-side complexes table only | unit | `npm run test -- --reporter=dot src/lib/data/facility-edu.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | EDU-01/02/03/04 | — | N/A | build | `npm run build` | — | ⬜ pending |
| 10-03-02 | 03 | 3 | EDU-04/05 | — | N/A | lint | `npm run lint` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/hagwon-category.test.ts` — stubs for EDU-03/05 (category classification)
- [ ] `src/lib/data/facility-edu.test.ts` — stubs for EDU-02/03 (kindergartens split, si percentile)
- [ ] `supabase/migrations/20260515000001_school_districts.sql` — schema for EDU-01

*Existing Vitest infrastructure covers all phase requirements. No new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 배정학교 강조 배지 UI 표시 | EDU-01 | 실제 DB 데이터 + 브라우저 렌더링 필요 | `/complexes/[id]` 접속 후 education card에서 배정학교에 "배정" 배지 확인 |
| 도보 시간 색깔 아이콘 | EDU-04 | 시각적 색상 검증 | 학교 거리별 초록/노랑/빨강 아이콘 3단계 확인 |
| 학원 목록 펼치기 | EDU-03 | 인터랙션 검증 | "외 N개" 버튼 클릭 시 전체 목록 펼쳐지는지 확인 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (3 files)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
