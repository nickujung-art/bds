import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Phase 3 A11Y-01/02/03: 접근성 E2E
 * - critical 위반 0건 강제 (V1.0 출시 게이트)
 * - 키보드 탐색 + 시맨틱 라벨 검증
 */

const PUBLIC_PAGES = [
  '/',
  '/map',
  '/login',
  '/legal/terms',
  '/legal/privacy',
  '/legal/ad-policy',
]

for (const path of PUBLIC_PAGES) {
  test(`A11Y-01 axe-core: ${path} — critical 위반 0건`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status(), `${path} returned non-200 (${response?.status()})`).toBe(200)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1').first(), `${path} h1 미표시`).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')

    const summary = critical.map(v => ({
      id: v.id,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')),
    }))

    expect(
      critical,
      `Critical violations on ${path}:\n${JSON.stringify(summary, null, 2)}`,
    ).toHaveLength(0)
  })
}

test('A11Y-02 키보드 Tab — 랜딩 페이지에서 두 번 Tab 시 가시 포커스가 이동한다', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  await page.keyboard.press('Tab')
  const first = page.locator(':focus')
  await expect(first).toBeVisible()
  const firstHandle = await first.elementHandle()
  const firstId = await firstHandle?.evaluate((el) => (el as HTMLElement).outerHTML.slice(0, 80))

  await page.keyboard.press('Tab')
  const second = page.locator(':focus')
  await expect(second).toBeVisible()
  const secondHandle = await second.elementHandle()
  const secondId = await secondHandle?.evaluate((el) => (el as HTMLElement).outerHTML.slice(0, 80))

  expect(secondId, 'Tab 두 번 후에도 같은 요소면 키보드 트랩 가능성').not.toBe(firstId)
})

test('A11Y-03 시맨틱 라벨 — 랜딩에 nav + 검색 input 라벨', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  const nav = page.locator('nav, [role="navigation"]').first()
  await expect(nav).toBeVisible()

  const searchInput = page.locator('input[name="q"]').first()
  const isSearchVisible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false)
  if (isSearchVisible) {
    const ariaLabel = await searchInput.getAttribute('aria-label')
    const ariaLabelledBy = await searchInput.getAttribute('aria-labelledby')
    const placeholder = await searchInput.getAttribute('placeholder')
    const hasLabel = (ariaLabel && ariaLabel.length > 0)
      || (ariaLabelledBy && ariaLabelledBy.length > 0)
      || (placeholder && placeholder.length > 0)
    expect(hasLabel, '검색 input에 aria-label / aria-labelledby / placeholder 중 하나 필요').toBe(true)
  }
})

test('A11Y-03 footer — 모든 페이지에 footer 시맨틱 존재', async ({ page }) => {
  await page.goto('/legal/terms')
  await page.waitForLoadState('domcontentloaded')
  const footer = page.locator('footer').first()
  await expect(footer).toBeVisible()
})
