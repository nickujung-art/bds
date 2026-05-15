/**
 * facility_school.is_assignment 플래그 갱신
 *
 * school_districts / school_district_schools 테이블과 ST_Within 공간 조인으로
 * 각 단지의 배정 학교를 결정하고 is_assignment 컬럼을 업데이트한다.
 *
 * 실행:
 *   npx tsx scripts/update-assignment-flags.ts --dry-run   (대상 목록만 출력)
 *   npx tsx scripts/update-assignment-flags.ts              (실제 업데이트)
 *
 * 참고:
 *   고등학교 결과 0건은 정상 (창원·김해 = 평준화 지역, 학군 미적용)
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

const DRY_RUN = process.argv.includes('--dry-run')

// ─── SQL 헬퍼 ──────────────────────────────────────────────────────────────

function runSqlFile(sql: string, label: string): string {
  const tmpPath = path.join(process.cwd(), 'data', '_assign_flags.sql')
  fs.writeFileSync(tmpPath, sql, 'utf8')
  try {
    const output = execSync(`supabase db query --linked --file "${tmpPath}"`, { encoding: 'utf8' })
    return output
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
  }
}

// ─── Dry-run: 대상 목록만 출력 ─────────────────────────────────────────────

function dryRun() {
  console.log('[assign-flags] *** DRY RUN — DB 미실행 ***')
  console.log('[assign-flags] ST_Within 조인으로 배정될 (complex_id, school_name, school_type) 목록 조회 중...')

  const sql = `
SELECT
  fs.complex_id,
  fs.school_name,
  fs.school_type
FROM   public.facility_school fs
JOIN   public.complexes c ON c.id = fs.complex_id
JOIN   public.school_district_schools sds ON sds.school_name = fs.school_name
JOIN   public.school_districts sd
         ON sd.id = sds.district_id
         AND sd.school_level = fs.school_type
WHERE  c.location IS NOT NULL
  AND  ST_Within(c.location::geometry, sd.geometry)
ORDER  BY fs.school_type, fs.complex_id
LIMIT  50;
`.trim()

  const raw = runSqlFile(sql, 'dry-run')

  // rows 파싱
  const match = raw.match(/"rows"\s*:\s*(\[[\s\S]*?\])/)
  if (!match?.[1]) {
    console.log('[assign-flags] 결과 파싱 불가 — 원본 출력:')
    // 자격증명이 없는 안전한 출력
    console.log(raw.substring(0, 500))
    return
  }

  interface DryRunRow { complex_id: string; school_name: string; school_type: string }
  const rows = JSON.parse(match[1]) as DryRunRow[]
  console.log(`[assign-flags] DRY RUN: 배정 대상 ${rows.length}건 (상위 50건)`)
  for (const r of rows) {
    console.log(`  ${r.school_type.padEnd(12)} ${r.complex_id.padEnd(36)} ${r.school_name}`)
  }
  console.log('[assign-flags] DRY RUN 완료 — DB 미실행')
}

// ─── 실제 업데이트 ──────────────────────────────────────────────────────────

function updateFlags() {
  console.log('[assign-flags] is_assignment 플래그 갱신 시작 —', new Date().toISOString())

  // Step 1: 전체 초기화
  console.log('[assign-flags] Step 1: 기존 is_assignment = true 초기화...')
  const resetSql = `
UPDATE public.facility_school
SET    is_assignment = false, updated_at = now()
WHERE  is_assignment = true;
`.trim()
  runSqlFile(resetSql, 'reset')
  console.log('[assign-flags] Step 1 완료')

  // Step 2: ST_Within 공간 조인으로 배정 학교 설정
  // PostgreSQL UPDATE ... FROM 에서는 UPDATE 대상 테이블 alias를 FROM JOIN ON에서
  // 직접 참조할 수 없으므로 서브쿼리로 먼저 조인 결과를 생성 후 매칭
  console.log('[assign-flags] Step 2: ST_Within 공간 조인으로 배정 학교 설정...')
  const updateSql = `
UPDATE public.facility_school fs
SET    is_assignment = true, updated_at = now()
FROM (
  SELECT fs2.id AS fs_id
  FROM   public.facility_school fs2
  JOIN   public.complexes c ON c.id = fs2.complex_id
  JOIN   public.school_district_schools sds ON sds.school_name = fs2.school_name
  JOIN   public.school_districts sd
           ON sd.id = sds.district_id
           AND sd.school_level = fs2.school_type
  WHERE  c.location IS NOT NULL
    AND  ST_Within(c.location::geometry, sd.geometry)
) matched
WHERE fs.id = matched.fs_id;
`.trim()
  runSqlFile(updateSql, 'update')
  console.log('[assign-flags] Step 2 완료')

  // Step 3: 결과 검증 (항상 출력)
  console.log('[assign-flags] Step 3: 결과 검증...')
  const verifySql = `
SELECT school_type, COUNT(*) AS cnt
FROM   public.facility_school
WHERE  is_assignment = true
GROUP  BY school_type
ORDER  BY school_type;
`.trim()
  const raw = runSqlFile(verifySql, 'verify')

  const match = raw.match(/"rows"\s*:\s*(\[[\s\S]*?\])/)
  if (match?.[1]) {
    interface VerifyRow { school_type: string; cnt: string | number }
    const rows = JSON.parse(match[1]) as VerifyRow[]
    console.log('[assign-flags] 배정 결과 (is_assignment = true):')
    for (const r of rows) {
      console.log(`  ${r.school_type.padEnd(12)} ${r.cnt}건`)
    }
    // 고등학교 0건은 창원·김해 평준화 지역 특성상 정상
    const highRow = rows.find(r => r.school_type === 'high')
    if (!highRow || Number(highRow.cnt) === 0) {
      console.log('[assign-flags] 참고: 고등학교 0건 — 평준화 지역(창원·김해)은 학군 미적용, 정상')
    }
  } else {
    console.log('[assign-flags] 검증 결과 파싱 불가 — 원본 일부:')
    console.log(raw.substring(0, 200))
  }

  console.log('[assign-flags] 완료 —', new Date().toISOString())
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

function main() {
  if (DRY_RUN) {
    dryRun()
  } else {
    updateFlags()
  }
}

try {
  main()
} catch (err) {
  console.error('[assign-flags] 치명적 오류:', err instanceof Error ? err.message : err)
  process.exit(1)
}
