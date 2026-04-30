'use client'

import dynamic from 'next/dynamic'
import type { ComplexMapItem } from '@/lib/data/complexes-map'

// SSR 비활성화 — kakao 글로벌 객체는 브라우저에서만 존재
const KakaoMap = dynamic(
  () => import('./KakaoMap').then((m) => m.KakaoMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        지도 불러오는 중…
      </div>
    ),
  },
)

interface Props {
  complexes: ComplexMapItem[]
}

export function MapView({ complexes }: Props) {
  if (!process.env.NEXT_PUBLIC_KAKAO_JS_KEY) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-gray-400">
        NEXT_PUBLIC_KAKAO_JS_KEY 환경변수를 설정해주세요
      </div>
    )
  }

  return <KakaoMap complexes={complexes} />
}
