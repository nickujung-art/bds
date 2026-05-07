import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface QuadrantPoint {
  complexId: string
  complexName: string
  x: number       // 평당가 (만원/평) — price / (area_m2 / 3.3058) / 10000
  y: number       // 학군점수 (0-100)
  isTarget: boolean
}

export interface QuadrantData {
  points: QuadrantPoint[]
  medianX: number
  medianY: number
  regionLabel: string   // 예: "창원시 의창구"
  totalCount: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : ((sorted[mid - 1]! + sorted[mid]!) / 2)
}

export async function getQuadrantData(
  targetComplexId: string,
  si: string,
  gu: string,
  supabase: SupabaseClient<Database>,
): Promise<QuadrantData> {
  const regionLabel = `${si} ${gu}`

  // 1. 같은 시·구 active 단지 목록 (L-1: limit 400)
  const { data: complexList, error: complexErr } = await supabase
    .from('complexes')
    .select('id, canonical_name, si, gu')
    .eq('si', si)
    .eq('gu', gu)
    .eq('status', 'active')
    .limit(400)

  if (complexErr) throw new Error(`getQuadrantData complexes failed: ${complexErr.message}`)
  if (!complexList || complexList.length === 0) {
    return { points: [], medianX: 0, medianY: 0, regionLabel, totalCount: 0 }
  }

  const complexIds = complexList.map(c => c.id)

  // 2. 최근 12개월 sale 거래에서 단지별 평당가 집계
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromDate = twelveMonthsAgo.toISOString().slice(0, 10)  // YYYY-MM-DD

  // NOTE: Supabase JS client cannot GROUP BY without an RPC function.
  // This approach fetches raw rows and aggregates client-side.
  // Risk: a lower limit may cut low-volume complexes if high-volume ones fill the window.
  // Phase 6 improvement: create get_avg_price_by_complex() RPC for accurate SQL aggregation.
  // Mitigation: increased limit to 50000 and order by complex_id to improve locality
  // (rows for the same complex are contiguous, reducing cross-complex cutoff risk).
  // H-2: limit(50000) + order('complex_id') — 집계 편향 최소화
  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('complex_id, price, area_m2')
    .in('complex_id', complexIds)
    .is('cancel_date', null)          // 필수 — CLAUDE.md 대원칙
    .is('superseded_by', null)        // 필수 — CLAUDE.md 대원칙
    .eq('deal_type', 'sale')
    .gte('deal_date', fromDate)
    .gt('area_m2', 0)
    .order('complex_id')    // group locality — reduce cross-complex cutoff risk
    .limit(50000)           // increased from 10000 — reduces per-complex skew

  if (txErr) throw new Error(`getQuadrantData transactions failed: ${txErr.message}`)

  // 단지별 평균 평당가 계산 (만원/평)
  const priceMap = new Map<string, number[]>()
  for (const tx of txData ?? []) {
    if (!tx.complex_id || !tx.price || !tx.area_m2) continue
    const ppp = (tx.price as number) / ((tx.area_m2 as number) / 3.3058) / 10000
    if (!priceMap.has(tx.complex_id)) priceMap.set(tx.complex_id, [])
    priceMap.get(tx.complex_id)!.push(ppp)
  }

  const avgPriceMap = new Map<string, number>()
  for (const [cid, prices] of priceMap.entries()) {
    avgPriceMap.set(cid, prices.reduce((a, b) => a + b, 0) / prices.length)
  }

  // 3. 배정 초등학교 거리로 학군점수 계산
  // Note: score=0 means school ≥1km away (not null/excluded).
  // Only complexes with NO is_assignment=true school are excluded from the chart.
  // A complex 1km+ from its school appears at y≈0 in the chart — this is intentional.
  // L-3: score=0 동작 문서화
  //
  // facility_school.school_type 값은 영문 'elementary' (migration 20260430000004_facility.sql 기준)
  const { data: schoolData, error: schoolErr } = await supabase
    .from('facility_school')
    .select('complex_id, distance_m')
    .in('complex_id', complexIds)
    .eq('is_assignment', true)
    .eq('school_type', 'elementary')

  if (schoolErr) throw new Error(`getQuadrantData school failed: ${schoolErr.message}`)

  // 단지별 가장 가까운 배정 초등학교 거리로 점수 계산
  const schoolScoreMap = new Map<string, number>()
  for (const s of schoolData ?? []) {
    if (!s.complex_id || s.distance_m == null) continue
    const score = Math.max(0, Math.min(100, 100 - (s.distance_m / 10)))
    // 가장 가까운 학교 우선
    const existing = schoolScoreMap.get(s.complex_id)
    if (existing === undefined || score > existing) {
      schoolScoreMap.set(s.complex_id, score)
    }
  }

  // 4. 포인트 조합 (배정 초등학교 없는 단지 제외 — score=0은 포함)
  const points: QuadrantPoint[] = []
  for (const complex of complexList) {
    const x = avgPriceMap.get(complex.id)
    const y = schoolScoreMap.get(complex.id)
    if (x === undefined || y === undefined) continue  // 데이터 없으면 제외

    points.push({
      complexId: complex.id,
      complexName: complex.canonical_name,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 10) / 10,
      isTarget: complex.id === targetComplexId,
    })
  }

  // 5. 중앙값 계산 (빈 배열이면 0)
  const xValues = points.map(p => p.x)
  const yValues = points.map(p => p.y)
  const medianX = median(xValues)
  const medianY = median(yValues)

  return { points, medianX, medianY, regionLabel, totalCount: points.length }
}
