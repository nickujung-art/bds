import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const URL_  = process.env.TEST_SUPABASE_URL  ?? 'http://127.0.0.1:54321'
export const SKEY  = process.env.TEST_SUPABASE_SKEY ?? ''
export const AKEY  = process.env.TEST_SUPABASE_AKEY ?? ''

export const admin = createClient<Database>(URL_, SKEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
