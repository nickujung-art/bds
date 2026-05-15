import type { SupabaseClient } from '@supabase/supabase-js'
import Supercluster from 'supercluster'

export interface ComplexMapItem {
  id:                  string
  canonical_name:      string
  lat:                 number
  lng:                 number
  sgg_code:            string
  // Phase 11 추가
  avg_sale_per_pyeong: number | null
  view_count:          number
  price_change_30d:    number | null
  tx_count_30d:        number
  status:              string
  built_year:          number | null
  household_count:     number | null
  hagwon_grade:        string | null
  // Phase 12 추가 — hover 툴팁 + DongClusterChip
  si:              string | null
  gu:              string | null
  dong:            string | null
  recent_price:    number | null  // 만원 단위 — 최근 3개월 이내 거래 1건
  recent_date:     string | null  // 'YYYY-MM-DD'
  recent_area_m2:  number | null  // m² 단위
}

/**
 * complexes.hagwon_score (0~1 백분위) → 등급 문자열 변환.
 * 임계값은 src/lib/data/facility-edu.ts의 HagwonStats.grade 계산과 동일.
 * facility_edu 테이블 JOIN 없이 complexes 컬럼만 사용.
 */
function scoreToGradeInline(score: number | null): string | null {
  if (score === null) return null
  if (score >= 0.933) return 'A+'
  if (score >= 0.867) return 'A'
  if (score >= 0.800) return 'A-'
  if (score >= 0.700) return 'B+'
  if (score >= 0.600) return 'B'
  if (score >= 0.500) return 'B-'
  if (score >= 0.400) return 'C+'
  if (score >= 0.300) return 'C'
  if (score >= 0.200) return 'C-'
  return 'D'
}

export async function getComplexesForMap(
  sggCodes: string[],
  supabase: SupabaseClient,
): Promise<ComplexMapItem[]> {
  if (sggCodes.length === 0) return []

  // 스텝 1: complexes 기본 정보 조회 (Phase 12: si/gu/dong 추가)
  const { data, error } = await supabase
    .from('complexes')
    .select(
      `id, canonical_name, lat, lng, sgg_code,
       avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d,
       status, built_year, household_count, hagwon_score,
       si, gu, dong`,
    )
    .in('sgg_code', sggCodes)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .neq('status', 'demolished')

  if (error) throw new Error(`getComplexesForMap failed: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id:                  string
    canonical_name:      string
    lat:                 number
    lng:                 number
    sgg_code:            string
    avg_sale_per_pyeong: number | null
    view_count:          number
    price_change_30d:    number | null
    tx_count_30d:        number
    status:              string
    built_year:          number | null
    household_count:     number | null
    hagwon_score:        number | null
    si:                  string | null
    gu:                  string | null
    dong:                string | null
  }>

  if (rows.length === 0) return []

  // 스텝 2: 최근 3개월 거래 조회
  // CRITICAL: cancel_date IS NULL AND superseded_by IS NULL 필수 (CLAUDE.md)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10)

  const ids = rows.map((r) => r.id)

  const { data: txData } = await supabase
    .from('transactions')
    .select('complex_id, price, deal_date, area_m2')
    .in('complex_id', ids)
    .eq('deal_type', 'sale')
    .is('cancel_date', null)
    .is('superseded_by', null)
    .gte('deal_date', threeMonthsAgoStr)
    .order('deal_date', { ascending: false })

  // 스텝 3: complex_id별 첫 번째(최신) 거래만 Map으로 구성
  const recentTxMap = new Map<string, { price: number; deal_date: string; area_m2: number }>()
  for (const tx of (txData ?? []) as Array<{
    complex_id: string
    price: number
    deal_date: string
    area_m2: number
  }>) {
    if (!recentTxMap.has(tx.complex_id)) {
      recentTxMap.set(tx.complex_id, {
        price:     tx.price,
        deal_date: tx.deal_date,
        area_m2:   tx.area_m2,
      })
    }
  }

  return rows.map((r) => {
    const tx = recentTxMap.get(r.id)
    return {
      id:                  r.id,
      canonical_name:      r.canonical_name,
      lat:                 r.lat,
      lng:                 r.lng,
      sgg_code:            r.sgg_code,
      avg_sale_per_pyeong: r.avg_sale_per_pyeong ?? null,
      view_count:          r.view_count ?? 0,
      price_change_30d:    r.price_change_30d ?? null,
      tx_count_30d:        r.tx_count_30d ?? 0,
      status:              r.status ?? 'active',
      built_year:          r.built_year ?? null,
      household_count:     r.household_count ?? null,
      hagwon_grade:        scoreToGradeInline(r.hagwon_score ?? null),
      si:                  r.si ?? null,
      gu:                  r.gu ?? null,
      dong:                r.dong ?? null,
      recent_price:        tx?.price ?? null,
      recent_date:         tx?.deal_date ?? null,
      recent_area_m2:      tx ? Number(tx.area_m2) : null,
    } satisfies ComplexMapItem
  })
}

// ── supercluster 래퍼 ──────────────────────────────────────

export type ClusterFeature = ReturnType<Supercluster['getClusters']>[number]

export function buildClusterIndex(complexes: ComplexMapItem[]) {
  const index = new Supercluster({ radius: 60, maxZoom: 12 })
  index.load(
    complexes.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      properties: {
        id:                  c.id,
        name:                c.canonical_name,
        cluster:             false,
        avg_sale_per_pyeong: c.avg_sale_per_pyeong,
        view_count:          c.view_count,
        price_change_30d:    c.price_change_30d,
        tx_count_30d:        c.tx_count_30d,
        status:              c.status,
        built_year:          c.built_year,
        household_count:     c.household_count,
        hagwon_grade:        c.hagwon_grade,
        // Phase 12 추가 — DongClusterChip/hover 툴팁
        si:                  c.si,
        gu:                  c.gu,
        dong:                c.dong,
        recent_price:        c.recent_price,
        recent_date:         c.recent_date,
        recent_area_m2:      c.recent_area_m2,
      },
    })),
  )
  return index
}

export function clusterComplexes(
  complexes: ComplexMapItem[],
  bounds: [number, number, number, number],  // [westLng, southLat, eastLng, northLat]
  zoom: number,
): ClusterFeature[] {
  if (complexes.length === 0) return []
  return buildClusterIndex(complexes).getClusters(bounds, zoom)
}
