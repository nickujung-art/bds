# Phase 6 Deferred Items

## 06-01 발견 항목

### 1. match_complex_embeddings RPC 타입 미등록

- **발견 위치:** `src/app/api/chat/complex/route.ts` (Wave 3 파일)
- **문제:** Wave 0 마이그레이션에서 `match_complex_embeddings` RPC 추가됨, 그러나 `src/types/database.ts`의 Functions 타입에 미등록
- **오류:** `TS2345: Argument of type '"match_complex_embeddings"' is not assignable`
- **해결 담당:** 06-03 플랜 (Wave 3 RAG 봇 구현 시)

### 2. ad-copy-review route.test.ts TypeScript 오류

- **발견 위치:** `src/app/api/admin/ad-copy-review/route.test.ts` (Wave 3 파일)
- **문제:** `vi.mocked(Anthropic)` 타입 캐스팅 오류
- **해결 담당:** 06-02 플랜 (Wave 2 AD-02 구현 시)
