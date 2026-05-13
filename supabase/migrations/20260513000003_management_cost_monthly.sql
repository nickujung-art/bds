create table if not exists public.management_cost_monthly (
  id               uuid primary key default gen_random_uuid(),
  complex_id       uuid not null references public.complexes(id) on delete cascade,
  kapt_code        text not null,
  year_month       date not null,              -- YYYY-MM-01

  -- 공용관리비 (원, 단지 전체 합계)
  common_cost_total    bigint,
  labor_cost           bigint,  -- 인건비
  cleaning_cost        bigint,  -- 청소비
  guard_cost           bigint,  -- 경비비
  disinfection_cost    bigint,  -- 소독비
  elevator_cost        bigint,  -- 승강기유지비
  repair_cost          bigint,  -- 수선비
  network_cost         bigint,  -- 지능형네트워크유지비
  vehicle_cost         bigint,  -- 차량유지비
  consignment_fee      bigint,  -- 위탁관리수수료

  -- 개별사용료 (원, 단지 전체 합계)
  individual_cost_total bigint,
  electricity_cost      bigint,  -- 전기료(전용)
  water_cost            bigint,  -- 수도료(전용)
  heating_cost          bigint,  -- 난방비(전용)
  hot_water_cost        bigint,  -- 급탕비(전용)
  gas_cost              bigint,  -- 가스사용료(전용)

  -- 장기수선충당금
  long_term_repair_monthly bigint,  -- 월부과액
  long_term_repair_total   bigint,  -- 총적립금액

  created_at  timestamptz not null default now(),

  unique (complex_id, year_month)
);

alter table public.management_cost_monthly enable row level security;

create policy "management_cost_monthly_public_read"
  on public.management_cost_monthly for select
  using (true);

create index management_cost_monthly_complex_id_idx
  on public.management_cost_monthly (complex_id, year_month desc);
create index management_cost_monthly_kapt_code_idx
  on public.management_cost_monthly (kapt_code);
