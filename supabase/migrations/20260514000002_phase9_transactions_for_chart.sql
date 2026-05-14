-- Phase 9: 단지별 개별 거래 행 + area 필터 RPC (UX-01 IQR 이상치, UX-02 평형 필터)
-- 기존 complex_monthly_prices RPC는 월별 집계만 반환 → IQR 계산 불가
-- 본 RPC는 개별 거래 행을 반환하여 클라이언트에서 IQR 계산 + 평형 그룹 추출 가능

create or replace function public.complex_transactions_for_chart(
  p_complex_id uuid,
  p_deal_type  text,
  p_months     int     default 120,
  p_area_m2    numeric default null
) returns table (
  deal_date  text,
  year_month text,
  price      numeric,
  area_m2    numeric
) language sql stable as $$
  select
    deal_date::text                       as deal_date,
    to_char(deal_date, 'YYYY-MM')         as year_month,
    price::numeric                        as price,
    area_m2::numeric                      as area_m2
  from public.transactions
  where
    complex_id     = p_complex_id
    and deal_type  = p_deal_type::public.deal_type
    and deal_date  >= (now() - (p_months || ' months')::interval)::date
    and cancel_date    is null
    and superseded_by  is null
    and (p_area_m2 is null or round(area_m2) = round(p_area_m2))
  order by deal_date asc
$$;

comment on function public.complex_transactions_for_chart is
  'UX-01/UX-02: 개별 거래 행 반환 (area 필터 선택적). cancel_date IS NULL AND superseded_by IS NULL 필수.';
