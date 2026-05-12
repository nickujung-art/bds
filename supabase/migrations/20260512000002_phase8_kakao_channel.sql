-- Phase 8: 카카오톡 채널 구독 스키마 (DIFF-04)

CREATE TABLE IF NOT EXISTS public.kakao_channel_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number  text NOT NULL,  -- pgcrypto로 암호화 저장 권장
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  is_active     boolean NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

ALTER TABLE public.kakao_channel_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kakao_channel_subscriptions: owner all"
  ON public.kakao_channel_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 관리자도 읽기 가능 (운영 목적)
CREATE POLICY "kakao_channel_subscriptions: admin read"
  ON public.kakao_channel_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

COMMENT ON TABLE public.kakao_channel_subscriptions IS 'DIFF-04: 전화번호는 개인정보 — 로그 출력 절대 금지. RLS owner-only.';
