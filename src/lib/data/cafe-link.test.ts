import { describe, it, expect } from 'vitest'
import { buildCafeSearchUrl } from '@/lib/data/cafe-link'

describe('buildCafeSearchUrl (COMM-03)', () => {
  it('단지명을 encodeURIComponent로 인코딩해 URL을 생성한다', () => {
    const url = buildCafeSearchUrl('창원 더샵 마리나파크')
    expect(url).toContain('cafe.naver.com/ArticleSearchList.nhn')
    expect(url).toContain(encodeURIComponent('창원 더샵 마리나파크'))
  })

  it('특수문자가 포함된 단지명도 안전하게 인코딩한다', () => {
    const url = buildCafeSearchUrl('A&B 아파트')
    expect(url).not.toContain(' ')  // 공백은 인코딩됨
    expect(url).toContain('cafe.naver.com')
  })
})
