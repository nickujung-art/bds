# Step 7 (3-extras): kakao-channel

## 목표
카카오톡 채널 알림톡으로 신고가·주간 다이제스트 알림을 발송한다. 웹 푸시 거부·이메일 미사용 사용자의 대안 채널.

## 전제 (Prerequisites)
- 1-launch step3 완료 (notification-engine — 알림 큐 구조)
- 카카오 비즈니스 채널 개설 + 알림톡 서비스 신청 (KakaoWork 또는 솔루션사 계약)

## 외부 서비스 준비 (구현 전 필수)

| 항목 | 확인 |
|---|---|
| 카카오 비즈니스 채널 개설 | 사업자등록 필요 |
| 알림톡 템플릿 심의 | 카카오 검수 기간 1~2주 |
| 솔루션사 계약 (예: 알리고, NHN) | API 한도·단가 확인 |
| 사용자 카카오 전화번호 수집 동의 | 개인정보처리방침 업데이트 필요 |

## 적용 범위 (Scope)
- `src/services/kakao-alimtalk.ts` — 알림톡 어댑터
- `src/lib/notifications/kakao.ts` — 알림톡 발송 함수
- `src/app/(auth)/settings/page.tsx` — 카카오 알림 설정 추가

## 알림톡 템플릿 (심의 필요)

```
[신고가 알림]
안녕하세요, #{단지명} 즐겨찾기 회원님.
#{평형} 신고가가 #{금액}만원으로 갱신됐습니다.
▶ 상세보기: #{url}

[주간 다이제스트]
이번 주 #{관심지역} 부동산 요약
• 신고가: #{단지명} #{금액}만원
• 거래량 급증: #{단지명}
▶ 자세히 보기: #{url}
```

## 도메인 컨텍스트 / 가드레일
- `profiles`에 `kakao_phone_hash text NULL` 컬럼 추가 (전화번호는 해시만 저장, 원본 미보관)
- 알림톡 발송은 `notifications` 테이블의 기존 알림 큐 재사용 — `channel: 'kakao'` 추가
- 발송 실패 시 이메일 fallback (기존 Resend 경로)
- 발신 비용: 알림톡 건당 약 8~15원. `KAKAO_ALIMTALK_BUDGET_MONTHLY` 예산 가드 필수
- 사용자 설정: 카카오 알림 on/off (기본 off) + 전화번호 입력·삭제 (동의 철회 시 즉시 삭제)

## 작업 목록
1. 외부 서비스 준비 완료 확인
2. `profiles` 마이그레이션 (`kakao_phone_hash` 컬럼 + 동의 timestamp)
3. `kakao-alimtalk.ts`: 솔루션사 API 래퍼
4. `notifications` 테이블에 `channel` 컬럼 추가 (email/push/kakao)
5. 알림 워커에 kakao 채널 분기 추가
6. 설정 페이지: 카카오 알림 토글 + 전화번호 입력 (해시 저장)
7. 월 예산 초과 시 워커에서 건너뜀 + 운영자 알림
8. Vitest: 채널 분기 로직 + 예산 가드

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 신고가 알림 → 카카오 알림톡 발송 (sandbox 테스트)
- [ ] 발송 실패 → 이메일 fallback 확인
- [ ] 월 예산 초과 → 발송 중단 + 운영자 알림
- [ ] 전화번호 삭제 → `kakao_phone_hash=NULL` 즉시

## Definition of Done
카카오 알림톡 채널 완성. 웹 푸시 미지원 사용자 알림 도달률 향상.
