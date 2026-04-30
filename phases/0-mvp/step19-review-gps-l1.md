# Step 19: review-gps-l1 (V0.9 스키마 준비 — 인증 배지 V1.0 활성화)

## 목표
`review_verifications` 테이블 스키마와 `GpsVerifyButton` 컴포넌트를 준비한다.  
V0.9에서는 인증(auth) 없이 GPS L1을 완료할 수 없어 **배지 표시만 준비 상태**로 제공한다.  
V1.0 인증(1-launch step0) 연동 후 GPS L1 전체 기능이 활성화된다.

## 전제 (Prerequisites)
- Step 18 완료 (후기 — `reviews` 테이블 존재)

## 적용 범위 (Scope)
- `supabase/migrations/0012_review_verifications.sql` — `review_verifications` 테이블 + V0.9 RLS
- `src/components/danji/GpsVerifyButton.tsx` — V0.9: 비활성 상태 + "V1.0 오픈 예정" 툴팁
- `src/app/api/reviews/verify-location/route.ts` — 인증 필요 401 반환 (V0.9)

## 데이터 모델

```sql
review_verifications
  id              uuid PK DEFAULT gen_random_uuid()
  review_id       uuid FK NOT NULL REFERENCES reviews(id) ON DELETE CASCADE
  user_id         uuid FK NULL REFERENCES auth.users(id) ON DELETE SET NULL
                  -- V0.9: 항상 NULL (익명). V1.0 auth 적용 후 연결
  gps_level       text NOT NULL DEFAULT 'L1'
  verified_at     timestamptz DEFAULT now()
  expires_at      timestamptz NOT NULL       -- verified_at + 1 year (ADR-046)
  complex_id      uuid FK NOT NULL REFERENCES complexes(id)
  -- 원좌표 저장 금지 (ADR-046): 서버 검증 후 결과만 저장
```

## 도메인 컨텍스트 / 가드레일

### V0.9 제약
- `user_id = NULL` — V0.9에서는 익명이므로 GPS L1 인증을 완료할 수 없음
- `/api/reviews/verify-location` POST → **401 반환** (V0.9에서는 auth 필요)
- `GpsVerifyButton` V0.9 상태: 버튼 비활성화(disabled) + 툴팁 "로그인 후 GPS 인증 가능 (V1.0 예정)"
- `ReviewCard`의 GPS 배지: V0.9에서는 L0만 표시 (L1 배지 없음)

### V1.0 활성화 계획
1-launch step0(인증) 완료 후:
- `/api/reviews/verify-location` 인증 가드 제거 → `auth.uid()` 기반 user_id 저장
- `GpsVerifyButton` 활성 상태 전환 (Geolocation API 호출 + 서버 검증)
- RLS: `user_id=auth.uid()` INSERT 정책 교체
- `geocoding_accuracy < 0.7` 단지 제외 (ADR-046)

### ADR-046 적용
- GPS L1: 단지 centroid로부터 `ST_DWithin(user_point, complex_centroid, 100)` 검증
- 원좌표(lat/lng) DB 저장 금지 — 검증 결과만 보존
- 인증 유효기간: 1년 (`expires_at = verified_at + interval '1 year'`)
- 동일 user + complex 24h 이내 재인증 차단 (V1.0 활성화 시)

### Geolocation API (V1.0 활성화 시 적용)
```js
{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
```
- TIMEOUT → "위치를 가져오는 데 시간이 걸립니다. 다시 시도해 주세요."
- 권한 거부 → "GPS를 사용할 수 없습니다. 방문 후기를 먼저 작성하고 나중에 인증할 수 있어요."

### 센트로이드 정확도 가드 (V1.0 활성화 시)
- `geocoding_accuracy < 0.7` 단지 → 인증 시도 시 400 "이 단지는 GPS 인증을 지원하지 않습니다."

## 작업 목록
1. `0012_review_verifications.sql`:
   - `review_verifications` 테이블 + RLS (`user_id=auth.uid()` — V1.0 활성화 시 적용, V0.9 INSERT 비허용)
   - `reviews.gps_level` 컬럼 존재 여부 확인 (step18 마이그레이션에서 추가됨)
2. `GpsVerifyButton.tsx`: V0.9 비활성 상태 컴포넌트 — disabled 버튼 + 툴팁
3. `/api/reviews/verify-location/route.ts`: V0.9에서 401 반환 ("V1.0 기능입니다")
4. `ReviewCard.tsx` GPS 배지 슬롯: `gps_level === 'L1'` → 배지 표시 (V0.9 항상 L0)
5. Vitest: V0.9 endpoint 401 반환 확인 + 마이그레이션 스키마 검증

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (마이그레이션 + 401 반환)
- [ ] `review_verifications` 테이블 마이그레이션 적용됨
- [ ] `GpsVerifyButton` 렌더 시 disabled 상태 + 툴팁 표시
- [ ] `/api/reviews/verify-location` POST → 401 JSON 응답
- [ ] V1.0 활성화 체크리스트 주석 `// TODO: V1.0 auth 활성화 시 제거` 포함

## V1.0 연동 체크리스트
- [ ] `GpsVerifyButton` disabled 해제 + Geolocation API 연결
- [ ] `/api/reviews/verify-location` 인증 가드 + `ST_DWithin` 검증 로직 완성
- [ ] `review_verifications` RLS: anon INSERT 금지 → `user_id=auth.uid()` INSERT 정책
- [ ] 24h 재인증 rate limit 구현
- [ ] `geocoding_accuracy < 0.7` 차단 로직

## Definition of Done
V0.9에서 스키마 준비 완료. V1.0 인증 연동 후 GPS L1 배지 즉시 활성화 가능.
