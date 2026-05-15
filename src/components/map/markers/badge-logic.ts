export type BadgeType =
  | 'pre_sale'
  | 'new_build'
  | 'crown'
  | 'hot'
  | 'surge'
  | 'drop'
  | 'school'
  | 'large_complex'
  | 'redevelop'
  | 'none'

export interface BadgeInput {
  status:           string
  built_year:       number | null
  view_count:       number
  price_change_30d: number | null  // 비율 (예: 0.10 = +10%)
  hagwon_grade:     string | null
  household_count:  number | null
  tx_count_30d:     number
  p95_view_count:   number
  p95_tx_count:     number
}

/**
 * 배지 우선순위에 따라 한 단지의 대표 배지 타입을 반환하는 순수 함수.
 * 1순위: pre_sale, new_build
 * 2순위: crown, hot, surge, drop
 * 3순위: school, large_complex, redevelop
 *
 * // 광고(ad) 배지: Phase 6 AI·차별화 기술 미완료로 입력 데이터(has_ad 필드)가 없음.
 * // Phase 6 완료 후 ComplexMapItem에 has_ad: boolean 추가 및 여기에 배지 로직 확장 예정.
 */
export function determineBadge(input: BadgeInput): BadgeType {
  // 1순위
  if (input.status === 'pre_sale') return 'pre_sale'
  if (input.built_year !== null && input.built_year >= 2021) return 'new_build'

  // 2순위
  if (input.p95_tx_count > 0 && input.tx_count_30d >= input.p95_tx_count) return 'crown'
  if (input.p95_view_count > 0 && input.view_count >= input.p95_view_count) return 'hot'
  if (input.price_change_30d !== null && input.price_change_30d > 0.05) return 'surge'
  if (input.price_change_30d !== null && input.price_change_30d < -0.05) return 'drop'

  // 3순위
  if (input.hagwon_grade !== null && ['A+', 'A'].includes(input.hagwon_grade)) return 'school'
  if (input.household_count !== null && input.household_count >= 1000) return 'large_complex'
  if (input.status === 'in_redevelopment') return 'redevelop'

  return 'none'
}

/**
 * 평당가(만원/평)에 따른 마커 색상 반환.
 * < 800만: emerald(저가), 800~1499만: amber(중가), >= 1500만: red(고가)
 */
export function getPriceColor(avgSalePerPyeong: number | null): string {
  if (avgSalePerPyeong === null || avgSalePerPyeong === 0) return '#6B7280' // gray-500
  if (avgSalePerPyeong < 800) return '#10B981'   // emerald-500: 저가
  if (avgSalePerPyeong < 1500) return '#F59E0B'  // amber-500: 중가
  return '#EF4444'                                // red-500: 고가
}
