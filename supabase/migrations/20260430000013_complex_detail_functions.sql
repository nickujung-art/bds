-- 단지 월별 거래가 집계 (단지 상세 페이지용)
-- cancel_date IS NULL AND superseded_by IS NULL 조건으로 유효 거래만 집계
create or replace function public.complex_monthly_prices(
  p_complex_id uuid,
  p_deal_type  text,
  p_months     int default 120    -- 10년 = 120개월
) returns table (
  year_month text,
  avg_price  numeric,
  count      bigint,
  avg_area   numeric
) language sql stable as $$
  select
    to_char(deal_date, 'YYYY-MM')     as year_month,
    round(avg(price))                 as avg_price,
    count(*)                          as count,
    round(avg(area_m2)::numeric, 2)   as avg_area
  from public.transactions
  where
    complex_id     = p_complex_id
    and deal_type  = p_deal_type::public.deal_type
    and deal_date  >= (now() - (p_months || ' months')::interval)::date
    and cancel_date    is null
    and superseded_by  is null
  group by to_char(deal_date, 'YYYY-MM')
  order by year_month asc
$$;
