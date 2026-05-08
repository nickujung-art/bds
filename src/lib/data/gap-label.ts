import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface GapLabelData {
  listingPricePerPy: number | null
  avgTransactionPricePerPy: number | null
}

/**
 * 갭 라벨 데이터 조회
 * - listingPricePerPy: listing_prices 최근값 (price_per_py)
 * - avgTransactionPricePerPy: 최근 12개월 실거래 평균 평당가 (price / (area_m2 / 3.3058))
 *
 * CRITICAL: 거래 쿼리에 cancel_date IS NULL AND superseded_by IS NULL 항상 포함 (CLAUDE.md)
 */
export async function getGapLabelData(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<GapLabelData> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [listingResult, transactionResult] = await Promise.all([
    supabase
      .from('listing_prices')
      .select('price_per_py')
      .eq('complex_id', complexId)
      .order('recorded_date', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('transactions')
      .select('price, area_m2')
      .eq('complex_id', complexId)
      .eq('deal_type', 'sale')
      .is('cancel_date', null)
      .is('superseded_by', null)
      .not('price', 'is', null)
      .not('area_m2', 'is', null)
      .gte('deal_date', twelveMonthsAgo),
  ])

  const listingPricePerPy = listingResult.data?.price_per_py ?? null

  const rows = transactionResult.data ?? []
  const avgTransactionPricePerPy =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, r) => {
            const py = Number(r.area_m2) / 3.3058
            return sum + Number(r.price) / py
          }, 0) / rows.length,
        )
      : null

  return { listingPricePerPy, avgTransactionPricePerPy }
}
