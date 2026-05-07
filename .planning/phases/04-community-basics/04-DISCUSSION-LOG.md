# Phase 4: 커뮤니티 기초 — Discussion Log

**Date:** 2026-05-07
**Areas discussed:** 댓글 구조 (COMM-01), GPS 인증 흐름 (COMM-02), 신축·분양권 데이터 모델 (DATA-02)
**Areas deferred to Claude's discretion:** COMM-03, COMM-04, COMM-05, DATA-01, NOTIF-01, NOTIF-02

---

## Area 1: 댓글 구조 (COMM-01)

| Question | Options | Selection |
|----------|---------|-----------|
| 댓글 깊이 | 1-depth flat / 2-depth (parent_id) / Threaded | **1-depth flat** |
| 댓글 노출 방식 | 인라인 표시 / "댓글 N개" 클릭 후 펼침 | **후기 카드 하단 인라인 표시** |
| 댓글 작성 권한 | 로그인 회원만 / 후기 작성자만 | **로그인 회원만** |
| 댓글 신고 처리 | reports 테이블 통합 / comment_reports 별도 | **reports 테이블 통합** |

**Key decision:** 단순 1-depth flat으로 스키마를 최소화하고, Phase 3에서 만든 어드민 신고 큐를 재사용.

---

## Area 2: GPS 인증 흐름 (COMM-02)

| Question | Options | Selection |
|----------|---------|-----------|
| GPS 캡처 타이밍 | 후기 작성 중 포함 / 작성 후 별도 "인증받기" | **후기 작성 중 세션에 포함** |
| 인증 실패/거부 처리 | 인증 없이 제출 허용 / 경고 후 허용 | **인증 없이 후기 제출 허용** |
| 검증 방식 | 서버 검증 (PostGIS) / 클라이언트 신뢰 | **클라이언트 → Server Action → PostGIS 서버 검증** |

**Key decision:** GPS 인증은 선택사항. 서버에서 PostGIS ST_DWithin으로 검증해 스푸핑 저항성 확보.

---

## Area 3: 신축·분양권 데이터 모델 (DATA-02)

| Question | Options | Selection |
|----------|---------|-----------|
| 분양권 거래 저장 위치 | 신축 전용 별도 테이블 / transactions 확장 | **신축 전용 별도 테이블** |
| 분양 정보 입력 방식 | 운영자 수동 입력 / MOLIT API 자동 연동 | **MOLIT API 자동 연동** |
| UI 위치 | 단지 상세 내 탭 / 랜딩 별도 분양 섹션 | **랜딩 페이지 별도 '분양' 섹션** |
| 분양 섹션 핵심 콘텐츠 | 카드 리스트 / 헤드라인+featured | **분양 단지 카드 리스트** |
| 업데이트 주기 | 일배치 cron 통합 / 별도 주간 cron | **일배치 cron 통합** |

**Key decision:** transactions 대원칙 유지를 위해 별도 테이블. 랜딩 nav의 기존 '분양' 링크(href="#") 활성화.

---

## Claude's Discretion Areas

아래 영역은 사용자가 "I'm ready for context"를 선택해 Claude 재량으로 위임:

- **COMM-03 (카페 외부 링크):** 네이버 카페 검색 URL 패턴
- **COMM-04 (신고 SLA 24h):** 어드민 대시보드 24h 경과 표시
- **COMM-05 (주간 카페 가입 코드):** GitHub Actions 주간 cron + 어드민 확인
- **DATA-01 (K-apt 부대시설):** 기존 kapt.ts 어댑터 활용
- **NOTIF-01 (주간 다이제스트):** Resend + 기존 알림 워커 패턴
- **NOTIF-02 (알림 토픽 구독):** 프로필 설정 + 기존 push_subscriptions 확장
