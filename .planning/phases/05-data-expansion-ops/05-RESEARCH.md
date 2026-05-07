# Phase 5: 데이터 확장·운영 안정성 - Research

**Researched:** 2026-05-07
**Domain:** Supabase DB Push / Recharts ScatterChart / GitHub Actions pg_dump / MOLIT Backfill
**Confidence:** HIGH (대부분 기존 코드·마이그레이션 직접 검증)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**가성비 4분면 차트 (DATA-04)**
- D-01: 단지 상세 페이지 `src/app/complexes/[id]/page.tsx` 인라인 삽입 (별도 페이지 없음)
- D-02: 차트 데이터 = 같은 시·구의 모든 단지(미색 점) + 현재 단지(주황 하이라이트)
- D-03: X축(평당가) · Y축(학군점수) 모두 해당 시·구 중앙값 기준 4분할 (절대값 아님)
- D-04: 4분면 라벨 — 좌상단=가성비, 우상단=프리미엄, 좌하단=현실적, 우하단=주의
- D-05: Recharts `ScatterChart` 사용. ISR 페이지이므로 `'use client'` 차트 컴포넌트로 분리

**매물가 갭 인프라 (DATA-05)**
- D-06: Phase 5 범위 = `listing_prices` 테이블 스키마 생성 + 어드민 수동 입력 UI만 (갭 라벨 표시 Phase 6 defer)
- D-07: `listing_prices(id UUID PK, complex_id UUID FK complexes, price_per_py INT, recorded_date DATE, source TEXT, created_by UUID FK profiles, created_at TIMESTAMPTZ)`. 어드민 RLS: insert/update/delete는 admin role만
- D-08: 갭 라벨 UI는 KB API 연동 완료 전까지 단지 상세에 표시하지 않음

**DB 백업 자동화 (OPS-01)**
- D-09: 백업 전용 별도 GitHub private repo (`nickujung-art/danjiondo-backup`)
- D-10: `SUPABASE_DB_URL`을 GitHub Secrets에 저장 (Dashboard > Project Settings > Database > URI)
- D-11: GitHub Actions 주간 workflow — 매주 일요일 04:00 KST `pg_dump` → `.sql.gz` → backup repo push
- D-12: 백업 파일명 `backup-{YYYY-MM-DD}.sql.gz`, 90일 보관 후 자동 삭제 (workflow 내 cleanup step)

**프로덕션 DB 초기화 (신규 발견)**
- D-13: danjiondo 프로젝트(auoravdadyzvuoxunogh)에 테이블 없음. Phase 5 Wave 0에 `supabase db push` [BLOCKING]
- D-14: MOLIT 10년치 백필: `scripts/backfill-realprice.ts` 신규 DB 대상 GitHub Actions 1회성 실행. 지역별 청크 분할

### Claude's Discretion

- **DATA-03 타임라인 UI**: `redevelopment_projects` 테이블(10단계 enum) 활용. 단지 상세에 수평 step 시퀀스. 재건축 단지(`status='in_redevelopment'`)에만 표시
- **DATA-03 어드민 입력**: 신규 `/admin/redevelopment` 페이지. `createSupabaseAdminClient()` 경유. 단지 검색 → 단계 선택 → notes 입력 → upsert
- **DATA-03 RLS**: `redevelopment_projects`에 admin write 정책 추가 (현재 public read만 있음)

### Deferred Ideas (OUT OF SCOPE)

- 갭 라벨 UI 표시 (매물가 vs 실거래가) → Phase 6 (KB시세 API 연동 후)
- KB시세 API 자동 연동 → Phase 6
- 가성비 차트 별도 /analysis 지역 비교 페이지 → Phase 7 이후
- 구 MVP 프로젝트 데이터 ETL → MOLIT 재백필로 대체

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-03 | 재건축 단계 운영자 수동 입력 + 진행 타임라인 | `redevelopment_projects` 테이블 + `redevelopment_phase` enum 이미 존재. admin write RLS 추가 + 수평 stepper UI 패턴 |
| DATA-04 | 가성비 분석 4분면 (평당가 × 학군 점수) 시각화 | Recharts ScatterChart + ReferenceLine 패턴. 학군점수 집계 쿼리 설계 필요 |
| DATA-05 | 매물가 vs 실거래가 갭 라벨 (인프라만) | `listing_prices` 신규 테이블 마이그레이션. 어드민 Server Action upsert |
| OPS-01 | DB 백업 자동화 — pg_dump + GitHub private repo 주간 + 복구 런북 | GitHub Actions pg_dump 워크플로우 패턴. PAT 인증. 90일 cleanup 로직 |

</phase_requirements>

---

## Summary

Phase 5는 4개 요구사항(DATA-03, DATA-04, DATA-05, OPS-01)과 **Wave 0 BLOCKING 작업** 2개(supabase db push + MOLIT 10년 백필)로 구성된다.

