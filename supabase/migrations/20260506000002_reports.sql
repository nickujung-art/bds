-- Phase 3 ADMIN-03: 신고 큐 테이블 + RLS
create type public.report_target_type as enum ('review', 'user', 'ad');
create type public.report_status      as enum ('pending', 'accepted', 'rejected');

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type public.report_target_type not null,
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 5 and 200),
  status      public.report_status not null default 'pending',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint reports_no_self_report check (reporter_id is null or reporter_id::text <> target_id::text)
);

create index reports_status_created_idx
  on public.reports(status, created_at desc)
  where status = 'pending';
create index reports_target_idx on public.reports(target_type, target_id);

alter table public.reports enable row level security;

-- 인증 사용자만 신고 생성, reporter_id = 자기 자신 강제
create policy "reports: auth insert"
  on public.reports for insert
  with check (auth.uid() is not null and reporter_id = auth.uid());

-- admin/superadmin만 신고 조회
create policy "reports: admin read"
  on public.reports for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));

-- admin/superadmin만 신고 처리(상태 변경)
create policy "reports: admin update"
  on public.reports for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));

comment on table public.reports is 'ADMIN-03 신고 큐: review/user/ad 대상 신고 + admin 처리 로그';
