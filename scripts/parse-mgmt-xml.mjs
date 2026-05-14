/**
 * K-apt xlsx sheet1.xml 직접 스트리밍 파서
 * dimension ref="A1" 버그가 있는 파일 전용
 *
 * 사용법: node scripts/parse-mgmt-xml.mjs <sheet1.xml 경로> <출력.json 경로>
 */
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { writeFileSync } from 'fs'

const XML_PATH = process.argv[2]
const OUT_PATH = process.argv[3] ?? '/tmp/mgmt_rows.json'

if (!XML_PATH) {
  console.error('사용법: node scripts/parse-mgmt-xml.mjs <sheet1.xml> [out.json]')
  process.exit(1)
}

// &#NNNNN; → 실제 문자 디코딩
function decodeXmlEntities(str) {
  return str.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
}

// 열 문자 → 0-indexed 숫자 (A=0, B=1, ..., Z=25, AA=26, ...)
function colToIndex(col) {
  let n = 0
  for (const ch of col) n = n * 26 + ch.charCodeAt(0) - 64
  return n - 1
}

// inlineStr 또는 숫자 셀에서 값 추출
// <c r="B3" [s="1"] [t="inlineStr"]><is><t>TEXT</t></is></c>  → TEXT
// <c r="H3"><v>12345</v></c>  → 12345
function parseCells(line) {
  const cells = {}
  const re = /<c r="([A-Z]+)\d+"[^>]*>(.*?)<\/c>/g
  let m
  while ((m = re.exec(line)) !== null) {
    const colIdx = colToIndex(m[1])
    const inner = m[2]
    let val = ''
    const inlineM = inner.match(/<t>(.*?)<\/t>/)
    const numM = inner.match(/<v>(.*?)<\/v>/)
    if (inlineM) val = decodeXmlEntities(inlineM[1])
    else if (numM) val = numM[1]
    cells[colIdx] = val
  }
  return cells
}

function toInt(v) {
  if (v === undefined || v === '' || v === null) return null
  const n = Math.round(parseFloat(v))
  return isNaN(n) ? null : n
}

function toYM(v) {
  const s = String(v ?? '').replace(/[^0-9]/g, '')
  if (s.length !== 6) return null
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-01`
}

// 열 인덱스 상수 (0-indexed, A=0)
const C = {
  sgg:                      1,   // B
  kapt_code:                4,   // E
  kapt_name:                5,   // F
  year_month:               6,   // G
  common_cost_total:        7,   // H
  labor_cost:               8,   // I
  vehicle_cost:             13,  // N
  cleaning_cost:            15,  // P
  guard_cost:               16,  // Q
  disinfection_cost:        17,  // R
  elevator_cost:            18,  // S
  network_cost:             19,  // T
  repair_cost:              20,  // U
  consignment_fee:          24,  // Y
  individual_cost_total:    25,  // Z
  heating_cost:             27,  // AB
  hot_water_cost:           29,  // AD
  gas_cost:                 31,  // AF
  electricity_cost:         33,  // AH
  water_cost:               35,  // AJ
  long_term_repair_monthly: 43,  // AR
  long_term_repair_total:   45,  // AT
}

async function main() {
  console.log('[parse-xml] 파일:', XML_PATH)
  console.log('[parse-xml] 출력:', OUT_PATH)

  const rl = createInterface({
    input: createReadStream(XML_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })

  const records = []
  let totalRows = 0
  let matched = 0
  let nextIsCells = false

  for await (const line of rl) {
    if (line.startsWith('<row r="')) {
      nextIsCells = true
      totalRows++
      if (totalRows % 50000 === 0) {
        process.stdout.write(`\r  처리: ${totalRows.toLocaleString()}행, 매칭: ${matched}건`)
      }
      continue
    }

    if (nextIsCells && line.startsWith('<c ')) {
      nextIsCells = false
      const cells = parseCells(line)
      const sgg = cells[C.sgg] ?? ''
      if (!sgg.includes('창원') && !sgg.includes('김해')) continue

      const ym = toYM(cells[C.year_month])
      if (!ym) continue

      matched++
      records.push({
        kapt_code:                String(cells[C.kapt_code] ?? '').trim(),
        year_month:               ym,
        common_cost_total:        toInt(cells[C.common_cost_total]),
        labor_cost:               toInt(cells[C.labor_cost]),
        vehicle_cost:             toInt(cells[C.vehicle_cost]),
        cleaning_cost:            toInt(cells[C.cleaning_cost]),
        guard_cost:               toInt(cells[C.guard_cost]),
        disinfection_cost:        toInt(cells[C.disinfection_cost]),
        elevator_cost:            toInt(cells[C.elevator_cost]),
        network_cost:             toInt(cells[C.network_cost]),
        repair_cost:              toInt(cells[C.repair_cost]),
        consignment_fee:          toInt(cells[C.consignment_fee]),
        individual_cost_total:    toInt(cells[C.individual_cost_total]),
        heating_cost:             toInt(cells[C.heating_cost]),
        hot_water_cost:           toInt(cells[C.hot_water_cost]),
        gas_cost:                 toInt(cells[C.gas_cost]),
        electricity_cost:         toInt(cells[C.electricity_cost]),
        water_cost:               toInt(cells[C.water_cost]),
        long_term_repair_monthly: toInt(cells[C.long_term_repair_monthly]),
        long_term_repair_total:   toInt(cells[C.long_term_repair_total]),
      })
    } else {
      nextIsCells = false
    }
  }

  process.stdout.write('\n')
  console.log(`[parse-xml] 전체: ${totalRows.toLocaleString()}행, 창원/김해: ${matched}건`)

  const months = [...new Set(records.map(r => r.year_month))].sort()
  const codes = new Set(records.map(r => r.kapt_code))
  console.log(`[parse-xml] 기간: ${months[0]} ~ ${months[months.length - 1]}`)
  console.log(`[parse-xml] 단지코드: ${codes.size}개`)

  writeFileSync(OUT_PATH, JSON.stringify(records))
  console.log(`[parse-xml] 저장 완료: ${OUT_PATH}`)
}

main().catch(err => {
  console.error('[parse-xml] 오류:', err)
  process.exit(1)
})
