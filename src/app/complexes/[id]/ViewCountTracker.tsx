'use client'

import { useEffect } from 'react'
import { incrementViewCount } from './actions'

interface Props {
  complexId: string
}

/**
 * 단지 상세 페이지 방문 시 view_count를 1회 증가시키는 클라이언트 컴포넌트.
 * sessionStorage로 세션 내 중복 방지.
 */
export function ViewCountTracker({ complexId }: Props) {
  useEffect(() => {
    const key = `vc_${complexId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    incrementViewCount(complexId).catch(() => {
      // 조회수 실패는 무시 — 비즈니스 크리티컬 아님
    })
  }, [complexId])

  return null
}
