-- complex_rankings: 신고가 평형 등 rank_type별 부가정보 저장
ALTER TABLE public.complex_rankings
  ADD COLUMN IF NOT EXISTS metadata jsonb;
