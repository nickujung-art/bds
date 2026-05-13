import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

// T-8-02: KAKAO_REST_API_KEY는 서버 전용. 클라이언트에서 절대 호출 금지.
const CAFE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/cafe'

export interface CafePost {
  title:    string
  contents: string
  url:      string
  datetime: string
  cafeName: string
}

export async function searchCafePosts(
  query: string,
  size = 10,
): Promise<CafePost[]> {
  const url = new URL(CAFE_SEARCH_URL)
  url.searchParams.set('query', query)
  url.searchParams.set('sort', 'recency')
  url.searchParams.set('size', String(size))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) throw new Error(`Daum cafe search HTTP ${res.status}`)

  const json = (await res.json()) as {
    documents: Array<{
      title:    string
      contents: string
      url:      string
      datetime: string
      cafename: string
    }>
  }

  return json.documents.map(d => ({
    title:    d.title,
    contents: d.contents,
    url:      d.url,
    datetime: d.datetime,
    cafeName: d.cafename,
  }))
}

/**
 * T-8-03: Gemini 프롬프트 인젝션 방지
 * 카페 글 내용을 [텍스트]...[텍스트 끝] 구분자로 반드시 감싼다.
 */
export async function extractComplexNames(text: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Fallback: GEMINI_API_KEY 없으면 빈 배열 반환 (운영 오류 방지)
    return []
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction:
      '한국 부동산 텍스트에서 아파트 단지명과 지역명(구/동)을 추출하세요. 응답은 반드시 JSON: {"complexes": ["단지명1"], "region": "창원 성산구"}. 없으면 빈 문자열/배열.',
  })

  // 프롬프트 인젝션 방지: [텍스트] 구분자 사용 (T-8-03)
  const safeText = text.slice(0, 500)
  const prompt = `다음 텍스트에서 아파트 단지명을 추출하세요:\n[텍스트]\n${safeText}\n[텍스트 끝]`

  try {
    const result = await model.generateContent(prompt)
    const raw = result.response.text().replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(raw) as { complexes: string[] }
    return Array.isArray(parsed.complexes) ? parsed.complexes : []
  } catch {
    return []
  }
}
