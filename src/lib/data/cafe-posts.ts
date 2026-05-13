import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CafePost } from '@/services/daum-cafe'
import { matchComplex } from '@/lib/data/complex-matching'

// database.ts는 Phase 8 마이그레이션 테이블(cafe_posts)을 아직 포함하지 않음
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

export interface CafePostRecord {
  id:         string
  complex_id: string | null
  title:      string
  excerpt:    string | null
  url:        string
  cafe_name:  string | null
  posted_at:  string | null
  confidence: number | null
}

export async function getCafePostsByComplex(
  complexId: string,
  supabase: AnySupabase,
  limit = 5,
): Promise<CafePostRecord[]> {
  const { data } = await supabase
    .from('cafe_posts')
    .select('id, complex_id, title, excerpt, url, cafe_name, posted_at, confidence')
    .eq('complex_id', complexId)
    .eq('is_verified', true)
    .order('posted_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as CafePostRecord[]
}

/**
 * DIFF-02: 카페 글 ingest + 단지 매칭
 * CRITICAL: matchComplex() 경유 필수. 단지명 단독 매칭 절대 금지.
 */
export async function ingestCafePost(
  post: CafePost,
  complexName: string,
  sggCode: string,
  supabase: AnySupabase,
): Promise<void> {
  // matchComplex: sgg_code + 이름 복합 매칭 (CLAUDE.md 필수 규칙)
  const complexId = await matchComplex(
    {
      rawName:    complexName,
      sggCode:    sggCode,
      source:     'cafe_nlp',
      rawPayload: { postUrl: post.url, cafeName: post.cafeName },
    },
    supabase,
  )

  // AUTO_THRESHOLD(0.9) 이상인 경우에만 matchComplex가 complexId를 반환
  // confidence = null이면 큐에 들어가 운영자 검수 대기 (is_verified = false)
  const confidence = complexId !== null ? 0.9 : null
  const isVerified = complexId !== null

  await supabase
    .from('cafe_posts')
    .upsert(
      {
        complex_id:  complexId,
        title:       post.title.slice(0, 200),
        excerpt:     post.contents.slice(0, 500),
        url:         post.url,
        cafe_name:   post.cafeName,
        posted_at:   post.datetime,
        confidence,
        is_verified: isVerified,
      },
      { onConflict: 'url' },
    )
}
