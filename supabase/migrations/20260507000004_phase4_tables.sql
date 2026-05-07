-- Phase 4 테이블 마이그레이션
-- 000003_phase4_enum.sql 이후 실행 보장됨 (타임스탬프 순서)

-- ========== 1. comments 테이블 (COMM-01, D-01) ==========
CREATE TABLE public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES public.complex_reviews(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content     text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_review_id_idx ON public.comments(review_id, created_at);
CREATE INDEX comments_user_id_idx   ON public.comments(user_id);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS (D-03, complex_reviews 패턴 대조)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: public read"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "comments: auth insert"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "comments: owner update"
  ON public.comments FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "comments: owner or admin delete"
  ON public.comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ========== 2. new_listings 테이블 (DATA-02, D-08) ==========
CREATE TABLE public.new_listings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id   uuid REFERENCES public.complexes(id) ON DELETE SET NULL,  -- nullable: 미매칭 신축 허용
  name         text NOT NULL,
  region       text NOT NULL,
  price_min    integer,   -- 만원 단위
  price_max    integer,   -- 만원 단위
  total_units  integer,
  move_in_date date,
  source_code  text,      -- MOLIT 분양권전매 API의 단지 식별자 (umdNm+aptNm 조합)
  fetched_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, region)   -- 동일 단지명+지역 중복 방지
);

-- RLS: public read (분양 데이터는 공개), service_role write (cron만 적재)
ALTER TABLE public.new_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "new_listings: public read"
  ON public.new_listings FOR SELECT USING (true);

-- ========== 3. presale_transactions 테이블 (DATA-02, D-08) ==========
CREATE TABLE public.presale_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid NOT NULL REFERENCES public.new_listings(id) ON DELETE CASCADE,
  area           numeric,
  floor          integer,
  price          integer NOT NULL,   -- 만원 단위
  deal_date      date NOT NULL,
  cancel_date    date,               -- 취소 거래: cancel_date IS NOT NULL
  superseded_by  uuid REFERENCES public.presale_transactions(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, deal_date, area, floor)  -- UPSERT 중복 방지 키
);

-- RLS: public read, service_role write
ALTER TABLE public.presale_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presale_transactions: public read"
  ON public.presale_transactions FOR SELECT USING (true);

-- ========== 4. notification_topics 테이블 (NOTIF-02) ==========
CREATE TABLE public.notification_topics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic      text NOT NULL CHECK (topic IN ('high_price', 'presale', 'complex_update')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic)
);

ALTER TABLE public.notification_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_topics: owner all"
  ON public.notification_topics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== 5. cafe_join_codes 테이블 (COMM-05) ==========
CREATE TABLE public.cafe_join_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  week_start date NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cafe_join_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cafe_join_codes: admin read"
  ON public.cafe_join_codes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

-- ========== 6. facility_kapt 컬럼 추가 (DATA-01) ==========
ALTER TABLE public.facility_kapt
  ADD COLUMN IF NOT EXISTS elevator_count   integer,
  ADD COLUMN IF NOT EXISTS heat_type        text,
  ADD COLUMN IF NOT EXISTS management_type  text,
  ADD COLUMN IF NOT EXISTS total_area       numeric;

-- ========== 7. check_gps_proximity SQL 함수 (COMM-02, D-07) ==========
CREATE OR REPLACE FUNCTION public.check_gps_proximity(
  p_complex_id  uuid,
  p_lat         double precision,
  p_lng         double precision,
  p_distance_m  integer DEFAULT 100
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.complexes
    WHERE id = p_complex_id
      AND location IS NOT NULL
      AND ST_DWithin(
        location,
        ST_Point(p_lng, p_lat)::geography,
        p_distance_m
      )
  )
$$;

COMMENT ON FUNCTION public.check_gps_proximity IS 'COMM-02: 단지 중심 ±p_distance_m 미터 내 좌표 검증 (PostGIS geography). GPS 스푸핑 방지용 서버 검증.';
