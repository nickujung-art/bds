import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface QuadrantPoint {
  complexId: string
  complexName: string
  x: number       // 평당가 (만원/평) — price / (area_m2 / 3.3058) / 10000
  y: number       // 전세가율 (%) — avg_jeonse_per_pyeong / avg_sale_per_pyeong * 100
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

  // 2. 최근 12개월 매매·전세 거래에서 단지별 평당가 집계
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromDate = twelveMonthsAgo.toISOString().slice(0, 10)

  const txBase = supabase
    .from('transactions')
    .select('complex_id, price, area_m2')
    .in('complex_id', complexIds)
    .is('cancel_date', null)
    .is('superseded_by', null)
    .gte('deal_date', fromDate)
    .gt('area_m2', 0)
    .order('complex_id')

  const [{ data: saleData, error: saleErr }, { data: jeonseData, error: jeonseErr }] =
    await Promise.all([
      txBase.eq('deal_type', 'sale').limit(50000),
      txBase.eq('deal_type', 'jeonse').limit(30000),
    ])

  if (saleErr) throw new Error(`getQuadrantData sale failed: ${saleErr.message}`)
  if (jeonseErr) throw new Error(`getQuadrantData jeonse failed: ${jeonseErr.message}`)

  function buildAvgPpMap(rows: { complex_id: string | null; price: number | null; area_m2: number | null }[]): Map<string, number> {
    const acc = new Map<string, number[]>()
    for (const tx of rows) {
      if (!tx.complex_id || !tx.price || !tx.area_m2) continue
      const ppp = (tx.price as number) / ((tx.area_m2 as number) / 3.3058) / 10000
      if (!acc.has(tx.complex_id)) acc.set(tx.complex_id, [])
      acc.get(tx.complex_id)!.push(ppp)
    }
    const avg = new Map<string, number>()
    for (const [cid, vals] of acc.entries()) {
      if (vals.length >= 2) avg.set(cid, vals.reduce((a, b) => a + b, 0) / vals.length)
    }
    return avg
  }

  const avgSaleMap   = buildAvgPpMap(saleData ?? [])
  const avgJeonseMap = buildAvgPpMap(jeonseData ?? [])

  // 3. 포인트 조합: 매매+전세 둘 다 있는 단지만 (전세가율 계산 가능)
  const points: QuadrantPoint[] = []
  for (const complex of complexList) {
    const saleAvg   = avgSaleMap.get(complex.id)
    const jeonseAvg = avgJeonseMap.get(complex.id)
    if (!saleAvg || !jeonseAvg) continue

    const jeonseRatio = (jeonseAvg / saleAvg) * 100

    points.push({
      complexId: complex.id,
      complexName: complex.canonical_name,
      x: Math.round(saleAvg * 10) / 10,
      y: Math.round(jeonseRatio * 10) / 10,
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
