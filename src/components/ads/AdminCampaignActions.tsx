'use client'

import { useTransition } from 'react'
import { approveAdCampaign, rejectAdCampaign, pauseAdCampaign } from '@/lib/auth/ad-actions'

interface Props {
  id: string
  status: string
}

export function AdminCampaignActions({ id, status }: Props) {
  const [pending, startTransition] = useTransition()

  function call(action: (id: string) => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action(id)
      if (result.error) alert(result.error)
    })
  }

  if (status === 'pending') {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-sm btn-primary"
          style={{ fontSize: 11 }}
          disabled={pending}
          onClick={() => call(approveAdCampaign)}
        >
          승인
        </button>
        <button
          className="btn btn-sm btn-ghost"
          style={{ fontSize: 11, color: '#dc2626' }}
          disabled={pending}
          onClick={() => call(rejectAdCampaign)}
        >
          거절
        </button>
      </div>
    )
  }
  if (status === 'approved') {
    return (
      <button
        className="btn btn-sm btn-ghost"
        style={{ fontSize: 11 }}
        disabled={pending}
        onClick={() => call(pauseAdCampaign)}
      >
        일시중지
      </button>
    )
  }
  if (status === 'paused') {
    return (
      <button
        className="btn btn-sm btn-ghost"
        style={{ fontSize: 11, color: '#16a34a' }}
        disabled={pending}
        onClick={() => call(approveAdCampaign)}
      >
        재개
      </button>
    )
  }
  return <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>—</span>
}
