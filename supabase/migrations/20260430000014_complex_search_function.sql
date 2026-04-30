-- 단지 trigram 검색 (사이드패널 자동완성용)
-- name_normalized 컬럼의 gin_trgm 인덱스를 활용
create or replace function public.search_complexes(
  p_query      text,
  p_sgg_codes  text[],
  p_limit      int default 20
) returns table (
  id              uuid,
  canonical_name  text,
  road_address    text,
  si              text,
  gu              text,
  dong            text,
  sgg_code        text,
  lat             double precision,
  lng             double precision,
  similarity      real
) language sql stable as $$
  select
    c.id,
    c.canonical_name,
    c.road_address,
    c.si,
    c.gu,
    c.dong,
    c.sgg_code,
    c.lat,
    c.lng,
    word_similarity(p_query, c.name_normalized) as similarity
  from public.complexes c
  where
    c.sgg_code = any(p_sgg_codes)
    and c.name_normalized % p_query          -- pg_trgm 연산자 (기본 임계값 0.3)
  order by word_similarity(p_query, c.name_normalized) desc
  limit p_limit
$$;
