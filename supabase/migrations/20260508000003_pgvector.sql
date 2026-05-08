-- Phase 6 DIFF-03: pgvector RAG 임베딩 (voyage-4-lite 1024 dim)
create extension if not exists vector with schema extensions;

create table public.complex_embeddings (
  id          uuid primary key default gen_random_uuid(),
  complex_id  uuid not null references public.complexes(id) on delete cascade,
  content     text not null,
  chunk_type  text not null
    check (chunk_type in ('summary', 'transactions', 'reviews')),
  embedding   extensions.vector(1024),
  updated_at  timestamptz not null default now(),
  unique (complex_id, chunk_type)
);

create index complex_embeddings_hnsw_idx
  on public.complex_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.complex_embeddings enable row level security;

create policy "complex_embeddings: public read"
  on public.complex_embeddings for select using (true);

create policy "complex_embeddings: service role write"
  on public.complex_embeddings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function match_complex_embeddings(
  query_embedding extensions.vector(1024),
  target_complex_id uuid,
  match_count int default 3
)
returns table (
  chunk_type text,
  content    text,
  similarity float
)
language sql stable
as $$
  select
    chunk_type,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from public.complex_embeddings
  where complex_id = target_complex_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
