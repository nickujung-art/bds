-- Phase 5: redevelopment_projects admin write RLS 추가
-- (public read RLS는 20260430000009_rls.sql에 이미 존재)
-- ALTER TABLE ENABLE ROW LEVEL SECURITY 불필요 — 이미 활성화됨

create policy "redevelopment_projects: admin write"
  on public.redevelopment_projects for all
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
