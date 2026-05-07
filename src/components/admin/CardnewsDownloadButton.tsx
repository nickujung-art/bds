'use client'
import { useState } from 'react'

export function CardnewsDownloadButton() {
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleDownload() {
    setPending(true)
    setErr(null)
    try {
      const res = await fetch('/api/cardnews/generate', { cache: 'no-store' })
      if (!res.ok) {
        setErr(`다운로드 실패 (${res.status}): ${await res.text()}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cardnews_${new Date().toISOString().slice(0, 10)}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '다운로드 실패')
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        className="btn btn-md btn-primary"
        onClick={handleDownload}
        disabled={pending}
        aria-label="주간 신고가 TOP5 카드뉴스 다운로드"
      >
        {pending ? '생성 중…' : '카드뉴스 생성 + 다운로드'}
      </button>
      {err && (
        <div
          role="alert"
          style={{ font: '500 13px/1.5 var(--font-sans)', color: '#dc2626' }}
        >
          {err}
        </div>
      )}
    </div>
  )
}
