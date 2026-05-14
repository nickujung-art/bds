# K-apt 관리비 엑셀 데이터

K-apt에서 다운로드한 관리비 엑셀 파일을 이 폴더에 넣고 아래 명령어를 실행하세요.

## 파일 명명 규칙

```
YYYYQ#aptcost.xlsx      # 분기별
YYYYaptcost.xlsx        # 연간
```

예시:
```
2025Q1aptcost.xlsx      # 2025년 1분기 (1~3월)
2025Q2aptcost.xlsx      # 2025년 2분기 (4~6월)
2025Q3aptcost.xlsx      # 2025년 3분기 (7~9월)
2025Q4aptcost.xlsx      # 2025년 4분기 (10~12월)
2025aptcost.xlsx        # 2025년 연간 (1~12월)
2026aptcost.xlsx        # 2026년 연간 or 현재까지
```

## 실행 명령어

### 특정 파일 1개 적재
```bash
npx tsx scripts/import-management-cost.ts --file data/management-cost/2025aptcost.xlsx
```

### 이 폴더의 모든 xlsx 파일 일괄 적재
```bash
npx tsx scripts/import-management-cost.ts --dir data/management-cost
```

### 옵션
| 플래그 | 설명 |
|--------|------|
| `--dry-run` | DB 적재 없이 파싱/매칭만 확인 |
| `--debug` | 매칭 실패 단지 목록 출력 |

예시:
```bash
# 먼저 dry-run으로 확인
npx tsx scripts/import-management-cost.ts --file data/management-cost/2025aptcost.xlsx --dry-run --debug

# 이상 없으면 실제 적재
npx tsx scripts/import-management-cost.ts --file data/management-cost/2025aptcost.xlsx
```

## K-apt 다운로드 경로

K-apt 공동주택관리정보시스템 → 데이터 제공 → 관리비 → 엑셀 다운로드
- URL: https://www.k-apt.go.kr/
- 시군구 필터: 경남 창원시 / 경남 김해시

## 주의사항

- 이 폴더의 xlsx 파일은 `.gitignore`에 포함되어 git에 커밋되지 않습니다
- 중복 적재는 안전합니다 (upsert — complex_id + year_month 기준)
- 같은 달 데이터를 여러 파일에 걸쳐 넣어도 마지막 것으로 덮어씁니다
