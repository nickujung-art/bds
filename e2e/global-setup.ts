import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import * as fs from 'fs'
import * as path from 'path'

// Unique per-run email prevents collision between concurrent CI jobs
const TEST_USER_EMAIL = `e2e-test-${Date.now()}@danjiondo.test`
const TEST_USER_PASSWORD = `TestPw${Date.now()}!`

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[E2E Setup] Supabase credentials not set — skipping auth setup (auth-required tests will be skipped)')
    return
  }

  // 1. Admin client — service_role key, no session persistence
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 2. Create test user with email_confirm:true (no verification email needed)
  let createResult: Awaited<ReturnType<typeof supabase.auth.admin.createUser>>
  try {
    createResult = await supabase.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    })
  } catch {
    console.warn('[E2E Setup] Supabase connection failed — skipping auth setup (auth-required tests will be skipped)')
    return
  }
  const { data: { user }, error: createError } = createResult
  if (createError || !user) {
    console.warn(`[E2E Setup] Test user creation failed: ${createError?.message} — skipping auth setup`)
    return
  }

  // 3. Sign in to obtain a session
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })
  if (signInError || !sessionData.session) {
    // Cleanup on sign-in failure to avoid orphaned test users
    await supabase.auth.admin.deleteUser(user.id)
    throw new Error(`E2E test user sign-in failed: ${signInError?.message}`)
  }

  // 4. Inject session cookies into a Playwright browser context and save storageState
  //
  // @supabase/ssr 0.10.x uses the cookie name: sb-{ref}-auth-token
  // where {ref} is the first subdomain of NEXT_PUBLIC_SUPABASE_URL
  // (e.g. https://abcdefgh.supabase.co  →  ref = abcdefgh)
  //
  // If review.spec.ts auth fails, verify the actual cookie name via:
  //   npm run dev → http://localhost:3000 → login → DevTools → Application → Cookies
  const supabaseRef = new URL(supabaseUrl).hostname.split('.')[0]
  const cookieName = `sb-${supabaseRef}-auth-token`
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const baseHostname = new URL(baseURL).hostname

  const browser = await chromium.launch()
  const context = await browser.newContext()

  // The session value Supabase's SSR helper expects is a JSON tuple of
  // [access_token, refresh_token] serialized as a string.
  await context.addCookies([
    {
      name: cookieName,
      value: JSON.stringify([
        sessionData.session.access_token,
        sessionData.session.refresh_token,
      ]),
      domain: baseHostname,
      path: '/',
      httpOnly: true,
      secure: baseURL.startsWith('https'),
      sameSite: 'Lax',
    },
  ])

  const authDir = path.join(__dirname, '.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  await context.storageState({ path: path.join(authDir, 'user.json') })
  await browser.close()

  // 5. Pass userId to globalTeardown via env so the test user is always cleaned up
  process.env.E2E_TEST_USER_ID = user.id

  console.log(`[E2E Setup] Test user created: ${TEST_USER_EMAIL} (${user.id})`)
  console.log(`[E2E Setup] Cookie name used: ${cookieName}`)
  console.log(
    `[E2E Setup] If review.spec.ts auth fails, verify the actual cookie name in DevTools and update cookieName`,
  )
}
