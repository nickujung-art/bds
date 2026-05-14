-- Phase 9: facility_kapt.building_count 컬럼 추가 (UX-03 엘리베이터 동당 계산용)
-- 원천: KAPT BasicInfo API의 kaptDongCnt (동수)
-- Idempotent: ADD COLUMN IF NOT EXISTS

alter table public.facility_kapt
  add column if not exists building_count integer;

comment on column public.facility_kapt.building_count is
  'UX-03: 동수 (KAPT kaptDongCnt). 엘리베이터 동당 대수 계산: elevator_count / building_count.';
