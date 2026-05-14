/**
 * Fetches kaptDongCnt (building_count) from K-apt BasicInfo API for all
 * facility_kapt rows where building_count IS NULL.
 *
 * Reads facility_kapt via anon key (public read RLS).
 * Outputs SQL UPDATE statements to stdout — pipe to a file and apply via MCP.
 *
 * Usage: npx tsx scripts/kapt-building-count-fetch.ts > /tmp/building-count.sql
 */
import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fetchKaptBasicInfo } from '../src/services/kapt'

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  process.stderr.write('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing\n')
  process.exit(1)
}
if (!process.env.KAPT_API_KEY) {
  process.stderr.write('KAPT_API_KEY missing\n')
  process.exit(1)
}

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DELAY_MS = 120

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function main(): Promise<void> {
  process.stderr.write('[building-count] 시작\n')

  const { data, error } = await supabase
    .from('facility_kapt')
    .select('complex_id, kapt_code, data_month')
    .is('building_count', null)
    .order('complex_id')

  if (error) {
    process.stderr.write(`[building-count] facility_kapt 조회 실패: ${error.message}\n`)
    process.exit(1)
  }

  const rows = data as Array<{ complex_id: string; kapt_code: string; data_month: string }>
  process.stderr.write(`[building-count] 대상: ${rows.length}개\n`)

  const updates: Array<{ complex_id: string; kapt_code: string; data_month: string; building_count: number }> = []
  let skip = 0
  let fail = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const progress = `[${i + 1}/${rows.length}]`
    try {
      const info = await fetchKaptBasicInfo(row.kapt_code)
      if (info?.kaptDongCnt != null) {
        updates.push({ ...row, building_count: info.kaptDongCnt })
        process.stderr.write(`${progress} ${row.kapt_code} → ${info.kaptDongCnt}동\n`)
      } else {
        process.stderr.write(`${progress} ${row.kapt_code} → null (스킵)\n`)
        skip++
      }
    } catch (err) {
      process.stderr.write(`${progress} ${row.kapt_code} → ERROR: ${err instanceof Error ? err.message : err}\n`)
      fail++
    }
    await delay(DELAY_MS)
  }

  process.stderr.write(`\n완료: 성공 ${updates.length}, 스킵 ${skip}, 실패 ${fail}\n`)

  // Output SQL UPDATEs to stdout
  if (updates.length > 0) {
    process.stdout.write('-- building_count updates from K-apt BasicInfo API\n')
    for (const u of updates) {
      const escapedMonth = u.data_month.replace(/'/g, "''")
      process.stdout.write(
        `UPDATE facility_kapt SET building_count = ${u.building_count} WHERE complex_id = '${u.complex_id}' AND data_month = '${escapedMonth}';\n`,
      )
    }
    process.stdout.write(`-- ${updates.length} rows updated\n`)
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[building-count] 치명적 오류: ${err}\n`)
  process.exit(1)
})
