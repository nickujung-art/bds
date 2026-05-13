'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const subscribeSchema = z.object({
  phone:   z.string().regex(/^010-\d{4}-\d{4}$/, '010-XXXX-XXXX 형식으로 입력해주세요'),
  consent: z.boolean().refine(v => v === true, '개인정보 수집에 동의해야 신청할 수 있어요'),
})

export async function subscribeKakaoChannel(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다' }

  const parsed = subscribeSchema.safeParse({
    phone:   formData.get('phone'),
    consent: formData.get('consent') === 'true',
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? '입력을 확인해주세요' }
  }

  // T-8-04: phone_number를 로그에 절대 출력 금지
  const { error } = await supabase
    .from('kakao_channel_subscriptions')
    .upsert(
      {
        user_id:       user.id,
        phone_number:  parsed.data.phone,
        is_active:     true,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (error) return { error: '잠시 후 다시 시도해주세요' }
  return { success: true }
}
