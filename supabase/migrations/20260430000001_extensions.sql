-- PostGIS: 좌표 기반 단지 매칭 + 반경 검색
create extension if not exists postgis;
-- pg_trgm: 단지명 유사도 검색 (위치 복합 매칭용)
create extension if not exists pg_trgm;

-- 공통 updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
