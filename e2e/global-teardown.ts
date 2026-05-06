import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'

export default async function globalTeardown() {
  const userId = process.env.E2E_TEST_USER_ID
  if (!userId) {
    console.warn('[E2E Teardown] No test user ID found — skipping cleanup')
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[E2E Teardown] Missing Supabase credentials — skipping cleanup')
    return
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // auth.users deletion cascades to profiles (ON DELETE CASCADE in schema)
  // Any reviews or favorites created during the test run will also be removed
  // because their user_id FK references auth.users with ON DELETE CASCADE.
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    console.error(`[E2E Teardown] Failed to delete test user ${userId}: ${error.message}`)
  } else {
    console.log(`[E2E Teardown] Test user deleted: ${userId}`)
  }
}
