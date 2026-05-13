/**
 * K-apt 관리비 엑셀 임포트 스크립트
 *
 * 실행: npx tsx scripts/import-management-cost.ts [--file <path>] [--debug] [--dry-run]
 * 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 기본 파일: ./2026aptcost.xlsx
 * 필터: 시군구 = 창원* 또는 김해*
 * 매칭: kapt_code → complexes.id
 * 적재: management_cost_monthly (upsert, unique: complex_id + year_month)
 *
 * --debug   : 매칭 실패 단지 목록 출력
 * --dry-run : DB 적재 없이 파싱/매칭만 확인
 */
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'

loadEnvConfig(process.cwd())

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[mgmt-cost] Supabase 환경변수가 없습니다.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const DEBUG = process.argv.includes('--debug')
const DRY_RUN = process.argv.includes('--dry-run')
const fileArgIdx = process.argv.indexOf('--file')
const FILE_PATH = fileArgIdx !== -1
  ? process.argv[fileArgIdx + 1]!
  : path.join(process.cwd(), '2026aptcost.xlsx')

// 엑셀 컬럼 인덱스 (ROW1 헤더 기준, 0-indexed)
const COL = {
  sgg:                   1,   // 시군구
  kapt_code:             4,   // 단지코드
  kapt_name:             5,   // 단지명
  year_month:            6,   // 발생년월(YYYYMM)
  common_cost_total:     7,   // 공용관리비계
  labor_cost:            8,   // 인건비
  vehicle_cost:          13,  // 차량유지비
  cleaning_cost:         15,  // 청소비
  guard_cost:            16,  // 경비비
  disinfection_cost:     17,  // 소독비
  elevator_cost:         18,  // 승강기유지비
  network_cost:          19,  // 지능형네트워크유지비
  repair_cost:           20,  // 수선비
  consignment_fee:       24,  // 위탁관리수수료
  individual_cost_total: 25,  // 개별사용료계
  heating_cost:          27,  // 난방비(전용)
  hot_water_cost:        29,  // 급탕비(전용)
  gas_cost:              31,  // 가스사용료(전용)
  electricity_cost:      33,  // 전기료(전용)
  water_cost:            35,  // 수도료(전용)
  long_term_repair_monthly: 43,  // 장충금 월부과액
  long_term_repair_total:   45,  // 장충금 총적립금액
} as const

function toInt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Math.round(parseFloat(String(val)))
  return isNaN(n) ? null : n
}

