-- 창원시·김해시 시군구코드 (국토부 LAWD_CD = 행안부 admCd 앞 5자리)
insert into public.regions (sgg_code, sgg_name, si, gu) values
  ('48121', '창원시 의창구',   '창원시', '의창구'),
  ('48123', '창원시 성산구',   '창원시', '성산구'),
  ('48125', '창원시 마산합포구', '창원시', '마산합포구'),
  ('48127', '창원시 마산회원구', '창원시', '마산회원구'),
  ('48129', '창원시 진해구',   '창원시', '진해구'),
  ('48250', '김해시',         '김해시', null)
on conflict (sgg_code) do nothing;

-- 외부 데이터 소스 초기 시드 (ADR-037)
insert into public.data_sources (id, cadence, expected_freshness_hours, ui_label) values
  ('molit_trade',   'daily',     48,   '전일 기준'),
  ('molit_rent',    'daily',     48,   '전일 기준'),
  ('kapt',          'monthly',   1080, '전월 기준'),
  ('school_alimi',  'quarterly', 2400, '분기 기준'),
  ('kakao_poi',     'quarterly', 2400, '분기 기준'),
  ('juso',          'event',     168,  '갱신 기준')
on conflict (id) do nothing;
