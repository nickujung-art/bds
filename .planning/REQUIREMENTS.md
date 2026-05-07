# Requirements — 단지온도

## v1 Requirements (V1.0 정식 출시)

### Security & Infrastructure
- [ ] **INFRA-01**: 프로덕션 Vercel 배포 + 환경 변수 전체 검증 및 `.env.local.example` 최신화
- [ ] **INFRA-02**: GitHub Actions CI 파이프라인 — PR마다 lint/build/test 자동 실행
- [ ] **INFRA-03**: Playwright E2E — 골든패스 5종 (랜딩·단지 상세·지도·검색·후기 작성) 자동화
- [ ] **SEC-01**: 광고 이벤트 엔드포인트 rate limiting + IP hash (`x-forwarded-for` sha256) 추가
- [ ] **SEC-02**: `createSupabaseAdminClient()` 통합 — inline service-role createClient 3곳 교체
- [ ] **SEC-03**: 지도 쿼리 `status='active'` 필터 추가 (철거 단지 핀 노출 차단)
- [ ] **SEC-04**: Sentry 초기화 (`@sentry/nextjs`) 또는 플레이스홀더 제거 + 환경 변수 정리

### Landing & Ranking
- [ ] **RANK-01**: 지역 인기 단지 풀 정의 SQL + 일배치 갱신
- [ ] **RANK-02**: 랭킹 4종 산식 (신고가·거래량·평당가·관심도) + 1시간 cron
- [ ] **RANK-03**: 랜딩 페이지 완성 — 오늘 신고가 카드 + 4종 랭킹 탭 (ISR 60s)

### Sharing & Viral
- [ ] **SHARE-01**: 단지별 동적 OG 이미지 생성 (`@vercel/og`)
- [ ] **SHARE-02**: 카카오톡·네이버 공유 버튼 + 단지 상세 공유 UX
- [x] **SHARE-03**: 카드뉴스 자동 생성 — Recharts SSR + `@vercel/og` 조합
- [x] **SHARE-04**: 어드민 카드뉴스 1-click 발행 UI

### Legal & Compliance
- [ ] **LEGAL-01**: 이용약관 페이지 + 가입 시 동의 흐름
- [ ] **LEGAL-02**: 개인정보처리방침 페이지 (최소 수집·제3자 제공·보관 기간)
- [ ] **LEGAL-03**: 광고 정책 페이지 + 표시광고법 준수 고지
- [ ] **LEGAL-04**: 회원 탈퇴 플로우 — 30일 grace period + hard delete cron
- [ ] **LEGAL-05**: 이메일 지원 채널 (`SUPPORT_EMAIL`) 설정 + 문의 안내 UI

### Admin & Operations
- [ ] **ADMIN-01**: 회원 관리 — 카페 닉네임 검증 + 가입 소스 추적 + 계정 정지
- [ ] **ADMIN-02**: 광고 검수 워크플로우 — 등록→검수→승인/반려 상태 머신
- [ ] **ADMIN-03**: 신고 큐 — 후기·데이터 오류 신고 운영자 처리 UI
- [ ] **ADMIN-04**: 시스템 상태 모니터링 메뉴 (ingest 현황·알림 큐·cron 상태)

### Accessibility
- [ ] **A11Y-01**: axe-core CI 통합 — PR마다 critical 0건 강제
- [ ] **A11Y-02**: 키보드 탐색 검증 — 지도·단지 상세·검색·로그인 전 흐름
- [ ] **A11Y-03**: 스크린리더 라벨 검증 (지도 마커·차트·폼)

---

## v2 Requirements (V1.5 — 커뮤니티)

- [ ] **COMM-01**: 후기 댓글 (단순 텍스트, RLS, 신고 가능)
- [ ] **COMM-02**: GPS L1 인증 배지 활성화 (V0.9 스키마 준비됨, 단지 ±100m 인증 연동)
- [ ] **COMM-03**: 단지 페이지 → 카페 검색 외부 링크
- [ ] **COMM-04**: 데이터 오류·후기·매칭 신고 통합 큐 + SLA ≤ 24h
- [ ] **COMM-05**: 주간 회전 카페 가입 코드 시스템
- [ ] **DATA-01**: K-apt 부대시설 데이터 추가 (단지 상세 시설 탭 확장)
- [ ] **DATA-02**: 신축 분양 정보 등록 + 분양권 거래 분리 UI
- [ ] **DATA-03**: 재건축 단계 운영자 수동 입력 + 진행 타임라인
- [ ] **DATA-04**: 가성비 분석 4분면 (평당가 × 학군 점수) 시각화
- [ ] **DATA-05**: 매물가 vs 실거래가 갭 라벨 (단지 상세)
- [ ] **NOTIF-01**: 주간 다이제스트 이메일 (관심 단지 요약)
- [ ] **NOTIF-02**: 알림 토픽 채널 구독 (신고가·분양 등 카테고리 선택)
- [ ] **OPS-01**: DB 백업 자동화 — pg_dump + GitHub private repo 주간 백업 + 복구 런북

---

## v3 Requirements (V2.0 — 차별화 자산)

- [ ] **DIFF-01**: 게이미피케이션 마크 (👑🔥💬) + 회원 등급 기반 UI
- [ ] **DIFF-02**: 카페 글 NLP 단지 매칭 (정확도 ≥ 85%) + 단지 페이지 연동
- [ ] **DIFF-03**: Claude API + RAG 단지 상담 봇 (환각률 ≤ 5%)
- [ ] **DIFF-04**: 카카오톡 채널 알리미 (웹 푸시 거부 대안)
- [ ] **DIFF-05**: 회원 등급 시스템 + 우선 알림 혜택
- [ ] **DIFF-06**: 즐겨찾기 단지 2~4개 비교 표
- [ ] **DATA-06**: SGIS 인구·세대 통계 분기 적재
- [ ] **DATA-07**: 재개발 행정 데이터 자동 적재 (출처 확보 시)
- [ ] **AD-01**: 광고 통계 고도화 (전환 추적·ROI·이상 트래픽 감지)
- [ ] **AD-02**: 광고주 카피 AI 어시스트 + 표시광고법 자동 감지
- [ ] **AUTH-01**: GPS L2+L3 인증 (다회+시간패턴 / 우편·관리비)
- [ ] **OPS-02**: 카카오 카페 매니저 OAuth 카드뉴스 자동 발행 (약관 법무 승인 후)

---

## Out of Scope

- NextAuth.js 전환 — Supabase Auth로 이미 완전 구현됨. 전환 시 이득 없이 재작성 비용만 발생
- 모바일 네이티브 앱 (iOS/Android) — PWA로 충분. 수요 검증 전 투자 불필요
- 매물 직접 등록 UI — 중개사 파트너십 없이 허위 매물 위험
- 카페 글 백포팅 (V1.0) — 카페 연동 API 없이 불가. V2에서 NLP 연동 후 추진

---

## Traceability

*Phase → Requirement 매핑은 ROADMAP.md에서 관리*

| Phase | Version | Requirements |
|-------|---------|--------------|
| Phase 1 | V1.0 | INFRA-01~04, SEC-01~04, RANK-01~03, SHARE-01~04, LEGAL-01~05, ADMIN-01~04, A11Y-01~03 |
| Phase 2 | V1.5 | COMM-01~05, DATA-01~05, NOTIF-01~02, OPS-01 |
| Phase 3 | V2.0 | DIFF-01~06, DATA-06~07, AD-01~02, AUTH-01, OPS-02 |