**Wave 0**이 가장 중요하다. 신규 danjiondo Supabase 프로젝트(auoravdadyzvuoxunogh)에 테이블이 없으므로, `supabase link --project-ref auoravdadyzvuoxunogh` → `supabase db push --linked` 명령으로 22개 마이그레이션을 적용해야 모든 후속 작업이 가능하다. 이후 `scripts/backfill-realprice.ts`를 GitHub Actions 1회성 워크플로우로 실행해 10년치 MOLIT 거래 데이터를 적재한다.

**DATA-03**은 `redevelopment_projects` 테이블과 10단계 `redevelopment_phase` enum이 이미 마이그레이션에 존재하므로 새 마이그레이션은 admin write RLS 정책 1개만 추가하면 된다. UI는 단지 상세 페이지에 조건부(status='in_redevelopment') 렌더링하는 수평 stepper 컴포넌트다.

**DATA-04**는 Recharts ScatterChart를 사용한다. `'use client'` 컴포넌트를 분리하고, 서버 컴포넌트에서 같은 시·구 모든 단지의 평당가+학군점수를 집계해 내려준다. 학군점수는 `facility_school` 테이블에서 배정학교 개수/거리로 파생 계산한다.

**DATA-05**와 **OPS-01**은 신규 마이그레이션 + GitHub Actions 워크플로우 추가로 완결된다.

**Primary recommendation:** Wave 0(supabase db push + 백필)을 가장 먼저 독립 실행하고, 이후 DATA-03/04/05/OPS-01을 병렬 구현한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| supabase db push (마이그레이션 적용) | DB / Infra | — | CLI 명령어. 런타임 코드 없음 |
| MOLIT 10년 백필 | GitHub Actions (1회성) | — | `scripts/backfill-realprice.ts`는 Node 스크립트. Vercel에서 실행 불가 (10,000 API 콜) |
| 재건축 타임라인 UI | Frontend (RSC + Client) | DB | RSC에서 데이터 fetch, 'use client' 없이 순수 HTML 렌더 가능 (정적 표시) |
| 어드민 재건축 입력 | API / Backend (Server Action) | DB | Server Action + createSupabaseAdminClient() 패턴 |
| 가성비 차트 데이터 집계 | API / Backend (RSC) | DB | createReadonlyClient() ISR 쿼리 |
| 가성비 차트 렌더링 | Browser / Client | — | Recharts는 DOM 의존 → 반드시 'use client' 분리 |
| listing_prices 어드민 입력 | API / Backend (Server Action) | DB | admin role 검증 + createSupabaseAdminClient() |
| pg_dump 백업 | GitHub Actions (주간 cron) | — | Vercel Hobby는 1일 1회 한도 → GitHub Actions 필수 |
| 90일 backup cleanup | GitHub Actions (동일 워크플로우) | — | backup repo git log로 90일 이전 커밋 파악 후 삭제 |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.1 | ScatterChart 4분면 차트 | 이미 설치됨. TransactionChart.tsx에서 사용 중 [VERIFIED: package.json] |
| @supabase/ssr | ^0.10.2 | Supabase 서버/클라이언트 | 프로젝트 표준 [VERIFIED: package.json] |
| supabase CLI | latest | db push, migration 관리 | 프로젝트 표준 (npm run db:push 스크립트 존재) [VERIFIED: CLAUDE.md] |
| postgresql-client | 15/16 | GitHub Actions pg_dump 실행 | `apt-get install postgresql-client` — ubuntu-latest에서 설치 [VERIFIED: 공식 문서] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | (npx) | backfill-realprice.ts 실행 | GitHub Actions에서 `npx tsx` 로 TypeScript 스크립트 실행 |
| tj-actions/pg-dump | v3 | pg_dump 대안 Action | 필요 없음 — 직접 pg_dump 명령어가 더 단순하고 의존도 낮음 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 직접 pg_dump 명령어 | tj-actions/pg-dump@v3 | tj-actions는 postgresql_version 관리가 편하지만 외부 의존성 추가. 직접 명령어가 더 투명 |
| PAT(개인 액세스 토큰) | Deploy key | PAT는 계정 전체 권한. Deploy key는 repo별 제한. 보안상 Deploy key 권장하지만 PAT가 설정 단순 |

---

## Architecture Patterns

### System Architecture Diagram

```
[Wave 0: BLOCKING]
supabase link --project-ref auoravdadyzvuoxunogh
    → supabase db push --linked
        → 22개 마이그레이션 적용
        → supabase migration list 로 검증

GitHub Actions 1회성 백필 워크플로우
    → scripts/backfill-realprice.ts --resume --sgg=<청크>
        → MOLIT API (일 10,000회 한도)
        → supabase transactions upsert

[Wave 1: 병렬 실행 가능]

DATA-03:
  supabase/migrations/새 마이그레이션
    → redevelopment_projects admin write RLS 추가
  /admin/redevelopment/page.tsx (RSC + admin guard)
    → Server Action: upsertRedevelopmentProject()
        → createSupabaseAdminClient()
  complexes/[id]/page.tsx
    → getRedevelopmentProject(complexId)  [readonly client]
        → RedevelopmentTimeline 컴포넌트 (조건부 렌더링)

DATA-04:
  complexes/[id]/page.tsx (ISR, revalidate=86400)
    → getQuadrantData(si, gu, supabase)  [readonly client]
        → complexes + facility_school 집계 쿼리
    → <ValueQuadrantChart> (use client 분리)
        → Recharts ScatterChart + ReferenceLine × 2

DATA-05:
  supabase/migrations/새 마이그레이션
    → listing_prices 테이블 + RLS
  /admin/listing-prices/page.tsx
    → Server Action: upsertListingPrice()
        → createSupabaseAdminClient()

OPS-01:
  GitHub Actions .github/workflows/db-backup.yml
    → cron: '0 19 * * 0'  (일요일 04:00 KST)
    → apt-get install postgresql-client
    → pg_dump "$SUPABASE_DB_URL" | gzip > backup-YYYY-MM-DD.sql.gz
    → git clone nickujung-art/danjiondo-backup (PAT 인증)
    → git add + commit + push
    → cleanup: 90일 이전 커밋 찾아 파일 삭제 후 force push (또는 별도 cleanup step)
```

