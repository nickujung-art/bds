# Step 17 (1-launch): backup

## 목표
주간 Postgres dump + GitHub private repo 저장소를 구현한다. V1.0 출시 전 데이터 복구 기반 필수 (ADR-029).

## 전제 (Prerequisites)
- 1-launch step0~15 완료 (프로덕션 DB 데이터 존재)

## 배경
Supabase Free tier는 Point-in-time recovery(PITR) 미지원. 7일 자동 백업이 있으나 Free tier 한계 (Supabase 일정 변경 가능). 주간 pg_dump를 GitHub private repo에 저장해 독립 보관한다.

## 적용 범위 (Scope)
- `.github/workflows/backup.yml` — 주간 cron GitHub Actions
- `scripts/backup.ts` — pg_dump + gzip + upload 스크립트
- `docs/RUNBOOK.md` — 복구 절차 문서

## 도메인 컨텍스트 / 가드레일
- ADR-029: RPO 7일 (Supabase 기본) + 주간 외부 dump. 매출 발생 후 일간 dump로 전환 권장
- 백업 범위: `--schema=public` (공개 스키마 전체). `auth.*` 스키마는 Supabase 관리 → 별도 export 필요시 Supabase 대시보드 사용
- 민감 데이터 처리: dump 파일에는 이메일·push token 등 PII 포함 → **GitHub private repo + repo-level secret 접근 제한** 필수
- 보존 정책: 최신 12주 보관. 13주 이전은 GitHub Actions artefact 자동 만료
- RTO 목표: dump 파일 → 로컬 restore → 서비스 복구 2시간 이내 (팀 내 검증 필요)

## 작업 목록
1. `.github/workflows/backup.yml`:
   ```yaml
   on:
     schedule:
       - cron: '0 20 * * 0'  # 매주 일 UTC 20:00 (KST 월 05:00)
   ```
   - `pg_dump $DATABASE_URL -Fc | gzip > backup_$(date +%Y%m%d).dump.gz`
   - GitHub CLI로 private repo에 push (`GH_BACKUP_REPO` secret)
   - Sentry/Resend로 성공·실패 알림
2. `scripts/backup.ts` — 로컬 실행 가능한 동일 로직 (수동 실행 지원)
3. **복구 리허설** 체크리스트 (`docs/RUNBOOK.md`):
   - dump 파일 다운로드
   - `pg_restore -d $LOCAL_DB backup_YYYYMMDD.dump.gz`
   - 레코드 수 검증 (complexes, transactions, profiles)
   - DNS 전환 없이 로컬 서버로 연결 확인
4. 환경변수: `GH_BACKUP_REPO` (private repo URL), `GH_BACKUP_TOKEN` (write access PAT)

## 수용 기준 (Acceptance Criteria)
- [ ] GitHub Actions workflow 수동 트리거 → dump 파일 생성 + private repo push 확인
- [ ] dump 파일로 로컬 DB restore → `complexes`, `transactions` 레코드 수 일치
- [ ] 실패 시 Resend 운영자 알림 발송 (mock)
- [ ] `docs/RUNBOOK.md` 복구 절차 문서 존재

## Definition of Done
주간 백업 자동화 완료. RPO 7일 보장. 데이터 손실 시 복구 가능.
