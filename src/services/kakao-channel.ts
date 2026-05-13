import 'server-only'

export interface AlimtalkParams {
  to: string
  pfId: string
  templateId: string
  variables: Record<string, string>
}

/**
 * DIFF-04: SOLAPI를 통한 카카오 알림톡 발송
 * 환경 변수 SOLAPI_API_KEY가 없으면 발송 없이 리턴 (개발/테스트 환경 안전)
 */
export async function sendAlimtalk(params: AlimtalkParams): Promise<void> {
  const apiKey    = process.env.SOLAPI_API_KEY
  const apiSecret = process.env.SOLAPI_API_SECRET
  const from      = process.env.SOLAPI_SENDER_NUMBER

  if (!apiKey || !apiSecret || !from) {
    // SOLAPI 계정 미설정 — 발송 스킵 (개발 환경)
    return
  }

  const { SolapiMessageService } = await import('solapi')
  const service = new SolapiMessageService(apiKey, apiSecret)

  await service.send({
    to:   params.to,
    from,
    kakaoOptions: {
      pfId:       params.pfId,
      templateId: params.templateId,
      variables:  params.variables,
    },
  })
}
