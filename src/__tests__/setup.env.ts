/**
 * Test environment setup — loads .env.test.local before test modules are evaluated.
 * Required in vitest.config.ts as setupFiles entry.
 */
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.test.local') })
