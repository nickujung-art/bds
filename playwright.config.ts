import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // NEXT_PUBLIC_SITE_URL is set on Vercel; falls back to localhost for local runs
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Golden-path specs that do NOT require auth (landing, map, complex-detail, search)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Golden-path spec that DOES require auth (review submission)
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
