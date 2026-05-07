import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchKaptBasicInfo } from '@/services/kapt'

export const runtime = 'nodejs'

/**
 * 일배치 cron 엔드포인트 (매일 04:00 KST, Vercel Cron)
 * - K-apt 부대시설 UPSERT (DATA-01)
 * - 향후 04-05에서 MOLIT 분양 UPSERT (DATA-02) 추가 예정
 */
export async function GET(request: Request): Promise<Response> {
  // CRON_SECRET 검증 (모든 /api/cron/* 필수)
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const errors: string[] = []
  let totalUpserted = 0

  // ── K-apt 부대시설 UPSERT (DATA-01) ──────────────────────────────────
  const { data: complexesWithKaptCode } = await supabase
    .from('complexes')
    .select('id, kapt_code')
    .not('kapt_code', 'is', null)
    .limit(50)  // 일배치당 50개 제한 (K-apt API 한도 보호)

  let kaptUpserted = 0
  for (const complex of complexesWithKaptCode ?? []) {
    if (!complex.kapt_code) continue
    try {
      const info = await fetchKaptBasicInfo(complex.kapt_code)
      if (!info) continue

      // facility_kapt has Phase 4 Wave 0 columns (heat_type, management_type, total_area)
      // not yet reflected in generated Supabase types — cast through unknown
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
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`kapt=${complex.kapt_code}: ${msg}`)
    }
  }

  totalUpserted += kaptUpserted

  return Response.json({
    ok:            errors.length === 0,
    totalUpserted,
    kaptUpserted,
    errors,
  })
}
