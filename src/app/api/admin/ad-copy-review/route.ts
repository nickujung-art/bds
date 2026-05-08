import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  // T-06-02-04: 두 단계 검증 (auth.getUser + profiles.role)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['admin', 'superadmin'].includes((profile as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const copy =
    typeof (body as Record<string, unknown>)?.copy === 'string'
      ? ((body as Record<string, unknown>).copy as string).trim()
      : ''
  if (!copy) return NextResponse.json({ error: 'copy required' }, { status: 400 })
  // D-10: 500자 제한
  if (copy.length > 500) return NextResponse.json({ error: 'copy too long' }, { status: 400 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `당신은 한국 표시광고법 전문가입니다. 부동산 광고 카피를 검토하여 다음을 찾아냅니다:
1. 표시광고법 위반 가능 표현 (최저가 보장, 100% 확실, 투자 원금 보장 등 과장·허위 표현)
2. 과장 표현, 근거 없는 수익률 주장
응답은 반드시 JSON 형식: {"violations": [...], "suggestions": [...]}
위반·제안이 없으면 빈 배열 반환. 절대 JSON 외의 텍스트 포함 금지.`,
      messages: [
        {
          role: 'user',
          content: `다음 부동산 광고 카피를 검토해주세요:\n\n"${copy}"\n\n반드시 JSON만 반환하세요 (설명 금지):\n{"violations": ["위반 표현1", ...], "suggestions": ["개선 제안1", ...]}`,
        },
      ],
    })

    const rawText =
      message.content[0]?.type === 'text' ? message.content[0].text : '{}'
    // Claude가 마크다운 블록으로 감쌀 경우 제거 후 파싱
    const jsonText = rawText
      .replace(/```json?\n?/g, '')
      .replace(/```/g, '')
      .trim()
    const result = JSON.parse(jsonText) as {
      violations?: string[]
      suggestions?: string[]
    }

    return NextResponse.json({
      violations: Array.isArray(result.violations) ? result.violations : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    })
  } catch (err) {
    // D-10: 실패 시 등록 차단 안 함 — error 플래그만 반환
    console.error('Claude API error:', err)
    return NextResponse.json(
      { violations: [], suggestions: [], error: true },
      { status: 200 },
    )
  }
}