### Recommended Project Structure

```
supabase/
├── migrations/
│   ├── 20260507000005_phase5_listing_prices.sql    # listing_prices + RLS
│   └── 20260507000006_phase5_redevelopment_rls.sql # admin write RLS 추가

src/
├── app/
│   ├── complexes/[id]/
│   │   └── page.tsx                               # getQuadrantData + getRedevelopmentProject 추가
│   └── admin/
│       ├── redevelopment/
│       │   └── page.tsx                           # DATA-03 어드민 입력
│       └── listing-prices/
│           └── page.tsx                           # DATA-05 어드민 입력
├── components/
│   ├── complex/
│   │   ├── ValueQuadrantChart.tsx                 # 'use client', ScatterChart
│   │   └── RedevelopmentTimeline.tsx              # 수평 stepper (RSC 가능)
│   └── admin/
│       └── ListingPriceForm.tsx                   # 어드민 폼
├── lib/
│   ├── data/
│   │   ├── quadrant.ts                            # getQuadrantData 함수
│   │   └── redevelopment.ts                       # getRedevelopmentProject 함수
│   └── auth/
│       └── listing-price-actions.ts               # Server Action upsertListingPrice
│       └── redevelopment-actions.ts               # Server Action upsertRedevelopmentProject

.github/workflows/
├── db-backup.yml                                  # OPS-01 주간 pg_dump
└── molit-backfill-once.yml                        # Wave 0 1회성 백필

scripts/
└── backfill-realprice.ts                          # 기존 (재활용)
```

### Pattern 1: ISR 페이지에 'use client' 차트 컴포넌트 분리

**What:** RSC(ISR) 페이지에서 데이터를 fetch하고, Recharts 차트는 별도 'use client' 컴포넌트에 props로 전달
**When to use:** ISR 페이지(`export const revalidate = N`)에 인터랙티브 차트 삽입 시 항상

```typescript
// Source: 기존 TransactionChart.tsx 패턴 [VERIFIED: src/components/complex/TransactionChart.tsx]

// ❌ Wrong: ISR 페이지 자체에 'use client' 붙이기
// ✅ Correct: 분리

// src/components/complex/ValueQuadrantChart.tsx
'use client'
import { ScatterChart, Scatter, XAxis, YAxis, ReferenceLine,
         ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

interface QuadrantPoint { x: number; y: number; complexId: string; isTarget: boolean }
interface Props {
  data: QuadrantPoint[]
  medianX: number  // 해당 시·구 평당가 중앙값
  medianY: number  // 해당 시·구 학군점수 중앙값
  targetId: string
}

export function ValueQuadrantChart({ data, medianX, medianY }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="x" name="평당가" type="number" tickFormatter={v => `${Math.round(v/10000)}만`} />
        <YAxis dataKey="y" name="학군점수" type="number" />
        {/* 4분면 구분선 */}
        <ReferenceLine x={medianX} stroke="#ccc" strokeDasharray="4 2" />
        <ReferenceLine y={medianY} stroke="#ccc" strokeDasharray="4 2" />
        {/* 배경 단지 (회색) */}
        <Scatter data={data.filter(d => !d.isTarget)} fill="#d1d5db" opacity={0.5} />
        {/* 현재 단지 (주황) */}
        <Scatter data={data.filter(d => d.isTarget)} fill="#ea580c" r={6} />
        <Tooltip />
      </ScatterChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 2: Recharts ReferenceLine 4분면 라벨 (SVG customLabel)

**What:** ReferenceLine 교차점 근처에 한국어 4분면 라벨을 오버레이
**When to use:** 4분면 영역 표시 시

```typescript
// Source: Recharts 공식 API 문서 [CITED: recharts.github.io/en-US/api/ReferenceLine]
// ReferenceLine의 label prop에 ReactElement 또는 함수 전달 가능

// 방법 A: 절대 포지션 div 오버레이 (더 단순)
// 방법 B: ReferenceLine label prop에 custom SVG element
<ReferenceLine x={medianX} stroke="#d1d5db" strokeDasharray="4 2"
  label={<text x={0} y={0} fill="#9ca3af" fontSize={10}>{'|'}</text>}
/>

