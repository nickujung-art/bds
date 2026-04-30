import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ingestMonth } from '@/lib/data/realprice'
import type { IngestResult } from '@/lib/data/realprice'

function prevYearMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
}

export async function GET(request: Request): Promise<Response> {
  // CRON_SECRET 검증 (ADR: 모든 /api/ingest/* 필수)
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const yearMonth = prevYearMonth()

  // 활성 지역 목록 조회
  const { data: regions, error: regErr } = await supabase
    .from('regions')
    .select('sgg_code')
    .eq('is_active', true)
    .order('sgg_code')
  if (regErr) {
    return Response.json({ error: regErr.message }, { status: 500 })
  }

  const results: Record<string, IngestResult> = {}

  for (const { sgg_code } of (regions ?? []) as { sgg_code: string }[]) {
    try {
      results[sgg_code] = await ingestMonth(sgg_code, yearMonth, supabase)
    } catch (err) {
      results[sgg_code] = {
        runId:        '',
        sggCode:      sgg_code,
        yearMonth,
        rowsFetched:  0,
        rowsUpserted: 0,
        rowsSkipped:  0,
        rowsFailed:   0,
        status:       'failed',
      }
      console.error(`ingestMonth failed for ${sgg_code}:`, err)
    }
  }

  const total = Object.values(results)
  const summary = {
    yearMonth,
    regions:      total.length,
    rowsUpserted: total.reduce((s, r) => s + r.rowsUpserted, 0),
    failed:       total.filter(r => r.status === 'failed').length,
  }

  return Response.json({ summary, results })
}
