-- Phase 10: 학구도 테이블 + si별 학원 백분위 함수

CREATE TABLE public.school_districts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hakgudo_id   text NOT NULL,
  school_level text NOT NULL CHECK (school_level IN ('elementary', 'middle', 'high')),
  geometry     geometry(Geometry, 4326) NOT NULL,
  source_file  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX school_districts_geometry_idx
  ON public.school_districts USING GIST (geometry);

CREATE TABLE public.school_district_schools (
  district_id  uuid NOT NULL REFERENCES public.school_districts(id) ON DELETE CASCADE,
  school_name  text NOT NULL,
  school_level text NOT NULL,
  PRIMARY KEY (district_id, school_name)
);

ALTER TABLE public.school_districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_districts: public read"
  ON public.school_districts FOR SELECT USING (true);

CREATE POLICY "school_districts: service role write"
  ON public.school_districts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.school_district_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_district_schools: public read"
  ON public.school_district_schools FOR SELECT USING (true);

CREATE POLICY "school_district_schools: service role write"
  ON public.school_district_schools FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- si 단위 학원 백분위 함수 (창원시/김해시 분리)
CREATE OR REPLACE FUNCTION public.hagwon_score_percentile_by_si(
  target_score integer,
  p_si         text
)
RETURNS double precision
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE hagwon_score < target_score)::double precision
    / NULLIF(COUNT(*) FILTER (WHERE hagwon_score IS NOT NULL), 0)
  FROM public.complexes
  WHERE si = p_si;
$$;
