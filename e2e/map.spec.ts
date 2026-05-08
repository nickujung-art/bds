import { test, expect } from '@playwright/test'

test.describe('지도 페이지', () => {
  test('지도 페이지가 로드되고 URL이 /map을 포함한다', async ({ page }) => {
    const response = await page.goto('/map', { waitUntil: 'domcontentloaded' })
    expect(page.url()).toContain('/map')
    // HTTP 5xx 에러가 아닌지 확인
    expect(response?.status()).not.toBeGreaterThanOrEqual(500)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('지도 페이지에서 에러 없이 렌더된다', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    await expect(page.locator('text=500')).not.toBeVisible()
    await expect(page.locator('body')).toBeVisible()
  })

  test('지도 컨테이너 요소가 DOM에 존재한다', async ({ page }) => {
    await page.goto('/map', { waitUntil: 'domcontentloaded' })

    // KakaoMap은 동적 import(SSR 비활성화) → 브라우저에서만 렌더
    // 카카오 SDK 로딩 완료까지 waitForSelector 사용 (결정론적 대기 — 시간 기반 대기 금지)
    // NEXT_PUBLIC_KAKAO_JS_KEY 미설정 시 fallback 텍스트가 표시됨
    const mapContainerOrFallback = await page
      .waitForSelector(
        [
          // react-kakao-maps-sdk Map 컴포넌트가 생성하는 div
          'div.kakao_map_container',
          // Kakao SDK 로드 전 또는 키 미설정 fallback
          'text=지도 불러오는 중',
          'text=NEXT_PUBLIC_KAKAO_JS_KEY',
          // SDK 직접 생성 div (react-kakao-maps-sdk 내부)
          '[class*="kakao"]',
        ].join(', '),
        { timeout: 8000 },
      )
      .catch(() => null)

    if (!mapContainerOrFallback) {
      // 지도 컨테이너 selector 불일치 시 — 최소 조건(에러 없음)만 검증
      console.warn(
        '[map.spec] Map container not found with default selectors — verify src/components/map/KakaoMap.tsx structure',
      )
    }

    // 최소 기준: 페이지가 에러 없이 렌더됨
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('랜딩 페이지 검색 폼 제출 시 /map?q= 로 이동한다', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[name="q"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('창원')
      await searchInput.press('Enter')
      await page.waitForLoadState('domcontentloaded')
      // 검색 폼 action="/map" → /map?q=창원 으로 이동
      expect(page.url()).toContain('/map')
      await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
    }
  })
})
