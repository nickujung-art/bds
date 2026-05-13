/**
 * KAPT 단지 시설 정보 적재 스크립트
 *
 * 실행: npx tsx scripts/kapt-facility-enrich.ts [--debug] [--limit N]
 * 환경변수: KAPT_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 조건: complexes WHERE kapt_code IS NOT NULL (전체 단지)
 * 적재 대상: facility_kapt (management_cost_m2, parking_count, elevator_count, data_month)
 * Idempotent: 이미 같은 (complex_id, data_month) 레코드가 있으면 upsert로 덮어씀
 *
 * --debug : 첫 3개 단지 raw API 응답 출력 후 종료
 * --limit N: N개 단지만 처리
 */
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import { fetchKaptDetailInfo } from '../src/services/kapt'

loadEnvConfig(process.cwd())

if (!process.env.KAPT_API_KEY) {
  console.error('[kapt-facility] KAPT_API_KEY 환경변수가 없습니다.')
  process.exit(1)
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[kapt-facility] Supabase 환경변수가 없습니다.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const DEBUG = process.argv.includes('--debug')
const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1] ?? '10', 10) : null
const RATE_LIMIT_DELAY_MS = 100
const DATA_MONTH = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().slice(0, 10) // YYYY-MM-01

interface ComplexRow {
  id: string
  kapt_code: string
  canonical_name: string
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  console.log('[kapt-facility] 시작 —', new Date().toISOString())
  console.log('[kapt-facility] data_month =', DATA_MONTH)

  const query = supabase
    .from('complexes')
    .select('id, kapt_code, canonical_name')
    .not('kapt_code', 'is', null)
    .order('canonical_name')

  if (LIMIT) query.limit(LIMIT)

  const { data, error } = await query
  if (error) {
    console.error('[kapt-facility] complexes 조회 실패:', error.message)
    process.exit(1)
  }

  const complexes = data as ComplexRow[]
  const total = complexes.length
  console.log(`[kapt-facility] 처리 대상: ${total}개 단지`)

  let successCount = 0
  let skipCount = 0
  let failCount = 0
  let debugCount = 0

  for (let i = 0; i < complexes.length; i++) {
    const complex = complexes[i]!
    const progress = `[${i + 1}/${total}]`

    try {
      const { parsed, raw } = await fetchKaptDetailInfo(complex.kapt_code)

      // DEBUG 모드: 처음 3개 raw 응답 출력 후 종료
      if (DEBUG) {
        console.log(`\n${progress} [DEBUG] ${complex.canonical_name} (${complex.kapt_code})`)
        console.log('raw response:', JSON.stringify(raw, null, 2))
        debugCount++
        if (debugCount >= 3) {
          console.log('\n[kapt-facility] --debug 모드: 3개 확인 후 종료')
          return
        }
        await delay(RATE_LIMIT_DELAY_MS)
        continue
      }

      if (!parsed) {
        console.warn(`${progress} ${complex.canonical_name} — API null 반환 (스킵)`)
        skipCount++
        await delay(RATE_LIMIT_DELAY_MS)
        continue
      }

      const { error: upsertError } = await supabase
        .from('facility_kapt')
        .upsert(
          {
            complex_id: complex.id,
            kapt_code: complex.kapt_code,
            parking_count: parsed.parkNose ?? null,
            elevator_count: parsed.elevCnt ?? null,
            management_cost_m2: parsed.managCost ?? null,
            data_month: DATA_MONTH,
          },
          { onConflict: 'complex_id,data_month' },
        )

      if (upsertError) {
        console.error(`${progress} ${complex.canonical_name} — upsert 실패:`, upsertError.message)
        failCount++
      } else {
        const fields = [
          parsed.parkNose != null ? `주차=${parsed.parkNose}면` : null,
          parsed.elevCnt != null ? `엘리베이터=${parsed.elevCnt}대` : null,
          parsed.managCost != null ? `관리비=${parsed.managCost}원/m²` : null,
        ].filter(Boolean).join(', ')
        console.log(`${progress} ${complex.canonical_name} → ${fields || '(데이터 없음)'} done`)
        successCount++
      }
    } catch (err) {
      console.error(`${progress} ${complex.canonical_name} — 예외:`, err instanceof Error ? err.message : err)
      failCount++
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }

  console.log('\n[kapt-facility] 완료 ─────────────────────────────────')
  console.log(`  성공: ${successCount}/${total}`)
  console.log(`  스킵: ${skipCount}/${total}`)
  console.log(`  실패: ${failCount}/${total}`)
  console.log(`  완료 시각: ${new Date().toISOString()}`)

  if (failCount > 0) process.exit(1)
}

main().catch((err: unknown) => {
  console.error('[kapt-facility] 치명적 오류:', err)
  process.exit(1)
})
