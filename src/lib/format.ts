// src/lib/format.ts
// 가격·평수·날짜 포맷 유틸 — page.tsx에서 추출, 프로젝트 전반 공유

export function formatPrice(price: number): string {
  const uk = Math.floor(price / 10000)
  const man = price % 10000
  if (uk > 0 && man > 0) return `${uk}억 ${man.toLocaleString()}`
  if (uk > 0) return `${uk}억`
  return `${price.toLocaleString()}만`
}

export function formatPyeong(area_m2: number): string {
  return `${Math.round(area_m2 / 3.3058)}평`
}

export function formatDealDate(dealDate: string): string {
  const today = new Date().toISOString().split('T')[0]!
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]!
  if (dealDate === today) return '오늘'
  if (dealDate === yesterday) return '어제'
  const d = new Date(dealDate)
  return `${d.getMonth() + 1}.${d.getDate()}`
}
