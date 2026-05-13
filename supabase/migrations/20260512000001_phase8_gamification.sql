-- Phase 8: 게이미피케이션 스키마 (DIFF-01, DIFF-05)

-- 1. profiles 테이블 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activity_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS member_tier text NOT NULL DEFAULT 'bronze'
    CHECK (member_tier IN ('bronze', 'silver', 'gold'));

CREATE INDEX IF NOT EXISTS profiles_member_tier_idx ON public.profiles(member_tier);

-- 2. activity_logs 테이블
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points     integer NOT NULL,
  reason     text NOT NULL CHECK (reason IN ('review', 'comment', 'gps_verify', 'daily_visit', 'first_favorite')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs: owner read"
  ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
-- write: service_role only (SECURITY DEFINER 트리거 함수에서만 호출)

-- 3. 포인트 적립 함수 (SECURITY DEFINER — 클라이언트 직접 호출 불가)
CREATE OR REPLACE FUNCTION public.add_activity_points(
  p_user_id uuid,
  p_points  integer,
  p_reason  text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, points, reason)
    VALUES (p_user_id, p_points, p_reason);

  UPDATE public.profiles
    SET
      activity_points = activity_points + p_points,
      member_tier = CASE
        WHEN activity_points + p_points >= 200 THEN 'gold'
        WHEN activity_points + p_points >= 50  THEN 'silver'
        ELSE 'bronze'
      END
    WHERE id = p_user_id;
END;
$$;

-- 4. 후기 작성 트리거 함수
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.add_activity_points(NEW.user_id, 10, 'review');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_award_points ON public.complex_reviews;
CREATE TRIGGER reviews_award_points
  AFTER INSERT ON public.complex_reviews
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.award_review_points();

-- 5. 댓글 작성 트리거 함수
CREATE OR REPLACE FUNCTION public.award_comment_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.add_activity_points(NEW.user_id, 3, 'comment');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_award_points ON public.comments;
CREATE TRIGGER comments_award_points
  AFTER INSERT ON public.comments
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.award_comment_points();

COMMENT ON FUNCTION public.add_activity_points IS 'DIFF-01/05: SECURITY DEFINER — 클라이언트 직접 UPDATE 불가. 트리거에서만 호출.';
