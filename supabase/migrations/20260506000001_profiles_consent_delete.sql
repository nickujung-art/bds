-- Phase 3: 동의·탈퇴·정지 컬럼 추가 (D-09, D-12, ADMIN-01)
-- 기존 profiles 테이블 (20260430000005_users.sql)에 ALTER TABLE
alter table public.profiles
  add column if not exists deleted_at      timestamptz,
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists suspended_at    timestamptz;

-- 30일 hard delete cron 필터용 부분 인덱스
create index if not exists profiles_deleted_at_idx
  on public.profiles(deleted_at)
  where deleted_at is not null;

-- 어드민 status 페이지: 약관 미동의 회원 카운트용 부분 인덱스
create index if not exists profiles_terms_not_agreed_idx
  on public.profiles(id)
  where terms_agreed_at is null;

comment on column public.profiles.deleted_at      is 'Soft delete 시각 (30일 grace 후 hard delete cron이 auth.users 삭제)';
comment on column public.profiles.terms_agreed_at is '이용약관·개인정보처리방침 동의 시각 (NULL = 미동의 → /consent 리다이렉트)';
comment on column public.profiles.suspended_at    is '관리자에 의한 계정 정지 시각 (NULL = 정상)';
