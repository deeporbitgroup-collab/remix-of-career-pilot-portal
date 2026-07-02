-- Fix: "Leave Talent Pool" was broken because the edge function
-- send-talent-pool-leave sets talent_pool_users.status = 'left', but the
-- talent_pool_user_status enum never contained that value (see
-- 20251027145419_...sql). Every leave attempt failed with
-- "invalid input value for enum talent_pool_user_status: 'left'" and the
-- student was never logged out nor were the departure emails sent.
-- The Admin dashboard already renders a "Left Talent Pool" badge for this
-- status, so 'left' is the intended terminal state — add it to the enum.

ALTER TYPE public.talent_pool_user_status ADD VALUE IF NOT EXISTS 'left';
