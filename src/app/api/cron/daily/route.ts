import { createClient } from '@supabase/supabase-js'
import {
  fetchPresaleTrades,
  parseAmount,
  currentYearMonth,
  LAWD_CODES,
} from '@/services/molit-presale'

export const runtime = 'nodejs'

// Phase 4 테이블은 database.ts에 아직 미반영 (supabase gen types 미실행)
// 타입 안전성을 위해 untyped 클라이언트 사용 (service_role)
function createAdminClientUntyped() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin env vars missing: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: Request): Promise<Response> {
  // Vercel Cron: Authorization: Bearer 검증 (rankings/route.ts 패턴)
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClientUntyped()
  const dealYmd = currentYearMonth()
  let totalUpserted = 0
  const errors: string[] = []

  for (const lawdCd of LAWD_CODES) {
    try {
      const trades = await fetchPresaleTrades(lawdCd, dealYmd)
      for (const trade of trades) {
        // new_listings UPSERT (name+region unique)
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
        const cancelDate = trade.cdealType === 'Y' ? dealDate : null

        const { error } = await supabase
          .from('presale_transactions')
          .upsert(
            {
              listing_id: listingId,
              area: trade.excluUseAr ?? null,
              floor: trade.floor ?? null,
              price: parseAmount(trade.dealAmount),
              deal_date: dealDate,
              cancel_date: cancelDate,
            },
            { onConflict: 'listing_id,deal_date,area,floor', ignoreDuplicates: true },
          )

        if (!error) totalUpserted++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`lawdCd=${lawdCd}: ${msg}`)
      console.error('daily cron presale error:', msg)
    }
  }

  return Response.json({ ok: errors.length === 0, totalUpserted, errors })
}
