// RevenueCat webhook endpoint.
//
// Auth:  Authorization: Bearer $RC_WEBHOOK_AUTH
// Body:  { event: { id, type, app_user_id, expiration_at_ms, ... } }
//
// Response:
//   200 — processed or duplicate (dedupe via revenuecat_events.event_id unique)
//   400 — malformed body
//   401 — bad/missing bearer
//   500 — DB error (RC retries)
//
// Deploy: `supabase functions deploy revenuecat-webhook --project-ref <ref>`
// Secret: `supabase secrets set RC_WEBHOOK_AUTH=<token> --project-ref <ref>`

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RC_WEBHOOK_AUTH = Deno.env.get('RC_WEBHOOK_AUTH') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface RcEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  environment?: 'SANDBOX' | 'PRODUCTION';
  original_transaction_id?: string;
  [k: string]: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const auth = req.headers.get('authorization') ?? '';
  if (!RC_WEBHOOK_AUTH || auth !== `Bearer ${RC_WEBHOOK_AUTH}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let envelope: { event?: RcEvent } | null;
  try {
    envelope = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const event = envelope?.event;
  if (!event || typeof event.type !== 'string') {
    return new Response(JSON.stringify({ error: 'missing event.type' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const userId = typeof event.app_user_id === 'string' && UUID_RE.test(event.app_user_id)
    ? event.app_user_id
    : null;

  // 1) Audit insert. Unique constraint on event_id dedupes RC retries.
  const auditRes = await supabase.from('revenuecat_events').insert({
    event_id: event.id ?? null,
    event_type: event.type,
    app_user_id: event.app_user_id ?? null,
    user_id: userId,
    environment: event.environment?.toLowerCase() ?? null,
    payload: event,
  });
  if (auditRes.error) {
    if ((auditRes.error as { code?: string }).code === '23505') {
      return new Response(JSON.stringify({ status: 'duplicate' }), { status: 200 });
    }
    console.error('audit insert failed', auditRes.error);
    return new Response(JSON.stringify({ error: auditRes.error.message }), { status: 500 });
  }

  // 2) Entitlement upsert (skipped for non-UUID app_user_id / audit-only types).
  const write = entitlementWrite(event, userId);
  if (!write) return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });

  const upsertRes = await supabase
    .from('plus_entitlements')
    .upsert(write, { onConflict: 'user_id' });
  if (upsertRes.error) {
    console.error('entitlement upsert failed', upsertRes.error);
    return new Response(JSON.stringify({ error: upsertRes.error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
});

function entitlementWrite(event: RcEvent, userId: string | null): Record<string, unknown> | null {
  if (!userId) return null;

  const base = {
    user_id: userId,
    entitlement_id: 'plus',
    product_id: event.product_id ?? null,
    original_transaction_id: event.original_transaction_id ?? null,
    period_type: event.period_type ?? null,
    purchase_date: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
    expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    environment: event.environment?.toLowerCase() ?? null,
    updated_at: new Date().toISOString(),
  };

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
      return { ...base, will_renew: true, unsubscribe_detected_at: null, billing_issues_detected_at: null };
    case 'CANCELLATION':
      return { ...base, will_renew: false, unsubscribe_detected_at: new Date().toISOString() };
    case 'EXPIRATION':
      return { ...base, will_renew: false };
    case 'BILLING_ISSUE':
      return { ...base, billing_issues_detected_at: new Date().toISOString() };
    case 'SUBSCRIBER_ALIAS':
    case 'TEST':
    case 'TRANSFER':
      return null;
    default:
      return null;
  }
}
