import type { RankingRow } from '@/lib/data/rankings'

function formatEok(score: number): string {
  const eok = Math.floor(score / 10000)
  const remain = Math.round((score % 10000) / 1000) * 1000
  return remain > 0 ? `${eok}억 ${remain / 1000}천` : `${eok}억`
}

/**
 * 카드뉴스 1080×1080 레이아웃 — Satori/ImageResponse 호환 JSX
 * CSS flex only (Recharts 등 SVG 라이브러리 미사용)
 */
export function CardnewsLayout({ rankings }: { rankings: RankingRow[] }) {
  const maxScore = rankings[0]?.score ?? 1

  return (
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
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: '#ea580c',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          단
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#ea580c' }}>단지온도</span>
      </div>

      {/* 타이틀 */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#111111',
          letterSpacing: '-2px',
          lineHeight: 1.15,
          marginBottom: 12,
          display: 'flex',
        }}
      >
        주간 신고가 TOP 5
      </div>
      <div
        style={{
          fontSize: 22,
          color: '#6b7280',
          fontWeight: 500,
          marginBottom: 40,
          display: 'flex',
        }}
      >
        창원·김해 · 최근 30일 기준
      </div>

      {/* 랭킹 목록 — CSS flex 바 (Recharts 미사용: Satori 미지원) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
        {rankings.length === 0 ? (
          <div style={{ fontSize: 24, color: '#9ca3af', display: 'flex' }}>데이터 없음</div>
        ) : (
          rankings.map((r) => {
            const widthPct = Math.max(20, Math.round((r.score / maxScore) * 100))
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: '#fff7ed',
                    color: '#ea580c',
                    fontSize: 22,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {r.rank}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#111111' }}>
                      {r.canonical_name}
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#ea580c' }}>
                      {formatEok(r.score)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      height: 10,
                      background: '#f3f4f6',
                      borderRadius: 5,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{ width: `${widthPct}%`, height: '100%', background: '#ea580c' }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 푸터 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #e5e7eb',
          paddingTop: 20,
          marginTop: 32,
        }}
      >
        <span style={{ fontSize: 18, color: '#6b7280', fontWeight: 500 }}>실거래가 · 단지온도</span>
        <span style={{ fontSize: 16, color: '#9ca3af' }}>danjiondo.com</span>
      </div>
    </div>
  )
}
