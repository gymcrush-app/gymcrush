import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Meta Conversions API (CAPI) bridge.
 *
 * Forwards in-app events from the GymCrush iOS client to Meta's Conversions
 * API for ad attribution. Server-side keeps the FACEBOOK_PIXEL_ACCESS_TOKEN
 * out of the client bundle (Meta would invalidate it if it ever leaked).
 *
 * Required secrets (set via `supabase secrets set ...`):
 *   - FACEBOOK_PIXEL_ID
 *   - FACEBOOK_PIXEL_ACCESS_TOKEN
 *
 * Request body (JSON):
 *   {
 *     "event_name": "CompleteRegistration" | "Purchase" | "Subscribe" | <custom>,
 *     "event_id": "<idempotency key, optional but recommended>",
 *     "event_time": <unix seconds, optional — defaults to now>,
 *     "user_email": "<plaintext, optional>",
 *     "user_id": "<plaintext supabase user id, optional>",
 *     "custom_data": { "value": 9.99, "currency": "USD", ... },
 *     "client_user_agent": "<from device, optional>",
 *     "test_event_code": "<from Meta Events Manager, optional, for QA>"
 *   }
 */

const META_API_VERSION = 'v18.0';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface MetaCapiRequest {
  event_name: string;
  event_id?: string;
  event_time?: number;
  user_email?: string;
  user_id?: string;
  custom_data?: Record<string, unknown>;
  client_user_agent?: string;
  test_event_code?: string;
}

interface MetaUserData {
  em?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
}

interface MetaEventPayload {
  event_name: string;
  event_time: number;
  action_source: 'app';
  event_id?: string;
  user_data: MetaUserData;
  custom_data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const pixelId = Deno.env.get('FACEBOOK_PIXEL_ID');
  const accessToken = Deno.env.get('FACEBOOK_PIXEL_ACCESS_TOKEN');
  if (!pixelId || !accessToken) {
    return jsonResponse(
      { ok: false, error: 'Meta CAPI credentials not configured' },
      500,
    );
  }

  let body: MetaCapiRequest;
  try {
    body = (await req.json()) as MetaCapiRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  if (!body.event_name) {
    return jsonResponse({ ok: false, error: 'event_name is required' }, 400);
  }

  // Best-effort client IP (Supabase forwards via x-forwarded-for)
  const forwardedFor = req.headers.get('x-forwarded-for') ?? '';
  const clientIp = forwardedFor.split(',')[0]?.trim() || undefined;

  const userData: MetaUserData = {
    client_user_agent: body.client_user_agent ?? req.headers.get('user-agent') ?? undefined,
    client_ip_address: clientIp,
  };
  if (body.user_email) {
    userData.em = [await sha256(body.user_email)];
  }
  if (body.user_id) {
    userData.external_id = [await sha256(body.user_id)];
  }

  const event: MetaEventPayload = {
    event_name: body.event_name,
    event_time: body.event_time ?? Math.floor(Date.now() / 1000),
    action_source: 'app',
    user_data: userData,
  };
  if (body.event_id) event.event_id = body.event_id;
  if (body.custom_data) event.custom_data = body.custom_data;

  const metaPayload: Record<string, unknown> = { data: [event] };
  if (body.test_event_code) metaPayload.test_event_code = body.test_event_code;

  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaPayload),
    });
    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('Meta CAPI error', resp.status, respBody);
      return jsonResponse(
        { ok: false, error: 'Meta CAPI rejected event', status: resp.status, details: respBody },
        502,
      );
    }
    return jsonResponse({ ok: true, meta: respBody });
  } catch (err) {
    console.error('Meta CAPI fetch failed', err);
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      500,
    );
  }
});
