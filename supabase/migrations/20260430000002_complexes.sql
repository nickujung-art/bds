-- complexes.status 6단계 enum (ADR-035)
create type public.complex_status as enum (
  'pre_sale',
  'under_construction',
  'recently_built',
  'active',
  'in_redevelopment',
  'demolished'
);

-- Golden Record: 단지 정보의 단일 진실 (ADR-033)
-- 위치(좌표) + 이름 복합 매칭 전용 — 단지명 단독 매칭 절대 금지
create table public.complexes (
  id                  uuid primary key default gen_random_uuid(),
  canonical_name      text not null,
  name_normalized     text not null,    -- NFC + 공백제거 + lower (검색·매칭용)
  molit_complex_code  text unique,
  kapt_code           text,
  sgg_code            text not null,    -- 시군구코드 5자리 (국토부 LAWD_CD 형식)
  road_address        text,
  jibun_address       text,
  si                  text,
  gu                  text,
  dong                text,
  lat                 double precision,
  lng                 double precision,
  location            geography(Point, 4326) generated always as (
    case
      when lat is not null and lng is not null
      then st_setsrid(st_makepoint(lng, lat), 4326)::geography
    end
  ) stored,
  geocoding_accuracy  numeric,
  household_count     integer,
  built_year          smallint,
  floors_above        smallint,
  floors_below        smallint,
  heat_type           text,
  status              public.complex_status not null default 'active',
  predecessor_id      uuid references public.complexes(id),   -- 재건축 이전 단지
  successor_id        uuid references public.complexes(id),   -- 재건축 이후 단지
  data_completeness   jsonb not null default
                        '{"transactions":false,"school":false,"kapt":false,"poi":false}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index complexes_location_idx
  on public.complexes using gist(location);
create index complexes_name_normalized_trgm_idx
  on public.complexes using gin(name_normalized gin_trgm_ops);
create index complexes_sgg_code_idx on public.complexes(sgg_code);
create index complexes_status_idx on public.complexes(status);

create trigger complexes_updated_at
  before update on public.complexes
  for each row execute function public.set_updated_at();

-- 외부 출처별 단지명 누적 별칭 (덮어쓰지 않고 누적)
create table public.complex_aliases (
  id          uuid primary key default gen_random_uuid(),
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  source      text not null,
  alias_name  text not null,
  external_id text,
  confidence  numeric,
  created_at  timestamptz not null default now(),
  unique(complex_id, source, alias_name)
);

create unique index complex_aliases_source_external_id_idx
  on public.complex_aliases(source, external_id)
  where external_id is not null;
create index complex_aliases_complex_id_idx on public.complex_aliases(complex_id);
create index complex_aliases_alias_name_trgm_idx
  on public.complex_aliases using gin(alias_name gin_trgm_ops);

-- 매칭 신뢰도 미달·충돌 시 운영자 검수 큐 (ADR-039)
create type public.match_reason as enum ('low_confidence', 'conflict', 'no_match');
create type public.match_status as enum ('pending', 'resolved', 'rejected');

create table public.complex_match_queue (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,
  raw_payload    jsonb not null,
  candidate_ids  uuid[],
  reason         public.match_reason not null,
  status         public.match_status not null default 'pending',
  tie_reason     text,           -- 'same_coordinate' 등
  -- resolved_by uuid FK: 0005_users.sql에서 profiles 생성 후 추가
  resolved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index complex_match_queue_pending_idx
  on public.complex_match_queue(created_at)
  where status = 'pending';

create trigger complex_match_queue_updated_at
  before update on public.complex_match_queue
  for each row execute function public.set_updated_at();
