import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: 'voyage-4-lite', input_type: 'query' }),
    signal: AbortSignal.timeout(8_000),
  })
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> }
  return json.data?.[0]?.embedding ?? []
}

export async function POST(request: Request): Promise<Response> {
  // 인증 확인 — 미로그인 사용자의 Voyage AI + Claude API 무제한 소모 방지
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const complexId = typeof b.complexId === 'string' ? b.complexId : null
  const messages = Array.isArray(b.messages)
    ? (b.messages as Array<{ role: string; content: string }>)
    : null

  if (!complexId || !messages) {
    return NextResponse.json({ error: 'complexId and messages required' }, { status: 400 })
  }

  // 마지막 user 메시지 추출
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
  if (!lastUserMsg) {
    return NextResponse.json({ error: 'no user message' }, { status: 400 })
  }

  // Voyage AI 임베딩 (T-06-02-01: 사용자 입력은 context 외부에 배치)
  const queryEmbedding = await embedQuery(lastUserMsg)

  // pgvector 유사도 검색
  // match_complex_embeddings는 migration 06-00-03에서 추가된 RPC.
  // DB 타입 재생성 전까지 unknown cast 사용.
  const adminClient = createSupabaseAdminClient()
  const { data: chunks } = await (adminClient as unknown as {
    rpc: (
      fn: string,
      args: { query_embedding: number[]; target_complex_id: string; match_count: number },
    ) => Promise<{ data: Array<{ chunk_type: string; content: string; similarity: number }> | null }>
  }).rpc('match_complex_embeddings', {
    query_embedding: queryEmbedding,
    target_complex_id: complexId,
    match_count: 3,
  })

  const context = (chunks ?? [])
    .map(c => c.content)
    .join('\n\n')

  // Claude API 스트리밍 (T-06-02-01: 시스템 프롬프트로 역할 고정)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `당신은 부동산 단지 정보 안내 도우미입니다. 반드시 아래 단지 데이터만 참조하여 답변하세요. 데이터에 없는 내용은 "해당 정보는 단지 데이터에 없습니다."라고 답하세요. 추측하거나 일반 지식으로 답하지 마세요.

[단지 데이터]
${context || '(데이터 없음)'}`,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
