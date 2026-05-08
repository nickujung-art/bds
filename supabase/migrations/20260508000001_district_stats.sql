-- Phase 6 DATA-06: SGIS 시군구 인구·세대 통계
create table public.district_stats (
  id           uuid primary key default gen_random_uuid(),
  adm_cd       text not null,
  adm_nm       text not null,
  si           text not null,
  gu           text not null,
  data_year    smallint not null,
  data_quarter smallint not null check (data_quarter between 1 and 4),
  population   integer,
  households   integer,
  fetched_at   timestamptz not null default now(),
  unique (adm_cd, data_year, data_quarter)
);

create index district_stats_si_gu_idx on public.district_stats(si, gu);
create index district_stats_year_quarter_idx
  on public.district_stats(data_year desc, data_quarter desc);

alter table public.district_stats enable row level security;

create policy "district_stats: public read"
  on public.district_stats for select using (true);

create policy "district_stats: service role write"
  on public.district_stats for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
