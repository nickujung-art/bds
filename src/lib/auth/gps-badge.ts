'use server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface GpsVisitResult {
  success: boolean
  newBadgeLevel: number
  error?: string
}

/**
 * GPS L1 방문 기록 + L2 거주 자동승인 체크
 * 호출 조건: complex_reviews 작성 시 GPS 인증 버튼 클릭 (기존 L1 인증 흐름)
 * 클라이언트에서 수신한 위도/경도를 ±100m 범위 확인 (PostGIS 대체)
 */
export async function recordGpsVisitAndCheckL2(
  complexId: string,
  lat: number,
  lng: number,
): Promise<GpsVisitResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, newBadgeLevel: 0, error: 'Unauthenticated' }

  const adminClient = createSupabaseAdminClient()

  // 1. 단지 위치 가져오기 (PostGIS ST_DWithin ±100m 대체: 위도/경도 차이 검사)
  const { data: complex } = await adminClient
    .from('complexes')
    .select('location')
    .eq('id', complexId)
    .single()

  if (!complex) return { success: false, newBadgeLevel: 0, error: 'Complex not found' }

  // PostGIS 함수 RPC가 없는 환경에서는 위도/경도 오차 범위 계산으로 대체
  // 위도 0.001° ≈ 111m, 경도 0.001° ≈ 약 88m (한국 위도 기준)
  const complexLat = typeof complex.location === 'object' && complex.location !== null
    ? (complex.location as { lat?: number }).lat
    : null
  const complexLng = typeof complex.location === 'object' && complex.location !== null
    ? (complex.location as { lng?: number }).lng
    : null

  if (complexLat !== null && complexLng !== null && complexLat !== undefined && complexLng !== undefined) {
    const latDiff = Math.abs(lat - complexLat)
    const lngDiff = Math.abs(lng - complexLng)
    // ±100m 이내: 위도 0.0009°, 경도 0.0013° 이내
    if (latDiff > 0.0009 || lngDiff > 0.0013) {
      return { success: false, newBadgeLevel: 0, error: '현재 위치가 단지에서 100m 이상 떨어져 있습니다.' }
    }
  }

  // 2. gps_visits INSERT
  const { error: insertErr } = await adminClient
    .from('gps_visits')
    .insert({ user_id: user.id, complex_id: complexId, lat, lng })

  if (insertErr) {
    console.error('[gps-badge] insert error:', insertErr)
    return { success: false, newBadgeLevel: 0, error: 'DB error' }
  }

  // 3. 최근 30일 해당 단지 방문 횟수 집계
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await adminClient
    .from('gps_visits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('complex_id', complexId)
    .gte('verified_at', thirtyDaysAgo)

  // 4. 현재 배지 레벨 조회
  const { data: profileData } = await adminClient
    .from('profiles')
    .select('gps_badge_level')
    .eq('id', user.id)
    .single()

  const currentLevel = profileData?.gps_badge_level ?? 0

  // 5. L1 badge: 최초 방문 시 0 -> 1
  if (currentLevel === 0) {
    await adminClient
      .from('profiles')
      .update({ gps_badge_level: 1 })
      .eq('id', user.id)
  }

  // 6. L2 upgrade: 30일 내 3회 이상 방문 -> level 2
  if (currentLevel < 2 && (count ?? 0) >= 3) {
    await adminClient
      .from('profiles')
      .update({ gps_badge_level: 2 })
      .eq('id', user.id)
    return { success: true, newBadgeLevel: 2 }
  }

  return { success: true, newBadgeLevel: currentLevel === 0 ? 1 : currentLevel }
}

/**
 * L3 서류 인증 신청 생성
 * 클라이언트에서 Storage 업로드 후 Storage 경로를 받아 DB에 기록
 */
export async function submitL3VerificationRequest(
  complexId: string,
  docType: '등본' | '관리비',
  storagePath: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthenticated' }

  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('gps_verification_requests')
    .insert({
      user_id:      user.id,
      complex_id:   complexId,
      doc_type:     docType,
      storage_path: storagePath,
      status:       'pending',
    })

  if (error) {
    console.error('[gps-badge] L3 request error:', error)
    return { success: false, error: 'DB error' }
  }

  return { success: true }
}

/**
 * L3 서류 Storage 업로드 Server Action (CLAUDE.md: server-only Supabase usage)
 * GpsVerifyL3Upload.tsx 클라이언트 컴포넌트에서 호출 — Storage는 반드시 server-side에서만
 */
export async function uploadL3Document(
  complexId: string,
  docType: '등본' | '관리비',
  formData: FormData,
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthenticated' }

  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File)) return { success: false, error: 'No file' }

  // 서버측 MIME 타입 검증 (클라이언트 검증은 우회 가능)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: '허용되지 않는 파일 형식입니다. JPG, PNG, PDF만 가능합니다.' }
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: '파일 크기는 10MB 이하여야 합니다.' }
  }

  // 안전한 확장자 추출 — 점이 없는 파일명에서 전체 이름이 경로에 삽입되는 것을 방지
  const rawExt = (file.name.split('.').pop() ?? '').toLowerCase()
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'bin'
  const filePath = `${user.id}/${complexId}/${docType}-${Date.now()}.${ext}`

  const adminClient = createSupabaseAdminClient()
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await adminClient.storage
    .from('gps-docs')
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    console.error('[uploadL3Document]', uploadErr)
    return { success: false, error: uploadErr.message }
  }
  return { success: true, storagePath: filePath }
}
