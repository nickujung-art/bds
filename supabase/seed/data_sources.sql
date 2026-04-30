-- 외부 데이터 소스 초기 시드 (ADR-037)
insert into public.data_sources (id, cadence, expected_freshness_hours, ui_label) values
  ('molit_trade',   'daily',     48,   '전일 기준'),
  ('molit_rent',    'daily',     48,   '전일 기준'),
  ('kapt',          'monthly',   1080, '전월 기준'),
  ('school_alimi',  'quarterly', 2400, '분기 기준'),
  ('kakao_poi',     'quarterly', 2400, '분기 기준'),
  ('juso',          'event',     168,  '갱신 기준')
on conflict (id) do nothing;
