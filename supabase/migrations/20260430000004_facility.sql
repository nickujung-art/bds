-- 학군 정보 (학교알리미 API)
create table public.facility_school (
  id              uuid primary key default gen_random_uuid(),
  complex_id      uuid not null references public.complexes(id) on delete cascade,
  school_name     text not null,
  school_type     text not null check (school_type in ('elementary', 'middle', 'high')),
  school_code     text,
  distance_m      integer,
  is_assignment   boolean not null default false,  -- 배정 학교 여부
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index facility_school_complex_id_idx on public.facility_school(complex_id);

create trigger facility_school_updated_at
  before update on public.facility_school
  for each row execute function public.set_updated_at();

-- 관리비 정보 (K-apt API)
create table public.facility_kapt (
  id                  uuid primary key default gen_random_uuid(),
  complex_id          uuid not null references public.complexes(id) on delete cascade,
  kapt_code           text,
  management_cost_m2  integer,   -- 원/m²
  parking_count       integer,
  data_month          date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index facility_kapt_complex_id_idx on public.facility_kapt(complex_id);

create trigger facility_kapt_updated_at
  before update on public.facility_kapt
  for each row execute function public.set_updated_at();

-- 주변 시설 (카카오 로컬 API)
create table public.facility_poi (
  id          uuid primary key default gen_random_uuid(),
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  category    text not null,    -- 'mart', 'hospital', 'park', 'subway', etc.
  poi_name    text not null,
  distance_m  integer,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now()
);

create index facility_poi_complex_id_idx on public.facility_poi(complex_id);
create index facility_poi_complex_category_idx on public.facility_poi(complex_id, category);
