'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

async function requireAdmin(): Promise<{ error: string | null; admin: AdminClient | null }> {
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

  return { error: null, admin: createSupabaseAdminClient() }
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
