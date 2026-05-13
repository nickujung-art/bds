'use client'
import { useState } from 'react'

interface AdminCardnewsCopyButtonProps {
  text: string
}

export function AdminCardnewsCopyButton({ text }: AdminCardnewsCopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')

  async function handleCopy() {
    setState('copying')
    try {
      await navigator.clipboard.writeText(text)
      setState('success')
    } catch {
      setState('error')
    } finally {
      setTimeout(() => setState('idle'), 2000)
    }
  }

  const label = {
    idle:    '텍스트 복사',
    copying: '복사 중…',
    success: '복사됨 ✓',
    error:   '복사 실패',
  }[state]

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === 'copying'}
      className="btn btn-sm btn-secondary"
      style={{
        color:       state === 'success' ? 'var(--fg-positive)'
                   : state === 'error'   ? 'var(--fg-negative)'
                   : undefined,
        borderColor: state === 'success' ? 'var(--fg-positive)'
                   : state === 'error'   ? 'var(--fg-negative)'
                   : undefined,
        opacity:    state === 'copying' ? 0.7 : 1,
        transition: 'color 120ms ease, border-color 120ms ease',
      }}
      aria-label={label}
      aria-live="polite"
    >
      {label}
    </button>
  )
}
