-- facility_kapt: elevator_count 컬럼 + upsert용 unique constraint 추가
alter table public.facility_kapt
  add column if not exists elevator_count integer;

-- (complex_id, data_month) 중복 방지 — upsert onConflict 기준
alter table public.facility_kapt
  drop constraint if exists facility_kapt_complex_id_data_month_key;
alter table public.facility_kapt
  add constraint facility_kapt_complex_id_data_month_key
  unique (complex_id, data_month);
