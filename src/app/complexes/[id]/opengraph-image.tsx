import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getComplexById } from '@/lib/data/complex-detail'

// Node.js runtime 사용: TTF 4MB 파일 로드 허용 (Edge runtime은 1MB 한도)
export const runtime = 'nodejs'

export const alt = '단지온도 아파트 실거래가'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// 24시간 캐시 (단지 기본 정보는 자주 바뀌지 않음)
export const revalidate = 86400

interface Props {
  params: Promise<{ id: string }>
}

export default async function Image({ params }: Props): Promise<ImageResponse> {
  // Next.js 15: params는 Promise — await 필수
  const { id } = await params

  // 한글 TTF 폰트 로드 (WOFF2는 Satori 미지원 — RESEARCH.md Pitfall 1)
  const fontData = readFileSync(
    join(process.cwd(), 'public/fonts/PretendardSubset.ttf'),
  )

  // 단지 데이터 조회 (createReadonlyClient: cookies() 미호출, ISR 안전)
  const supabase = createReadonlyClient()
  const complex = await getComplexById(id, supabase)

  const name = complex?.canonical_name ?? '단지온도'
  const location = [complex?.si, complex?.gu, complex?.dong]
    .filter(Boolean)
    .join(' ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '60px 72px',
          fontFamily: 'Pretendard',
        }}
      >
        {/* 브랜드 헤더 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: '#ea580c',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            단
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#ea580c' }}>
            단지온도
          </span>
        </div>

        {/* 단지명 */}
        <div
          style={{
            fontSize: complex ? 56 : 48,
            fontWeight: 700,
            color: '#111111',
            letterSpacing: '-2px',
            lineHeight: 1.15,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {name}
        </div>

        {/* 위치 + 하단 구분선 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            borderTop: '1px solid #e5e7eb',
            paddingTop: 24,
            marginTop: 24,
          }}
        >
          <span style={{ fontSize: 22, color: '#6b7280', fontWeight: 500 }}>
            {location || '창원·김해 아파트 실거래가'}
          </span>
          <span style={{ fontSize: 16, color: '#9ca3af' }}>
            실거래가 · 단지온도
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Pretendard',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  )
}
