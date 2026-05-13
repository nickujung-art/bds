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

// Phase 8 DIFF-01: 등급 배지 표시를 위해 user 정보 포함
export interface CommentWithUserInfo extends Pick<Comment, 'id' | 'content' | 'created_at' | 'user_id'> {
  member_tier?: string | null
  cafe_nickname?: string | null
}

export type ReviewWithComments = ComplexReview & {
  comments: CommentWithUserInfo[]
  reviewer_tier?: string | null
  reviewer_cafe_nickname?: string | null
}

export async function getReviewsWithComments(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<ReviewWithComments[]> {
  // database.ts는 comments/profiles 관계를 아직 포함하지 않음 — any 캐스트로 런타임 쿼리 허용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('complex_reviews')
    .select(`
      *,
      reviewer:profiles!user_id(member_tier, cafe_nickname),
      comments(
        id,
        content,
        created_at,
        user_id,
        commenter:profiles!user_id(member_tier, cafe_nickname)
      )
    `)
    .eq('complex_id', complexId)
    .order('created_at', { ascending: false })
    .limit(20)

  // profiles join 결과를 flat한 구조로 변환
  const rows = (data ?? []) as Array<{
    reviewer?: { member_tier?: string | null; cafe_nickname?: string | null } | null
    comments?: Array<{
      id: string
      content: string
      created_at: string
      user_id: string | null
      commenter?: { member_tier?: string | null; cafe_nickname?: string | null } | null
    }>
    [key: string]: unknown
  }>

  return rows.map(row => {
    const { reviewer, comments, ...rest } = row
    return {
      ...rest,
      reviewer_tier: reviewer?.member_tier ?? null,
      reviewer_cafe_nickname: reviewer?.cafe_nickname ?? null,
      comments: (comments ?? []).map(c => {
        const { commenter, ...commentRest } = c
        return {
          ...commentRest,
          member_tier: commenter?.member_tier ?? null,
          cafe_nickname: commenter?.cafe_nickname ?? null,
        }
      }),
    }
  }) as ReviewWithComments[]
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
