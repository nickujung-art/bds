'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

const VALID_PHASES = [
  'rumor', 'proposed', 'committee_formed', 'safety_eval',
  'designated', 'business_approval', 'construction_permit',
  'construction', 'completed', 'cancelled',
] as const

const redevelopmentSchema = z.object({
  complexId: z.string().uuid('유효한 단지 ID가 아닙니다'),
  phase: z.enum(VALID_PHASES, { message: '유효한 진행 단계가 아닙니다' }),
  notes: z.string().max(500, '비고는 500자 이하로 입력해 주세요').nullable(),
})

async function requireAdmin(): Promise<{
  error: string | null
  admin: AdminClient | null
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

export async function upsertRedevelopmentProject(
  complexId: string,
  phase: string,
  notes: string | null,
): Promise<{ error: string | null }> {
  // 1. admin guard FIRST (before zod — prevents payload shape leak to unauthenticated callers)
  const { error, admin, userId } = await requireAdmin()
  if (error || !admin || !userId) return { error: error! }

  // 2. zod validation (after auth confirmed)
  const parsed = redevelopmentSchema.safeParse({ complexId, phase, notes })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0] ?? parsed.error.flatten().fieldErrors
    const message = typeof firstIssue === 'object' && 'message' in firstIssue
      ? (firstIssue as { message: string }).message
      : '입력값이 유효하지 않습니다'
    return { error: message }
  }

  // 3. upsert (complex_id 기준 — 단지당 1개 row)
  // All DB writes MUST use createSupabaseAdminClient() — per CLAUDE.md.
  // The requireAdmin() function returns the admin client after auth verification.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbErr } = await (admin as any)
    .from('redevelopment_projects')
    .upsert(
      {
        complex_id: parsed.data.complexId,
        phase: parsed.data.phase,
        notes: parsed.data.notes,
        project_name: `재건축-${parsed.data.complexId}`,
        created_by: userId,
      },
      { onConflict: 'complex_id' },
    )

  if (dbErr) return { error: (dbErr as { message: string }).message }

  revalidatePath('/admin/redevelopment')
  revalidatePath(`/complexes/${parsed.data.complexId}`)
  return { error: null }
}
