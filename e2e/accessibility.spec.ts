/**
 * Phase 3 A11Y-01, A11Y-02, A11Y-03: 접근성 E2E
 * RED state: pages /consent, /legal/terms, /legal/privacy not yet implemented
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PUBLIC_PAGES = ['/', '/legal/terms', '/legal/privacy', '/legal/ad-policy', '/login']

for (const path of PUBLIC_PAGES) {
  test(`A11Y-01 axe-core: ${path} — critical 위반 0건`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(
      critical,
      `Critical violations on ${path}: ${JSON.stringify(critical.map(v => v.id))}`,
    ).toHaveLength(0)
  })
}

test('A11Y-02 키보드 Tab — 랜딩 페이지 첫 포커스 가시성', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
})

test('A11Y-03 스크린리더 — 랜딩 nav aria-label 또는 시맨틱 nav 존재', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  // Footer 또는 main nav에 aria-label 또는 <nav> 시맨틱 존재
  const nav = page.locator('nav, [role="navigation"]').first()
  await expect(nav).toBeVisible()
})
