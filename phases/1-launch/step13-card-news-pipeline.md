# Step 13 (1-launch): card-news-pipeline

## 목표
매일 06:00 KST에 신고가 TOP 5 카드뉴스 PNG + 카피를 자동 생성한다. 어드민에서 운영자가 1-click으로 다운로드·복사 후 카페에 수동 발행한다.

## 전제 (Prerequisites)
- step5 완료 (랭킹)
- step6 완료 (랜딩, OG 이미지 인프라)

## 적용 범위 (Scope)
- `src/app/api/card-news/generate/route.ts` — 일배치 PNG 생성 cron
- `src/app/api/card-news/[id]/image/route.ts` — `@vercel/og` JSX → PNG
- `src/app/(admin)/admin/card-news/page.tsx` — 어드민 카드뉴스 UI
- `src/components/card-news/CardTemplate.tsx` — OG 이미지 JSX 템플릿
- `supabase/migrations/0012_cafe_post_queue.sql` — cafe_post_queue 테이블

## 도메인 컨텍스트 / 가드레일
- ADR-045: 완전 자동 발행 V2 보류. V1은 1-click 수동 발행
- ADR-047: `@vercel/og` (JSX→PNG). 그래프 sparkline은 Recharts SSR → SVG → PNG 변환
- 이미지 규격: 1080×1920px 9:16
- UI_GUIDE 준수: Pretendard, 액센트 #ea580c, AI 슬롭 금지
- UTM: 카드뉴스 내 단지 URL = `?utm_source=cafe&utm_medium=card_news&utm_campaign=YYYYMMDD`
- `cafe_post_queue.status`: pending_review → approved → published

## 작업 목록
1. `CardTemplate.tsx`: `@vercel/og` JSX — 표지(날짜+제목) + 단지카드 5장 + 마지막(QR+출처)
2. sparkline: Recharts `<LineChart>` SSR → SVG string → PNG embed in OG
3. `generate/route.ts`: 오늘 신고가 TOP 5 쿼리 → `cafe_post_queue` INSERT (status=pending_review) + 이미지 생성
4. 어드민 페이지: 카드 미리보기 grid + "이미지 ZIP 다운로드" 버튼 + 카피 클립보드 복사 + 발행 URL 입력 폼
5. UTM 전환: 발행 URL 입력 시 `published_url` 저장 → PostHog UTM 클릭 추적
6. `vercel.json`에 `"0 21 * * *"` (UTC 21 = KST 06) cron 추가

## 수용 기준 (Acceptance Criteria)
- [ ] cron 실행 → `cafe_post_queue` 레코드 생성 + PNG URL 확인
- [ ] 어드민에서 ZIP 다운로드 → 1080×1920 PNG 5장
- [ ] 카피 클립보드 복사 동작 확인

## Definition of Done
카드뉴스 자동화 완성. 운영자 일 1분 카페 발행으로 트래픽 유입 채널 확보.
