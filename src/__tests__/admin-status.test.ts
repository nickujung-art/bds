/**
 * Phase 3 ADMIN-04: 시스템 모니터링 — COUNT 쿼리 검증
 * RED state: page not yet implemented; tests verify query schema once columns/tables exist
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { admin } from './helpers/db'

beforeAll(() => {
  // 마이그레이션이 적용되어야 통과 (Task 4 supabase db push 의존)
})

describe('admin/status COUNT queries', () => {
  it('profiles 카운트 쿼리 정상', async () => {
    const { error, count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    expect(error).toBeNull()
    expect(typeof count).toBe('number')
  })
  it('terms_agreed_at IS NULL 쿼리 정상 (신규 컬럼)', async () => {
    const { error } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('terms_agreed_at', null)
    expect(error).toBeNull()
  })
  it('reports pending 카운트 정상 (신규 테이블)', async () => {
    const { error, count } = await admin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    expect(error).toBeNull()
    expect(typeof count).toBe('number')
  })
  it('ingest_runs 최근 10건 정상', async () => {
    const { error, data } = await admin
      .from('ingest_runs')
      .select('source_id, status, started_at')
      .order('started_at', { ascending: false })
      .limit(10)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
