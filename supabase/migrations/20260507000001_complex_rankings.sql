-- complex_rankings: 랭킹 cron이 1시간마다 UPSERT하는 전용 테이블
-- materialized view 대신 테이블 사용 이유: RLS 적용 가능, 서비스롤 UPSERT 안정
create table public.complex_rankings (
  id           uuid primary key default gen_random_uuid(),
  complex_id   uuid not null references public.complexes(id) on delete cascade,
  rank_type    text not null
                 check (rank_type in ('high_price', 'volume', 'price_per_pyeong', 'interest')),
  score        numeric not null,
  rank         integer not null check (rank >= 1),
  window_days  integer not null default 30,
  computed_at  timestamptz not null default now(),
  unique (rank_type, complex_id, window_days)
);

-- 랭킹 조회 최적화 인덱스 (rank_type별 순위 정렬)
create index complex_rankings_type_rank_idx
  on public.complex_rankings (rank_type, rank);

comment on table public.complex_rankings is
  '창원·김해 단지 랭킹 4종(신고가·거래량·평당가·관심도). rankings cron이 1h 주기로 UPSERT.';
