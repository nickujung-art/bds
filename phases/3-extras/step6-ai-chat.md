# Step 6 (3-extras): ai-chat

## 목표
Claude API + RAG 기반 단지 상담 봇을 구현한다. 사용자가 특정 단지에 대해 자유 질문하면 실거래·시설·후기 데이터를 바탕으로 답변한다.

## 전제 (Prerequisites)
- 0-mvp step12 완료 (단지 상세 — 데이터 구조 확정)
- Anthropic API 키 (`ANTHROPIC_API_KEY`) 설정

## 적용 범위 (Scope)
- `src/app/api/ai/chat/route.ts` — Claude API 호출 Server Route
- `src/lib/ai/rag.ts` — 단지 컨텍스트 조합 (RAG)
- `src/lib/ai/prompt-guard.ts` — Prompt injection 방어
- `src/components/danji/AiChatWidget.tsx`

## RAG 컨텍스트 구성

```
시스템 프롬프트 (고정):
  "당신은 단지온도의 부동산 데이터 안내 도우미입니다.
   아래 제공된 데이터만 바탕으로 답변하세요.
   데이터에 없는 내용은 '해당 정보가 없습니다'라고 답하세요.
   투자 권유, 법률·세무 자문은 제공하지 않습니다."

사용자 컨텍스트 (단지 ID 기반 조합):
  - 단지 기본 정보 (이름·세대수·연식·위치)
  - 최근 12개월 거래 요약 (평형별 중앙값·최고가·최저가)
  - 관리비 최근 6개월 평균
  - 학군 배정 학교 목록
  - 후기 최신 5건 (요약)
  - AI 추정값 여부

사용자 입력: {user_question}
```

## 도메인 컨텍스트 / 가드레일
- **비용 가드**: 일 토큰 한도 `CLAUDE_DAILY_TOKEN_LIMIT` 환경변수. 초과 시 503 + "오늘 상담 한도가 초과됐습니다" 안내. 토큰 사용량은 `ai_usage_logs` 테이블에 기록
- **Prompt injection 방어** (`prompt-guard.ts`):
  - 사용자 입력에서 `<`, `>`, `{`, `}`, `system:`, `ignore previous` 등 패턴 감지 → 400
  - 사용자 입력 최대 500자
  - 시스템 프롬프트와 사용자 입력을 별도 메시지로 분리 (Messages API 구조 유지)
- **환각 라벨**: 모든 봇 답변 하단에 "AI가 데이터를 기반으로 요약한 내용입니다. 실제 거래 판단 시 공인중개사 확인을 권장합니다." 고정 표시
- **캐싱**: 동일 단지 + 동일 질문 해시 → 1h 응답 캐시 (Supabase 또는 Redis)
- **스트리밍**: `stream: true` 사용. Vercel Edge 런타임으로 TTFB 최소화
- 모델: `claude-haiku-4-5-20251001` (비용 효율. 복잡 분석 시 Sonnet으로 fallback 옵션)
- **Rate limit**: 회원 1인당 10회/일, 비회원 3회/일

### 토큰 한도 분산 락(Distributed Lock)
- `ai_usage_logs` 기반 일별 토큰 합산은 동시 요청 시 race condition 발생 가능 (두 요청이 동시에 한도 미만으로 읽고 둘 다 통과)
- 해결: Postgres 행 수준 락 사용 → `SELECT ... FOR UPDATE` on `ai_daily_quota(user_id, date)` 테이블. 또는 Supabase RPC 함수로 원자적 체크-앤-증가
- `ai_daily_quota` 테이블: `(user_id, date) UNIQUE`, `tokens_used integer DEFAULT 0`
- `increment_quota(user_id, date, delta, limit)` RPC → 한도 초과 시 raise exception → 409 반환

### 빈 RAG 컨텍스트 처리
- `buildComplexContext(complexId)`: DB 조회 결과가 거래 0건 + 시설 0건 (완전히 비어있는 단지)인 경우:
  - Claude API 호출하지 않음
  - 즉시 응답: "해당 단지의 데이터가 아직 충분하지 않습니다. 데이터 누적 후 다시 시도해 주세요."
  - `ai_usage_logs` 기록 안 함 (토큰 미소모)

### 캐시 키 명세
- 캐시 키: `sha256(complex_id + ':' + normalized_question)`
- `normalized_question`: 소문자 + 공백 정규화 (`\s+` → ` `) + 앞뒤 trim
- 캐시 히트 시: 스트리밍 없이 전체 응답 즉시 반환 (cached=true 헤더 포함)

### 스트리밍 연결 끊김(Disconnect) 처리
- `AiChatWidget.tsx`: 스트리밍 중 컴포넌트 언마운트 시 `ReadableStream.cancel()` 호출
- 서버 route: `request.signal` aborted 감지 → Claude API streaming 즉시 중단 + `ai_usage_logs`에 실제 소비 토큰만 기록 (부분 소모)
- UI: 연결 끊김 감지 시 "응답 중 오류가 발생했습니다. 다시 시도해 주세요." + 재시도 버튼

### Claude API 429 (Rate Limit) 처리
- Anthropic API 429 → `Retry-After` 헤더 파싱 → 해당 시간 후 1회 재시도
- 재시도도 429 → 503 반환 + Sentry warn (일시적 트래픽 폭증 감지)

## 작업 목록
1. `supabase/migrations/0025_ai_usage.sql`: `ai_usage_logs`, `ai_daily_quota` 테이블 + `increment_quota` RPC + 일별 집계 뷰
2. `rag.ts`: `buildComplexContext(complexId)` — DB 조회 → 컨텍스트 문자열 조합. 빈 컨텍스트 조기 반환
3. `prompt-guard.ts`: `sanitizeUserInput(text): string` + injection 패턴 탐지
4. `/api/ai/chat` route: 인증 → `increment_quota` RPC(분산 락) → rate limit → guard → RAG → 빈 컨텍스트 조기 반환 → 캐시 체크 → Claude API (streaming) → disconnect 처리
5. `AiChatWidget.tsx`: 대화 UI + 스트리밍 텍스트 렌더 + 환각 라벨 + 로딩 인디케이터 + 언마운트 시 stream cancel
6. 일 토큰 한도 초과 시 503 처리 + Sentry 알림
7. Vitest: prompt injection 탐지 + rate limit + 토큰 집계 + 분산 락 레이스 시뮬레이션 + 빈 RAG 조기 반환

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (injection 탐지 + rate limit 단위 테스트)
- [ ] 단지 질문 → 해당 단지 데이터 기반 답변 (환각 최소화 확인)
- [ ] 환각 라벨 항상 표시 확인
- [ ] 일 한도 초과 → 503 + 안내 메시지
- [ ] injection 패턴 입력 → 400
- [ ] 응답 캐시: 동일 질문 2회 → DB 호출 1회 (로그 확인)
- [ ] 빈 데이터 단지 질문 → Claude API 호출 없이 즉시 안내 메시지 반환 (Vitest)
- [ ] 동시 10 요청 → 토큰 합산 정확히 한도 초과 시 차단 (분산 락 레이스 테스트)

## Definition of Done
AI 상담 봇 완성. Claude API 비용 가드 + Prompt injection 방어 완비. 환각 라벨 필수 표시.
