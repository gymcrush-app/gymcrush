/**
 * Load .env (or ENVFILE) and expose Supabase config for seed scripts.
 * Usage: ENVFILE=.env.staging npx tsx scripts/seed-profiles.ts
 */
import dotenv from 'dotenv';

const envFile = process.env.ENVFILE || '.env';
dotenv.config({ path: envFile });

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const isLocal = url.includes('127.0.0.1') || url.includes('localhost');
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (isLocal ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY : undefined);

  if (!serviceRoleKey) {
    if (isLocal) {
      console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
      console.error('Load from .env or run: supabase status, then set the anon key in .env');
    } else {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY for remote Supabase.');
      console.error('Set it in your .env (e.g. .env.staging) from Dashboard → Settings → API.');
    }
    console.error(`\nExample: ENVFILE=${envFile} npx tsx scripts/<script>.ts\n`);
    process.exit(1);
  }

  return { url, serviceRoleKey };
}
