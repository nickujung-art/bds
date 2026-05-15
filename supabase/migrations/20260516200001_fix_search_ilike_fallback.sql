-- 검색 함수에 ILIKE fallback 추가
-- pg_trgm % 연산자 임계값(0.3) 미달인 단어 ("더샵", "유니시티" 등 짧은 키워드)도 검색 가능하도록
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
    and (
      c.name_normalized % p_query
      or c.name_normalized ilike '%' || p_query || '%'
    )
  order by word_similarity(p_query, c.name_normalized) desc
  limit p_limit
$$;
