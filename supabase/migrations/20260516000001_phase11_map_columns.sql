-- Phase 11: 지도 고도화 — avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d
-- 의존: complexes 테이블, transactions 테이블 (20260430000002_complexes.sql 이후)

-- ============================================================
-- 1. 컬럼 추가
-- ============================================================
ALTER TABLE public.complexes
  ADD COLUMN IF NOT EXISTS avg_sale_per_pyeong integer,
  ADD COLUMN IF NOT EXISTS view_count          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_change_30d    numeric(5,4),
  ADD COLUMN IF NOT EXISTS tx_count_30d        integer NOT NULL DEFAULT 0;

-- ============================================================
-- 2. 인덱스 (지도 필터 + 정렬용)
-- ============================================================
CREATE INDEX IF NOT EXISTS complexes_view_count_idx
  ON public.complexes(view_count);

CREATE INDEX IF NOT EXISTS complexes_avg_sale_idx
  ON public.complexes(avg_sale_per_pyeong);

CREATE INDEX IF NOT EXISTS complexes_price_change_idx
  ON public.complexes(price_change_30d);

-- ============================================================
-- 3. view_count +1 RPC
--    SECURITY INVOKER + anon GRANT — 클라이언트에서 호출 가능
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_view_count(p_complex_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  UPDATE public.complexes
  SET view_count = view_count + 1,
      updated_at = now()
  WHERE id = p_complex_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

-- ============================================================
-- 4. 배치 집계 함수
--    CRITICAL: cancel_date IS NULL AND superseded_by IS NULL 반드시 포함 (CLAUDE.md)
--    price_change_30d: numeric(5,4) 비율 저장 (0.1050 = +10.5%)
--    avg_sale_per_pyeong: 만원/평 단위 정수
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_complex_price_stats()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.complexes c
  SET
    avg_sale_per_pyeong = (
      SELECT (avg(t.price / NULLIF(t.area_m2 / 3.3058, 0)) / 10000)::integer
      FROM public.transactions t
      WHERE t.complex_id = c.id
        AND t.deal_type = 'sale'
        AND t.deal_date >= CURRENT_DATE - INTERVAL '1 year'
        AND t.cancel_date IS NULL
        AND t.superseded_by IS NULL
        AND t.area_m2 > 0
    ),
    price_change_30d = (
      WITH recent AS (
        SELECT avg(t.price) AS avg_p
        FROM public.transactions t
        WHERE t.complex_id = c.id
          AND t.deal_type = 'sale'
          AND t.deal_date >= CURRENT_DATE - INTERVAL '30 days'
          AND t.cancel_date IS NULL
          AND t.superseded_by IS NULL
      ),
      prev AS (
        SELECT avg(t.price) AS avg_p
        FROM public.transactions t
        WHERE t.complex_id = c.id
          AND t.deal_type = 'sale'
          AND t.deal_date >= CURRENT_DATE - INTERVAL '60 days'
          AND t.deal_date <  CURRENT_DATE - INTERVAL '30 days'
          AND t.cancel_date IS NULL
          AND t.superseded_by IS NULL
      )
      SELECT CASE
        WHEN prev.avg_p IS NULL OR prev.avg_p = 0 THEN NULL
        ELSE round(((recent.avg_p - prev.avg_p) / prev.avg_p)::numeric, 4)
      END
      FROM recent, prev
    ),
    tx_count_30d = (
      SELECT count(*)::integer
      FROM public.transactions t
      WHERE t.complex_id = c.id
        AND t.deal_type = 'sale'
        AND t.deal_date >= CURRENT_DATE - INTERVAL '30 days'
        AND t.cancel_date IS NULL
        AND t.superseded_by IS NULL
    ),
    updated_at = now()
  WHERE c.status = 'active';
$$;
