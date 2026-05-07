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

  const { error } = await supabase
    .from('comments')
    .insert({ review_id: reviewId, user_id: user.id, content: content.trim() })

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}

export async function deleteComment(
  commentId: string,
  complexId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}
