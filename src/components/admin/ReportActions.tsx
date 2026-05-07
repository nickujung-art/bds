'use client'

import { useTransition } from 'react'
import { resolveReport } from '@/lib/auth/admin-actions'

interface Props {
  reportId: string
  status: 'pending' | 'accepted' | 'rejected'
}

export function ReportActions({ reportId, status }: Props) {
  const [pending, startTransition] = useTransition()

  function call(action: 'accepted' | 'rejected') {
    startTransition(async () => {
      const result = await resolveReport(reportId, action)
      if (result.error) alert(result.error)
    })
  }

  if (status !== 'pending') {
    return (
      <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>—</span>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        style={{ fontSize: 11 }}
        disabled={pending}
        onClick={() => call('accepted')}
        aria-label="신고 수용 (처리 완료)"
      >
        처리 완료
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={{ fontSize: 11, color: '#dc2626' }}
        disabled={pending}
        onClick={() => call('rejected')}
        aria-label="신고 기각"
      >
        기각
      </button>
    </div>
  )
}
