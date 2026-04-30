-- 알림 큐 (GitHub Actions 5분 워커 polled delivery)
-- UNIQUE(user_id, event_type, target_id, dedupe_key) — 중복 발송 방지
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('price_alert', 'comment', 'reply', 'system')),
  event_type   text not null,   -- dedupe 키 구성요소
  target_id    text,            -- dedupe 키 구성요소 (complex_id, post_id 등)
  dedupe_key   text,            -- dedupe 키 구성요소 (날짜 등 주기 단위)
  title        text not null,
  body         text not null,
  data         jsonb,
  is_read      boolean not null default false,
  status       text not null default 'pending'
                 check (status in ('pending', 'sent', 'failed')),
  delivered_at timestamptz,
  created_at   timestamptz not null default now(),
  unique(user_id, event_type, target_id, dedupe_key)
);

-- 미발송 알림 폴링 (5분 워커)
create index notifications_pending_idx
  on public.notifications(created_at)
  where status = 'pending';

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where is_read = false;
