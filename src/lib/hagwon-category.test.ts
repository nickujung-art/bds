import { describe, it, expect } from 'vitest'
import { classifyHagwon, walkColor } from './hagwon-category'

describe('classifyHagwon', () => {
  it('수학 키워드 → "수학"', () => {
    expect(classifyHagwon('엠투에스수학1지구학원')).toBe('수학')
  })
  it('영어 키워드 → "영어"', () => {
    expect(classifyHagwon('에이든영어학원')).toBe('영어')
  })
  it('미술 키워드 → "예체능"', () => {
    expect(classifyHagwon('미나한아트미술스튜디오')).toBe('예체능')
  })
  it('매칭 없음 → "기타"', () => {
    expect(classifyHagwon('율하IT컴퓨터학원')).toBe('기타')
  })
})

describe('walkColor', () => {
  it('670m (10분) → "green"', () => {
    expect(walkColor(670)).toBe('green')
  })
  it('671m (10분 1초) → "yellow"', () => {
    expect(walkColor(671)).toBe('yellow')
  })
  it('1005m (15분) → "yellow"', () => {
    expect(walkColor(1005)).toBe('yellow')
  })
  it('1006m (15분+) → "red"', () => {
    expect(walkColor(1006)).toBe('red')
  })
  it('null → "green"', () => {
    expect(walkColor(null)).toBe('green')
  })
})
