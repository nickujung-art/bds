-- 서비스 대상 지역 기준 테이블 (창원·김해)
-- sgg_code = 국토부 LAWD_CD 5자리 = 행안부 admCd 앞 5자리
create table public.regions (
  sgg_code   text primary key check (sgg_code ~ '^\d{5}$'),
  sgg_name   text not null,
  si         text not null,
  gu         text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.regions enable row level security;
create policy "regions: public read"
  on public.regions for select using (true);
