-- Audit log should not reject events whose app_user_id doesn't match a real
-- auth.users row — RC TEST events send synthetic UUIDs, and legitimate events
-- may reference deleted users. Keep user_id as a plain uuid for joins, no FK.

alter table public.revenuecat_events
  drop constraint if exists revenuecat_events_user_id_fkey;
