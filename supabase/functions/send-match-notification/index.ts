import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SupabaseWebhookPayload = {
  type?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

type SendMatchNotificationRequest =
  | { match_id: string }
  | { user1_id: string; user2_id: string; match_id?: string }
  | SupabaseWebhookPayload;

type SendMatchNotificationResponse = {
  ok: boolean;
  notifiedTokens: number;
  skippedTokens: number;
  errors: Array<{ token?: string; message: string; details?: Json }>;
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
  });
}

function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
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
      return jsonResponse({ error: 'Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json()) as SendMatchNotificationRequest;

    let matchId: string | undefined;
    let user1Id: string | undefined;
    let user2Id: string | undefined;

    // Accept our internal payload shape
    if ('match_id' in body && typeof body.match_id === 'string' && body.match_id) {
      matchId = body.match_id;
    }
    if ('user1_id' in body && 'user2_id' in body) {
      const b: any = body as any;
      if (typeof b.user1_id === 'string') user1Id = b.user1_id;
      if (typeof b.user2_id === 'string') user2Id = b.user2_id;
      if (typeof b.match_id === 'string') matchId = b.match_id ?? matchId;
    }

    // Accept Supabase Database Webhooks shape: { record: { id, user1_id, user2_id, ... } }
    if (!matchId && 'record' in body) {
      const record = (body as SupabaseWebhookPayload).record ?? null;
      const r: any = record as any;
      if (r && typeof r === 'object') {
        if (typeof r.id === 'string') matchId = r.id;
        if (typeof r.user1_id === 'string') user1Id = r.user1_id;
        if (typeof r.user2_id === 'string') user2Id = r.user2_id;
      }
    }

    if (!matchId && !(user1Id && user2Id)) {
      return jsonResponse({ error: 'Provide match_id or (user1_id, user2_id)' }, 400);
    }

    // Resolve match + participants if only match_id was provided
    if (matchId && !(user1Id && user2Id)) {
      const { data: match, error } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .eq('id', matchId)
        .single();
      if (error || !match) return jsonResponse({ error: 'Match not found', details: error }, 404);
      user1Id = match.user1_id;
      user2Id = match.user2_id;
    }

    // Preferences: if a row exists and match_notifications is false, skip.
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, match_notifications')
      .in('user_id', [user1Id, user2Id]);

    const matchAllowedByUserId = new Map<string, boolean>();
    for (const p of prefs ?? []) {
      matchAllowedByUserId.set(p.user_id, p.match_notifications !== false);
    }

    const recipients = [user1Id!, user2Id!].filter((uid) => matchAllowedByUserId.get(uid) !== false);

    if (recipients.length === 0) {
      const empty: SendMatchNotificationResponse = { ok: true, notifiedTokens: 0, skippedTokens: 0, errors: [] };
      return jsonResponse(empty, 200);
    }

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('expo_push_token, user_id, is_active')
      .in('user_id', recipients)
      .eq('is_active', true);

    if (tokensError) return jsonResponse({ error: 'Failed to fetch push tokens', details: tokensError }, 500);

    const validTokens = (tokens ?? [])
      .map((t) => t.expo_push_token)
      .filter((t) => typeof t === 'string' && t.length > 0)
      .filter(isExpoPushToken);

    if (validTokens.length === 0) {
      const empty: SendMatchNotificationResponse = { ok: true, notifiedTokens: 0, skippedTokens: 0, errors: [] };
      return jsonResponse(empty, 200);
    }

    // Minimal payload for infra; app can fetch details after tap.
    const messages = validTokens.map((to) => ({
      to,
      sound: 'notification.caf',
      title: "It's a GymCrush",
      body: 'You have a new GymCrush. Say hi.',
      data: { type: 'match', matchId: matchId ?? null },
    }));

    // Expo Push API accepts up to 100 messages per request.
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

    let notifiedTokens = 0;
    let skippedTokens = 0;
    const errors: SendMatchNotificationResponse['errors'] = [];

    for (const chunk of chunks) {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      const payload = (await expoRes.json().catch(() => null)) as any;
      if (!expoRes.ok) {
        errors.push({ message: `Expo push API error: ${expoRes.status}`, details: payload ?? null });
        skippedTokens += chunk.length;
        continue;
      }

      const receipts = payload?.data;
      if (!Array.isArray(receipts)) {
        // Unexpected but treat as delivered to avoid retry storm.
        notifiedTokens += chunk.length;
        continue;
      }

      for (let i = 0; i < receipts.length; i++) {
        const r = receipts[i];
        const token = chunk[i]?.to as string | undefined;
        if (r?.status === 'ok') {
          notifiedTokens += 1;
          continue;
        }

        skippedTokens += 1;
        errors.push({
          token,
          message: r?.message ?? 'Unknown Expo receipt error',
          details: r?.details ?? null,
        });

        // If Expo says token is invalid, deactivate it.
        const errorCode = r?.details?.error;
        if (token && (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials')) {
          await supabase.from('push_tokens').update({ is_active: false }).eq('expo_push_token', token);
        }
      }
    }

    // Update last_used_at for all tokens we attempted to send to (even if some failed).
    await supabase
      .from('push_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .in('expo_push_token', validTokens);

    const res: SendMatchNotificationResponse = {
      ok: errors.length === 0,
      notifiedTokens,
      skippedTokens,
      errors,
    };

    return jsonResponse(res, 200);
  } catch (error: any) {
    console.error('Error in send-match-notification:', error);
    return jsonResponse({ error: error?.message ?? 'Internal server error' }, 500);
  }
});

