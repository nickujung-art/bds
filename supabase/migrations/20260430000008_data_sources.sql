-- 외부 데이터 소스 메타 (ADR-037)
create table public.data_sources (
  id                       text primary key,  -- 'molit_trade', 'molit_rent', 'kapt', ...
  cadence                  text not null
                             check (cadence in ('daily', 'monthly', 'quarterly', 'annual', 'event', 'manual')),
  expected_freshness_hours integer not null,
  last_synced_at           timestamptz,
  last_status              text check (last_status in ('success', 'partial', 'failed')),
  consecutive_failures     integer not null default 0,
  ui_label                 text               -- "전월 기준" 등 사용자 노출 텍스트
);

-- 백필·배치 런 추적 (--resume / --force 재개 지원)
create table public.ingest_runs (
  id             uuid primary key default gen_random_uuid(),
  source_id      text not null references public.data_sources(id),
  sgg_code       text,
  year_month     text,           -- 'YYYYMM'
  page           integer,
  status         text not null default 'running'
                   check (status in ('running', 'success', 'partial', 'failed')),
  rows_fetched   integer not null default 0,
  rows_upserted  integer not null default 0,
  error_message  text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index ingest_runs_source_status_idx on public.ingest_runs(source_id, status);
create index ingest_runs_resume_idx on public.ingest_runs(source_id, sgg_code, year_month);

-- transactions.source_run_id FK (ingest_runs 생성 후 추가)
alter table public.transactions
  add column source_run_id uuid references public.ingest_runs(id) on delete set null;

create index transactions_source_run_id_idx on public.transactions(source_run_id)
  where source_run_id is not null;
