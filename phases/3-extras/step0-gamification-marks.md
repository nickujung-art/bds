# Step 0 (3-extras): gamification-marks

## 목표
회원 활동(즐겨찾기·후기·알림 클릭)을 기반으로 등급 배지와 단지 마크(인기·신고가·활발)를 구현한다. ADR-010: V1.0 이후 차별화 자산.

## 전제 (Prerequisites)
- 2-community step0 완료 (reviews)
- 1-launch step2 완료 (favorites)
- 1-launch step3 완료 (notification-engine)

## 적용 범위 (Scope)
- `supabase/migrations/0020_gamification.sql` — `member_tiers`, `complex_marks` 테이블
- `src/lib/gamification/marks.ts` — 단지 마크 산식
- `src/lib/gamification/tiers.ts` — 회원 등급 산식
- `src/components/danji/ComplexMarks.tsx`
- `src/components/shared/MemberBadge.tsx`

## 단지 마크 정의

| 마크 | 아이콘 | 조건 |
|---|---|---|
| 신고가 | 🔥 | 최근 30일 내 신고가 갱신 |
| 인기 | 👑 | 즐겨찾기 상위 10% (지역 내) |
| 활발 | 💬 | 후기 ≥ 5건 AND 최근 30일 내 신규 후기 ≥ 1건 |

## 회원 등급 정의

| 등급 | 조건 |
|---|---|
| 새내기 | 가입 |
| 임장러 | 즐겨찾기 ≥ 5 OR 지도 방문 ≥ 10회 |
| 이웃 | 후기 ≥ 1건 (GPS L1 이상) |
| 단골 | 알림 클릭률 ≥ 50% AND 30일 리텐션 |
| 전문가 | 후기 ≥ 5건 AND cafe_verified |

## 도메인 컨텍스트 / 가드레일
- 마크는 단지 카드·단지 상세 헤더에 최대 2개만 표시 (혼잡 방지). 우선순위: 신고가 > 인기 > 활발
- 마크·등급은 일배치 cron에서 갱신 (실시간 갱신 불필요)
- `complex_marks`: `snapshot_date`별 보존 → 추이 분석 가능
- 등급은 `profiles.member_tier` 컬럼으로 저장. 등급 강등 없음 (한번 획득 유지)
- UI: 이모지 대신 Lucide 아이콘 + 텍스트 라벨 사용 (UI_GUIDE 원칙). 이모지는 index.json 타이틀에만

## 작업 목록
1. `0020_gamification.sql`: `complex_marks(complex_id, mark_type, snapshot_date)` + `profiles.member_tier` 컬럼
2. `marks.ts`: `computeComplexMarks(complexId)` — 신고가·인기·활발 기준 계산
3. `tiers.ts`: `computeMemberTier(userId)` — 등급 산식
4. 일배치 cron에 마크·등급 갱신 단계 추가
5. `ComplexMarks.tsx`: 단지 카드 + 상세 헤더에 마크 배지 (최대 2개)
6. `MemberBadge.tsx`: 프로필·후기 작성자 옆 등급 표시
7. Vitest: 마크 기준 경계값 + 등급 전환 케이스

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (마크·등급 산식 단위 테스트)
- [ ] 신고가 갱신 단지 → 🔥 마크 표시 (다음 일배치 후)
- [ ] 즐겨찾기 5개 등록 → 임장러 등급
- [ ] 단지 카드 마크 최대 2개 제한

## Definition of Done
게이미피케이션 마크·등급 완성. 회원 참여 유인 + 단지 인기 신호 시각화.
