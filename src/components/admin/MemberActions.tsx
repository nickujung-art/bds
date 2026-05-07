'use client'

import { useTransition } from 'react'
import { suspendMember, reactivateMember } from '@/lib/auth/admin-actions'

interface Props {
  memberId: string
  isSuspended: boolean
}

export function MemberActions({ memberId, isSuspended }: Props) {
  const [pending, startTransition] = useTransition()

  function call(action: (id: string) => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action(memberId)
      if (result.error) alert(result.error)
    })
  }

  if (isSuspended) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={{ fontSize: 11, color: '#16a34a' }}
        disabled={pending}
        onClick={() => call(reactivateMember)}
        aria-label="회원 정지 해제"
      >
        정지 해제
      </button>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      style={{ fontSize: 11, color: '#dc2626' }}
      disabled={pending}
      onClick={() => call(suspendMember)}
      aria-label="회원 정지"
    >
      정지
    </button>
  )
}
