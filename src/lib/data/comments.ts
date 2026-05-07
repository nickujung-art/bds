import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ComplexReview } from '@/lib/data/reviews'

// comments 테이블은 Phase 4 마이그레이션(20260507000004)으로 추가됨.
// database.ts 자동 생성 전까지 수동 타입 정의 사용.
export interface Comment {
  id: string
  review_id: string
  user_id: string | null
  content: string
  created_at: string
  updated_at: string
}

export type ReviewWithComments = ComplexReview & {
  comments: Pick<Comment, 'id' | 'content' | 'created_at' | 'user_id'>[]
}

export async function getReviewsWithComments(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<ReviewWithComments[]> {
  // database.ts는 comments 관계를 아직 포함하지 않음 — any 캐스트로 런타임 쿼리 허용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('complex_reviews')
    .select('*, comments(id, content, created_at, user_id)')
    .eq('complex_id', complexId)
    .order('created_at', { ascending: false })
    .limit(20)
  return ((data ?? []) as unknown) as ReviewWithComments[]
}

export async function getCommentsByReviewId(
  reviewId: string,
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<Comment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('comments')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return ((data ?? []) as unknown) as Comment[]
}
