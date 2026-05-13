/**
 * DIFF-04 — SOLAPI 알림톡 발송
 * RED: 구현 없음 → 실패 예상
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

describe('kakao-channel sendAlimtalk', () => {
  beforeEach(() => {
    vi.stubEnv('SOLAPI_API_KEY', 'test-api-key')
    vi.stubEnv('SOLAPI_API_SECRET', 'test-secret')
    vi.stubEnv('SOLAPI_SENDER_NUMBER', '0212345678')
    vi.stubEnv('KAKAO_CHANNEL_PF_ID', 'test-pf-id')
  })

  it('서버 전용 — SOLAPI 클라이언트는 src/services/kakao-channel.ts에서만 초기화', async () => {
    // solapi는 서버 전용. 이 테스트에서 import 가능하면 OK
    const mod = await import('@/services/kakao-channel')
    expect(typeof mod.sendAlimtalk).toBe('function')
  })

  it('sendAlimtalk: SOLAPI 호출 → 성공', async () => {
    vi.doMock('solapi', () => ({
      SolapiMessageService: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({}),
      })),
    }))

    const { sendAlimtalk } = await import('@/services/kakao-channel')
    await expect(sendAlimtalk({
      to: '01012345678',
      pfId: 'test-pf-id',
      templateId: 'KA01TP_TEST',
      variables: { '#{단지명}': '래미안더센트럴', '#{가격}': '15억' },
    })).resolves.not.toThrow()
  })

  it('deliver.ts에 kakao 분기 추가: deliverKakaoChannelNotifications 함수 존재', async () => {
    const mod = await import('@/lib/notifications/deliver')
    expect(typeof mod.deliverKakaoChannelNotifications).toBe('function')
  })
})
