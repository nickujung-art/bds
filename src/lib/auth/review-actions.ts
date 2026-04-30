'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface SubmitReviewInput {
  complexId: string
  content:   string
  rating:    number
}

export async function submitReview(
  input: SubmitReviewInput,
): Promise<{ error: string | null }> {
  const { complexId, content, rating } = input

  if (content.length < 10 || content.length > 500) {
    return { error: '후기는 10자 이상 500자 이하로 작성해주세요.' }
  }
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return { error: '평점은 1~5 사이의 정수여야 합니다.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase.from('complex_reviews').insert({
    complex_id: complexId,
    user_id:    user.id,
    content:    content.trim(),
    rating,
  })

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}

export async function deleteReview(
  reviewId: string,
  complexId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('complex_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}
