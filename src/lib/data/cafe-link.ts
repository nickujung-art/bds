export function buildCafeSearchUrl(complexName: string): string {
  return `https://cafe.naver.com/ArticleSearchList.nhn?search.query=${encodeURIComponent(complexName)}`
}
