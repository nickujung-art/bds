-- 거래 유형 enum
create type public.deal_type as enum ('sale', 'jeonse', 'monthly');
create type public.deal_subtype as enum ('sale', 'occupancy_right', 'pre_sale_right');

-- 국토부 실거래가 (ADR-022: dedupe_key UNIQUE, ADR-038: superseded_by + cancel_date)
create table public.transactions (
  id               bigserial primary key,
  complex_id       uuid references public.complexes(id) on delete set null,
  deal_type        public.deal_type not null,
  deal_subtype     public.deal_subtype,
  deal_date        date not null,
  price            bigint,              -- 매매가·보증금(만원)
  monthly_rent     integer,             -- 월세(만원)
  area_m2          numeric(6, 2) not null,
  floor            smallint,
  building_name    text,
  sgg_code         text not null,
  -- 취소·정정: WHERE cancel_date IS NULL AND superseded_by IS NULL
  cancel_date      date,
  superseded_by    bigint references public.transactions(id),
  -- {sgg_code}_{deal_ym}_{complex_code}_{deal_date}_{price}_{area_m2}
  dedupe_key       text not null unique,
  -- source_run_id uuid FK: 0008_data_sources.sql에서 ingest_runs 생성 후 추가
  raw_complex_name text,
  raw_region_code  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 유효 거래 조회 최적화 (cancel_date IS NULL AND superseded_by IS NULL)
create index transactions_valid_complex_date_idx
  on public.transactions(complex_id, deal_date desc)
  where cancel_date is null and superseded_by is null;

create index transactions_valid_sgg_date_idx
  on public.transactions(sgg_code, deal_date desc)
  where cancel_date is null and superseded_by is null;

create index transactions_deal_date_idx on public.transactions(deal_date desc);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
