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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    // Authenticate the requesting user via their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'Missing Supabase env vars' }, 500);
    }

    // User client — to verify the JWT is valid
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Invalid token' }, 401);

    const userId = user.id;

    // Admin client — for deleting data and the auth user
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data from all tables (order matters for foreign keys)
    // Tables with foreign keys to profiles or user IDs:
    const deletions = [
      admin.from('messages').delete().or(`sender_id.eq.${userId},to_user_id.eq.${userId}`),
      admin.from('match_views').delete().or(`user_id.eq.${userId}`),
      admin.from('gem_gifts').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`),
      admin.from('push_tokens').delete().eq('user_id', userId),
      admin.from('notification_preferences').delete().eq('user_id', userId),
      admin.from('request_ignores').delete().or(`user_id.eq.${userId},ignored_user_id.eq.${userId}`),
      admin.from('reports').delete().or(`reporter_id.eq.${userId},reported_id.eq.${userId}`),
      admin.from('profile_prompts').delete().eq('user_id', userId),
    ];

    // Run independent deletions in parallel
    const results = await Promise.allSettled(deletions);
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('Deletion error:', r.reason);
      }
    }

    // Delete likes and matches (likes reference profiles, matches reference users)
    await admin.from('likes').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    await admin.from('matches').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // Delete profile
    await admin.from('profiles').delete().eq('id', userId);

    // Delete avatar storage files
    const { data: avatarFiles } = await admin.storage.from('avatars').list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const filePaths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await admin.storage.from('avatars').remove(filePaths);
    }

    // Delete the auth user
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError);
      return jsonResponse({ error: 'Failed to delete auth user' }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error: any) {
    console.error('Error in delete-account:', error);
    return jsonResponse({ error: error?.message ?? 'Internal server error' }, 500);
  }
});
