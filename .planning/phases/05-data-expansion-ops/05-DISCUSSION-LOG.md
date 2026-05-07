# Phase 5: 데이터 확장·운영 안정성 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 5-데이터확장운영안정성
**Areas discussed:** 가성비 4분면 위치·구조, 매물가 데이터 출처, DB 백업 GitHub repo, 프로덕션 DB 데이터 현황

---

## 가성비 4분면 위치·구조 (DATA-04)

### 차트 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 단지 상세 페이지 인라인 | 해당 단지를 하이라이트한 scatter chart를 단지 상세 페이지 안에 내장 | ✓ |
| 별도 /analysis 페이지 | 지역 전체 단지를 변수(지역 필터) 비교하는 전용 페이지 | |
| 랜딩 페이지 포함 | 랜딩에도 축소판 차트 노출 | |

**User's choice:** 단지 상세 페이지 인라인

### 차트 데이터 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 같은 지역(시·구)의 다른 단지들 + 해당 단지 하이라이트 | 미색 점으로 다른 단지, 주황 코일도로 현재 단지 | ✓ |
| 해당 단지만 (1점) | 위치 정보만 제공 | |

**User's choice:** 같은 시·구의 다른 단지들 + 해당 단지 하이라이트

### 축 기준

| Option | Description | Selected |
|--------|-------------|----------|
| 지역 중앙값 기준 4분할 | 해당 시·구 평당가 중앙값 × 학군점수 중앙값으로 쿼드런트 구분 | ✓ |
| 고정 기준값 (3억원/5점 등) | 절대값으로 분할 | |

**User's choice:** 지역 중앙값 기준 4분할

### 4분면 라벨

| Option | Description | Selected |
|--------|-------------|----------|
| 가성비·프리미엄·현실적·주의 | 좌상=가성비, 우상=프리미엄, 좌하=현실적, 우하=주의 | ✓ |
| 직접 입력 | 원하는 한국어 라벨 직접 제공 | |

**User's choice:** 가성비(좌상) · 프리미엄(우상) · 현실적(좌하) · 주의(우하)

---

## 매물가 데이터 출처 (DATA-05)

### 출처 결정

| Option | Description | Selected |
|--------|-------------|----------|
| 어드민 수동 입력 | 운영자가 호가수실/언론 교차 확인 후 단지별로 입력 | |
| KB시세 API / 호갱노노 결제 API 연동 | 에이전시로부터 자동 수집 | ✓ |
| 실거래가를 추정 매물가로 활용 | 최근 평균 실거래가에 프리미엄 모델 적용 | |
| Phase에서 제외 → Phase 6으로 defer | | |

**User's choice:** KB시세 API / 호갱노노 결제 API 연동

### KB API 연동 전 임시 처리

| Option | Description | Selected |
|--------|-------------|----------|
| API 연동 전까지 어드민 수동 입력으로 임시 운용 | | |
| API 연동 완료 전까지 보여주지 않음 | | ✓ |

**User's choice:** API 연동까지 보여주지 않음

### Phase 5 스코프 결정

| Option | Description | Selected |
|--------|-------------|----------|
| DB 스키마만 먼저 만들고 UI는 Phase 6에 | listing_prices 테이블 + 어드민 입력 UI만, 갭 라벨 표시는 Phase 6 | ✓ |
| DATA-05 전체 Phase 6으로 defer | | |

**User's choice:** DB 스키마 + 어드민 입력 UI만 Phase 5에, 갭 라벨 UI는 Phase 6

---

## DB 백업 GitHub repo (OPS-01)

### repo 선택

| Option | Description | Selected |
|--------|-------------|----------|
| 백업 전용 별도 private repo 생성 | 소스 repo와 분리 | ✓ |
| 같은 repo의 private branch | backups/ 브랜치에 push | |

**User's choice:** 백업 전용 별도 private repo 생성

### 인증 방식

| Option | Description | Selected |
|--------|-------------|----------|
| SUPABASE_DB_URL 시크릿으로 저장 | Supabase Dashboard URI → GitHub Secrets 등록 | ✓ |
| Supabase MCP 툴로 주간 dump 실행 | execute_sql로 CSV 덤프 | |

**User's choice:** SUPABASE_DB_URL을 GitHub Secrets에 저장

---

## 프로덕션 DB 데이터 현황 (신규 발견)

Supabase MCP로 확인한 결과:
- **구 MVP 프로젝트** (uvgkadgilufjctbzqoeh): Transaction 82,355건 (2015~2026) 존재
- **신규 danjiondo 프로젝트** (auoravdadyzvuoxunogh): 테이블 없음 (마이그레이션 미적용)

### 데이터 전략

| Option | Description | Selected |
|--------|-------------|----------|
| MOLIT API로 10년치 재백필 | scripts/backfill-realprice.ts를 신규 DB에 재실행 | ✓ |
| 구 DB 데이터를 신규 스키마로 마이그레이션 | ETL 스크립트 작성 (스키마 달라서 매핑 필요) | |

**User's choice:** MOLIT API로 10년치 재백필 (스키마 순수 유지)
**Notes:** scripts/backfill-realprice.ts 이미 존재. 신규 DB URL 환경 변수로 GitHub Actions 1회성 실행.

---

## Claude's Discretion

- **DATA-03 재건축 타임라인 UI**: 수평 step 시퀀스, 현재 단계 강조, `in_redevelopment` 단지에만 표시
- **DATA-03 어드민 입력**: 신규 `/admin/redevelopment` 페이지, admin write RLS 추가
- **백업 파일명·보관 기간**: `backup-{YYYY-MM-DD}.sql.gz`, 90일 보관 후 자동 삭제

## Deferred Ideas

- 갭 라벨 UI 표시 → Phase 6 (KB시세 API 연동 후)
- KB시세 API 자동 연동 → Phase 6
- 가성비 차트 지역 비교 전용 페이지 → Phase 7 이후
