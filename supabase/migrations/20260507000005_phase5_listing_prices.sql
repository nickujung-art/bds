-- Phase 5: listing_prices 테이블 생성 + RLS
-- 매물가 vs 실거래가 갭 라벨 인프라 (갭 라벨 UI는 Phase 6 defer)

create table public.listing_prices (
  id            uuid primary key default gen_random_uuid(),
  complex_id    uuid not null references public.complexes(id) on delete cascade,
  price_per_py  integer not null CHECK (price_per_py BETWEEN 100 AND 99999),
  recorded_date date not null,
  source        text not null default 'admin',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index listing_prices_complex_id_idx
  on public.listing_prices(complex_id, recorded_date desc);

-- upsert onConflict 대상 — (complex_id, recorded_date, source) 유니크 제약
create unique index listing_prices_complex_date_source_idx
  on public.listing_prices(complex_id, recorded_date, source);

alter table public.listing_prices enable row level security;

-- public read (Phase 6 갭 라벨 표시 시 사용)
create policy "listing_prices: public read"
  on public.listing_prices for select using (true);

-- admin write only (insert/update/delete)
create policy "listing_prices: admin write"
  on public.listing_prices for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
