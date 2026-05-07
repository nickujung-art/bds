'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type TopicType = 'high_price' | 'presale' | 'complex_update'

export async function upsertNotificationTopic(
  topic: TopicType,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // notification_topics 테이블은 Phase 4 마이그레이션으로 추가됨.
  // database.ts 자동 생성 전까지 any 캐스트 사용.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notification_topics')
    .upsert(
      { user_id: user.id, topic },
      { onConflict: 'user_id,topic', ignoreDuplicates: true },
    )

  if (error) return { error: (error as { message: string }).message }
  return { error: null }
}

export async function deleteNotificationTopic(
  topic: TopicType,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notification_topics')
    .delete()
    .eq('user_id', user.id)
    .eq('topic', topic)

  if (error) return { error: (error as { message: string }).message }
  return { error: null }
}
