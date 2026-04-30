import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// 쿠키 불필요한 공개 데이터 조회용 — ISR/SSG 페이지에서 사용
// cookies()를 호출하지 않아 revalidate가 정상 동작함
export function createReadonlyClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
