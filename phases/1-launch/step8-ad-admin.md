# Step 8 (1-launch): ad-admin + ad-billing

## 목표
광고주 어드민을 구현한다. 캠페인 등록, 상태 머신(draft→pending→approved→ended), 노출/클릭 통계, 운영자 검수 후 승인.  
**결제 모델·청구서·세금계산서** 흐름도 이 step에서 함께 구현한다 (step8-5 흡수).

## 전제 (Prerequisites)
- 1-launch step0 완료 (인증 + role)

## 적용 범위 (Scope)
- `src/app/(admin)/admin/ads/` — 운영자 광고 검수 UI
- `src/app/api/ads/campaigns/route.ts` — CRUD
- `src/app/api/ads/approve/route.ts` — 승인 (status 전이)
- 광고주 어드민 (role='advertiser'): `src/app/(admin)/admin/advertiser/`
- `src/app/(admin)/admin/billing/` — 청구서 목록·생성·다운로드
- `src/lib/billing/invoice.ts` — 청구서 PDF 생성

## 데이터 모델 추가 (결제)

```sql
-- ad_campaigns에 추가
budget_krw          bigint NOT NULL DEFAULT 0  -- 계약 금액 (원)
billing_unit        enum('cpm', 'flat_weekly', 'flat_monthly') NOT NULL DEFAULT 'flat_weekly'
invoiced_at         timestamptz NULL            -- 청구서 발행일

-- ad_invoices (신규)
id                  uuid PK DEFAULT gen_random_uuid()
campaign_id         uuid FK REFERENCES ad_campaigns(id)
advertiser_id       uuid FK REFERENCES profiles(id)
amount_krw          bigint NOT NULL
tax_amount_krw      bigint NOT NULL             -- 부가세 10%
total_krw           bigint NOT NULL             -- amount + tax
period_start        date NOT NULL
period_end          date NOT NULL
status              enum(draft, sent, paid, cancelled) DEFAULT 'draft'
invoice_number      text UNIQUE                 -- 'INV-YYYYMM-NNNN'
issued_at           timestamptz DEFAULT now()
paid_at             timestamptz NULL
notes               text NULL
```

마이그레이션 파일: `supabase/migrations/0010_ad_billing.sql`

## 도메인 컨텍스트 / 가드레일

### 광고 상태머신
- ADR-025: 상태 머신 엄격 적용. `approved`가 아닌 캠페인은 절대 게재 금지
- RLS: advertiser는 본인 캠페인만 접근
- 표시광고법: 캠페인 등록 폼에 "필수 고지 문구" 템플릿 제공
- 운영자 검수 체크리스트: 고지문구·기간·이미지 저작권 확인 체크박스 필수 통과 후 approved 전이
- `audit_logs`에 모든 상태 변경 기록

### 결제 정책 (V1 수동 청구)
- V1 결제 방식: **계좌이체 + 수동 청구**. PG 연동은 V2.
- 세금계산서는 별도 회계 툴(자이고·더존)에서 발행. 어드민은 청구서(거래명세서) PDF만 생성.
- 부가세 = 공급가액 × 10% (한국 표준). 30만원 이하는 간이 영수증 가능.
- RLS: `ad_invoices` — advertiser는 본인 invoice만 SELECT. INSERT/UPDATE는 `service_role`만.

### 광고 단가 기준 (초기값, 운영자 조정 가능)
- 배너 위치별 차등 단가:
  - 분양 광고 배너 (단지 상세 상단): 주 150,000원 (부가세 별도)
  - 중개 배너 (검색 결과): 주 50,000원 (부가세 별도)
  - 전면 광고 (랜딩 상단): 월 500,000원 (부가세 별도)
- 단가는 협의 후 확정. 위 값은 어드민 기본값으로 제공.

## 작업 목록

### 캠페인 어드민
1. 캠페인 등록 폼: ad_type, slot, target_filter(시군구·평형·키워드), 기간, **budget_krw**, **billing_unit**, creative, 고지문구
2. 상태 전이 API: pending→approved, approved→paused 등 유효 전이만 허용
3. 운영자 검수 큐: pending 목록 + 체크리스트 + 승인/거부 버튼
4. 통계 페이지: 노출수·클릭수·CTR (campaign_id 기준)
5. Vitest: 상태 전이 유효성 (rejected → approved 불가 등)

### 청구 어드민 (step8-5 흡수)
6. `0010_ad_billing.sql` 마이그레이션 — `ad_campaigns` 컬럼 추가 + `ad_invoices` 생성 + RLS
7. `invoice.ts`:
   - `generateInvoiceNumber()` → 'INV-YYYYMM-NNNN' (월별 시퀀스)
   - `createInvoice(campaignId)` → 기간·금액 계산 → DB 삽입
   - `generateInvoicePdf(invoiceId)` → React PDF로 PDF 바이트 반환
8. 어드민 청구서 목록: campaign별 invoices + 상태 필터
9. "청구서 발행" 버튼 → 초안 생성 → 미리보기 → "이메일 발송" (Resend) + "PDF 다운로드"
10. Vitest: `generateInvoiceNumber` 중복 방지 + 부가세 계산 정확성

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (상태 머신 + invoice 생성 + 부가세 계산)
- [ ] draft → approved: 체크리스트 완료 후에만 가능
- [ ] advertiser가 다른 advertiser 캠페인 조회 → RLS 차단
- [ ] 승인/거부 → `audit_logs` 기록
- [ ] 캠페인 등록 시 금액·결제 방식 입력 가능
- [ ] 어드민에서 청구서 초안 생성 → PDF 다운로드
- [ ] `ad_invoices` RLS — 광고주는 본인 invoice만 조회 가능

## Definition of Done
광고 어드민 + 결제·청구 기반 완성. step9 게재 로직과 연결 준비됨. V2 PG 연동 전까지 수동 청구·정산 가능.
