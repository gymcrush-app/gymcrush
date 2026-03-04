/**
 * Seed Script for Matches Only (No Messages)
 * 
 * Creates matches between the current user and test profiles without any messages.
 * 
 * Usage:
 *   npx tsx scripts/seed-matches-only.ts
 * 
 * Requires:
 *   - .env (or ENVFILE) with EXPO_PUBLIC_SUPABASE_URL and either
 *     SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY (for local).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { getSupabaseConfig } from './env';

const { url: supabaseUrl, serviceRoleKey } = getSupabaseConfig();

// Current user ID (from the user's profile)
const CURRENT_USER_ID = 'f077f2c2-9e3f-42ba-9c22-a91441460989';

// Create admin client with service role key
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getOtherUsers() {
  // Get all profiles except the current user
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .neq('id', CURRENT_USER_ID)
    .eq('is_onboarded', true)
    .limit(20);

  if (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }

  return profiles || [];
}

async function createMatch(user1Id: string, user2Id: string) {
  // Ensure user1_id < user2_id (as per schema constraint)
  const [user1, user2] = [user1Id, user2Id].sort();
  
  const { data, error } = await supabase
    .from('matches')
    .insert({
      user1_id: user1,
      user2_id: user2,
    })
    .select()
    .single();

  if (error) {
    // Match might already exist, try to fetch it
    if (error.code === '23505') {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single();
      return existingMatch;
    }
    throw error;
  }

  return data;
}

async function checkMatchHasMessages(matchId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', matchId);

  if (error) {
    console.error(`Error checking messages for match ${matchId}:`, error);
    return false;
  }

  return (count || 0) > 0;
}

async function main() {
  console.log('Starting matches-only seed script...\n');
  console.log(`Current user ID: ${CURRENT_USER_ID}\n`);

  try {
    // Get other users
    const otherUsers = await getOtherUsers();
    console.log(`Found ${otherUsers.length} other users\n`);

    if (otherUsers.length === 0) {
      console.log('No other users found. Please run seed-profiles.ts first to create test users.');
      process.exit(0);
    }

    // Get existing matches to avoid duplicates
    const { data: existingMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${CURRENT_USER_ID},user2_id.eq.${CURRENT_USER_ID}`);

    if (matchesError) {
      console.error('Error fetching existing matches:', matchesError);
      throw matchesError;
    }

    const existingMatchUserIds = new Set<string>();
    if (existingMatches) {
      for (const match of existingMatches) {
        const otherUserId = match.user1_id === CURRENT_USER_ID ? match.user2_id : match.user1_id;
        existingMatchUserIds.add(otherUserId);
      }
    }

    // Filter out users we already have matches with
    const availableUsers = otherUsers.filter(
      (user) => !existingMatchUserIds.has(user.id)
    );

    if (availableUsers.length === 0) {
      console.log('All available users already have matches. Skipping match creation.');
      process.exit(0);
    }

    // Create matches with 5-10 random users (or all available if less than 5)
    const numMatches = Math.min(5 + Math.floor(Math.random() * 6), availableUsers.length);
    const selectedUsers = availableUsers
      .sort(() => Math.random() - 0.5)
      .slice(0, numMatches);

    console.log(`Creating ${selectedUsers.length} matches (without messages)...\n`);

    const createdMatches = [];
    for (const otherUser of selectedUsers) {
      try {
        console.log(`Creating match with ${otherUser.display_name}...`);
        const match = await createMatch(CURRENT_USER_ID, otherUser.id);
        if (!match) {
          console.error(`  ✗ Failed to create match: match is null`);
          continue;
        }
        console.log(`  ✓ Match created: ${match.id}`);
        createdMatches.push({ match, otherUser });
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`  ℹ Match already exists with ${otherUser.display_name}`);
          // Fetch existing match
          const [user1, user2] = [CURRENT_USER_ID, otherUser.id].sort();
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('*')
            .eq('user1_id', user1)
            .eq('user2_id', user2)
            .single();
          if (existingMatch) {
            // Only include if it has no messages
            const hasMessages = await checkMatchHasMessages(existingMatch.id);
            if (!hasMessages) {
              createdMatches.push({ match: existingMatch, otherUser });
              console.log(`  ✓ Using existing match (no messages)`);
            } else {
              console.log(`  ⊘ Skipping: match already has messages`);
            }
          }
        } else {
          console.error(`  ✗ Failed to create match:`, error.message);
        }
      }
    }

    console.log(`\n✓ Seed script completed!`);
    console.log(`  Created/found ${createdMatches.length} matches (without messages)`);
    console.log(`\nYou can now view these matches in the chat tab's "New Matches" section!`);
  } catch (error: any) {
    console.error('\n✗ Seed script failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
