export function getSlaState(createdAt: string): 'ok' | 'warning' | 'overdue' {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  if (hours > 24) return 'overdue'
  if (hours > 16) return 'warning'
  return 'ok'
}
