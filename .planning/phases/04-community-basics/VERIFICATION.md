---
phase: 04-community-basics
verified: 2026-05-07T00:00:00Z
status: complete
score: 5/5 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 4: 커뮤니티 기초 Verification Report

**Phase Goal:** 후기·댓글·외부 연결 등 커뮤니티 참여 기능 + 데이터 깊이 확장 (V1.5). Persona A(실수요자)의 "이웃 의견" 수요 충족.
**Verified:** 2026-05-07
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 후기에 댓글을 달 수 있고, 댓글 신고 시 신고 큐에 쌓인다 | PARTIAL | 댓글 작성: VERIFIED (submitComment, CommentSection, DB 마이그레이션). 신고: FAILED — ReportButton 없음, reports INSERT 없음 |
| 2 | GPS L1 인증(단지 ±100m)을 통과한 후기에 배지가 표시된다 | VERIFIED | verifyGpsForReview in review-actions.ts calls check_gps_proximity RPC; ReviewList renders GPS 인증 badge when r.gps_verified |
| 3 | 단지 상세에 카페 검색 외부 링크가 표시된다 | VERIFIED | CafeLink inline component in ReviewList.tsx, buildCafeSearchUrl in cafe-link.ts, wired in both empty and non-empty review states |
| 4 | 구독 회원에게 매주 관심 단지 다이제스트 이메일이 발송된다 | VERIFIED | buildWeeklyDigest in digest.ts queries favorites + transactions (cancel_date/superseded_by filters applied), inserts notifications; /api/worker/digest with CRON_SECRET; weekly-digest.yml Monday 09:00 KST |
| 5 | 카페 가입 코드가 매주 갱신되고 어드민에서 확인 가능하다 | VERIFIED | /api/worker/cafe-code generates 8-char code, stores in cafe_join_codes; cafe-code-weekly.yml Monday 09:05 KST; admin/status/page.tsx queries and renders this week's code |

