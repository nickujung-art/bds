-- 교육 시설 카카오 배치 수집을 위한 제약 + 학원 점수 컬럼 + 백분위 함수

-- facility_school: (complex_id, school_name) 유니크 → upsert 가능
ALTER TABLE public.facility_school
  ADD CONSTRAINT facility_school_complex_name_uq
  UNIQUE (complex_id, school_name);

-- facility_poi: (complex_id, category, poi_name) 유니크 → upsert 가능
ALTER TABLE public.facility_poi
  ADD CONSTRAINT facility_poi_complex_cat_name_uq
  UNIQUE (complex_id, category, poi_name);

-- complexes: 학원 밀도 점수 (배치 스크립트가 기록, 페이지에서 백분위 계산)
-- raw 점수: 500m내 학원수 × 3 + 500~1000m 학원수 × 1
ALTER TABLE public.complexes
  ADD COLUMN IF NOT EXISTS hagwon_score smallint;

-- 학원 점수 백분위 함수 (0.0~1.0, 높을수록 좋음)
-- target_score보다 낮은 단지 비율을 반환 (= 이 단지가 X% 초과)
CREATE OR REPLACE FUNCTION public.hagwon_score_percentile(target_score integer)
RETURNS double precision
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE hagwon_score < target_score)::double precision
    / NULLIF(COUNT(*) FILTER (WHERE hagwon_score IS NOT NULL), 0)
  FROM public.complexes;
$$;
