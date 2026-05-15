'use server'

import { createReadonlyClient } from '@/lib/supabase/readonly'

/**
 * 단지 조회수를 1 증가시키는 Server Action.
 * 클라이언트 컴포넌트의 useEffect에서 호출 (ISR 페이지 빌드 타임 실행 방지).
 * 세션 내 중복 방지는 호출 측에서 sessionStorage로 처리.
 *
 * increment_view_count RPC는 마이그레이션에서 anon role에 GRANT EXECUTE되어 있으므로
 * anon key를 사용하는 createReadonlyClient()로도 UPDATE가 허용된다.
 */
export async function incrementViewCount(complexId: string): Promise<void> {
  const supabase = createReadonlyClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('increment_view_count', { p_complex_id: complexId })
}
