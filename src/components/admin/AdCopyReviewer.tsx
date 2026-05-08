'use client'

import { useState } from 'react'

type ReviewState = 'idle' | 'loading' | 'result' | 'error'

interface ReviewResult {
  violations: string[]
  suggestions: string[]
}

interface AdCopyReviewerProps {
  copyText: string
}

function SparkleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z" />
    </svg>
  )
}

export function AdCopyReviewer({ copyText }: AdCopyReviewerProps) {
  const [state, setState] = useState<ReviewState>('idle')
  const [result, setResult] = useState<ReviewResult | null>(null)

  async function handleReview() {
    if (!copyText.trim() || state === 'loading') return
    setState('loading')
    try {
      const res = await fetch('/api/admin/ad-copy-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy: copyText }),
      })
      const data = (await res.json()) as ReviewResult & { error?: boolean }
      if (data.error) {
        setState('error')
      } else {
        setResult({ violations: data.violations, suggestions: data.suggestions })
        setState('result')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <div style={{ marginTop: '8px' }}>
      <button
        className="btn btn-sm btn-secondary"
        onClick={() => void handleReview()}
        disabled={state === 'loading' || !copyText.trim()}
        aria-label="광고 카피 AI 검토"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          opacity: state === 'loading' ? 0.5 : 1,
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        <SparkleIcon />
        AI 검토
      </button>

      {state !== 'idle' && (
        <div
          role="status"
          aria-live="polite"
          aria-busy={state === 'loading'}
          style={{
            marginTop: '8px',
            border: '1px solid var(--line-default)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
          }}
        >
          {state === 'loading' && (
            <p
              style={{
                font: '500 12px/1 var(--font-sans)',
                color: 'var(--fg-tertiary)',
                margin: 0,
              }}
            >
              검토 중...
            </p>
          )}

          {state === 'error' && (
            <p
              style={{
                font: '500 12px/1.4 var(--font-sans)',
                color: 'var(--fg-negative)',
                margin: 0,
              }}
            >
              AI 검토 요청에 실패했습니다. 직접 검토 후 등록하세요.
            </p>
          )}

          {state === 'result' && result && (
            <>
              <p
                style={{
                  font: '500 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  marginBottom: '8px',
                  marginTop: 0,
                }}
              >
                검토 결과
              </p>

              {result.violations.length === 0 &&
                result.suggestions.length === 0 && (
                  <p
                    style={{
                      font: '500 12px/1.4 var(--font-sans)',
                      color: 'var(--fg-positive)',
                      margin: 0,
                    }}
                  >
                    검토 결과 특이 사항이 없습니다.
                  </p>
                )}

              {result.violations.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <p
                    style={{
                      font: '600 12px/1.4 var(--font-sans)',
                      color: 'var(--fg-negative)',
                      marginBottom: '6px',
                      marginTop: 0,
                    }}
                  >
                    위반 가능 표현
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.violations.map((v, i) => (
                      <li
                        key={i}
                        style={{
                          font: '500 12px/1.6 var(--font-sans)',
                          color: 'var(--fg-pri)',
                          paddingLeft: '8px',
                        }}
                      >
                        · {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestions.length > 0 && (
                <div>
                  <p
                    style={{
                      font: '600 12px/1.4 var(--font-sans)',
                      color: 'var(--fg-sec)',
                      marginBottom: '6px',
                      marginTop: 0,
                    }}
                  >
                    개선 제안
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {result.suggestions.map((s, i) => (
                      <li
                        key={i}
                        style={{
                          font: '500 12px/1.6 var(--font-sans)',
                          color: 'var(--fg-pri)',
                          paddingLeft: '8px',
                        }}
                      >
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
