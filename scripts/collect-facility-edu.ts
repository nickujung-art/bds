/**
 * 카카오 로컬 카테고리 검색으로 교육 시설 데이터 배치 수집
 *
 * 수집 항목:
 *   SC4 → facility_school  (초·중·고)       반경 1,500m
 *   AC5 → facility_poi     (학원, category='hagwon')   반경 1,000m × 최대 3페이지
 *   PS3 → facility_poi     (어린이집·유치원, category='daycare') 반경 1,000m
 *
 * 실행:
 *   npx tsx scripts/collect-facility-edu.ts
 *   npx tsx scripts/collect-facility-edu.ts --dry-run   (SQL 생성만, DB 미실행)
 *   npx tsx scripts/collect-facility-edu.ts --sgg 창원  (특정 시 필터)
 *
 * 환경변수: KAKAO_REST_API_KEY (필수)
 * 의존: supabase CLI (supabase db query --linked)
 */
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// .env.local 직접 로드 (loadEnvConfig가 tsx에서 불안정)
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    const key = m?.[1]; const val = m?.[2]
    if (key && val !== undefined && !process.env[key]) process.env[key] = val.replace(/^"|"$/g, '')
  }
}

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY
if (!KAKAO_KEY) {
  console.error('KAKAO_REST_API_KEY 환경변수가 없습니다.')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')
const sggIdx  = process.argv.indexOf('--sgg')
const SGG_FILTER = sggIdx !== -1 ? (process.argv[sggIdx + 1] ?? '') : ''

// ─── 카카오 API ────────────────────────────────────────────────────────────

interface KakaoDoc {
  place_name:    string
  category_name: string
  distance:      string   // meters (string)
  y:             string   // lat
  x:             string   // lng
}

interface KakaoCategoryResult {
  documents: KakaoDoc[]
  meta: { total_count: number; pageable_count: number; is_end: boolean }
}

async function kakaoCategory(
  code: 'SC4' | 'AC5' | 'PS3',
  lat: number,
  lng: number,
  radiusM: number,
  page = 1,
): Promise<KakaoCategoryResult> {
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json')
  url.searchParams.set('category_group_code', code)
  url.searchParams.set('y', String(lat))
  url.searchParams.set('x', String(lng))
  url.searchParams.set('radius', String(radiusM))
  url.searchParams.set('size', '15')
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort', 'distance')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Kakao API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<KakaoCategoryResult>
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ─── 학교 유형 파싱 ────────────────────────────────────────────────────────

function parseSchoolType(categoryName: string): 'elementary' | 'middle' | 'high' | null {
  if (categoryName.includes('초등학교')) return 'elementary'
  if (categoryName.includes('중학교'))   return 'middle'
  if (categoryName.includes('고등학교')) return 'high'
  return null
}

// ─── DB에서 단지 목록 조회 (supabase CLI) ──────────────────────────────────

interface ComplexRow { id: string; lat: number; lng: number; si: string | null }

function fetchComplexes(): ComplexRow[] {
  const sggClause = SGG_FILTER
    ? `AND si ILIKE '%${SGG_FILTER}%'`
    : ''
  const query = `SELECT id, lat, lng, si FROM complexes WHERE lat IS NOT NULL AND lng IS NOT NULL ${sggClause} ORDER BY si, id`
  const raw = execSync(
    `supabase db query --linked ${JSON.stringify(query)}`,
    { encoding: 'utf8' },
  )

  // 출력 JSON 파싱 (CLI wraps in boundary/warning envelope)
  const match = raw.match(/"rows"\s*:\s*(\[[\s\S]*?\])/)
  if (!match?.[1]) throw new Error('단지 조회 실패: rows 파싱 불가')
  return JSON.parse(match[1]) as ComplexRow[]
}

// ─── SQL 생성 ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/'/g, "''")
}

interface SchoolRow {
  complex_id: string
  school_name: string
  school_type: string
  distance_m: number
}

interface PoiRow {
  complex_id: string
  category: string
  poi_name: string
  distance_m: number
}

function buildSchoolSql(rows: SchoolRow[]): string {
  if (rows.length === 0) return ''
  const vals = rows.map(r =>
    `('${r.complex_id}','${esc(r.school_name)}','${r.school_type}',${r.distance_m})`
  ).join(',\n  ')
  return `INSERT INTO facility_school (complex_id,school_name,school_type,distance_m)
VALUES
  ${vals}
ON CONFLICT (complex_id,school_name) DO UPDATE SET
  distance_m = EXCLUDED.distance_m,
  updated_at = now();`
}

function buildPoiSql(rows: PoiRow[]): string {
  if (rows.length === 0) return ''
  const vals = rows.map(r =>
    `('${r.complex_id}','${r.category}','${esc(r.poi_name)}',${r.distance_m})`
  ).join(',\n  ')
  return `INSERT INTO facility_poi (complex_id,category,poi_name,distance_m)
VALUES
  ${vals}
ON CONFLICT (complex_id,category,poi_name) DO UPDATE SET
  distance_m = EXCLUDED.distance_m;`
}

function buildScoreSql(scores: Array<{ id: string; score: number }>): string {
  if (scores.length === 0) return ''
  const cases = scores.map(s => `  WHEN id = '${s.id}' THEN ${s.score}`).join('\n')
  const ids = scores.map(s => `'${s.id}'`).join(',')
  return `UPDATE complexes SET hagwon_score = CASE\n${cases}\n  ELSE hagwon_score END
WHERE id IN (${ids});`
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('[edu-collect] 시작 —', new Date().toISOString())
  if (DRY_RUN) console.log('[edu-collect] *** DRY RUN — SQL만 생성, DB 미실행 ***')
  if (SGG_FILTER) console.log(`[edu-collect] 필터: ${SGG_FILTER}`)

  // 1. 단지 목록 로드
  const complexes = fetchComplexes()
  console.log(`[edu-collect] 단지 ${complexes.length}개`)

  const schoolRows: SchoolRow[] = []
  const poiRows:    PoiRow[]    = []
  const hagwonScores: Array<{ id: string; score: number }> = []

  let done = 0

  for (const cx of complexes) {
    done++
    process.stdout.write(`\r  [${done}/${complexes.length}] ${cx.si ?? ''} ...`)

    try {
      // ── 학교 (SC4) ──────────────────────────────────────────
      const scResult = await kakaoCategory('SC4', cx.lat, cx.lng, 1500)
      for (const doc of scResult.documents) {
        const type = parseSchoolType(doc.category_name)
        if (!type) continue
        schoolRows.push({
          complex_id:  cx.id,
          school_name: doc.place_name,
          school_type: type,
          distance_m:  Math.round(parseFloat(doc.distance)),
        })
      }
      await sleep(80)

      // ── 학원 (AC5, 최대 3페이지) ────────────────────────────
      let hagwonDocs: KakaoDoc[] = []
      for (let page = 1; page <= 3; page++) {
        const ac = await kakaoCategory('AC5', cx.lat, cx.lng, 1000, page)
        hagwonDocs = hagwonDocs.concat(ac.documents)
        await sleep(80)
        if (ac.meta.is_end) break
      }
      for (const doc of hagwonDocs) {
        poiRows.push({
          complex_id: cx.id,
          category:   'hagwon',
          poi_name:   doc.place_name,
          distance_m: Math.round(parseFloat(doc.distance)),
        })
      }

      // 학원 밀도 점수 계산
      const cnt500  = hagwonDocs.filter(d => parseFloat(d.distance) <= 500).length
      const cntRest = hagwonDocs.length - cnt500
      const score   = cnt500 * 3 + cntRest * 1
      hagwonScores.push({ id: cx.id, score })

      // ── 어린이집·유치원 (PS3) ────────────────────────────────
      const psResult = await kakaoCategory('PS3', cx.lat, cx.lng, 1000)
      for (const doc of psResult.documents) {
        poiRows.push({
          complex_id: cx.id,
          category:   'daycare',
          poi_name:   doc.place_name,
          distance_m: Math.round(parseFloat(doc.distance)),
        })
      }
      await sleep(80)

    } catch (e) {
      console.error(`\n  오류 (${cx.id}): ${e instanceof Error ? e.message : e}`)
    }
  }

  process.stdout.write('\n')
  console.log(`[edu-collect] 수집 완료`)
  console.log(`  학교:     ${schoolRows.length}건`)
  console.log(`  학원:     ${poiRows.filter(r => r.category === 'hagwon').length}건`)
  console.log(`  어린이집: ${poiRows.filter(r => r.category === 'daycare').length}건`)

  // 2. SQL 생성 (1,000행씩 분할)
  const BATCH = 1000
  const sqlParts: string[] = []

  for (let i = 0; i < schoolRows.length; i += BATCH)
    sqlParts.push(buildSchoolSql(schoolRows.slice(i, i + BATCH)))
  for (let i = 0; i < poiRows.length; i += BATCH)
    sqlParts.push(buildPoiSql(poiRows.slice(i, i + BATCH)))
  for (let i = 0; i < hagwonScores.length; i += BATCH)
    sqlParts.push(buildScoreSql(hagwonScores.slice(i, i + BATCH)))

  const sql = sqlParts.filter(Boolean).join('\n\n')
  const outPath = path.join(process.cwd(), 'data', 'facility_edu.sql')
  fs.writeFileSync(outPath, sql, 'utf8')
  console.log(`[edu-collect] SQL 저장: ${outPath} (${(sql.length / 1024).toFixed(0)}KB)`)

  if (DRY_RUN) {
    console.log('[edu-collect] DRY RUN — DB 실행 건너뜀')
    return
  }

  // 3. DB 실행
  console.log('[edu-collect] DB 실행 중...')
  execSync(`supabase db query --linked --file "${outPath}"`, {
    stdio: 'inherit',
  })
  console.log('[edu-collect] 완료 —', new Date().toISOString())
}

main().catch(err => {
  console.error('[edu-collect] 치명적 오류:', err)
  process.exit(1)
})
