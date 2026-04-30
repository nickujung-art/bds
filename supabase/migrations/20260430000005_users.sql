-- 사용자 프로필 (auth.users 1:1 확장)
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nickname        text unique,
  avatar_url      text,
  cafe_nickname   text,
  signup_source   text,
  role            text not null default 'user'
                    check (role in ('user', 'admin', 'superadmin', 'advertiser')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- complex_match_queue.resolved_by FK (profiles 생성 후)
alter table public.complex_match_queue
  add column resolved_by uuid references public.profiles(id) on delete set null;

-- auth.users 신규 가입 시 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관심 단지
create table public.favorites (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  complex_id             uuid not null references public.complexes(id) on delete cascade,
  price_alert_threshold  integer,   -- 만원 단위, NULL = 알림 없음
  created_at             timestamptz not null default now(),
  unique(user_id, complex_id)
);

create index favorites_user_id_idx on public.favorites(user_id);
create index favorites_complex_id_idx on public.favorites(complex_id);

-- Web Push 구독 (VAPID)
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