// 권장: 4분면 텍스트는 차트 위에 absolute positioned div로 오버레이 (CSS grid trick)
// → Recharts SVG 좌표계와 맞추는 복잡도 없이 구현 단순
```

### Pattern 3: supabase db push 신규 프로젝트 적용 순서

**What:** 테이블이 없는 신규 Supabase 프로젝트에 모든 마이그레이션 적용
**When to use:** Wave 0 BLOCKING 작업

```bash
# Source: 공식 문서 [CITED: supabase.com/docs/reference/cli/supabase-db-push]

# 1. 프로젝트 연결 (한 번만)
npx supabase link --project-ref auoravdadyzvuoxunogh

# 2. 건식 실행으로 적용될 마이그레이션 확인
npx supabase db push --linked --dry-run

# 3. 실제 적용
npx supabase db push --linked

# 4. 적용 결과 검증
npx supabase migration list --linked
# → 22개 마이그레이션 모두 APPLIED 상태 확인

# 5. 선택: Supabase Dashboard > Table Editor에서 주요 테이블 존재 확인
#    complexes, transactions, redevelopment_projects, etc.
```

**주의:** `--db-url` 플래그로 직접 연결 시 connection string은 percent-encoded 필요. `--linked` 방식이 더 단순하고 안전.

### Pattern 4: GitHub Actions pg_dump → private repo 백업

**What:** 주간 스케줄로 Supabase DB를 pg_dump하고 private backup repo에 커밋
**When to use:** OPS-01 구현

```yaml
# Source: [CITED: github.com/tj-actions/pg-dump README + 공식 GitHub Actions 문서]

name: DB Backup
on:
  schedule:
    - cron: '0 19 * * 0'   # 일요일 19:00 UTC = 월요일 04:00 KST
  workflow_dispatch: {}

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Install postgresql-client
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y postgresql-client

      - name: Run pg_dump
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          FILENAME="backup-$(date +%Y-%m-%d).sql.gz"
          pg_dump "$SUPABASE_DB_URL" | gzip > "/tmp/$FILENAME"
          echo "FILENAME=$FILENAME" >> $GITHUB_ENV

      - name: Clone backup repo
        env:
          BACKUP_PAT: ${{ secrets.BACKUP_PAT }}
        run: |
          git clone "https://x-access-token:${BACKUP_PAT}@github.com/nickujung-art/danjiondo-backup.git" /tmp/backup-repo

      - name: Commit backup
        run: |
          cp "/tmp/$FILENAME" /tmp/backup-repo/
          cd /tmp/backup-repo
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git config user.name "github-actions[bot]"
          git add "$FILENAME"
          git commit -m "backup: $FILENAME"
          git push

      - name: Cleanup 90-day-old backups
        run: |
          cd /tmp/backup-repo
          CUTOFF=$(date -d '90 days ago' +%Y-%m-%d)
          for f in backup-*.sql.gz; do
            FILEDATE="${f#backup-}"
            FILEDATE="${FILEDATE%.sql.gz}"
            if [[ "$FILEDATE" < "$CUTOFF" ]]; then
              git rm "$f"
            fi
          done
          if git diff --cached --quiet; then
            echo "No old backups to remove"
          else
            git commit -m "cleanup: remove backups older than 90 days"
            git push
          fi
```

### Pattern 5: MOLIT 백필 GitHub Actions 1회성 워크플로우

**What:** `scripts/backfill-realprice.ts`를 GitHub Actions에서 지역별 청크로 실행
**When to use:** Wave 0 MOLIT 백필

```yaml
# Source: 기존 scripts/backfill-realprice.ts CLI 인터페이스 분석 [VERIFIED]
# --sgg=48121,48123 옵션으로 지역별 청크 분할 가능

name: MOLIT Backfill (1회성)
on:
  workflow_dispatch:
    inputs:
      sgg_codes:
        description: 'SGG 코드 (쉼표 구분)'
        required: true
        default: '48121,48123,48125'   # 창원 의창·성산·마산합포 등

