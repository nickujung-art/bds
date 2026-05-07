'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitComment(input: {
  reviewId: string
  complexId: string
  content: string
}): Promise<{ error: string | null }> {
  const { reviewId, complexId, content } = input

  // auth-first 패턴: 인증 확인을 입력 검증보다 먼저
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (content.length < 10 || content.length > 500)
    return { error: '댓글은 10자 이상 500자 이하로 작성해주세요.' }

  // database.ts는 comments 테이블 타입을 아직 포함하지 않음 (Phase 4 마이그레이션 추가)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('comments')
    .insert({ review_id: reviewId, user_id: user.id, content: content.trim() })

  if (error) return { error: (error as { message: string }).message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}

export async function reportComment(
  commentId: string,
  reason = '부적절한 내용',
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('reports')
    .insert({ reporter_id: user.id, target_type: 'comment', target_id: commentId, reason })

  if (error) return { error: (error as { message: string }).message }
  return { error: null }
}

export async function deleteComment(
  commentId: string,
  complexId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // database.ts는 comments 테이블 타입을 아직 포함하지 않음 (Phase 4 마이그레이션 추가)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { error: (error as { message: string }).message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}
