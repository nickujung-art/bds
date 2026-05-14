# K-apt 관리비 엑셀 데이터

K-apt에서 다운로드한 관리비 엑셀 파일을 이 폴더에 넣고 아래 명령어를 실행하세요.

## 파일 명명 규칙

```
YYYYQ#aptcost.xlsx      # 분기별
YYYYaptcost.xlsx        # 연간
```

예시:
```
2024aptcost.xlsx        # 2024년 연간 (1~12월)
2025aptcost.xlsx        # 2025년 연간 (1~12월)
2025Q1aptcost.xlsx      # 2025년 1분기 (1~3월)
```

## 실행 방법

### 1단계: 파싱 확인 (dry-run)
```bash
npx tsx scripts/import-management-cost.ts --file data/management-cost/2025aptcost.xlsx --dry-run
```

### 2단계: DB 직접 적재 (supabase-js)
```bash
npx tsx scripts/import-management-cost.ts --file data/management-cost/2025aptcost.xlsx
```

supabase-js 인증이 실패하는 경우 → SQL 생성 방식 사용

### 대안: SQL 파일 생성 후 CLI로 적재
```bash
# SQL 파일 생성 (DB 불필요)
npx tsx scripts/import-management-cost.ts \
  --file data/management-cost/2025aptcost.xlsx \
  --generate-sql data/management-cost/mgmt2025_import.sql

# Supabase CLI로 실행 (supabase link 되어 있어야 함)
supabase db query --linked --file data/management-cost/mgmt2025_import.sql
```

### 폴더 전체 일괄 적재
```bash
npx tsx scripts/import-management-cost.ts --dir data/management-cost
```

## 옵션 목록

| 플래그 | 설명 |
|--------|------|
| `--file <path>` | 파일 1개 지정 |
| `--dir <path>` | 폴더의 모든 xlsx (기본: `data/management-cost/`) |
| `--dry-run` | DB 적재 없이 파싱/매칭만 확인 |
| `--debug` | 미매칭 단지 목록 출력 |
| `--generate-sql [파일명]` | SQL 파일 생성 (기본: `mgmt_import.sql`) |

## K-apt 버그 자동 처리

K-apt 전국 엑셀 파일은 `dimension ref="A1"` 버그가 있어 일반 xlsx 라이브러리로
파싱이 불가능합니다. 스크립트가 자동으로 감지하여 7z 스트리밍 XML 파서로
전환합니다.

- 7z 필요: `scoop install 7zip`
- 전국 파일(250만행)에서 창원/김해 ~7,000건만 필터링

## K-apt 다운로드 경로

K-apt 공동주택관리정보시스템 → 데이터 제공 → 관리비 → 엑셀 다운로드
- URL: https://www.k-apt.go.kr/
- 시군구 필터: 경남 창원시 / 경남 김해시

## 주의사항

- 이 폴더의 xlsx 파일은 `.gitignore`에 포함되어 git에 커밋되지 않습니다
- 중복 적재는 안전합니다 (upsert — complex_id + year_month 기준)
- 같은 달 데이터를 여러 파일에서 적재하면 나중 것으로 덮어씁니다
- `--dir` 모드는 폴더의 모든 xlsx를 처리하므로 오래된 파일 주의

## 적재 현황

| 파일 | 기간 | 행수 | 적재 완료 |
|------|------|------|-----------|
| 2024aptcost.xlsx | 2024.01~12 | 7,181행 | ✓ |
| 2025aptcost.xlsx | 2025.01~12 | 7,821행 | ✓ |
| 2026aptcost.xlsx | 2026.01~04 | 1,844행 | ✓ |
