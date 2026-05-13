-- Phase 8: 카페 글 NLP 매칭 저장 테이블 (DIFF-02)

CREATE TABLE IF NOT EXISTS public.cafe_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id  uuid REFERENCES public.complexes(id) ON DELETE SET NULL,
  title       text NOT NULL,
  excerpt     text,
  url         text NOT NULL UNIQUE,
  cafe_name   text,
  posted_at   timestamptz,
  matched_at  timestamptz NOT NULL DEFAULT now(),
  confidence  numeric CHECK (confidence BETWEEN 0 AND 1),
  is_verified boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS cafe_posts_complex_id_idx ON public.cafe_posts(complex_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS cafe_posts_url_idx ON public.cafe_posts(url);

ALTER TABLE public.cafe_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cafe_posts: public read"
  ON public.cafe_posts FOR SELECT USING (true);
-- write: service_role only (cron 워커)

COMMENT ON TABLE public.cafe_posts IS 'DIFF-02: Naver Search + Gemini NER 파이프라인 결과 저장. complex_id NULL 허용 (매칭 실패).';