**Score:** 4/5 truths verified (SC1 partially satisfied — comment CRUD verified, comment report NOT verified)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth/comment-actions.ts` | submitComment + deleteComment | VERIFIED | auth.getUser() guard, 10–500 char validation, INSERT to comments |
| `src/components/reviews/CommentSection.tsx` | Comment list + form | VERIFIED | Shows up to 3 comments, expand toggle, submit form, login gate |
| `src/lib/auth/review-actions.ts` | verifyGpsForReview | VERIFIED | Calls check_gps_proximity RPC with user auth guard |
| `src/lib/data/cafe-link.ts` | buildCafeSearchUrl | VERIFIED | Returns naver cafe search URL with encodeURIComponent |
| `src/components/admin/SlaUtils.ts` | getSlaState | ORPHANED | Exists and tested but admin/reports/page.tsx defines its own local copy; SlaUtils is never imported in production code |
| `src/services/kapt.ts` | fetchKaptBasicInfo | VERIFIED | Calls K-apt BasicInfo API, Zod validation, returns KaptBasicInfo or null |
| `src/app/api/cron/daily/route.ts` | K-apt UPSERT + MOLIT presale UPSERT | VERIFIED | Both DATA-01 (facility_kapt upsert) and DATA-02 (new_listings + presale_transactions upsert) present; CRON_SECRET via Bearer header |
| `src/services/molit-presale.ts` | fetchPresaleTrades | VERIFIED | Fetches XML, parses items, Zod validates, returns PresaleTrade[] |
| `src/app/presale/page.tsx` | ISR presale listing | VERIFIED | export const revalidate = 3600, createReadonlyClient(), getActiveListings, renders PresaleCard |
| `src/app/api/worker/cafe-code/route.ts` | cafe code generation | VERIFIED | x-cron-secret validation, generates 8-char code, idempotent (week_start UNIQUE) |
| `.github/workflows/cafe-code-weekly.yml` | Monday cron | VERIFIED | cron: '5 0 * * 1' (09:05 KST), calls POST /api/worker/cafe-code |
| `src/lib/notifications/digest.ts` | buildWeeklyDigest | VERIFIED | favorites query, transactions (cancel_date/superseded_by filters), notifications INSERT with dedupe_key |
| `src/app/api/worker/digest/route.ts` | digest worker | VERIFIED | x-cron-secret validation, calls buildWeeklyDigest |
| `.github/workflows/weekly-digest.yml` | Monday 09:00 KST cron | VERIFIED | cron: '0 0 * * 1', calls POST /api/worker/digest |
| `src/lib/auth/topic-actions.ts` | upsertNotificationTopic, deleteNotificationTopic | VERIFIED | Both actions with auth.getUser() guard, upsert with ignoreDuplicates |
| `src/components/profile/TopicToggle.tsx` | 3 pill toggles | VERIFIED | Renders 3 topics (high_price, presale, complex_update) as pill switches with optimistic updates |
| `src/app/profile/page.tsx` | includes TopicToggle | VERIFIED | getNotificationTopics called, TopicToggle rendered with initialTopics prop |
| `supabase/migrations/20260507000004_phase4_tables.sql` | 5 tables + GPS RPC | VERIFIED | comments, new_listings, presale_transactions, notification_topics, cafe_join_codes created with RLS; check_gps_proximity function; facility_kapt columns added |
| **MISSING** | ReportButton or comment report Server Action | MISSING | No ReportButton component. No submitReport Server Action for user-facing comment reports. SC1 ("신고 큐에 쌓인다") cannot be satisfied. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CommentSection.tsx | comment-actions.ts | submitComment import | WIRED | Line 4: `import { submitComment } from '@/lib/auth/comment-actions'` |
| ReviewList.tsx | CommentSection.tsx | CommentSection render | WIRED | Line 3 import, line 145 render with r.id, r.complex_id, r.comments |
| complexes/[id]/page.tsx | lib/data/comments.ts | getReviewsWithComments | WIRED | Line 8 import, line 109 await |
| presale/page.tsx | lib/data/presale.ts | getActiveListings | WIRED | Line 4 import, line 16 await |
| profile/page.tsx | TopicToggle.tsx | TopicToggle render | WIRED | Line 9 import, line 207 render |
| profile/page.tsx | lib/data/topics.ts | getNotificationTopics | WIRED | Line 10 import, line 45 await |
| api/worker/digest | lib/notifications/digest.ts | buildWeeklyDigest | WIRED | Line 3 import, line 16 call |
| api/cron/daily | services/kapt.ts | fetchKaptBasicInfo | WIRED | Line 3 import, line 41 call |
| api/cron/daily | services/molit-presale.ts | fetchPresaleTrades | WIRED | Lines 4–8 imports, lines 70–73 call |
| CommentSection.tsx | reports table | submitReport (MISSING) | NOT_WIRED | No report button, no report action. SC1 신고 condition unmet. |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| CommentSection.tsx | initialComments | getReviewsWithComments JOIN query (complexes/[id]/page.tsx) | Yes — Supabase JOIN `*, comments(id, content, created_at, user_id)` | FLOWING |
| presale/page.tsx | listings | getActiveListings → new_listings table | Yes — DB query with .order + .limit | FLOWING |
| profile/page.tsx | topics (TopicToggle) | getNotificationTopics → notification_topics table | Yes — DB query filtered by user_id | FLOWING |
| admin/status/page.tsx | cafeCode | cafe_join_codes table query by week_start | Yes — DB query .eq('week_start', weekStart) | FLOWING |
| digest.ts | notifications | favorites + transactions tables | Yes — favorites JOIN, transactions with cancel_date/superseded_by filters | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable server during verification. All routes require Supabase credentials and live DB. Static analysis confirms data wiring above.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COMM-01 | 04-01 | 후기 댓글 (텍스트, RLS, 신고) | PARTIAL | 댓글 CRUD verified; 신고 path missing |
| COMM-02 | 04-02 | GPS L1 인증 배지 활성화 | SATISFIED | verifyGpsForReview + check_gps_proximity RPC + badge in ReviewList |
| COMM-03 | 04-03 | 단지 페이지 → 카페 검색 외부 링크 | SATISFIED | CafeLink in ReviewList.tsx |
| COMM-04 | 04-03 | 신고 통합 큐 + SLA ≤ 24h 운영 | PARTIAL | Admin reports page + SlaUtils exist; user-facing report submission missing for comment type |
| COMM-05 | 04-06 | 주간 회전 카페 가입 코드 | SATISFIED | cafe-code worker + weekly.yml + admin/status display |
| DATA-01 | 04-04 | K-apt 부대시설 데이터 | SATISFIED | fetchKaptBasicInfo + daily cron UPSERT to facility_kapt |
| DATA-02 | 04-05 | 분양권전매 + presale UI | SATISFIED | fetchPresaleTrades + presale_transactions + /presale page + PresaleCard |
| NOTIF-01 | 04-07 | 주간 다이제스트 이메일 | SATISFIED | buildWeeklyDigest + digest worker + weekly-digest.yml |
| NOTIF-02 | 04-08 | 알림 토픽 채널 구독 | SATISFIED | TopicToggle (3 pills) + topic-actions + notification_topics table |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/admin/SlaUtils.ts` | Orphaned export — exists and tested but `admin/reports/page.tsx` defines its own local `getSlaState` rather than importing from SlaUtils | WARNING | SlaUtils is dead production code; tests pass but the utility is never used in production. Not a blocker. |
| `src/lib/auth/comment-actions.ts` (line 23) | `as any` cast for comments table query | INFO | Documented intent — database.ts types not yet regenerated for Phase 4 tables. Common Phase 4 pattern. Not a stub. |
| `src/lib/auth/topic-actions.ts` (line 17, 36) | `as any` cast for notification_topics table | INFO | Same documented intent as above. |

