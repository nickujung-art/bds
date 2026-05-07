-- Phase 4 enum 변경 — 트랜잭션 분리 필수 (PostgreSQL 제약)
-- ALTER TYPE ... ADD VALUE는 BEGIN/COMMIT 블록 내에서 실행 불가

-- 1. report_target_type에 'comment' 추가
ALTER TYPE public.report_target_type ADD VALUE IF NOT EXISTS 'comment';

-- 2. notifications.type CHECK 제약에 'digest' 추가
--    기존: ('price_alert', 'comment', 'reply', 'system')
--    변경: ('price_alert', 'comment', 'reply', 'system', 'digest')
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('price_alert', 'comment', 'reply', 'system', 'digest'));
