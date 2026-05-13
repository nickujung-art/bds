import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type MemberTier = 'bronze' | 'silver' | 'gold'

export interface MemberTierInfo {
  tier: MemberTier
  points: number
}

export interface TierBadgeInput {
  tier: MemberTier
  cafeVerified: boolean
}

/**
 * profiles 테이블에서 사용자의 등급과 포인트를 조회한다.
 * DIFF-01: 활동 기반 회원 등급 조회 (읽기 전용 — 포인트 갱신은 DB 트리거에서만)
 */
export async function getMemberTier(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<MemberTierInfo> {
  // database.ts는 Phase 8 마이그레이션 컬럼(activity_points, member_tier)을 아직 포함하지 않음
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('profiles')
    .select('activity_points, member_tier')
    .eq('id', userId)
    .single()

  if (!data) return { tier: 'bronze', points: 0 }

  const row = data as { activity_points: number; member_tier: string }
  return {
    tier: (row.member_tier as MemberTier) ?? 'bronze',
    points: row.activity_points ?? 0,
  }
}

/**
 * 등급별 알림 딜레이(ms) 반환.
 * DIFF-05: gold → 즉시 발송(0ms), silver/bronze → 30분 딜레이.
 */
export function getNotificationDelay(tier: MemberTier): number {
  return tier === 'gold' ? 0 : 30 * 60 * 1000
}

/**
 * 등급 + 카페 인증 여부에 따른 배지 문자열 반환.
 * - bronze + cafeVerified=false → ''
 * - silver → '🔥'
 * - gold → '👑'
 * - cafeVerified=true → 위 배지에 '💬' 추가
 */
export function getTierBadge({ tier, cafeVerified }: TierBadgeInput): string {
  const badges: string[] = []

  if (tier === 'silver') badges.push('🔥')
  if (tier === 'gold') badges.push('👑')
  if (cafeVerified) badges.push('💬')

  return badges.join('')
}
