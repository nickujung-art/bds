-- 단지 매칭 DB 헬퍼 함수 (ADR-034: 3축 복합 매칭)

-- Axis 2: 좌표 200m 이내 + trigram 유사도 기반 매칭
create or replace function public.match_complex_by_coord(
  p_lng           double precision,
  p_lat           double precision,
  p_name_normalized text,
  p_max_dist_m    int     default 200,
  p_min_similarity numeric default 0.7
)
returns table (
  id             uuid,
  canonical_name text,
  trgm_sim       numeric,
  distance_m     numeric
)
language sql
stable
as $$
  select
    c.id,
    c.canonical_name,
    similarity(c.name_normalized, p_name_normalized)::numeric  as trgm_sim,
    st_distance(
      c.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    )::numeric as distance_m
  from public.complexes c
  where
    c.location is not null
    and c.status != 'demolished'
    and st_dwithin(
      c.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_max_dist_m
    )
    and similarity(c.name_normalized, p_name_normalized) >= p_min_similarity
  order by trgm_sim desc, distance_m
  limit 1;
$$;

-- Axis 3: sgg_code + 이름 trigram 유사도 (좌표 없을 때 fallback)
create or replace function public.match_complex_by_admin(
  p_sgg_code        text,
  p_name_normalized text,
  p_min_similarity  numeric default 0.5
)
returns table (
  id             uuid,
  canonical_name text,
  trgm_sim       numeric
)
language sql
stable
as $$
  select
    c.id,
    c.canonical_name,
    similarity(c.name_normalized, p_name_normalized)::numeric as trgm_sim
  from public.complexes c
  where
    c.sgg_code = p_sgg_code
    and c.status != 'demolished'
    and similarity(c.name_normalized, p_name_normalized) >= p_min_similarity
  order by trgm_sim desc
  limit 1;
$$;