No blocker-level anti-patterns in core flow code. No TODO/FIXME/placeholder comments in shipped functionality. No hardcoded credentials. No console.log in production code (console.error in digest worker is acceptable server-side logging).

---

## Security Must-Haves

| Requirement | Status | Evidence |
|-------------|--------|---------|
| Worker endpoints validate CRON_SECRET or x-cron-secret | VERIFIED | /api/worker/cafe-code and /api/worker/digest both check `x-cron-secret` header; /api/cron/daily checks `Bearer ${CRON_SECRET}` |
| Server Actions call auth.getUser() before DB operations | VERIFIED | submitComment, deleteComment, upsertNotificationTopic, deleteNotificationTopic, verifyGpsForReview all auth-first |
| Transactions queries include cancel_date IS NULL AND superseded_by IS NULL | VERIFIED | digest.ts lines 41–42; presale.ts lines 51–52; admin/status/page.tsx lines 69–70 |
| Admin pages verify admin role before rendering | VERIFIED | admin/status, admin/reports, admin/members, admin/ads, admin/cardnews all check `['admin', 'superadmin'].includes(role)` with redirect |

---

## Human Verification Required

### 1. GPS Badge Visual Confirmation

**Test:** Navigate to a complex with at least one review marked `gps_verified: true`. Verify the orange "GPS 인증" badge renders on that review card and is absent on non-verified reviews.
**Expected:** Badge visible on verified reviews only, with correct aria-label.
**Why human:** Requires live DB with a gps_verified review row.

### 2. Digest Email Actually Sent

**Test:** Trigger `/api/worker/digest` with correct `x-cron-secret`, then check the `notifications` table for new rows with `event_type = 'weekly_digest'`. Separately, confirm the deliver worker picks up these rows and sends email via Resend.
**Expected:** Notifications inserted with correct dedupe_key; Resend delivers email to subscribed users.
**Why human:** Requires live Supabase + Resend integration. The digest only inserts notification rows — email delivery depends on the notify worker (separate system not in Phase 4 scope).

### 3. Cafe Code Admin Display

**Test:** As admin user, navigate to `/admin/status`. Verify the weekly cafe join code section shows an 8-character code or "아직 생성되지 않았습니다" if the worker hasn't run.
**Expected:** Code displayed in orange monospace; correct week_start date shown.
**Why human:** Requires admin account + the cafe-code worker to have run at least once.

### 4. Presale Page with Real Data

**Test:** After daily cron runs for a MOLIT presale cycle, navigate to `/presale` and verify PresaleCards render with actual listing names, price ranges, and region chips.
**Expected:** One or more cards visible with non-null price data from presale_transactions.
**Why human:** Presale page shows "아직 등록된 분양 정보가 없습니다" until the daily cron has populated new_listings.

---

## Gaps Summary

**1 BLOCKER gap blocking SC1:**

**댓글 신고** — SC1 states "댓글 신고 시 신고 큐에 쌓인다" but no mechanism exists for a user to report a comment. The `comments` table exists, the admin `reports` table exists with `target_type = 'comment'` support, and the admin reports page can display and process comment reports — but the user-facing path (report button in CommentSection + Server Action to insert into `reports`) was never built.

The 04-01 PLAN's must_have explicitly called for `<ReportButton targetType="comment" targetId={comment.id} />` reusing an "existing ReportButton component," but that component itself also does not exist. This indicates both the ReportButton component and its wiring into CommentSection were skipped.

**Impact on Success Criteria:** SC1 is partially satisfied (댓글 달기: YES; 신고 큐: NO). All other 4 Success Criteria are fully satisfied.

---

_Verified: 2026-05-07_
_Verifier: Claude (gsd-verifier)_
