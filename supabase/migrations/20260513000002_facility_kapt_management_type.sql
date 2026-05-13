-- facility_kapt: management_type 컬럼 추가 (K-apt getAphusDtlInfoV4 codeMgr 저장용)
alter table public.facility_kapt
  add column if not exists management_type text;
