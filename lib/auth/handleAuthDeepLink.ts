import type { EmailOtpType } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function isEmailOtpType(value: unknown): value is EmailOtpType {
  return typeof value === 'string' && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Parse an incoming deep link and, if it carries Supabase auth params,
 * establish the session with Supabase. This causes the appropriate
 * auth event (e.g. PASSWORD_RECOVERY) to fire, which the auth state
 * listener in app/_layout.tsx handles for routing.
 *
 * Returns true if the URL was an auth link we handled, false otherwise —
 * so callers can decide whether to swallow it or pass it to other handlers.
 */
export async function handleAuthDeepLink(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;

  let parsed: ReturnType<typeof Linking.parse>;
  try {
    parsed = Linking.parse(url);
  } catch {
    return false;
  }

  const params = parsed.queryParams ?? {};
  const code = typeof params.code === 'string' ? params.code : undefined;
  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : undefined;
  const type = isEmailOtpType(params.type) ? params.type : undefined;
  const errorDescription =
    typeof params.error_description === 'string' ? params.error_description : undefined;

  if (errorDescription) {
    console.warn('[auth deep link] error from supabase:', errorDescription);
    return true;
  }

  // PKCE flow: ?code=<auth_code>
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn('[auth deep link] exchangeCodeForSession failed:', error.message);
    return true;
  }

  // OTP flow: ?token_hash=<hash>&type=recovery|signup|email|magiclink|invite|email_change
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.warn('[auth deep link] verifyOtp failed:', error.message);
    return true;
  }

  return false;
}
