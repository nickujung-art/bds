import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// 모듈 레벨 싱글턴 — serverless 함수 재시작 후에도 Redis에서 상태 유지
export const adEventRatelimit = new Ratelimit({
  redis: Redis.fromEnv(), // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  limiter: Ratelimit.slidingWindow(100, '1 m'), // IP당 분당 100회 (D-06)
  analytics: false, // 무료 티어 데이터 절약
  prefix: 'danji:ad:rl',
})
