/**
 * 좌표(lat/lng) 없는 단지를 카카오 주소 검색 API로 채우기
 *
 * 실행:
 *   npx tsx scripts/fill-missing-coords.ts
 *   npx tsx scripts/fill-missing-coords.ts --dry-run
 *
 * 환경변수: KAKAO_REST_API_KEY (필수)
 */
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

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
if (!KAKAO_KEY) { console.error('KAKAO_REST_API_KEY 없음'); process.exit(1) }

const DRY_RUN = process.argv.includes('--dry-run')

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

interface ComplexRow { id: string; canonical_name: string; road_address: string }

function fetchMissing(): ComplexRow[] {
  const query = `SELECT id, canonical_name, road_address FROM complexes WHERE lat IS NULL AND road_address IS NOT NULL AND status NOT IN ('demolished') ORDER BY household_count DESC NULLS LAST`
  const raw = execSync(`supabase db query --linked ${JSON.stringify(query)}`, { encoding: 'utf8' })
  const match = raw.match(/"rows"\s*:\s*(\[[\s\S]*?\])/)
  if (!match?.[1]) throw new Error('단지 조회 실패')
  return JSON.parse(match[1]) as ComplexRow[]
}

interface KakaoAddressDoc {
  address_name: string
  address_type: string
  x: string  // lng
  y: string  // lat
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json')
  url.searchParams.set('query', address)
  url.searchParams.set('size', '1')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`Kakao API ${res.status}`)
  const json = await res.json() as { documents: KakaoAddressDoc[] }
  const doc = json.documents[0]
  if (!doc) return null
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) }
}

async function main() {
  console.log('[fill-coords] 시작 —', new Date().toISOString())
  if (DRY_RUN) console.log('[fill-coords] *** DRY RUN ***')

  const complexes = fetchMissing()
  console.log(`[fill-coords] 대상 ${complexes.length}개`)

  const updates: Array<{ id: string; name: string; lat: number; lng: number }> = []
  const failed: string[] = []

  for (let i = 0; i < complexes.length; i++) {
    const cx = complexes[i]
    process.stdout.write(`\r  [${i + 1}/${complexes.length}] ${cx.canonical_name} ...`)

    try {
      const coord = await geocode(cx.road_address)
      if (coord) {
        updates.push({ id: cx.id, name: cx.canonical_name, lat: coord.lat, lng: coord.lng })
      } else {
        failed.push(cx.canonical_name)
      }
    } catch (e) {
      failed.push(cx.canonical_name)
      console.error(`\n  오류 (${cx.canonical_name}): ${e instanceof Error ? e.message : e}`)
    }
    await sleep(80)
  }

  process.stdout.write('\n')
  console.log(`\n[fill-coords] 좌표 획득: ${updates.length}개 / 실패: ${failed.length}개`)

  if (updates.length === 0) {
    console.log('[fill-coords] 업데이트할 항목 없음')
    return
  }

  if (DRY_RUN) {
    for (const u of updates) {
      console.log(`  ${u.name}: lat=${u.lat}, lng=${u.lng}`)
    }
    console.log('[fill-coords] DRY RUN 완료')
    return
  }

  // UPDATE SQL 생성 후 실행
  const cases = updates.map(u => `  WHEN id = '${u.id}' THEN ROW(${u.lat}, ${u.lng})::record`).join('\n')
  const ids = updates.map(u => `'${u.id}'`).join(', ')
  const sql = `UPDATE complexes SET
  lat = CASE\n${updates.map(u => `  WHEN id = '${u.id}' THEN ${u.lat}`).join('\n')}\n  ELSE lat END,
  lng = CASE\n${updates.map(u => `  WHEN id = '${u.id}' THEN ${u.lng}`).join('\n')}\n  ELSE lng END
WHERE id IN (${ids});`

  const tmpPath = path.join(process.cwd(), 'data', '_coords_update.sql')
  fs.writeFileSync(tmpPath, sql, 'utf8')
  execSync(`supabase db query --linked --file "${tmpPath}"`, { stdio: 'inherit' })
  fs.unlinkSync(tmpPath)

  console.log(`[fill-coords] DB 업데이트 완료 — ${updates.length}개`)
  if (failed.length > 0) {
    console.log('[fill-coords] 좌표 못 찾은 단지:')
    failed.forEach(n => console.log(`  - ${n}`))
  }
  console.log('[fill-coords] 완료 —', new Date().toISOString())
}

main().catch(err => { console.error('[fill-coords] 오류:', err); process.exit(1) })