jobs:
  backfill:
    runs-on: ubuntu-latest
    timeout-minutes: 300   # 5시간 (MOLIT 한도 내 분할 실행)

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run backfill
        env:
          MOLIT_API_KEY: ${{ secrets.MOLIT_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          npx tsx scripts/backfill-realprice.ts \
            --resume \
            --sgg=${{ inputs.sgg_codes }}
```

**MOLIT API 한도 계산:**
- 창원+김해 전체 sgg_code 개수: `regions` 테이블에서 조회 필요 [ASSUMED: 6-10개 예상]
- 120개월 × sgg당 최대 10페이지 = 최대 1,200 API 콜/sgg
- sgg 10개 × 1,200 = 12,000 콜 → 하루 10,000 한도 초과 → **2일 분할 실행 필요**
- `--resume` 플래그로 완료된 월 건너뛰므로 2일차 재실행 가능

### Pattern 6: 재건축 타임라인 수평 Stepper UI

**What:** 10단계 `redevelopment_phase` enum을 순서대로 표시하는 수평 stepper
**When to use:** `complex.status === 'in_redevelopment'` 조건부 렌더링

```typescript
// Source: 기존 복지 코드 패턴 + CONTEXT.md 결정 [VERIFIED: supabase/migrations/20260430000009_rls.sql]

// redevelopment_phase 10단계 순서
const PHASE_ORDER: Record<string, number> = {
  'rumor': 0, 'proposed': 1, 'committee_formed': 2, 'safety_eval': 3,
  'designated': 4, 'business_approval': 5, 'construction_permit': 6,
  'construction': 7, 'completed': 8, 'cancelled': 9,
}

const PHASE_LABELS: Record<string, string> = {
  rumor: '재건축 소문',
  proposed: '추진 제안',
  committee_formed: '추진위 구성',
  safety_eval: '안전진단',
  designated: '구역 지정',
  business_approval: '사업 승인',
  construction_permit: '착공 허가',
  construction: '공사 중',
  completed: '완공',
  cancelled: '취소',
}

// RSC에서 렌더 가능 (인터랙션 없으므로 'use client' 불필요)
function RedevelopmentTimeline({ phase }: { phase: string }) {
  const currentIdx = PHASE_ORDER[phase] ?? 0
  const phases = Object.entries(PHASE_ORDER)
    .filter(([p]) => p !== 'cancelled')   // cancelled는 별도 처리
    .sort(([, a], [, b]) => a - b)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
      {phases.map(([p, idx]) => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: idx < currentIdx ? 'var(--dj-orange)'
                      : idx === currentIdx ? 'var(--dj-orange)'
                      : 'var(--bg-surface-2)',
            border: idx === currentIdx ? '2px solid var(--dj-orange)' : 'none',
            display: 'grid', placeItems: 'center',
          }}>
            {idx < currentIdx && <CheckIcon />}
          </div>
          <span style={{ font: '500 10px/1 var(--font-sans)', marginTop: 4 }}>
            {PHASE_LABELS[p]}
          </span>
          {idx < phases.length - 1 && (
            <div style={{ width: 20, height: 1, background: '#e5e7eb' }} />
          )}
        </div>
      ))}
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **ISR 페이지에 'use client' 직접 추가:** `page.tsx`에 `'use client'`를 붙이면 ISR(`export const revalidate`) 무효화. 차트는 반드시 별도 컴포넌트로 분리
- **Recharts를 SSR 컨텍스트에서 직접 import:** `ResponsiveContainer`는 DOM 크기에 의존하므로 서버 렌더 시 `window is not defined` 에러 발생. `dynamic(() => import('./ValueQuadrantChart'), { ssr: false })` 또는 'use client' 분리 필수
- **supabase db push에 --db-url 없이 --linked 미설정:** 링크 없이 실행하면 로컬 DB에 적용됨. 반드시 `--linked` 또는 `--db-url` 명시
- **pg_dump에 PGPASSWORD 환경변수 대신 URL에 패스워드 포함:** Supabase DB URL 형식은 `postgresql://postgres.[ref]:[password]@...` — URL에 패스워드 포함이 pg_dump에서 인식됨 [VERIFIED: 공식 문서]
- **backup repo에 GITHUB_TOKEN 사용:** `GITHUB_TOKEN`은 동일 repo에만 push 가능. 별도 repo에 push하려면 PAT(또는 deploy key) 필수 [VERIFIED: GitHub 공식 문서]
- **학군점수를 `facility_school` 테이블에서 직접 score 컬럼으로 읽기:** 해당 컬럼 없음. 배정학교 유무 + 거리로 파생 계산 필요 [VERIFIED: 20260430000004_facility.sql]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 차트 렌더링 | 직접 SVG 그리기 | Recharts ScatterChart | 이미 설치됨. 축/툴팁/반응형 처리 복잡 |
| pg_dump 설치 | 바이너리 수동 다운로드 | `apt-get install postgresql-client` | ubuntu-latest 표준 패키지 관리자 |
| 90일 cleanup 로직 | 복잡한 git rebase/filter-branch | `git rm` + `git commit` + `git push` | 단순 파일 삭제 커밋으로 충분. 히스토리 보존은 불필요 |
| MOLIT 데이터 직접 파싱 | 커스텀 XML 파서 | 기존 `src/lib/data/realprice.ts`의 `ingestMonth()` | 이미 구현됨. 재활용 |

**Key insight:** Phase 5는 신규 라이브러리가 거의 없다. 기존 패턴(TransactionChart, GitHub Actions cron, backfill script) 재활용이 핵심.

---

## Common Pitfalls

### Pitfall 1: supabase db push 실패 — ALTER TYPE ADD VALUE 트랜잭션 제약

**What goes wrong:** `ALTER TYPE ... ADD VALUE`는 트랜잭션 블록 안에서 실행 불가. 마이그레이션이 BEGIN/COMMIT으로 감싸여 있으면 실패
**Why it happens:** Phase 4 마이그레이션에서 이미 발생 (20260507000003_phase4_enum.sql에서 해결됨)
**How to avoid:** Phase 5 마이그레이션에서 enum 변경 필요 시 별도 마이그레이션 파일에 `ALTER TYPE ADD VALUE IF NOT EXISTS`만 단독 실행
**Warning signs:** `ERROR: ALTER TYPE ... cannot run inside a transaction block`

