import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const URL_  = process.env.TEST_SUPABASE_URL  ?? 'http://127.0.0.1:54321'
export const SKEY  = process.env.TEST_SUPABASE_SKEY ?? ''
export const AKEY  = process.env.TEST_SUPABASE_AKEY ?? ''

// 로컬 Supabase가 없는 환경(SKEY='')에서도 import 시 throw 하지 않도록 lazy init
// createClient는 키가 빈 문자열이면 즉시 throw → placeholder로 대체
const _skey = SKEY || 'placeholder-key-for-module-load'

export const admin = createClient<Database>(URL_, _skey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
