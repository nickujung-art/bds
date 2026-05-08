-- Phase 6 AUTH-01: GPS L2 방문 기록 + L3 서류 인증 + 배지 레벨
create table public.gps_visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  verified_at timestamptz not null default now(),
  lat         double precision,
  lng         double precision
);

create index gps_visits_user_complex_idx
  on public.gps_visits(user_id, complex_id, verified_at desc);

alter table public.gps_visits enable row level security;

create policy "gps_visits: owner read"
  on public.gps_visits for select
  using (user_id = auth.uid());

create policy "gps_visits: auth insert"
  on public.gps_visits for insert
  with check (user_id = auth.uid());

create table public.gps_verification_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  complex_id   uuid not null references public.complexes(id) on delete cascade,
  doc_type     text not null check (doc_type in ('등본', '관리비')),
  storage_path text not null,
  status       text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references public.profiles(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.gps_verification_requests enable row level security;

create policy "gps_req: owner read"
  on public.gps_verification_requests for select
  using (user_id = auth.uid());

create policy "gps_req: auth insert"
  on public.gps_verification_requests for insert
  with check (user_id = auth.uid());

create policy "gps_req: admin all"
  on public.gps_verification_requests for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

alter table public.profiles
  add column if not exists gps_badge_level smallint not null default 0
    check (gps_badge_level between 0 and 3);
-- 0=없음, 1=방문인증, 2=거주인증, 3=소유자인증

-- Supabase Storage private 버킷 (gps-docs)
insert into storage.buckets (id, name, public)
values ('gps-docs', 'gps-docs', false)
on conflict (id) do nothing;

create policy "gps-docs: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'gps-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gps-docs: admin read"
  on storage.objects for select
  using (
    bucket_id = 'gps-docs'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