### Pitfall 2: MOLIT 백필 API 한도 초과

**What goes wrong:** 일 10,000회 한도 초과 시 API 403/429 반환. 이후 당일 모든 요청 실패
**Why it happens:** 창원+김해 전체 지역 × 120개월 × 여러 페이지 = 한도 초과 가능
**How to avoid:**
  1. `--resume` 플래그 필수 — 완료된 월 skip
  2. `--sgg` 플래그로 지역 분할 (하루 3-5개 sgg씩)
  3. 스크립트 내 200ms 딜레이가 이미 구현됨 (`await new Promise(r => setTimeout(r, 200))`)
  4. `ingest_runs` 테이블에 완료 기록 → 중단 후 재개 가능
**Warning signs:** `⚠️ ${sggCode} ${ym}: failed` 출력 증가

### Pitfall 3: pg_dump Connection String 형식 — Supabase IPv6 주소

**What goes wrong:** Supabase connection string에 `[IPv6]` 괄호가 포함될 수 있어 pg_dump가 파싱 실패
**Why it happens:** IPv6 주소는 URL에서 `[::1]:5432` 형식인데 일부 pg_dump 버전이 미처리
**How to avoid:** Supabase Dashboard에서 **Direct connection (IPv4)** 문자열 사용. Transaction Pooler 문자열은 pg_dump 비호환(PgBouncer 프로토콜)
**Warning signs:** `pg_dump: error: connection to server ... failed: ...`

### Pitfall 4: Recharts ResponsiveContainer height=0

**What goes wrong:** 부모 컨테이너에 명시적 height가 없으면 `ResponsiveContainer`가 height=0 렌더링
**Why it happens:** `height="100%"` 설정 시 부모 높이를 상속하는데, 부모가 flex/grid 컨테이너가 아니면 0
**How to avoid:** `height={320}` 같이 고정 픽셀 값 사용 또는 부모에 명시적 height 지정
**Warning signs:** 차트 영역이 보이지 않음

### Pitfall 5: 학군점수 집계 — NULL 처리

**What goes wrong:** `facility_school`에 데이터가 없는 단지는 학군점수 NULL → ScatterChart에서 해당 점 미렌더링
**Why it happens:** 일부 단지는 학교알리미 API에서 매칭 안됨
**How to avoid:** 학군점수 NULL인 단지는 차트에서 제외하거나 Y축 0으로 처리. `COALESCE(school_score, 0)` 또는 필터링
**Warning signs:** 예상보다 적은 점 수

### Pitfall 6: backup repo PAT 권한 범위

**What goes wrong:** PAT의 권한이 `repo` 전체가 아닌 `public_repo`만이면 private repo push 실패
**Why it happens:** Fine-grained PAT는 repo별 권한 지정 필요
**How to avoid:** Classic PAT에 `repo` scope 부여 또는 Fine-grained PAT에 `danjiondo-backup` repo 한정 Contents write 권한
**Warning signs:** `remote: Permission to nickujung-art/danjiondo-backup.git denied`

---

## Code Examples

### 가성비 차트 데이터 집계 쿼리

```typescript
// src/lib/data/quadrant.ts
// Source: 기존 complexes 테이블 구조 분석 [VERIFIED: 20260430000002_complexes.sql]
//         기존 rankings.ts 평당가 계산 패턴 참조 [VERIFIED: src/lib/data/rankings.ts]

export interface QuadrantPoint {
  complexId: string
  complexName: string
  x: number  // 평당가 (만원)
  y: number  // 학군점수 (0-100)
  isTarget: boolean
}

export interface QuadrantData {
  points: QuadrantPoint[]
  medianX: number
  medianY: number
}

export async function getQuadrantData(
  targetComplexId: string,
  si: string,
  gu: string,
  supabase: ReturnType<typeof createReadonlyClient>
): Promise<QuadrantData> {
  // 1. 같은 시·구의 단지 목록 + 최근 거래 평균 집계
  const { data: complexList } = await supabase
    .from('complexes')
    .select('id, canonical_name, si, gu')
    .eq('si', si)
    .eq('gu', gu)
    .eq('status', 'active')
    .limit(200)

  // 2. 각 단지 평당가: 최근 12개월 transactions 평균
  //    (cancel_date IS NULL AND superseded_by IS NULL 필수)

  // 3. 학군점수: facility_school에서 is_assignment=true 배정학교 거리 기반 파생
  //    예: score = 100 - (배정 초등학교 거리_m / 10).clamp(0, 100)
  //    데이터 없으면 null → 점 제외

  // 4. 중앙값 계산 후 반환
}
```

### listing_prices 마이그레이션

