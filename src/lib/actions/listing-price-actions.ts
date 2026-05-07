'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

const listingPriceSchema = z.object({
  complexId:    z.string().uuid('유효한 단지 ID가 아닙니다'),
  pricePerPy:   z.number().int().min(100, '평당가는 100만원 이상이어야 합니다')
                           .max(99999, '평당가는 99,999만원 이하로 입력해 주세요'),
  recordedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '기준일을 입력해 주세요'),
  source:       z.string().min(1, '출처를 입력해 주세요').max(100),
})

const deleteSchema = z.object({
  id: z.string().uuid('유효하지 않은 ID입니다'),
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

export async function upsertListingPrice(input: {
  complexId: string
  pricePerPy: number
  recordedDate: string
  source: string
}): Promise<{ error: string | null }> {
  // 1. admin guard FIRST (prevents payload shape leak to unauthenticated callers)
  // All DB writes MUST use createSupabaseAdminClient() — per CLAUDE.md.
  // The admin client returned by requireAdmin() bypasses RLS; standard server client
  // would be blocked by RLS WITH CHECK policy.
  const { error, admin, userId } = await requireAdmin()
  if (error || !admin || !userId) return { error: error! }

  // 2. zod validation (after auth confirmed)
  const parsed = listingPriceSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값이 유효하지 않습니다' }
  }

  // 3. upsert with onConflict — (complex_id, recorded_date, source) unique constraint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbErr } = await (admin as any)
    .from('listing_prices')
    .upsert(
      {
        complex_id:    parsed.data.complexId,
        price_per_py:  parsed.data.pricePerPy,
        recorded_date: parsed.data.recordedDate,
        source:        parsed.data.source,
        created_by:    userId,
      },
      { onConflict: 'complex_id,recorded_date,source', ignoreDuplicates: false }
    )

  if (dbErr) return { error: (dbErr as { message: string }).message }

  revalidatePath('/admin/listing-prices')
  return { error: null }
}

export async function deleteListingPrice(id: string): Promise<{ error: string | null }> {
  // 1. admin guard FIRST (prevents payload shape leak to unauthenticated callers)
  const { error, admin } = await requireAdmin()
  if (error || !admin) return { error: error! }

  // 2. zod validation (after auth confirmed)
  const parsed = deleteSchema.safeParse({ id })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '유효하지 않은 ID입니다' }
  }

  // 3. delete
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbErr } = await (admin as any)
    .from('listing_prices')
    .delete()
    .eq('id', parsed.data.id)

  if (dbErr) return { error: (dbErr as { message: string }).message }

  revalidatePath('/admin/listing-prices')
  return { error: null }
}
