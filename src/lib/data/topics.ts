import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TopicType } from '@/lib/auth/topic-actions'

// notification_topics 테이블은 Phase 4 마이그레이션으로 추가됨.
// database.ts 자동 생성 전까지 any 캐스트 사용.
export async function getNotificationTopics(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<TopicType[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('notification_topics')
    .select('topic')
    .eq('user_id', userId)
  return ((data ?? []) as Array<{ topic: string }>).map(row => row.topic as TopicType)
}
