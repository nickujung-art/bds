export type BadgeType = 'pre_sale' | 'new_build' | 'hot' | 'none'

export interface BadgeInput {
  status:       string
  built_year:   number | null
  tx_count_30d: number
  p95_tx_count: number
}

/**
 * Phase 12 배지 3종 판별 — pre_sale > new_build > hot > none
 * (Phase 11의 10종에서 단순화)
 */
export function determineBadge(input: BadgeInput): BadgeType {
  if (input.status === 'pre_sale') return 'pre_sale'
  if (input.built_year !== null && input.built_year >= 2021) return 'new_build'
  if (input.p95_tx_count > 0 && input.tx_count_30d >= input.p95_tx_count) return 'hot'
  return 'none'
}
