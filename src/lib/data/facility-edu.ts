import type { SupabaseClient } from '@supabase/supabase-js'

export interface SchoolItem {
  school_name:  string
  school_type:  'elementary' | 'middle' | 'high'
  distance_m:   number | null
  is_assignment: boolean
}

export interface PoiItem {
  poi_name:   string
  distance_m: number | null
}

export interface HagwonStats {
  cnt500:     number   // 500m 이내
  cnt1000:    number   // 1km 이내 전체
  rawScore:   number   // 밀도 점수
  percentile: number   // 창원/김해 내 백분위 (0-100, 높을수록 좋음)
  grade:      'A' | 'B' | 'C' | 'D'
}

export interface FacilityEduData {
  schools:       SchoolItem[]
  hagwons:       PoiItem[]
  daycares:      PoiItem[]
  kindergartens: PoiItem[]
  hagwonStats:   HagwonStats | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getComplexFacilityEdu(
  complexId: string,
  supabase: SupabaseClient,
): Promise<FacilityEduData> {
  const [schoolRes, poiRes, scoreRes] = await Promise.all([
    supabase
      .from('facility_school')
      .select('school_name, school_type, distance_m, is_assignment')
      .eq('complex_id', complexId)
      .order('distance_m', { ascending: true, nullsFirst: false }),

    supabase
      .from('facility_poi')
      .select('category, poi_name, distance_m')
      .eq('complex_id', complexId)
      .in('category', ['hagwon', 'daycare'])
      .order('distance_m', { ascending: true, nullsFirst: false }),

    // 이 단지의 학원 점수 + si 기반 백분위 계산
    supabase
      .from('complexes')
      .select('hagwon_score, si')
      .eq('id', complexId)
      .maybeSingle(),
  ])

  const schools = (schoolRes.data ?? []) as SchoolItem[]
  const allPois = poiRes.data ?? []
  const hagwons = allPois
    .filter(p => p.category === 'hagwon')
    .map(p => ({ poi_name: p.poi_name, distance_m: p.distance_m }))

  const isKindergarten = (name: string) =>
    name.includes('유치원') || name.includes('병설')

  const kindergartens = allPois
    .filter(p => p.category === 'daycare' && isKindergarten(p.poi_name))
    .map(p => ({ poi_name: p.poi_name, distance_m: p.distance_m }))

  const daycares = allPois
    .filter(p => p.category === 'daycare' && !isKindergarten(p.poi_name))
    .map(p => ({ poi_name: p.poi_name, distance_m: p.distance_m }))

  // 학원 통계
  let hagwonStats: HagwonStats | null = null
  const complexData = scoreRes.data as { hagwon_score?: number | null; si?: string | null } | null
  const rawScore = complexData?.hagwon_score
  const si = complexData?.si
  if (rawScore != null) {
    // 백분위: si(시) 기반 또는 전체 분포에서 이 단지 위치
    const percentileRes = si
      ? await supabase.rpc('hagwon_score_percentile_by_si', { target_score: rawScore, p_si: si })
      : await supabase.rpc('hagwon_score_percentile', { target_score: rawScore })
    const percentile: number = (percentileRes.data as number | null) ?? 50

    hagwonStats = {
      cnt500:     hagwons.filter(h => (h.distance_m ?? 9999) <= 500).length,
      cnt1000:    hagwons.length,
      rawScore,
      percentile: Math.round(percentile * 100),
      grade:      percentile >= 0.8 ? 'A' : percentile >= 0.5 ? 'B' : percentile >= 0.2 ? 'C' : 'D',
    }
  } else if (hagwons.length > 0) {
    // DB 점수가 없지만 POI는 있는 경우 (배치 전 임시)
    const cnt500 = hagwons.filter(h => (h.distance_m ?? 9999) <= 500).length
    const score  = cnt500 * 3 + (hagwons.length - cnt500)
    hagwonStats = {
      cnt500,
      cnt1000:    hagwons.length,
      rawScore:   score,
      percentile: 50,
      grade:      'B',
    }
  }

  return { schools, hagwons, daycares, kindergartens, hagwonStats }
}
