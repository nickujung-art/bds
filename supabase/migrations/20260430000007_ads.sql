-- 광고 status 상태 머신 (ADR-025: draft→pending→approved→ended)
create type public.ad_status as enum ('draft', 'pending', 'approved', 'ended', 'rejected', 'paused');

-- 광고 캠페인
-- 쿼리 시 반드시: now() BETWEEN starts_at AND ends_at AND status='approved' (CLAUDE.md)
create table public.ad_campaigns (
  id               uuid primary key default gen_random_uuid(),
  advertiser_id    uuid references public.profiles(id) on delete set null,
  advertiser_name  text not null,
  title            text not null,
  image_url        text not null,
  link_url         text not null,
  placement        text not null check (placement in ('banner_top', 'sidebar', 'in_feed')),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           public.ad_status not null default 'draft',
  budget_won       integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint ad_campaigns_dates_check check (ends_at > starts_at)
);

create index ad_campaigns_active_idx
  on public.ad_campaigns(placement, starts_at, ends_at)
  where status = 'approved';

create trigger ad_campaigns_updated_at
  before update on public.ad_campaigns
  for each row execute function public.set_updated_at();

-- 노출·클릭 이벤트 (ip_hash: sha256(ip+secret), PII 미저장)
create table public.ad_events (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.ad_campaigns(id) on delete cascade,
  event_type   text not null check (event_type in ('impression', 'click')),
  ip_hash      text,
  user_id      uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index ad_events_campaign_type_idx on public.ad_events(campaign_id, event_type);
create index ad_events_created_at_idx on public.ad_events(created_at desc);
