---
phase: "06"
plan: "00"
subsystem: db-migrations
tags: [pgvector, district_stats, ad_events, gps_auth, migrations]
dependency_graph:
  requires: []
  provides:
    - district_stats 테이블 (SGIS 시군구 인구·세대 통계)
    - complex_embeddings 테이블 + match_complex_embeddings RPC (RAG 봇 벡터 검색)
    - ad_events.is_anomaly 컬럼 + conversion 이벤트 타입 (광고 이상 트래픽)
    - gps_visits + gps_verification_requests 테이블 (GPS L2/L3 인증)
    - profiles.gps_badge_level 컬럼 (배지 단계)
    - gps-docs Storage 버킷 (서류 업로드)
  affects:
    - ad_events (event_type CHECK constraint 수정)
    - profiles (gps_badge_level 컬럼 추가)
tech_stack:
  added:
    - pgvector extension (extensions schema)
    - Supabase Storage bucket: gps-docs (private)
  patterns:
    - RLS 정책 (public read + service_role write) 패턴 준수
    - HNSW 인덱스 (vector_cosine_ops) for cosine similarity
    - Partial index (WHERE is_anomaly = true) for anomaly query
key_files:
  created:
    - supabase/migrations/20260508000001_district_stats.sql
    - supabase/migrations/20260508000002_ad_events_conversion.sql
    - supabase/migrations/20260508000003_pgvector.sql
    - supabase/migrations/20260508000004_gps_auth.sql
  modified:
    - .env.local.example (4개 환경변수 키 추가)
decisions:
  - "voyage-4-lite 1024차원 벡터 사용 (Anthropic은 임베딩 미지원)"
  - "pgvector HNSW 인덱스 — 9000 vectors 규모에서 수초 이내 빌드"
  - "gps-docs Storage 버킷 private — 어드민만 읽기 가능"
  - "ad_events CHECK constraint DROP + 재생성 방식으로 conversion 추가"
metrics:
  duration: "~5분"
  completed_date: "2026-05-08"
  tasks_completed: 1
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 6 Plan 00: DB 마이그레이션 + 환경 변수 등록 Summary

Wave 0 준비: 4개 SQL 마이그레이션 파일 작성 + `.env.local.example` 환경변수 추가 완료. Task 2(마이그레이션 적용 + 패키지 설치)는 checkpoint:human-action으로 사용자가 직접 실행해야 함.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | SQL 마이그레이션 4개 파일 작성 | 94e63d3 | 4개 SQL 마이그레이션 파일 생성 |

## Migrations Written

| 파일 | 목적 | 주요 오브젝트 |
|------|------|--------------|
| `20260508000001_district_stats.sql` | SGIS 시군구 인구·세대 통계 | `district_stats` 테이블, `district_stats_si_gu_idx`, `district_stats_year_quarter_idx`, RLS 2개 정책 |
| `20260508000002_ad_events_conversion.sql` | 전환 이벤트 + 이상 트래픽 플래그 | `ad_events.event_type` CHECK 수정('conversion' 추가), `is_anomaly` 컬럼, `ad_events_anomaly_idx` (partial) |
| `20260508000003_pgvector.sql` | RAG 봇 벡터 저장소 | `pgvector` extension, `complex_embeddings` 테이블, HNSW 인덱스, `match_complex_embeddings` RPC, RLS 2개 정책 |
| `20260508000004_gps_auth.sql` | GPS L2/L3 인증 | `gps_visits` 테이블, `gps_verification_requests` 테이블, `profiles.gps_badge_level` 컬럼, `gps-docs` Storage 버킷, RLS 5개 정책 |

## Environment Variables Added to .env.local.example

```
ANTHROPIC_API_KEY=    # Claude API (AD-02, DIFF-03)
VOYAGE_API_KEY=       # Voyage AI 임베딩 (DIFF-03)
SGIS_CONSUMER_KEY=    # SGIS 통계 API (DATA-06)
SGIS_CONSUMER_SECRET= # SGIS 통계 API (DATA-06)
```

## Checkpoint Pending (Task 2)

사용자가 다음을 직접 실행해야 함:

1. `npm run db:push` — 로컬 Supabase에 마이그레이션 적용
2. `npm install @anthropic-ai/sdk` — Anthropic SDK 설치
3. `.env.local`에 실제 API 키 값 입력 (ANTHROPIC_API_KEY, VOYAGE_API_KEY, SGIS_CONSUMER_KEY/SECRET)
4. Supabase Studio에서 테이블 생성 확인
5. `npm run lint && npm run build` — 빌드 확인

## Deviations from Plan

None — 계획대로 정확히 실행됨.

## Known Stubs

없음. 이 플랜은 DB 스키마 마이그레이션만 포함하며 애플리케이션 코드 변경 없음.

## Threat Flags

없음. 마이그레이션 파일에 새 네트워크 엔드포인트나 신뢰 경계 변경 없음. 계획된 위협 모델(T-06-00-01~04)은 마이그레이션 내 RLS 정책으로 모두 mitigate 적용됨.

## Self-Check: PASSED

- [x] `supabase/migrations/20260508000001_district_stats.sql` — 생성됨
- [x] `supabase/migrations/20260508000002_ad_events_conversion.sql` — 생성됨
- [x] `supabase/migrations/20260508000003_pgvector.sql` — 생성됨
- [x] `supabase/migrations/20260508000004_gps_auth.sql` — 생성됨
- [x] `.env.local.example` — 4개 환경변수 키 추가됨
- [x] Commit 94e63d3 — git log로 확인됨