```sql
-- Source: CONTEXT.md D-07 결정 [VERIFIED]
-- supabase/migrations/20260507000005_phase5_listing_prices.sql

CREATE TABLE public.listing_prices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id    uuid NOT NULL REFERENCES public.complexes(id) ON DELETE CASCADE,
  price_per_py  integer NOT NULL,          -- 만원/평 단위
  recorded_date date NOT NULL,
  source        text NOT NULL DEFAULT 'admin',
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX listing_prices_complex_id_idx ON public.listing_prices(complex_id, recorded_date DESC);

ALTER TABLE public.listing_prices ENABLE ROW LEVEL SECURITY;

-- public read (갭 라벨 표시 시 필요 — Phase 6)
CREATE POLICY "listing_prices: public read"
  ON public.listing_prices FOR SELECT USING (true);

-- admin write only
CREATE POLICY "listing_prices: admin write"
  ON public.listing_prices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );
```

### redevelopment_projects admin write RLS

```sql
-- Source: 기존 RLS 패턴 분석 [VERIFIED: 20260430000009_rls.sql]
-- supabase/migrations/20260507000006_phase5_redevelopment_rls.sql

-- 현재: public read만 있음
-- 추가: admin write (INSERT, UPDATE, DELETE)
CREATE POLICY "redevelopment_projects: admin write"
  ON public.redevelopment_projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase db remote commit` | `supabase db push` | Supabase CLI v1 → v2 | 명령어 변경됨. `db remote commit`은 deprecated |
| pg_dump 직접 패스워드 입력 | Connection URL에 포함 | 현재 표준 | `PGPASSWORD` env var 불필요. URL 형식으로 단순화 |
| Recharts v2 `<Scatter>` name prop | v3 동일 API | v3.x | Recharts v3.8.1 설치됨. API 호환 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 창원+김해 sgg_code 개수 6-10개 (MOLIT 백필 2일 분할 계산 근거) | Pitfall 2 / Pattern 5 | sgg 개수가 더 많으면 분할 횟수 증가 — `regions` 테이블 조회로 확인 가능 |
| A2 | `facility_school` 테이블에 학군점수 컬럼 없음 → 거리 기반 파생 계산 필요 | Code Examples | 컬럼이 이미 있다면 파생 계산 불필요. 마이그레이션 추가 필요 없음 |
| A3 | Supabase Direct connection string이 IPv4 형식으로 제공됨 | Pitfall 3 | IPv6 전용이면 별도 포맷 처리 필요 |
| A4 | `danjiondo-backup` GitHub private repo가 아직 생성되지 않음 | Wave 0 구현 | repo가 이미 있다면 생성 단계 skip |

---

## Open Questions

1. **학군점수 산출 기준**
   - What we know: `facility_school`에 `distance_m`, `is_assignment`, `school_type` 컬럼 존재
   - What's unclear: "학군점수"의 정확한 산식을 CONTEXT.md가 정의하지 않음
   - Recommendation: 단순한 산식 사용 — 배정 초등학교 존재 여부(50점) + 거리 역비례 보정(50점) → 0-100 정규화

2. **supabase db push 실행 환경**
   - What we know: Wave 0에서 실행해야 함. `npm run db:push`가 script에 존재
   - What's unclear: CI(GitHub Actions)에서 실행인지, 로컬 실행인지 미결정
   - Recommendation: 로컬에서 개발자가 수동 실행 (`npx supabase db push --linked`). CI에서는 검증만

3. **regions 테이블 sgg_code 데이터 존재 여부**
   - What we know: `backfill-realprice.ts`가 `regions` 테이블에서 sgg_code를 조회
   - What's unclear: Wave 0에서 db push 이후 regions 테이블에 데이터가 있는지 (seed data 필요?)
   - Recommendation: db push 후 `regions` 테이블 확인. 비어있으면 `--sgg` 플래그로 직접 지정

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| supabase CLI | Wave 0 db push | 확인 필요 | — | `npx supabase` 사용 가능 |
| Node.js 20+ | backfill script (npx tsx) | ✓ (프로젝트 기준) | package.json engines 미설정 | — |
| postgresql-client | OPS-01 GitHub Actions | ✓ (ubuntu-latest apt) | 15/16 | — |
| GitHub Private Repo | OPS-01 backup | 생성 필요 | — | 생성 전까지 workflow 비활성화 |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | vitest.config.ts (프로젝트 루트) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03 | getRedevelopmentProject: status='in_redevelopment' 단지에 데이터 반환 | unit | `npm run test -- redevelopment` | ❌ Wave 0 |
| DATA-03 | RedevelopmentTimeline: phase 값에 따라 올바른 단계 표시 | unit (컴포넌트) | `npm run test -- RedevelopmentTimeline` | ❌ Wave 0 |
| DATA-04 | getQuadrantData: 같은 si/gu 단지 반환 + medianX/medianY 계산 | unit | `npm run test -- quadrant` | ❌ Wave 0 |
| DATA-05 | listing_prices RLS: admin만 INSERT 가능, public SELECT 가능 | integration | `npm run test -- listing-prices` | ❌ Wave 0 |
| DATA-05 | upsertListingPrice Server Action: 비어드민 실패, 어드민 성공 | unit | `npm run test -- listing-price-actions` | ❌ Wave 0 |
| OPS-01 | pg_dump 백업 workflow | manual | GitHub Actions workflow_dispatch | — |

### Sampling Rate

- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run build`
- **Phase gate:** `npm run test && npm run test:e2e && npm run build`

### Wave 0 Gaps

- [ ] `src/__tests__/redevelopment.test.ts` — covers DATA-03 (getRedevelopmentProject 함수)
- [ ] `src/__tests__/quadrant.test.ts` — covers DATA-04 (getQuadrantData 함수)
- [ ] `src/__tests__/listing-prices.test.ts` — covers DATA-05 (RLS + Server Action)
- [ ] `src/__tests__/redevelopment-actions.test.ts` — covers DATA-03 (upsertRedevelopmentProject Server Action)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — 기존 패턴 그대로 |
| V3 Session Management | yes | createSupabaseServerClient() 쿠키 세션 |
| V4 Access Control | yes | RLS 정책 — admin role 검증 |
| V5 Input Validation | yes | zod schema — Server Action 입력 검증 필수 |
| V6 Cryptography | no | — |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| admin write RLS 누락 | Elevation of Privilege | `redevelopment_projects`, `listing_prices`에 admin write RLS 명시 |
| pg_dump Connection URL 노출 | Information Disclosure | GitHub Secrets에만 저장. log에 URL 미출력 (`set -e`만 사용) |
| SUPABASE_DB_URL GitHub Secrets 불충분 | Information Disclosure | backup workflow는 별도 repo secrets — `danjiondo-backup` repo가 아닌 main repo에 저장 |
| Server Action 어드민 권한 미검증 | Elevation of Privilege | 모든 admin Server Action에서 role 확인 + redirect('/') 처리 필수 |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: supabase/migrations/20260430000009_rls.sql] — redevelopment_projects 테이블, redevelopment_phase enum, 기존 RLS 패턴
- [VERIFIED: supabase/migrations/20260430000002_complexes.sql] — complexes 스키마 (si, gu, status 필드)
- [VERIFIED: supabase/migrations/20260430000004_facility.sql] — facility_school 스키마 (학군점수 컬럼 없음 확인)
- [VERIFIED: src/components/complex/TransactionChart.tsx] — Recharts 'use client' 분리 패턴
- [VERIFIED: src/lib/data/rankings.ts] — 평당가 계산 패턴 (price / area_m2 / 3.3058)
- [VERIFIED: scripts/backfill-realprice.ts] — --resume, --sgg, --from, --to 플래그 인터페이스
- [VERIFIED: .github/workflows/cafe-code-weekly.yml] — GitHub Actions cron 패턴 (KST 변환)
- [VERIFIED: package.json] — recharts ^3.8.1, @supabase/ssr ^0.10.2
- [CITED: supabase.com/docs/reference/cli/supabase-db-push] — db push 플래그, --linked, --dry-run

### Secondary (MEDIUM confidence)

- [CITED: recharts.github.io/en-US/api/ScatterChart] — ScatterChart 기본 사용법, ReferenceLine label prop
- [CITED: recharts.github.io/en-US/api/ReferenceLine] — x/y 값 기반 구분선 그리기
- [WebSearch 검증: github.com/orgs/community/discussions/46566] — GITHUB_TOKEN은 타 repo push 불가. PAT 필요

### Tertiary (LOW confidence)

- [ASSUMED: A1] — sgg_code 개수 6-10개 (MOLIT 2일 분할 계산)
- [ASSUMED: A4] — danjiondo-backup repo 미생성

---

## Project Constraints (from CLAUDE.md)

실행 에이전트가 반드시 준수해야 할 지시사항:

1. **CRITICAL**: 모든 Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만. `ValueQuadrantChart.tsx`는 `'use client'`이므로 쿼리 금지 — 데이터는 RSC에서 내려줌
2. **CRITICAL**: 모든 사용자 데이터 테이블에 RLS 정책 명시 (`listing_prices`, `redevelopment_projects` 모두 포함)
3. **CRITICAL**: 외부 API 호출은 `src/services/` 어댑터에서만. MOLIT 백필 스크립트는 이미 `src/lib/data/realprice.ts`의 `ingestMonth()`를 경유
4. **CRITICAL**: transactions 쿼리는 항상 `WHERE cancel_date IS NULL AND superseded_by IS NULL` 포함
5. **CRITICAL**: `complexes`가 Golden Record. 평당가 집계 시 복합 매칭 (좌표+이름) 유지
6. **Server Action 우선**: listing_prices 입력, redevelopment_projects upsert 모두 Server Action 사용
7. **createSupabaseAdminClient() 단일 경유**: 어드민 write 작업 모두 이 클라이언트 사용
8. **AI 슬롭 금지**: backdrop-blur, gradient-text, glow, 보라/인디고 — 차트 UI에도 적용. 주황(--dj-orange)만 강조색
9. **TDD 필수**: 새 함수(`getQuadrantData`, `getRedevelopmentProject`, `upsertListingPrice`) 모두 테스트 먼저 작성

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 기존 package.json 직접 검증
- Architecture: HIGH — 기존 코드 패턴에서 직접 추출
- Pitfalls: HIGH (DB push/RLS/백필) / MEDIUM (pg_dump 연결 형식)

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (Supabase CLI, Recharts v3 안정적)
