'use server'

import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

async function requireAdmin(): Promise<{ error: string | null; admin: ReturnType<typeof createClient<Database>> | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다', admin: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    return { error: '관리자 권한이 필요합니다', admin: null }
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  return { error: null, admin: adminClient }
}

async function updateStatus(
  id: string,
  status: Database['public']['Enums']['ad_status'],
): Promise<{ error: string | null }> {
  const { error, admin } = await requireAdmin()
  if (error || !admin) return { error: error! }

  const { error: dbErr } = await admin
    .from('ad_campaigns')
    .update({ status })
    .eq('id', id)

  if (dbErr) return { error: dbErr.message }
  revalidatePath('/admin/ads')
  return { error: null }
}

export async function approveAdCampaign(id: string): Promise<{ error: string | null }> {
  return updateStatus(id, 'approved')
}

export async function rejectAdCampaign(id: string): Promise<{ error: string | null }> {
  return updateStatus(id, 'rejected')
}

export async function pauseAdCampaign(id: string): Promise<{ error: string | null }> {
  return updateStatus(id, 'paused')
}
