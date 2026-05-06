-- complex_rankings RLS: 공개 읽기, 쓰기는 service_role 전용 (rankings cron 파이프라인)
-- 기존 패턴: supabase/migrations/20260430000009_rls.sql의 complexes 정책과 동일
alter table public.complex_rankings enable row level security;

create policy "complex_rankings: public read"
  on public.complex_rankings for select using (true);

-- 쓰기(insert/update/delete)는 service_role이 RLS를 우회하므로 별도 정책 불필요.
-- rankings cron은 createSupabaseAdminClient()로만 접근한다.
