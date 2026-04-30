-- ============================================================
-- 관리자 보조 테이블
-- ============================================================

create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  payload     jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs(user_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

create type public.estimate_status as enum ('active', 'superseded', 'rejected');
create type public.estimate_method as enum ('nearest_neighbors', 'similar_complex', 'regression');

create table public.ai_estimates (
  id                    uuid primary key default gen_random_uuid(),
  target_complex_id     uuid not null references public.complexes(id) on delete cascade,
  estimated_value       jsonb not null,
  method                public.estimate_method not null,
  reference_complex_ids uuid[],
  confidence            numeric,
  status                public.estimate_status not null default 'active',
  created_at            timestamptz not null default now()
);

create index ai_estimates_complex_id_idx on public.ai_estimates(target_complex_id)
  where status = 'active';

create type public.redevelopment_phase as enum (
  'rumor', 'proposed', 'committee_formed', 'safety_eval',
  'designated', 'business_approval', 'construction_permit',
  'construction', 'completed', 'cancelled'
);

create table public.redevelopment_projects (
  id           uuid primary key default gen_random_uuid(),
  complex_id   uuid references public.complexes(id) on delete set null,
  project_name text not null,
  phase        public.redevelopment_phase not null default 'rumor',
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger redevelopment_projects_updated_at
  before update on public.redevelopment_projects
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS 활성화 + 정책
-- ============================================================

-- complexes: 전체 읽기, 쓰기는 service_role 전용 (데이터 파이프라인)
alter table public.complexes enable row level security;
create policy "complexes: public read"
  on public.complexes for select using (true);

alter table public.complex_aliases enable row level security;
create policy "complex_aliases: public read"
  on public.complex_aliases for select using (true);

alter table public.complex_match_queue enable row level security;
create policy "complex_match_queue: admin only"
  on public.complex_match_queue for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- transactions: 전체 읽기, 쓰기는 service_role 전용
alter table public.transactions enable row level security;
create policy "transactions: public read"
  on public.transactions for select using (true);

-- facility 3종: 전체 읽기, 쓰기는 service_role 전용
alter table public.facility_school enable row level security;
create policy "facility_school: public read"
  on public.facility_school for select using (true);

alter table public.facility_kapt enable row level security;
create policy "facility_kapt: public read"
  on public.facility_kapt for select using (true);

alter table public.facility_poi enable row level security;
create policy "facility_poi: public read"
  on public.facility_poi for select using (true);

-- profiles: 전체 읽기, 본인만 수정 (role 상승 금지)
alter table public.profiles enable row level security;
create policy "profiles: public read"
  on public.profiles for select using (true);
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role in ('user'));

-- favorites: 본인만 접근
alter table public.favorites enable row level security;
create policy "favorites: owner all"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- push_subscriptions: 본인만 접근
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: owner all"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- notifications: 본인만 읽기·수정
alter table public.notifications enable row level security;
create policy "notifications: owner read"
  on public.notifications for select using (auth.uid() = user_id);
create policy "notifications: owner update"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ad_campaigns: advertiser = 본인 row만. 일반 사용자는 approved+active만 SELECT
alter table public.ad_campaigns enable row level security;
create policy "ad_campaigns: public read active"
  on public.ad_campaigns for select
  using (
    status = 'approved'
    and now() between starts_at and ends_at
  );
create policy "ad_campaigns: advertiser read own"
  on public.ad_campaigns for select
  using (auth.uid() = advertiser_id);
create policy "ad_campaigns: advertiser insert"
  on public.ad_campaigns for insert
  with check (auth.uid() = advertiser_id);
create policy "ad_campaigns: advertiser update draft"
  on public.ad_campaigns for update
  using (auth.uid() = advertiser_id and status = 'draft')
  with check (auth.uid() = advertiser_id);

-- ad_events: 일반 사용자는 INSERT만 (impression/click 기록)
alter table public.ad_events enable row level security;
create policy "ad_events: authenticated insert"
  on public.ad_events for insert
  with check (true);

-- data_sources: 전체 읽기, 쓰기는 service_role 전용
alter table public.data_sources enable row level security;
create policy "data_sources: public read"
  on public.data_sources for select using (true);

alter table public.ingest_runs enable row level security;
create policy "ingest_runs: admin read"
  on public.ingest_runs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- audit_logs: admin만 읽기, 쓰기는 service_role 전용
alter table public.audit_logs enable row level security;
create policy "audit_logs: admin read"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

-- ai_estimates, redevelopment_projects: 전체 읽기
alter table public.ai_estimates enable row level security;
create policy "ai_estimates: public read active"
  on public.ai_estimates for select using (status = 'active');

alter table public.redevelopment_projects enable row level security;
create policy "redevelopment_projects: public read"
  on public.redevelopment_projects for select using (true);
