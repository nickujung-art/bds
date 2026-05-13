import 'server-only'

// T-8-02: SOLAPI API key는 서버 전용. 절대 클라이언트 컴포넌트에서 import 금지.
export interface AlimtalkParams {
  to:         string  // T-8-04: 전화번호 — 절대 로그 출력 금지
  pfId:       string
  templateId: string
  variables:  Record<string, string>
}

/**
 * DIFF-04: SOLAPI를 통한 카카오 알림톡 발송
 * 환경 변수 SOLAPI_API_KEY가 없으면 발송 없이 리턴 (개발/테스트 환경 안전)
 */
export async function sendAlimtalk(params: AlimtalkParams): Promise<void> {
  const apiKey    = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const sender    = process.env.SOLAPI_SENDER_NUMBER

  if (!apiKey || !apiSecret || !sender) {
    // Mock 모드: SOLAPI 계정 없으면 경고만 출력 (to 번호 절대 로그 금지)
    console.warn('[kakao-channel] SOLAPI env vars missing — skipping send (mock mode)')
    return
  }

  const { SolapiMessageService } = await import('solapi')
  const service = new SolapiMessageService(apiKey, apiSecret)

  await service.send({
    to:   params.to,
    from: sender,
    kakaoOptions: {
      pfId:       params.pfId,
      templateId: params.templateId,
      variables:  params.variables,
      disableSms: false,
    },
  })
}
