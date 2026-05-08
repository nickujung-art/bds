import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 모듈 레벨 싱글턴 — serverless 함수 재시작 후에도 Redis에서 상태 유지
// Vercel Storage 연결 시 KV_REST_API_URL/TOKEN으로 주입됨
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

// IP당 분당 100회 rate limit (D-06)
export const adEventRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: false, // 무료 티어 데이터 절약
  prefix: 'danji:ad:rl',
})

// AD-01 D-03: IP별 일별 클릭 10회 초과 anomaly 감지
export const adClickDailyLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  analytics: false,
  prefix: 'danji:ad:daily-click',
})
