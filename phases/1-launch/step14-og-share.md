# Step 14 (1-launch): og-share

## 목표
단지 페이지 공유 시 카카오톡·네이버에 단지명·거래가·갱신폭이 보이는 OG 이미지를 제공한다.

## 전제 (Prerequisites)
- 0-mvp step14 완료 (SEO meta 기반)
- step13 완료 (`@vercel/og` 패턴 확립)

## 적용 범위 (Scope)
- `src/app/(public)/danji/[id]/opengraph-image.tsx` — 단지 OG 이미지 (step14에서 stub → 실제 데이터)
- `src/components/shared/ShareButton.tsx` — 카카오톡 / URL 복사 버튼

## 도메인 컨텍스트 / 가드레일
- OG 이미지: 단지명 + 최근 거래가 + 갱신폭(액센트) + 단지온도 로고. AI 슬롭 금지
- 카카오톡 공유: Kakao SDK `Kakao.Share.sendDefault` (썸네일+설명+링크)
- UTM: `?utm_source=kakao&utm_medium=share`

## 작업 목록
1. `opengraph-image.tsx` 실제 Supabase 쿼리 연결 (단지명·최근 거래가·갱신폭)
2. `ShareButton.tsx`: 카카오 공유 + URL 클립보드 복사 (sonner 토스트)
3. Kakao JS SDK 초기화 (`NEXT_PUBLIC_KAKAO_JS_KEY`)

## 수용 기준 (Acceptance Criteria)
- [ ] 단지 상세 URL 카카오톡 공유 → 썸네일 + 단지명 + 거래가 표시
- [ ] OG 이미지 응답 ≤ 1s

## Definition of Done
카카오톡 공유 채널 확보. 바이럴 유입 가능.
