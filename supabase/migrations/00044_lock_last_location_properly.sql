-- Audit finding #2 (continued): the column-level REVOKE in migration 00042
-- was a no-op because Supabase grants `authenticated` and `anon` *table-level*
-- SELECT on every public table by default. Table-level SELECT covers all
-- columns regardless of column-specific revokes, so:
--   REVOKE SELECT (last_location) ON profiles FROM authenticated;
-- had no effect.
--
-- Confirmed 2026-05-22 via:
--   SELECT has_table_privilege('authenticated', 'public.profiles', 'SELECT');
--   -- true
--   SELECT has_column_privilege('authenticated', 'public.profiles', 'last_location', 'SELECT');
--   -- true
--   SELECT last_location FROM profiles LIMIT 1;
--   -- impersonated as `authenticated`, returned a row (NULL value but no 42501 error)
--
-- Correct lockdown: revoke table-level SELECT, then re-grant column-level
-- SELECT on the explicit allowlist (everything except last_location*).
-- RLS USING/WITH CHECK expressions still work because policy evaluation
-- bypasses column-level privilege checks. SECURITY DEFINER helpers and
-- service_role retain full access.
--
-- Client compatibility: every client path that read `profiles` was already
-- migrated to use the `PROFILE_COLUMNS` constant in 00042's companion commit,
-- so `select('*')` is no longer used anywhere. UPDATE/INSERT privileges are
-- unchanged.

BEGIN;

REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (
  id,
  display_name,
  age,
  gender,
  bio,
  fitness_disciplines,
  photo_urls,
  home_gym_id,
  is_visible,
  is_onboarded,
  discovery_preferences,
  created_at,
  updated_at,
  height,
  occupation,
  last_gem_given_at,
  gems_received_count,
  religion,
  alcohol,
  smoking,
  marijuana,
  has_kids,
  ethnicity
) ON public.profiles TO authenticated, anon;

COMMIT;
