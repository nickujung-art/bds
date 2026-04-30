import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function formatPrice(price: number): string {
  const uk = Math.floor(price / 10000)
  const man = price % 10000
  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}만`
  if (uk > 0) return `${uk}억`
  return `${price.toLocaleString()}만`
}

export async function generatePriceAlerts(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]!

  // 최근 7일 매매 거래 (유효 건만)
  const { data: recentTxns } = await supabase
    .from('transactions')
    .select(
      `complex_id, price, area_m2, deal_date,
       complexes!inner (canonical_name)`,
    )
    .is('cancel_date', null)
    .is('superseded_by', null)
    .eq('deal_type', 'sale')
    .gte('deal_date', sevenDaysAgo)
    .order('price', { ascending: false })
    .limit(200)

  if (!recentTxns?.length) return 0

  // 최고가 1건/단지 추출
  const topByComplex = new Map<string, { price: number; deal_date: string; name: string }>()
  for (const t of recentTxns) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = t as any
    const c = Array.isArray(r.complexes) ? r.complexes[0] : r.complexes
    if (!c) continue
    if (!topByComplex.has(r.complex_id)) {
      topByComplex.set(r.complex_id, {
        price:      r.price as number,
        deal_date:  r.deal_date as string,
        name:       c.canonical_name as string,
      })
    }
  }

  const complexIds = [...topByComplex.keys()]
  if (!complexIds.length) return 0

  // 해당 단지를 관심등록하고 알림 on인 유저
  const { data: favs } = await supabase
    .from('favorites')
    .select('user_id, complex_id')
    .in('complex_id', complexIds)
    .eq('alert_enabled', true)

  if (!favs?.length) return 0

  let created = 0

  for (const fav of favs) {
    const top = topByComplex.get(fav.complex_id)
    if (!top) continue

    // UNIQUE(user_id, event_type, target_id, dedupe_key) 충돌 시 무시
    const { error } = await supabase.from('notifications').insert({
      user_id:    fav.user_id,
      type:       'price_alert',
      event_type: 'price_high',
      target_id:  fav.complex_id,
      dedupe_key: top.deal_date,
      title:      `${top.name} 신고가 갱신`,
      body:       `${formatPrice(top.price)}원 실거래 (${top.deal_date})`,
      data:       { complex_id: fav.complex_id, price: top.price, deal_date: top.deal_date },
    })

    if (!error) created++
  }

  return created
}
