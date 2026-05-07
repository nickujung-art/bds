---
plan: "08"
status: complete
completed_at: "2026-05-07"
files_created:
  - src/lib/auth/topic-actions.ts
  - src/lib/data/topics.ts
  - src/components/profile/TopicToggle.tsx
files_modified:
  - src/app/profile/page.tsx
  - src/components/reviews/ReviewList.tsx
tests_passed: true
---

## Notes

### What was implemented

- **`src/lib/auth/topic-actions.ts`**: Server Actions for `upsertNotificationTopic` and `deleteNotificationTopic`. Both follow auth-first pattern (`getUser()` before DB ops) and return `{ error: string | null }`. Uses `as any` cast for `notification_topics` table since it was added in Phase 4 migration and is not yet in `database.ts` generated types.

- **`src/lib/data/topics.ts`**: `getNotificationTopics(userId, supabase)` data query that returns the current array of subscribed `TopicType` values for a user.

- **`src/components/profile/TopicToggle.tsx`**: Client Component with 3 pill toggles (high_price → "신고가 알림", presale → "신축 분양 알림", complex_update → "단지 업데이트"). Uses `useTransition` + optimistic update pattern: immediate UI toggle → Server Action → rollback on failure. Each pill uses `role="switch"` and `aria-checked` per spec. Active state uses `var(--dj-orange)`, inactive uses `var(--line-default)`. Pill: 40×22px, borderRadius 11, white 18×18 thumb.

- **`src/app/profile/page.tsx`**: Added imports for `TopicToggle` and `getNotificationTopics`, added `getNotificationTopics` to the existing `Promise.all` data fetch, rendered `<TopicToggle initialTopics={topics} />` inside the push notification card.

### Deviations

- Resolved a pre-existing merge conflict in `src/components/reviews/ReviewList.tsx` (conflict marker between HEAD and worktree-agent branches). Resolved by keeping the `complexName` prop version as it was already used in the function body.
- All TypeScript errors reported by `tsc --noEmit` are pre-existing in `e2e/` and `src/__tests__/` files (unrelated to this plan). ESLint shows "No ESLint warnings or errors" and the production build completes successfully.
