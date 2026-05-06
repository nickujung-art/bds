import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: {
    default: '단지온도',
    template: '%s | 단지온도',
  },
  description: '창원·김해 실거래가와 동네 의견을 한 화면에서.',
  manifest: '/manifest.webmanifest',
  applicationName: '단지온도',
  keywords: ['창원 아파트', '김해 아파트', '실거래가', '부동산'],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '단지온도',
  },
}

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans antialiased">
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&libraries=services`}
          strategy="beforeInteractive"
        />
        {children}
        <Footer />
      </body>
    </html>
  )
}
