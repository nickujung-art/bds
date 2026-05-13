-- data_sources 시드: 백필 스크립트가 참조하는 source_id 행 삽입
insert into public.data_sources (id, cadence, expected_freshness_hours, ui_label)
values
  ('molit_trade', 'monthly', 720, '국토부 실거래가 (매매)'),
  ('molit_rent',  'monthly', 720, '국토부 실거래가 (전월세)')
on conflict (id) do nothing;
