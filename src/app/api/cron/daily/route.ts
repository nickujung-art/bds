import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchKaptBasicInfo } from '@/services/kapt'
import {
  fetchPresaleTrades,
  parseAmount,
  currentYearMonth,
  LAWD_CODES,
} from '@/services/molit-presale'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const errors: string[] = []
  let totalUpserted = 0

  // ── K-apt 부대시설 UPSERT (DATA-01) ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any
  const { data: complexesWithKaptCode } = await supabase
    .from('complexes')
    .select('id, kapt_code')
    .not('kapt_code', 'is', null)
    .limit(50)

  let kaptUpserted = 0
  for (const complex of complexesWithKaptCode ?? []) {
    if (!complex.kapt_code) continue
    try {
      const info = await fetchKaptBasicInfo(complex.kapt_code)
      if (!info) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const facilityKaptTable = supabase.from('facility_kapt') as any
      const { error } = await facilityKaptTable.upsert(
        {
          complex_id:      complex.id,
          kapt_code:       info.kaptCode,
          heat_type:       info.heatType ?? null,
          management_type: info.managementType ?? null,
          total_area:      info.totalArea ?? null,
          data_month:      new Date().toISOString().slice(0, 7) + '-01',
        },
        { onConflict: 'complex_id' },
      ) as { error: { message: string } | null }
      if (!error) kaptUpserted++
    } catch (err) {
      errors.push(`kapt=${complex.kapt_code}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  totalUpserted += kaptUpserted

  // ── MOLIT 분양권전매 UPSERT (DATA-02) ────────────────────────────────
  const dealYmd = currentYearMonth()
  let presaleUpserted = 0

  for (const lawdCd of LAWD_CODES) {
    try {
      const trades = await fetchPresaleTrades(lawdCd, dealYmd)
      for (const trade of trades) {
        const { data: listing } = await supabase
          .from('new_listings')
          .upsert(
            {
              name: trade.aptNm,
              region: trade.umdNm,
              price_min: parseAmount(trade.dealAmount),
              price_max: parseAmount(trade.dealAmount),
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'name,region' },
          )
          .select('id')
          .single()

        if (!listing) continue
        const listingId = (listing as { id: string }).id
        const dealDate = `${trade.dealYear}-${trade.dealMonth.padStart(2, '0')}-${trade.dealDay.padStart(2, '0')}`

        const { error } = await supabase
          .from('presale_transactions')
          .upsert(
            {
              listing_id:  listingId,
              area:        trade.excluUseAr ?? null,
              floor:       trade.floor ?? null,
              price:       parseAmount(trade.dealAmount),
              deal_date:   dealDate,
              cancel_date: trade.cdealType === 'Y' ? dealDate : null,
            },
            { onConflict: 'listing_id,deal_date,area,floor', ignoreDuplicates: true },
          )
        if (!error) presaleUpserted++
      }
    } catch (err) {
      errors.push(`presale lawdCd=${lawdCd}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  totalUpserted += presaleUpserted

  // ── Phase 11: 평당가·30일 변동률·거래량 배치 집계 (MAP-02, MAP-05) ──────────
  try {
    await supabase.rpc('refresh_complex_price_stats')
  } catch (err) {
    errors.push(`refresh_complex_price_stats: ${err instanceof Error ? err.message : String(err)}`)
  }

  return Response.json({ ok: errors.length === 0, totalUpserted, kaptUpserted, presaleUpserted, errors })
}
