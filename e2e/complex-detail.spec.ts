import { test, expect, type Page } from '@playwright/test'

/**
 * 단지 상세 페이지 골든패스
 *
 * 단지 ID는 DB의 UUID — 고정 ID를 직접 사용하지 않는다.
 * 랜딩 페이지의 첫 번째 단지 링크를 따라가거나, 없으면 /map에서 찾는다.
 */
test.describe('단지 상세 페이지', () => {
  async function navigateToFirstComplex(page: Page): Promise<boolean> {
    // 1차: 랜딩 페이지에서 /complexes/ 링크 찾기
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const firstComplexLink = page.locator('a[href^="/complexes/"]').first()
    if (await firstComplexLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      // SPA 네비게이션: waitForLoadState는 URL 변경을 보장하지 않으므로 waitForURL 사용
      await Promise.all([
        page.waitForURL(/\/complexes\//, { timeout: 10000 }),
        firstComplexLink.click(),
      ])
      return true
    }
    // 2차: /map에서 /complexes/ 링크 찾기
    await page.goto('/map')
    await page.waitForLoadState('domcontentloaded')
    const mapComplexLink = page.locator('a[href^="/complexes/"]').first()
    if (await mapComplexLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await Promise.all([
        page.waitForURL(/\/complexes\//, { timeout: 10000 }),
        mapComplexLink.click(),
      ])
      return true
    }
    return false
  }

  test('단지 상세 페이지가 로드되고 단지명 h1이 표시된다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      // DB에 active 단지가 없으면 스킵 (CI 초기 상태)
      test.skip()
      return
    }
    expect(page.url()).toContain('/complexes/')
    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()
    await expect(heading).not.toBeEmpty()
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })

  test('단지 상세 페이지에서 main 콘텐츠 영역이 렌더된다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await expect(page.locator('main')).toBeVisible()
    // 500 에러 없음 확인
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible()
  })
})
