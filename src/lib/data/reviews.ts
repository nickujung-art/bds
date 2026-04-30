import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type ComplexReview = Database['public']['Tables']['complex_reviews']['Row']

export interface ReviewStats {
  count: number
  avg_rating: number | null
}

export async function getComplexReviews(
  complexId: string,
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<ComplexReview[]> {
  const { data } = await supabase
    .from('complex_reviews')
    .select('*')
    .eq('complex_id', complexId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getComplexReviewStats(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<ReviewStats> {
  const { data } = await supabase
    .from('complex_reviews')
    .select('rating')
    .eq('complex_id', complexId)

  if (!data?.length) return { count: 0, avg_rating: null }
  const sum = data.reduce((acc, r) => acc + r.rating, 0)
  return { count: data.length, avg_rating: sum / data.length }
}
