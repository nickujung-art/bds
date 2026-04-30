import { copyFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

try {
  mkdirSync(join(root, 'public/fonts'), { recursive: true })
  copyFileSync(
    join(root, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'),
    join(root, 'public/fonts/PretendardVariable.woff2')
  )
  console.warn('✓ Pretendard font copied to public/fonts/')
} catch {
  console.warn('Font copy skipped (pretendard not installed yet)')
}
