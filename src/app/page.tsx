import type { Metadata } from 'next'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getRecentHighRecords, getTopComplexRankings } from '@/lib/data/homepage'
import { UserMenu } from '@/components/auth/UserMenu'
import Link from 'next/link'
import { Suspense } from 'react'

export const revalidate = 0

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://danjiondo.kr'

export const metadata: Metadata = {
  title: '단지온도 — 창원·김해 아파트 실거래가',
  description: '창원·김해 아파트 실거래가와 동네 의견을 한 화면에서. 매매·전세·월세 시세를 빠르게 확인하세요.',
  openGraph: {
    title:       '단지온도 — 창원·김해 아파트 실거래가',
    description: '창원·김해 아파트 실거래가와 동네 의견을 한 화면에서.',
    url:         `${SITE}/`,
    siteName:    '단지온도',
    locale:      'ko_KR',
    type:        'website',
  },
  alternates: {
    canonical: `${SITE}/`,
  },
}

function formatPrice(price: number): string {
  const uk = Math.floor(price / 10000)
  const man = price % 10000
  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}`
  if (uk > 0) return `${uk}억`
  return `${price.toLocaleString()}만`
}

function formatPyeong(area_m2: number): string {
  return `${Math.round(area_m2 / 3.3058)}평`
}

function formatDealDate(dealDate: string): string {
  const today = new Date().toISOString().split('T')[0]!
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!
  if (dealDate === today) return '오늘'
  if (dealDate === yesterday) return '어제'
  const d = new Date(dealDate)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

function FireIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1 1 2 2 2 0-3-1-5 1-8z" />
    </svg>
  )
}

function SearchIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

function ArrUpIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m6 14 6-6 6 6" />
    </svg>
  )
}

export default async function HomePage() {
  const supabase = createReadonlyClient()

  const [highRecords, rankings] = await Promise.all([
    getRecentHighRecords(supabase, 4),
    getTopComplexRankings(supabase, 8),
  ])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Nav */}
      <header
        style={{
          height: 60,
          borderBottom: '1px solid var(--line-default)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: 32,
          flexShrink: 0,
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/" className="dj-logo">
          <span className="mark">단</span>
          <span>단지온도</span>
        </Link>
        <nav style={{ display: 'flex', gap: 24, font: '600 14px/1 var(--font-sans)' }}>
          <Link href="/" style={{ color: 'var(--dj-orange)', textDecoration: 'none' }}>
            홈
          </Link>
          <Link href="/map" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>
            지도
          </Link>
          <Link href="#" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>
            분양
          </Link>
          <Link href="/favorites" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>
            관심단지
          </Link>
        </nav>

        {/* Centered search → navigates to /map?q=... */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <form action="/map" method="get" style={{ position: 'relative', width: 480 }}>
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--fg-tertiary)',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon />
            </span>
            <input
              name="q"
              className="input"
              style={{ paddingLeft: 44 }}
              placeholder="단지명, 지역으로 검색"
              autoComplete="off"
            />
          </form>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-md btn-ghost btn-icon"
            style={{ color: 'var(--fg-sec)' }}
            aria-label="알림"
          >
            <BellIcon />
          </button>
          <Suspense
            fallback={
              <Link
                href="/login"
                className="btn btn-md btn-secondary"
                style={{ textDecoration: 'none' }}
              >
                로그인
              </Link>
            }
          >
            <UserMenu />
          </Suspense>
        </div>
      </header>

      {/* Body */}
      <main style={{ flex: 1, padding: '32px 48px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        {/* Section title */}
        <h1
          style={{
            font: '700 36px/1.2 var(--font-sans)',
            letterSpacing: '-0.025em',
            margin: '0 0 4px',
          }}
        >
          오늘 신고가
        </h1>
        <p
          style={{
            font: '500 14px/1.4 var(--font-sans)',
            color: 'var(--fg-sec)',
            margin: '0 0 24px',
          }}
        >
          창원·김해 최근 30일 최고 실거래가
        </p>

        {/*신고가 cards */}
        {highRecords.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginBottom: 40,
            }}
          >
            {highRecords.map((rec) => {
              const loc = [rec.complex.si, rec.complex.gu, rec.complex.dong]
                .filter(Boolean)
                .join(' ')
              return (
                <Link
                  key={rec.complex.id + rec.deal_date}
                  href={`/complexes/${rec.complex.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    className="card"
                    style={{ padding: 20, cursor: 'pointer', height: '100%' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <span className="badge orange">
                        <FireIcon />
                        신고가
                      </span>
                      <span
                        style={{
                          font: '500 11px/1 var(--font-sans)',
                          color: 'var(--fg-tertiary)',
                          marginLeft: 'auto',
                        }}
                      >
                        {formatDealDate(rec.deal_date)}
                      </span>
                    </div>
                    <div
                      style={{
                        font: '700 16px/1.35 var(--font-sans)',
                        letterSpacing: '-0.012em',
                        marginBottom: 2,
                      }}
                    >
                      {rec.complex.canonical_name}
                    </div>
                    <div
                      style={{
                        font: '500 12px/1.4 var(--font-sans)',
                        color: 'var(--fg-sec)',
                        marginBottom: 14,
                      }}
                    >
                      {loc} · {formatPyeong(rec.area_m2)}
                    </div>
                    <div
                      className="tnum"
                      style={{ font: '700 22px/1 var(--font-sans)', letterSpacing: '-0.02em' }}
                    >
                      {formatPrice(rec.price)}
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--fg-sec)',
                          marginLeft: 2,
                        }}
                      >
                        만원
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '48px 0',
              textAlign: 'center',
              color: 'var(--fg-tertiary)',
              font: '500 14px/1.6 var(--font-sans)',
              marginBottom: 40,
            }}
          >
            최근 30일 실거래 데이터가 없습니다.
            <br />
            <Link href="/map" style={{ color: 'var(--dj-orange)' }}>
              지도에서 단지 탐색하기 →
            </Link>
          </div>
        )}

        {/* Rankings */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div className="tabs" style={{ border: 'none' }}>
            <button className="tab" data-orange-active="true" style={{ background: 'none' }}>
              가격 TOP
            </button>
            <button className="tab" style={{ background: 'none' }}>
              거래량
            </button>
            <button className="tab" style={{ background: 'none' }}>
              조회수
            </button>
          </div>
          <span
            style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}
          >
            매매 기준 · 최근 30일
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0 32px',
            borderTop: '1px solid var(--line-default)',
          }}
        >
          {rankings.length > 0 ? (
            rankings.map((r, i) => {
              return (
                <Link
                  key={r.id}
                  href={`/complexes/${r.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: '1px solid var(--line-subtle)',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        font: '700 14px/1 var(--font-sans)',
                        color: i < 3 ? 'var(--dj-orange)' : 'var(--fg-tertiary)',
                        flexShrink: 0,
                      }}
                    >
                      {r.rank}
                    </span>
                    <span style={{ flex: 1, font: '600 14px/1 var(--font-sans)' }}>
                      {r.canonical_name}
                    </span>
                    {i < 3 && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--dj-orange)',
                        }}
                      >
                        <ArrUpIcon />
                      </span>
                    )}
                    <span
                      className="tnum"
                      style={{
                        font: '500 13px/1 var(--font-sans)',
                        color: 'var(--fg-sec)',
                        width: 72,
                        textAlign: 'right',
                      }}
                    >
                      {formatPrice(r.maxPrice)}
                    </span>
                  </div>
                </Link>
              )
            })
          ) : (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '32px 0',
                textAlign: 'center',
                color: 'var(--fg-tertiary)',
                font: '500 14px/1 var(--font-sans)',
              }}
            >
              랭킹 데이터를 불러오는 중입니다.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
