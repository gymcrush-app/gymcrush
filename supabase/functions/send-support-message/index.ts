// send-support-message
//
// Auths the caller, inserts a row into `support_messages`, and best-effort
// forwards the message to support@gymcrush.com via Resend's REST API.
//
// Required secrets:
//   SUPABASE_URL                  (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-provided)
//   RESEND_API_KEY                (set in Supabase Edge Function secrets)
//   SUPPORT_FROM_EMAIL            (optional, defaults to support@gymcrush.com once Resend domain verified)
//   SUPPORT_TO_EMAIL              (optional, defaults to support@gymcrush.com)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

type Kind = 'bug' | 'question' | 'feedback';
const VALID_KINDS: ReadonlyArray<Kind> = ['bug', 'question', 'feedback'];

interface Payload {
  kind: Kind;
  subject: string;
  body: string;
  app_version?: string | null;
  platform?: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Missing Supabase env vars' }, 500);
    }

    // Validate the caller's JWT.
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResult, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userResult.user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userId = userResult.user.id;
    const userEmail = userResult.user.email ?? null;

    const raw = (await req.json().catch(() => null)) as Payload | null;
    if (!raw) return jsonResponse({ error: 'Invalid JSON body' }, 400);

    const kind = raw.kind;
    const subject = (raw.subject ?? '').trim();
    const body = (raw.body ?? '').trim();
    const appVersion = (raw.app_version ?? null) || null;
    const platform = (raw.platform ?? null) || null;

    if (!VALID_KINDS.includes(kind)) return jsonResponse({ error: 'Invalid kind' }, 400);
    if (subject.length < 1 || subject.length > 200) {
      return jsonResponse({ error: 'Subject must be 1-200 chars' }, 400);
    }
    if (body.length < 1 || body.length > 5000) {
      return jsonResponse({ error: 'Body must be 1-5000 chars' }, 400);
    }

    // Service-role client (bypasses RLS) for the insert.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: inserted, error: insertErr } = await supabase
      .from('support_messages')
      .insert({
        user_id: userId,
        kind,
        subject,
        body,
        app_version: appVersion,
        platform,
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      console.error('[send-support-message] insert failed:', insertErr);
      return jsonResponse({ error: 'Failed to record submission' }, 500);
    }

    // Best-effort email forward. Failure here does NOT fail the request — the
    // submission is already captured in the DB.
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('SUPPORT_FROM_EMAIL') || 'support@gymcrush.com';
    const toEmail = Deno.env.get('SUPPORT_TO_EMAIL') || 'support@gymcrush.com';

    if (resendKey) {
      const kindLabel = kind === 'bug' ? 'Bug report' : kind === 'question' ? 'Support question' : 'Feedback';
      const emailSubject = `[GymCrush ${kindLabel}] ${subject}`;
      const meta = [
        `User: ${userId}${userEmail ? ` (${userEmail})` : ''}`,
        appVersion ? `App version: ${appVersion}` : null,
        platform ? `Platform: ${platform}` : null,
        `Submission id: ${inserted?.id ?? 'n/a'}`,
      ].filter(Boolean).join('\n');

      const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <p><strong>${escapeHtml(kindLabel)}</strong></p>
  <p style="white-space:pre-wrap;">${escapeHtml(body)}</p>
  <hr/>
  <pre style="font-size:12px;color:#555;white-space:pre-wrap;">${escapeHtml(meta)}</pre>
</div>`;
      const text = `${kindLabel}\n\n${body}\n\n---\n${meta}\n`;

      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            reply_to: userEmail ?? undefined,
            subject: emailSubject,
            html,
            text,
          }),
        });
        if (!resp.ok) {
          const detail = await resp.text();
          console.warn('[send-support-message] Resend non-2xx:', resp.status, detail);
        }
      } catch (err) {
        console.warn('[send-support-message] Resend fetch failed:', err);
      }
    } else {
      console.warn('[send-support-message] RESEND_API_KEY not set — skipping email forward');
    }

    return jsonResponse({ ok: true, id: inserted?.id ?? null });
  } catch (err) {
    console.error('[send-support-message] unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
