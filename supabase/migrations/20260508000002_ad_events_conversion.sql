-- Phase 6 AD-01: 전환 이벤트 추가 + 이상 트래픽 플래그
alter table public.ad_events
  drop constraint if exists ad_events_event_type_check;

alter table public.ad_events
  add constraint ad_events_event_type_check
    check (event_type in ('impression', 'click', 'conversion'));

alter table public.ad_events
  add column if not exists is_anomaly boolean not null default false;

create index if not exists ad_events_anomaly_idx
  on public.ad_events(campaign_id, is_anomaly)
  where is_anomaly = true;
