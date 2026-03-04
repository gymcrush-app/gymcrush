/**
 * Seed Script for Test Messages
 * 
 * Creates matches and messages between the current user and test profiles.
 * 
 * Usage:
 *   npx tsx scripts/seed-messages.ts
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

// Sample conversation starters and messages
const conversationStarters = [
  { from: 'other', text: 'Hey! Saw you at the gym today. Great workout!' },
  { from: 'current', text: 'Thanks! You too. Are you usually here in the mornings?' },
  { from: 'other', text: 'Yeah, usually around 7am. What about you?' },
  { from: 'current', text: 'Same! Maybe we\'ll see each other again tomorrow.' },
  { from: 'other', text: 'Definitely! Would be cool to have a workout partner.' },
];

const casualConversations = [
  [
    { from: 'other', text: 'Hey! 👋' },
    { from: 'current', text: 'Hey there! How\'s it going?' },
    { from: 'other', text: 'Pretty good! Just finished a leg day. How about you?' },
    { from: 'current', text: 'Nice! I\'m planning to hit legs tomorrow. Any tips?' },
    { from: 'other', text: 'Definitely focus on form over weight. And don\'t skip the warm-up!' },
  ],
  [
    { from: 'current', text: 'Hey! I saw your profile and we have similar fitness goals.' },
    { from: 'other', text: 'Oh cool! What are you working towards?' },
    { from: 'current', text: 'Trying to build more functional strength. What about you?' },
    { from: 'other', text: 'Same! I love functional training. It\'s so practical.' },
    { from: 'current', text: 'Exactly! Want to maybe train together sometime?' },
    { from: 'other', text: 'That sounds great! I\'m usually at the gym weekday mornings.' },
  ],
  [
    { from: 'other', text: 'Hi! Your approach prompt made me laugh 😄' },
    { from: 'current', text: 'Haha glad you liked it! Belt squats really are underrated.' },
    { from: 'other', text: 'I\'ve never tried them. Are they better than regular squats?' },
    { from: 'current', text: 'They\'re great for targeting quads without loading the spine. Worth trying!' },
    { from: 'other', text: 'I\'ll have to give them a shot. Thanks for the tip!' },
  ],
];

async function getOtherUsers() {
  // Get all profiles except the current user
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .neq('id', CURRENT_USER_ID)
    .eq('is_onboarded', true)
    .limit(10);

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

async function createMessage(
  matchId: string,
  senderId: string,
  content: string,
  createdAt: Date
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: senderId,
      content,
      created_at: createdAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error(`Error creating message:`, error);
    throw error;
  }

  return data;
}

function getRandomConversation() {
  const allConversations = [conversationStarters, ...casualConversations];
  return allConversations[Math.floor(Math.random() * allConversations.length)];
}

async function seedMessagesForMatch(matchId: string, otherUserId: string, conversation: typeof conversationStarters) {
  const messages = [];
  const now = new Date();
  
  // Spread messages over the last few days
  let messageTime = new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000); // Random time in last 3 days
  
  for (const msg of conversation) {
    const senderId = msg.from === 'current' ? CURRENT_USER_ID : otherUserId;
    
    // Add some randomness to message timing (1-6 hours between messages)
    messageTime = new Date(messageTime.getTime() + (1 + Math.random() * 5) * 60 * 60 * 1000);
    
    try {
      const message = await createMessage(matchId, senderId, msg.text, messageTime);
      messages.push(message);
      
      // Mark some messages as read (older messages from other user)
      if (msg.from === 'other' && Math.random() > 0.3) {
        await supabase
          .from('messages')
          .update({ read_at: new Date(messageTime.getTime() + 1000 * 60 * 30).toISOString() }) // Read 30 min later
          .eq('id', message.id);
      }
    } catch (error: any) {
      console.error(`  ✗ Failed to create message:`, error.message);
    }
  }
  
  return messages;
}

async function main() {
  console.log('Starting message seed script...\n');
  console.log(`Current user ID: ${CURRENT_USER_ID}\n`);

  try {
    // Get other users
    const otherUsers = await getOtherUsers();
    console.log(`Found ${otherUsers.length} other users\n`);

    if (otherUsers.length === 0) {
      console.log('No other users found. Please run seed-profiles.ts first to create test users.');
      process.exit(0);
    }

    // Create matches with 3-5 random users
    const numMatches = Math.min(3 + Math.floor(Math.random() * 3), otherUsers.length);
    const selectedUsers = otherUsers
      .sort(() => Math.random() - 0.5)
      .slice(0, numMatches);

    console.log(`Creating matches with ${selectedUsers.length} users...\n`);

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
            createdMatches.push({ match: existingMatch, otherUser });
          }
        } else {
          console.error(`  ✗ Failed to create match:`, error.message);
        }
      }
    }

    console.log(`\n✓ Created/found ${createdMatches.length} matches\n`);

    // Create messages for each match
    console.log('Creating messages...\n');
    let totalMessages = 0;

    for (const { match, otherUser } of createdMatches) {
      if (!match) {
        console.error(`  ✗ Skipping messages: match is null for ${otherUser.display_name}`);
        continue;
      }
      try {
        console.log(`Adding messages with ${otherUser.display_name}...`);
        const conversation = getRandomConversation();
        const messages = await seedMessagesForMatch(match.id, otherUser.id, conversation);
        console.log(`  ✓ Created ${messages.length} messages`);
        totalMessages += messages.length;
      } catch (error: any) {
        console.error(`  ✗ Failed to create messages:`, error.message);
      }
    }

    console.log(`\n✓ Seed script completed!`);
    console.log(`  Created/found ${createdMatches.length} matches`);
    console.log(`  Created ${totalMessages} messages`);
    console.log(`\nYou can now view these conversations in the chat tab!`);
  } catch (error: any) {
    console.error('\n✗ Seed script failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
