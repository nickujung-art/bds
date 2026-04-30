-- K-apt 기반 멱등성 시드를 위한 UNIQUE 제약
-- molit_complex_code: MOLIT ingest 기준
-- kapt_code: K-apt seed 기준
alter table public.complexes add constraint complexes_kapt_code_key unique (kapt_code);
