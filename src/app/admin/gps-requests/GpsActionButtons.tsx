'use client'

import { useTransition } from 'react'
import { approveGpsRequest, rejectGpsRequest } from '@/lib/auth/gps-approve-actions'

interface GpsActionButtonsProps {
  requestId: string
  userId: string
}

export function GpsActionButtons({ requestId, userId }: GpsActionButtonsProps) {
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await approveGpsRequest(requestId, userId)
      if (result.error) {
        alert(`승인 실패: ${result.error}`)
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectGpsRequest(requestId, userId)
      if (result.error) {
        alert(`거절 실패: ${result.error}`)
      }
    })
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      <button
        className="btn btn-sm btn-orange"
        onClick={handleApprove}
        disabled={isPending}
        type="button"
      >
        {isPending ? '처리 중...' : '승인'}
      </button>
      <button
        className="btn btn-sm btn-secondary"
        onClick={handleReject}
        disabled={isPending}
        type="button"
      >
        {isPending ? '처리 중...' : '거절'}
      </button>
    </div>
  )
}
