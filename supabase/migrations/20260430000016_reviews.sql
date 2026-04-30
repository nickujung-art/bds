-- 단지 후기 (V0.9: GPS 비활성, V1.0에서 gps_verified 배지 활성화)
create table public.complex_reviews (
  id           uuid primary key default gen_random_uuid(),
  complex_id   uuid not null references public.complexes(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  content      text not null check (char_length(content) between 10 and 500),
  rating       smallint not null check (rating between 1 and 5),
  gps_verified boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index complex_reviews_complex_id_idx on public.complex_reviews(complex_id, created_at desc);
create index complex_reviews_user_id_idx   on public.complex_reviews(user_id);

create trigger complex_reviews_updated_at
  before update on public.complex_reviews
  for each row execute function public.set_updated_at();

-- RLS
alter table public.complex_reviews enable row level security;

create policy "reviews: public read"
  on public.complex_reviews for select using (true);

create policy "reviews: auth insert"
  on public.complex_reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "reviews: owner update"
  on public.complex_reviews for update
  using (user_id = auth.uid());

create policy "reviews: owner or admin delete"
  on public.complex_reviews for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
