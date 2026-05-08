# Phase 6: AI·차별화 기술 — Discussion Log

**Date:** 2026-05-08
**Mode:** Default (interactive)
**Areas discussed:** 광고 통계 고도화, SGIS + AD-02 + 갭 라벨

---

## Area 1: 광고 통계 고도화 (AD-01)

### Q1: 전환 이벤트 정의
- Options: 클릭 후 연락처 클릭 / 클릭 자체를 전환 / 어드민만 확인
- **Selected:** 클릭 후 연락처 클릭
- Note: ad_events에 'conversion' 타입 추가

### Q2: ROI 대시보드 접근 주체
- Options: 어드민 전용 / 광고주 별도 로그인
- **Selected:** 어드민 전용
- Note: /admin/ads 페이지에 노출·클릭·전환·ROI 테이블 추가

### Q3: 이상 트래픽 감지 기준
- Options: 동일 IP 1일 N회 임계치 / Claude 재량
- **Selected:** 동일 IP 1일 N회 임계치
- Note: Upstash Redis 일별 sliding window 추가

### Q4: 임계치 N 수치
- Options: 10회 / 20회 / 5회
- **Selected:** 10회

---

## Area 2: SGIS + AD-02 + 갭 라벨

### Q1: SGIS 통계 수집 단위
- Options: 시군구 / 읍면동
- **Selected:** 시군구 (창원시 구 단위)

### Q2: SGIS 표시 위치
- Options: 단지 상세 새 탭 / 별도 /region 페이지
- **Selected:** 단지 상세 페이지 하단 새 탭

### Q3: AD-02 AI 어시스트 적용 단계
- Options: 광고 등록 시 실시간 / 어드민 검수 단계에서만
- **Selected:** 광고 등록 시 실시간 검토

### Q4: 갭 라벨 UI 형식
- Options: 차액 라벨 / 퍼센트 라벨
- **Selected:** 차액 라벨 ("시세보다 500만원 높음/낮음")

### 추가 논의: V0.9 미구현 영역 점검
- 사용자가 Phase 6 범위 내 미구현 영역 전체 현황 요청
- 확인 결과: RAG 봇, SGIS, 광고 전환, AI 어시스트, GPS L2/L3, 갭 라벨 UI 모두 신규

### Q5: DATA-07 처리 방향
- Options: Phase 6 제외 defer / 출처 확보 시 포함
- **Selected:** Phase 6 제외, Phase 7 defer
- Note: 출처 미확보 상태

---

## Claude's Discretion Items

이하 영역은 사용자가 논의하지 않아 Claude가 기존 패턴 기반으로 구현:
- DIFF-03 RAG 봇: pgvector + 단지 상세 사이드 패널 + claude-haiku-4-5-20251001
- AUTH-01 GPS L2+L3: L2 = 30일 내 3회 인증, L3 = 서류 업로드 어드민 승인

---

## Deferred Ideas

- DATA-07 재개발 행정 데이터 → Phase 7
- 광고주 별도 대시보드 → 수요 확인 후
- SGIS 읍면동 단위 → Phase 7 이후
- RAG 봇 별도 /chat 페이지 → 단지 상세 패널로 대체
