import Link from 'next/link'

/**
 * Phase 3 LEGAL-02/03/05: 공통 footer (3개 법적 링크 + 지원 이메일)
 *
 * AI 슬롭 금지: 흐림·그라데이션·발광 효과·보라/인디고 사용 안 함 (CLAUDE.md)
 * 시맨틱 HTML: <footer> + <nav aria-label> 사용 (D-20)
 */
export function Footer() {
  const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@danjiondo.com'

  return (
    <footer
      aria-label="사이트 푸터"
      style={{
        borderTop:  '1px solid var(--line-subtle)',
        background: 'var(--bg-canvas)',
        padding:    '24px 32px',
        font:       '500 12px/1.6 var(--font-sans)',
        color:      'var(--fg-sec)',
      }}
    >
      <nav
        aria-label="법적 정보"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}
      >
        <Link href="/legal/terms" style={{ color: 'var(--fg-sec)' }}>
          이용약관
        </Link>
        <Link href="/legal/privacy" style={{ color: 'var(--fg-sec)', fontWeight: 700 }}>
          개인정보처리방침
        </Link>
        <Link href="/legal/ad-policy" style={{ color: 'var(--fg-sec)' }}>
          광고 정책
        </Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--fg-sec)' }}>
          문의 {SUPPORT_EMAIL}
        </a>
      </nav>
      <p style={{ margin: 0, color: 'var(--fg-tertiary)' }}>
        © 단지온도 · 창원·김해 부동산 정보 서비스 · 본 사이트의 부동산 정보는 참고용입니다.
      </p>
    </footer>
  )
}
