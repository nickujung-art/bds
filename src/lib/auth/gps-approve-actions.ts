'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin(): Promise<{
  error: string | null
  admin: ReturnType<typeof createSupabaseAdminClient> | null
  userId: string | null
}> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다', admin: null, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    return { error: '관리자 권한이 필요합니다', admin: null, userId: null }
  }

  return { error: null, admin: createSupabaseAdminClient(), userId: user.id }
}

export async function approveGpsRequest(
  requestId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (!requestId || !userId) return { error: '잘못된 파라미터입니다' }

  const { error, admin, userId: adminUserId } = await requireAdmin()
  if (error || !admin || !adminUserId) return { error: error! }

  const { error: updateErr } = await admin
    .from('gps_verification_requests')
    .update({
      status: 'approved',
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (updateErr) {
    console.error('[gps-approve] update error:', updateErr)
    return { error: 'DB 오류가 발생했습니다' }
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update({ gps_badge_level: 3 })
    .eq('id', userId)

  if (profileErr) {
    console.error('[gps-approve] profile update error:', profileErr)
    return { error: '배지 업데이트 실패' }
  }

  revalidatePath('/admin/gps-requests')
  return { error: null }
}

export async function rejectGpsRequest(
  requestId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (!requestId || !userId) return { error: '잘못된 파라미터입니다' }

  const { error, admin, userId: adminUserId } = await requireAdmin()
  if (error || !admin || !adminUserId) return { error: error! }

  const { error: updateErr } = await admin
    .from('gps_verification_requests')
    .update({
      status: 'rejected',
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (updateErr) {
    console.error('[gps-approve] update error:', updateErr)
    return { error: 'DB 오류가 발생했습니다' }
  }

  revalidatePath('/admin/gps-requests')
  return { error: null }
}
