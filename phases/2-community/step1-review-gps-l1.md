# Step 1 (2-community): review-gps-l1

> **⚠️ V0.9로 분할 이동됨**:  
> - DB 스키마(`review_verifications`) 및 비활성 UI → `phases/0-mvp/step19-review-gps-l1.md` (V0.9)  
> - V1.0 인증 연동 후 이 파일의 전체 구현(`ST_DWithin` 검증, 배지 활성화, 24h rate-limit)이 적용됩니다.

## 목표
후기 작성 시 GPS 위치 인증(Level 1)을 구현한다. 단지 반경 ±100m 내 GPS 수신 1회로 L1 배지 획득. 인증 결과만 저장하고 원좌표는 저장하지 않는다.

## 전제 (Prerequisites)
- 2-community step0 완료 (reviews 테이블)

## 적용 범위 (Scope)
- `supabase/migrations/0012_review_verifications.sql` — `review_verifications` 테이블
- `src/components/danji/GpsVerifyButton.tsx` — 브라우저 Geolocation 요청 + 서버 검증
- `src/app/api/reviews/verify-location/route.ts` — 서버사이드 좌표 검증

## 데이터 모델

```sql
review_verifications
  id              uuid PK
  review_id       uuid FK NOT NULL
  user_id         uuid FK NOT NULL
  gps_level       enum(L1) DEFAULT 'L1'
  verified_at     timestamptz DEFAULT now()
  expires_at      timestamptz                -- verified_at + 1 year (ADR-046)
  complex_id      uuid FK NOT NULL           -- 검증 대상 단지
  -- 원좌표 저장 금지 (ADR-046): 서버에서 검증 후 결과만 저장
```

## 도메인 컨텍스트 / 가드레일
- ADR-046: GPS L1 — 단지 centroid로부터 ±100m 이내. 원좌표 서버에 저장 금지. 검증 결과(`gps_level`, `verified_at`)만 보존. 인증 1년 후 만료 (`expires_at`)
- **브라우저 위치 권한 거부 시 fallback**: "GPS를 사용할 수 없습니다. 방문 후기를 먼저 작성하고 나중에 인증할 수 있어요." 안내 UX. 인증 없이도 후기 작성 가능 (L0)
- **스푸핑 방어**: 동일 user_id + complex_id 조합은 24h 이내 재인증 차단 (rate limit). 재인증은 expires_at 갱신
- **서버사이드 검증만**: 클라이언트가 위도·경도를 서버에 전달 → `ST_DWithin(user_point, complex_centroid, 100)` 검증 → true이면 verification INSERT. 클라이언트 단독 검증 금지
- 인증 완료 시 `reviews.gps_level = 'L1'` 업데이트

### Geolocation API 호출 설정
- `navigator.geolocation.getCurrentPosition()` 옵션 명시:
  ```js
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  ```
- `enableHighAccuracy: true`: GPS 칩 우선 사용 (Wi-Fi 기반 위치보다 정확)
- `timeout: 10000`: 10초 초과 시 `PositionError.TIMEOUT` → 사용자에게 "위치를 가져오는 데 시간이 걸립니다. 다시 시도해 주세요." 안내
- `maximumAge: 0`: 캐시 좌표 사용 금지 (최신 위치만 허용 — 스푸핑 방지)

### 센트로이드 정확도 가드
- 단지의 `geocoding_accuracy < 0.7` (센트로이드 fallback 단지)인 경우:
  - GPS L1 인증 대상에서 **제외** — 센트로이드 위치 자체가 부정확하여 ±100m 기준 신뢰 불가
  - 인증 시도 시 400 "이 단지는 위치 정보가 충분하지 않아 GPS 인증을 지원하지 않습니다." 반환
- `geocoding_accuracy >= 0.7` (행안부 또는 카카오 매칭 단지) 만 L1 대상

## 작업 목록
1. `0012_review_verifications.sql` 마이그레이션 + RLS (user_id=auth.uid()만)
2. `/api/reviews/verify-location`: lat/lng 수신 → centroid accuracy 체크 → `ST_DWithin` 검증 → verification INSERT + `reviews.gps_level` 업데이트. 24h 이내 중복 요청 → 429
3. `GpsVerifyButton.tsx`: `enableHighAccuracy:true, timeout:10000, maximumAge:0` 옵션 → 서버 POST → 성공 시 배지 즉시 표시. TIMEOUT/권한 거부 분기 안내 메시지
4. `ReviewCard.tsx`에 L1 배지 추가 (step0에서 placeholder 처리됨)
5. Vitest: `ST_DWithin` 검증 함수 단위 테스트 (100m 경계 케이스 + accuracy < 0.7 차단)
6. Playwright E2E: 위치 권한 거부 → fallback UX 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (100m 경계 케이스 포함)
- [ ] 단지 100m 이내 좌표 → L1 배지 획득
- [ ] 단지 100m 초과 좌표 → 인증 실패 메시지
- [ ] 위치 권한 거부 → fallback 메시지 표시, 후기 작성은 가능
- [ ] DB에 원좌표(lat/lng) 저장 안 됨 확인
- [ ] 동일 사용자 24h 이내 재인증 시도 → 429

## Definition of Done
GPS L1 인증 완료. 인증 후기에 배지 표시. ADR-046 원좌표 비저장 준수.
