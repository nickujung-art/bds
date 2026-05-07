import { z } from 'zod/v4'

// 국토교통부_공동주택 단지 목록제공 서비스 (data.go.kr 승인 API)
// 오퍼레이션: getSigunguAptList3 — 시군구코드로 단지 코드+단지명 조회
// 파라미터명: sigunguCode (sigunguCd 아님)
const BASE_URL = 'https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3'

const KaptComplexSchema = z.object({
  kaptCode: z.string(),
  kaptName: z.string(),
  bjdCode:  z.string().optional(),   // 10자리 법정동코드
  as1:      z.string().optional(),   // 시도
  as2:      z.string().optional(),   // 시군구
  as3:      z.string().optional(),   // 읍면동
  as4:      z.string().nullable().optional(),
})

export type KaptComplex = z.infer<typeof KaptComplexSchema>

export async function fetchComplexList(sggCode: string): Promise<KaptComplex[]> {
  const apiKey = process.env.KAPT_API_KEY
  if (!apiKey) throw new Error('KAPT_API_KEY is not set')

  const results: KaptComplex[] = []
  let pageNo = 1
  const numOfRows = 100

  while (true) {
    const url = new URL(BASE_URL)
    url.searchParams.set('ServiceKey', apiKey)
    url.searchParams.set('sigunguCode', sggCode)
    url.searchParams.set('pageNo', String(pageNo))
    url.searchParams.set('numOfRows', String(numOfRows))
    url.searchParams.set('_type', 'json')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`K-apt API ${res.status}: ${await res.text()}`)

    const json: unknown = await res.json()
    const body = (json as { response?: { body?: unknown } })?.response?.body
    const rawItems = (body as { items?: unknown })?.items
    const items: unknown[] = Array.isArray(rawItems) ? rawItems : []

    if (items.length === 0) break

    for (const item of items) {
      const parsed = KaptComplexSchema.safeParse(item)
      if (parsed.success) results.push(parsed.data)
    }

    const totalCount: number = (body as { totalCount?: number })?.totalCount ?? 0
    if (results.length >= totalCount || items.length < numOfRows) break
    pageNo++
  }

  return results
}

// ===== fetchKaptBasicInfo (DATA-01) =====
const BASIC_INFO_URL = 'http://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3'

const KaptBasicInfoSchema = z.object({
  kaptCode:       z.string(),
  kaptName:       z.string(),
  kaptdaCnt:      z.coerce.number().optional(),   // 세대수
  kaptDongCnt:    z.coerce.number().optional(),   // 동수
  heatType:       z.string().optional(),          // 난방방식
  managementType: z.string().optional(),          // 관리방식
  totalArea:      z.coerce.number().optional(),   // 연면적
})

export type KaptBasicInfo = z.infer<typeof KaptBasicInfoSchema>

export async function fetchKaptBasicInfo(kaptCode: string): Promise<KaptBasicInfo | null> {
  const apiKey = process.env.KAPT_API_KEY
  if (!apiKey) throw new Error('KAPT_API_KEY is not set')

  const url = new URL(BASIC_INFO_URL)
  url.searchParams.set('ServiceKey', apiKey)
  url.searchParams.set('kaptCode', kaptCode)
  url.searchParams.set('_type', 'json')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`K-apt BasicInfo API ${res.status}`)

  const json: unknown = await res.json()
  const item = (json as { response?: { body?: { item?: unknown } } })?.response?.body?.item
  const parsed = KaptBasicInfoSchema.safeParse(item)
  return parsed.success ? parsed.data : null
}
