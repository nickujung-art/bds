'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addFavorite(
  complexId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('favorites')
    .upsert(
      { user_id: user.id, complex_id: complexId },
      { onConflict: 'user_id,complex_id' },
    )

  if (error) return { error: error.message }
  revalidatePath('/favorites')
  return { error: null }
}

export async function removeFavorite(
  complexId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('complex_id', complexId)

  if (error) return { error: error.message }
  revalidatePath('/favorites')
  return { error: null }
}

export async function toggleFavoriteAlert(
  complexId: string,
  enabled: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const { error } = await supabase
    .from('favorites')
    .update({ alert_enabled: enabled })
    .eq('user_id', user.id)
    .eq('complex_id', complexId)

  if (error) return { error: error.message }
  revalidatePath('/favorites')
  return { error: null }
}