function toYearMonth(yyyymm: unknown): string | null {
  const s = String(yyyymm ?? '').replace(/[^0-9]/g, '')
  if (s.length !== 6) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-01`
}

async function main(): Promise<void> {
  console.log('[mgmt-cost] 시작 —', new Date().toISOString())
  console.log('[mgmt-cost] 파일:', FILE_PATH)
  if (DRY_RUN) console.log('[mgmt-cost] *** DRY RUN 모드 — DB 적재 없음 ***')

  // 엑셀 로드
  console.log('[mgmt-cost] 엑셀 파일 로딩 중...')
  const wb = XLSX.readFile(FILE_PATH, { dense: true })
  const ws = wb.Sheets['sheet1']
  if (!ws) {
    console.error('[mgmt-cost] sheet1을 찾을 수 없습니다.')
    process.exit(1)
  }
  // range:1 → 헤더 행(ROW0 공지, ROW1 헤더) 건너뛰고 ROW1부터
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', range: 1 })
  const dataRows = allRows.slice(1) // ROW1이 헤더이므로 데이터는 ROW2부터

  // 창원/김해 필터
  const filtered = dataRows.filter(row => {
    const sgg = String((row as unknown[])[COL.sgg] ?? '')
    return sgg.includes('창원') || sgg.includes('김해')
  })
  console.log(`[mgmt-cost] 전체: ${dataRows.length}행 → 창원/김해: ${filtered.length}행`)

  // complexes 테이블에서 kapt_code → id 매핑 로드
  const { data: complexData, error } = await supabase
    .from('complexes')
    .select('id, kapt_code, canonical_name')
    .not('kapt_code', 'is', null)
  if (error) {
    console.error('[mgmt-cost] complexes 조회 실패:', error.message)
    process.exit(1)
  }
  const kaptToId = new Map<string, string>()
  for (const c of complexData ?? []) {
    kaptToId.set(c.kapt_code as string, c.id as string)
  }
  console.log(`[mgmt-cost] complexes 매핑: ${kaptToId.size}개 단지`)

  // 파싱 + 매칭
  const records: Record<string, unknown>[] = []
  const unmatched = new Map<string, string>()

  for (const row of filtered) {
    const r = row as unknown[]
    const kaptCode = String(r[COL.kapt_code] ?? '').trim()
    const complexId = kaptToId.get(kaptCode)

    if (!complexId) {
      unmatched.set(kaptCode, String(r[COL.kapt_name] ?? ''))
      continue
    }

    const yearMonth = toYearMonth(r[COL.year_month])
    if (!yearMonth) continue

    records.push({
      complex_id:            complexId,
      kapt_code:             kaptCode,
      year_month:            yearMonth,
      common_cost_total:     toInt(r[COL.common_cost_total]),
      labor_cost:            toInt(r[COL.labor_cost]),
      cleaning_cost:         toInt(r[COL.cleaning_cost]),
      guard_cost:            toInt(r[COL.guard_cost]),
      disinfection_cost:     toInt(r[COL.disinfection_cost]),
      elevator_cost:         toInt(r[COL.elevator_cost]),
      repair_cost:           toInt(r[COL.repair_cost]),
      network_cost:          toInt(r[COL.network_cost]),
      vehicle_cost:          toInt(r[COL.vehicle_cost]),
      consignment_fee:       toInt(r[COL.consignment_fee]),
      individual_cost_total: toInt(r[COL.individual_cost_total]),
      electricity_cost:      toInt(r[COL.electricity_cost]),
      water_cost:            toInt(r[COL.water_cost]),
      heating_cost:          toInt(r[COL.heating_cost]),
      hot_water_cost:        toInt(r[COL.hot_water_cost]),
      gas_cost:              toInt(r[COL.gas_cost]),
      long_term_repair_monthly: toInt(r[COL.long_term_repair_monthly]),
      long_term_repair_total:   toInt(r[COL.long_term_repair_total]),
    })
  }

  console.log(`[mgmt-cost] 매칭 성공: ${records.length}건 / 실패: ${unmatched.size}개 단지`)

  if (DEBUG && unmatched.size > 0) {
    console.log('\n[mgmt-cost] 매칭 실패 단지:')
    for (const [code, name] of unmatched) {
      console.log(`  ${code}  ${name}`)
    }
  }

  if (DRY_RUN) {
    console.log('\n[mgmt-cost] DRY RUN 완료 — 샘플 레코드:')
    console.log(JSON.stringify(records[0], null, 2))
    return
  }

  // 배치 upsert (500건씩)
  const BATCH = 500
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error: upsertErr } = await supabase
      .from('management_cost_monthly')
      .upsert(batch, { onConflict: 'complex_id,year_month' })

    if (upsertErr) {
      console.error(`[mgmt-cost] upsert 실패 (배치 ${i / BATCH + 1}):`, upsertErr.message)
      failCount += batch.length
    } else {
      successCount += batch.length
      process.stdout.write(`\r[mgmt-cost] 진행: ${successCount}/${records.length}`)
    }
  }

  console.log('\n')
  console.log('[mgmt-cost] 완료 ─────────────────────────────────')
  console.log(`  성공: ${successCount}건`)
  console.log(`  실패: ${failCount}건`)
  console.log(`  미매칭 단지: ${unmatched.size}개`)
  console.log(`  완료 시각: ${new Date().toISOString()}`)

  if (failCount > 0) process.exit(1)
}

main().catch((err: unknown) => {
  console.error('[mgmt-cost] 치명적 오류:', err)
  process.exit(1)
})
