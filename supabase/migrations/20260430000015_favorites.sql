-- favorites 테이블에 알림 활성화 컬럼 추가
-- (테이블 자체는 0005_users.sql에서 이미 생성됨)
alter table public.favorites
  add column if not exists alert_enabled boolean not null default true;

comment on column public.favorites.alert_enabled is
  '알림 on/off 토글. price_alert_threshold 값에 관계없이 즉시 알림 발송 여부.';
