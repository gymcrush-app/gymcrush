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
      return jsonResponse({ error: 'Missing Supabase env vars' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    // Accept DB webhook shape: { record: { ... } }
    const record = body.record ?? body;
    const messageId: string | undefined = record.id;
    const senderId: string | undefined = record.sender_id;
    const matchId: string | null = record.match_id ?? null;
    const toUserId: string | null = record.to_user_id ?? null;
    const content: string | undefined = record.content;

    if (!senderId) return jsonResponse({ error: 'Missing sender_id' }, 400);

    // Determine notification type and recipient
    let recipientId: string | null = null;
    let notificationType: 'message' | 'message_request';
    let notificationTitle: string;
    let notificationBody: string;
    let notificationData: Record<string, unknown>;

    if (matchId) {
      // ── Match chat message ──
      // Find the other user in the match
      const { data: match } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', matchId)
        .single();

      if (!match) return jsonResponse({ error: 'Match not found' }, 404);

      recipientId = match.user1_id === senderId ? match.user2_id : match.user1_id;
      notificationType = 'message';

      // Get sender display name
      const { data: sender } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', senderId)
        .single();

      const senderName = sender?.display_name ?? 'Someone';
      const preview = content && content.length > 60
        ? content.substring(0, 57) + '...'
        : (content ?? '');

      notificationTitle = senderName;
      notificationBody = preview;
      notificationData = { type: 'message', matchId };
    } else if (toUserId) {
      // ── Message request (pre-match) ──
      recipientId = toUserId;
      notificationType = 'message_request';

      notificationTitle = 'New message request';
      notificationBody = 'Someone is interested in you. Check it out!';
      notificationData = { type: 'message_request' };
    } else {
      return jsonResponse({ error: 'Message has neither match_id nor to_user_id' }, 400);
    }

    // Don't notify yourself
    if (recipientId === senderId) {
      return jsonResponse({ ok: true, notifiedTokens: 0 });
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('message_notifications')
      .eq('user_id', recipientId)
      .maybeSingle();

    if (prefs?.message_notifications === false) {
      return jsonResponse({ ok: true, notifiedTokens: 0, skipped: 'preferences' });
    }

    // Check if recipient has blocked the sender
    const { data: block } = await supabase
      .from('blocks')
      .select('id')
      .eq('user_id', recipientId)
      .eq('blocked_user_id', senderId)
      .maybeSingle();

    if (block) {
      return jsonResponse({ ok: true, notifiedTokens: 0, skipped: 'blocked' });
    }

    // Fetch active push tokens for recipient
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', recipientId)
      .eq('is_active', true);

    const validTokens = (tokens ?? [])
      .map((t) => t.expo_push_token)
      .filter((t) => typeof t === 'string' && t.length > 0)
      .filter(isExpoPushToken);

    if (validTokens.length === 0) {
      return jsonResponse({ ok: true, notifiedTokens: 0, skipped: 'no_tokens' });
    }

    // Send via Expo Push API
    const messages = validTokens.map((to) => ({
      to,
      sound: 'notification.caf',
      title: notificationTitle,
      body: notificationBody,
      data: notificationData,
    }));

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const payload = await expoRes.json().catch(() => null);

    // Deactivate invalid tokens
    if (payload?.data && Array.isArray(payload.data)) {
      for (let i = 0; i < payload.data.length; i++) {
        const r = payload.data[i];
        const errorCode = r?.details?.error;
        if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
          const token = messages[i]?.to;
          if (token) {
            await supabase.from('push_tokens').update({ is_active: false }).eq('expo_push_token', token);
          }
        }
      }
    }

    const notifiedTokens = validTokens.length;
    return jsonResponse({ ok: true, notifiedTokens });
  } catch (error: any) {
    console.error('Error in send-message-notification:', error);
    return jsonResponse({ error: error?.message ?? 'Internal server error' }, 500);
  }
});
