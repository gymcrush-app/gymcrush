/**
 * Reset and Seed Script
 *
 * Clears all existing user data (except current user) and seeds 100 new profiles
 * (80 females, 20 males) at the current user's home gym with last_location at
 * various distances from the gym (0.5–25 miles). Relationships:
 * - 20 matched users (mutual likes; subset with conversations and reaction messages)
 * - 30 message requests: 10 swipe-up, 10 comment-on-image, 10 comment-on-prompt
 * - 50 one-way likes (mix of directions)
 *
 * Usage:
 *   npx tsx scripts/reset-and-seed.ts
 *
 * Requires:
 *   - .env (or ENVFILE) with EXPO_PUBLIC_SUPABASE_URL and either
 *     SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY (for local).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Intent } from '../types/onboarding';
import { parseLocation } from '../lib/utils/distance';
import { getSupabaseConfig } from './env';

const { url: supabaseUrl, serviceRoleKey } = getSupabaseConfig();

// Create admin client with service role key
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Current user ID (from the user's profile)
const CURRENT_USER_ID = 'f077f2c2-9e3f-42ba-9c22-a91441460989';

// Seed counts
const NUM_FEMALE = 80;
const NUM_MALE = 20;
const NUM_MATCHES = 20;
const NUM_MESSAGE_REQUESTS = 30;
const NUM_MESSAGE_REQUESTS_SWIPE_UP = 10;
const NUM_MESSAGE_REQUESTS_IMAGE = 10;
const NUM_MESSAGE_REQUESTS_PROMPT = 10;
const NUM_ONE_WAY_LIKES = 50;
const NUM_MATCHES_WITH_CONVERSATIONS = 10;

// Distance from gym for last_location (miles)
const MIN_DISTANCE_MILES = 0.5;
const MAX_DISTANCE_MILES = 25;

// Base names (cycled with suffix for 80 female / 20 male distinct display names)
const femaleNames = [
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Ava', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth',
];
const maleNames = [
  'James', 'Michael', 'David', 'Daniel', 'Matthew', 'Christopher',
  'Andrew', 'Joseph', 'William', 'Alexander', 'Ryan', 'John',
  'Nathan', 'Samuel', 'Benjamin', 'Henry', 'Owen', 'Jack', 'Luke', 'Leo',
];

function getFemaleDisplayName(index: number): string {
  return `${femaleNames[index % femaleNames.length]}-${index}`;
}
function getMaleDisplayName(index: number): string {
  return `${maleNames[index % maleNames.length]}-${index}`;
}

// Fitness disciplines combinations
const disciplineCombos = [
  ['bodybuilding', 'powerlifting'],
  ['yoga', 'functional'],
  ['running', 'yoga'],
  ['powerlifting', 'olympic'],
  ['crossfit', 'functional'],
  ['bodybuilding', 'running'],
  ['yoga', 'general'],
  ['functional', 'general'],
  ['crossfit', 'sports'],
  ['bodybuilding', 'general'],
  ['powerlifting', 'bodybuilding'],
  ['yoga', 'running'],
  ['functional', 'crossfit'],
  ['olympic', 'powerlifting'],
  ['sports', 'general'],
  ['bodybuilding', 'crossfit'],
  ['yoga', 'functional'],
  ['running', 'general'],
  ['powerlifting', 'general'],
  ['bodybuilding', 'functional'],
];

// Bio templates
const bioTemplates = [
  'Fitness enthusiast looking for a workout partner!',
  'Love pushing my limits at the gym. Let\'s train together!',
  'Yoga and strength training keep me balanced.',
  'Always chasing new PRs. Looking for someone to spot me!',
  'Early morning gym sessions are my favorite.',
  'Fitness is my passion. Let\'s motivate each other!',
  'Love trying new workouts and challenges.',
  'Gym is my happy place. Looking for a training buddy!',
  'Strength training and cardio enthusiast.',
  'Always up for a good workout session!',
  'Fitness model and athlete. Let\'s get strong together!',
  'Competitive athlete looking for training partners.',
  'Yoga instructor and fitness coach.',
  'Powerlifter chasing new personal records.',
  'CrossFit enthusiast and functional movement lover.',
  'Bodybuilder focused on building strength.',
  'Marathon runner and strength training fan.',
  'Fitness coach looking for motivated partners.',
  'Always training for the next challenge.',
  'Gym regular looking for workout accountability.',
];

// Prompt templates
const promptTemplates = [
  'My gym hot take is... leg day is the best day.',
  'The way to my heart is through... a good protein shake after class.',
  'My ideal post-workout meal is... anything with protein and carbs.',
  'You\'ll find me at the gym when... the sun is rising.',
  'The exercise I love to hate is... deadlifts.',
  'My gym playlist always includes... high-energy beats.',
  'After leg day, I\'m usually... foam rolling everything.',
  'My fitness journey started because... I wanted to feel confident.',
  'The way to win me over is... spot me on bench press.',
  'I\'m looking for... someone who understands 5am gym sessions.',
  'My gym hot take is... cardio doesn\'t kill gains if done right.',
  'The way to my heart is through... perfect squat form.',
  'My ideal workout partner is... someone who pushes me.',
  'You\'ll find me at the gym when... it\'s empty and quiet.',
  'The exercise I love to hate is... burpees.',
  'My gym playlist always includes... motivational tracks.',
  'After leg day, I\'m usually... walking like a penguin.',
  'My fitness journey started because... I wanted to be strong.',
  'The way to win me over is... share your protein shake.',
  'I\'m looking for... a workout partner who shows up consistently.',
];

// Intent types
const intentTypes: Intent[] = ['meet_trainer', 'casual', 'longterm', 'open'];

// Conversation templates for matched conversations
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

// Message request templates (single messages, not conversations)
const messageRequestTemplates = [
  'Hey! Saw your profile and thought we\'d make great workout partners!',
  'Hi! Your fitness goals align with mine. Want to train together?',
  'Hey there! I noticed we both love powerlifting. Let\'s connect!',
  'Hi! I\'m looking for a workout buddy and you seem like a great fit.',
  'Hey! Your approach prompt caught my attention. Would love to chat!',
  'Hi there! We have similar disciplines. Want to meet up at the gym?',
  'Hey! I\'m always looking for motivated training partners. Interested?',
  'Hi! Your profile stood out to me. Would you be interested in training together?',
];

// Reaction messages (from other user reacting to current user's prompt or image)
const promptReactionTemplates: { content: string; answer: string }[] = [
  { content: 'Haha same! Leg day really is the best.', answer: 'Same! Leg day is the best day.' },
  { content: 'That made me laugh 😄', answer: 'Leg day is the best day.' },
  { content: 'Couldn\'t agree more!', answer: 'Focus on form over weight.' },
  { content: 'Love that take!', answer: 'Early morning sessions.' },
  { content: 'So true!', answer: 'Someone who pushes me.' },
];
const imageReactionTemplates = [
  'Love that photo!',
  'Great pics 👌',
  'You look strong!',
];

const EARTH_RADIUS_MILES = 3959;

/**
 * Compute a point at a given distance and bearing from an origin (destination point formula).
 * @param origin { lat, lng } in degrees
 * @param distanceMiles distance in miles
 * @param bearingRadians optional bearing in radians (0 = North); default random 0–2π
 */
function pointAtDistanceMiles(
  origin: { lat: number; lng: number },
  distanceMiles: number,
  bearingRadians?: number
): { lat: number; lng: number } {
  const bearing = bearingRadians ?? Math.random() * 2 * Math.PI;
  const dRad = distanceMiles / EARTH_RADIUS_MILES;
  const lat1Rad = (origin.lat * Math.PI) / 180;
  const lon1Rad = (origin.lng * Math.PI) / 180;

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(dRad) +
      Math.cos(lat1Rad) * Math.sin(dRad) * Math.cos(bearing)
  );
  const lon2Rad =
    lon1Rad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dRad) * Math.cos(lat1Rad),
      Math.cos(dRad) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  return {
    lat: (lat2Rad * 180) / Math.PI,
    lng: (lon2Rad * 180) / Math.PI,
  };
}

/**
 * Clear all existing data except current user
 */
async function clearExistingData(currentUserId: string) {
  console.log('Clearing existing data...\n');

  try {
    // Delete messages (cascade will handle some deletes, but we'll delete explicitly)
    console.log('Deleting messages...');
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', ''); // Delete all
    if (messagesError) {
      console.error('  ⚠ Error deleting messages:', messagesError.message);
    } else {
      console.log('  ✓ Messages deleted');
    }

    // Delete matches
    console.log('Deleting matches...');
    const { error: matchesError } = await supabase
      .from('matches')
      .delete()
      .neq('id', ''); // Delete all
    if (matchesError) {
      console.error('  ⚠ Error deleting matches:', matchesError.message);
    } else {
      console.log('  ✓ Matches deleted');
    }

    // Delete likes
    console.log('Deleting likes...');
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .neq('id', ''); // Delete all
    if (likesError) {
      console.error('  ⚠ Error deleting likes:', likesError.message);
    } else {
      console.log('  ✓ Likes deleted');
    }

    // Delete reports
    console.log('Deleting reports...');
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .neq('id', ''); // Delete all
    if (reportsError) {
      console.error('  ⚠ Error deleting reports:', reportsError.message);
    } else {
      console.log('  ✓ Reports deleted');
    }

    // Get all profile IDs except current user
    console.log('Fetching profiles to delete...');
    const { data: profilesToDelete, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', currentUserId);

    if (fetchError) {
      console.error('  ⚠ Error fetching profiles:', fetchError.message);
    } else if (profilesToDelete && profilesToDelete.length > 0) {
      const profileIds = profilesToDelete.map(p => p.id);
      console.log(`  Found ${profileIds.length} profiles to delete`);

      // Delete profiles (this will cascade to auth.users via foreign key)
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .neq('id', currentUserId);

      if (profilesError) {
        console.error('  ⚠ Error deleting profiles:', profilesError.message);
      } else {
        console.log('  ✓ Profiles deleted');

        // Delete auth users (except current user)
        console.log('Deleting auth users...');
        for (const profileId of profileIds) {
          try {
            const { error: authError } = await supabase.auth.admin.deleteUser(profileId);
            if (authError && !authError.message.includes('not found')) {
              console.error(`  ⚠ Error deleting auth user ${profileId}:`, authError.message);
            }
          } catch (error: any) {
            // Ignore errors for users that don't exist
            if (!error.message?.includes('not found')) {
              console.error(`  ⚠ Error deleting auth user ${profileId}:`, error.message);
            }
          }
        }
        console.log('  ✓ Auth users deleted');
      }
    } else {
      console.log('  ℹ No profiles to delete');
    }

    console.log('\n✓ Data clearing completed\n');
  } catch (error: any) {
    console.error('Error clearing data:', error.message);
    throw error;
  }
}

/**
 * Get current user's gym
 */
async function getCurrentUserGym(currentUserId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('home_gym_id')
    .eq('id', currentUserId)
    .single();

  if (error) {
    console.error('Error fetching current user profile:', error);
    throw error;
  }

  if (!profile || !profile.home_gym_id) {
    throw new Error('Current user does not have a home gym set. Please set a home gym in your profile first.');
  }

  // Get gym details
  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', profile.home_gym_id)
    .single();

  if (gymError) {
    console.error('Error fetching gym:', gymError);
    throw gymError;
  }

  return gym;
}

/**
 * Generate random intents for a profile
 * 40% get 1 intent, 40% get 2 intents, 20% get 3 intents
 */
function generateIntents(): Intent[] {
  const random = Math.random();
  let count: number;

  if (random < 0.4) {
    count = 1; // 40% get 1 intent
  } else if (random < 0.8) {
    count = 2; // 40% get 2 intents
  } else {
    count = 3; // 20% get 3 intents
  }

  // Shuffle and pick random intents
  const shuffled = [...intentTypes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Create auth user
 */
async function createAuthUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for test users
    });

    if (error) {
      throw error;
    }

    return data.user;
  } catch (error: any) {
    console.error(`Error creating auth user for ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create profile with intents
 */
async function createProfile(
  userId: string,
  name: string,
  age: number,
  gender: 'male' | 'female',
  gymId: string,
  photoUrls: string[],
  bio: string,
  prompt: string,
  disciplines: string[],
  intents: Intent[],
  lastLocationWkt?: string | null,
  lastLocationUpdatedAt?: string | null
) {
  const payload: Record<string, unknown> = {
    id: userId,
    display_name: name,
    age,
    gender,
    fitness_disciplines: disciplines,
    bio,
    approach_prompt: prompt,
    photo_urls: photoUrls,
    home_gym_id: gymId,
    is_visible: true,
    is_onboarded: true,
    discovery_preferences: {
      min_age: 18,
      max_age: 100,
      genders: [],
      intents: intents,
    },
  };
  if (lastLocationWkt != null) payload.last_location = lastLocationWkt as any;
  if (lastLocationUpdatedAt != null) payload.last_location_updated_at = lastLocationUpdatedAt;

  const { data, error } = await supabase
    .from('profiles')
    .insert(payload as Database['public']['Tables']['profiles']['Insert'])
    .select()
    .single();

  if (error) {
    console.error(`Error creating profile for ${name}:`, error);
    throw error;
  }

  return data;
}

/**
 * Create like
 */
async function createLike(fromUserId: string, toUserId: string) {
  const { data, error } = await supabase
    .from('likes')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      is_crush_signal: false,
    })
    .select()
    .single();

  if (error) {
    // If like already exists, that's okay
    if (error.code === '23505') {
      console.log(`  ℹ Like already exists from ${fromUserId} to ${toUserId}`);
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Create mutual likes (both directions) to trigger automatic match creation
 */
async function createMutualLike(user1Id: string, user2Id: string) {
  // First create like from other user to current user
  await createLike(user1Id, user2Id);
  
  // Then create like from current user to other user (this triggers match creation)
  await createLike(user2Id, user1Id);
  
  // Wait a bit for the trigger to create the match
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Fetch the created match
  const [user1, user2] = [user1Id, user2Id].sort();
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('user1_id', user1)
    .eq('user2_id', user2)
    .single();
  
  return match;
}

/**
 * Create a message request (message with to_user_id, no match).
 * Optionally include reaction_type (prompt/image) and related fields.
 */
async function createMessageRequest(
  fromUserId: string,
  toUserId: string,
  content: string,
  options?: {
    reactionType?: 'prompt' | 'image' | null;
    reactionPromptTitle?: string | null;
    reactionPromptAnswer?: string | null;
    reactionImageUrl?: string | null;
  }
) {
  const payload: Record<string, unknown> = {
    to_user_id: toUserId,
    sender_id: fromUserId,
    content: content.trim(),
  };
  if (options?.reactionType != null) payload.reaction_type = options.reactionType;
  if (options?.reactionPromptTitle != null) payload.reaction_prompt_title = options.reactionPromptTitle;
  if (options?.reactionPromptAnswer != null) payload.reaction_prompt_answer = options.reactionPromptAnswer;
  if (options?.reactionImageUrl != null) payload.reaction_image_url = options.reactionImageUrl;

  const { data, error } = await supabase
    .from('messages')
    .insert(payload as Database['public']['Tables']['messages']['Insert'])
    .select()
    .single();

  if (error) {
    console.error(`Error creating message request:`, error);
    throw error;
  }

  return data;
}

/**
 * Create a message in a match (message with match_id)
 */
async function createMatchMessage(
  matchId: string,
  senderId: string,
  content: string,
  createdAt?: Date,
  reactionType?: 'prompt' | 'image' | null,
  reactionPromptTitle?: string | null,
  reactionPromptAnswer?: string | null
) {
  const payload: Record<string, unknown> = {
    match_id: matchId,
    sender_id: senderId,
    content: content.trim(),
    created_at: createdAt ? createdAt.toISOString() : undefined,
  };
  if (reactionType != null) payload.reaction_type = reactionType;
  if (reactionPromptTitle != null) payload.reaction_prompt_title = reactionPromptTitle;
  if (reactionPromptAnswer != null) payload.reaction_prompt_answer = reactionPromptAnswer;

  const { data, error } = await supabase
    .from('messages')
    .insert(payload as Database['public']['Tables']['messages']['Insert'])
    .select()
    .single();

  if (error) {
    console.error(`Error creating match message:`, error);
    throw error;
  }

  return data;
}

/**
 * Seed a conversation between two users in a match
 */
async function seedConversation(
  matchId: string,
  otherUserId: string,
  conversation: typeof conversationStarters
) {
  const messages = [];
  const now = new Date();
  
  // Spread messages over the last few days
  let messageTime = new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000); // Random time in last 3 days
  
  for (const msg of conversation) {
    const senderId = msg.from === 'current' ? CURRENT_USER_ID : otherUserId;
    
    // Add some randomness to message timing (1-6 hours between messages)
    messageTime = new Date(messageTime.getTime() + (1 + Math.random() * 5) * 60 * 60 * 1000);
    
    try {
      const message = await createMatchMessage(matchId, senderId, msg.text, messageTime);
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

/**
 * Get a random conversation template
 */
function getRandomConversation() {
  const allConversations = [conversationStarters, ...casualConversations];
  return allConversations[Math.floor(Math.random() * allConversations.length)];
}

/**
 * Seed a few messages from the other user that react to current user's prompt or image
 */
async function seedReactionMessages(
  matchId: string,
  otherUserId: string,
  currentUserApproachPrompt: string | null
): Promise<number> {
  const now = new Date();
  let messageTime = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
  let count = 0;

  // 1 prompt reaction (if we have a prompt to react to)
  if (currentUserApproachPrompt && currentUserApproachPrompt.trim()) {
    const template = promptReactionTemplates[Math.floor(Math.random() * promptReactionTemplates.length)];
    messageTime = new Date(messageTime.getTime() + 2 * 60 * 60 * 1000);
    try {
      await createMatchMessage(
        matchId,
        otherUserId,
        template.content,
        messageTime,
        'prompt',
        currentUserApproachPrompt.trim(),
        template.answer
      );
      count++;
    } catch (e: any) {
      console.error(`  ✗ Failed to create prompt reaction message:`, e?.message);
    }
  }

  // 1 image reaction
  const imageContent = imageReactionTemplates[Math.floor(Math.random() * imageReactionTemplates.length)];
  messageTime = new Date(messageTime.getTime() + 3 * 60 * 60 * 1000);
  try {
    await createMatchMessage(matchId, otherUserId, imageContent, messageTime, 'image', null, null);
    count++;
  } catch (e: any) {
    console.error(`  ✗ Failed to create image reaction message:`, e?.message);
  }

  return count;
}

/**
 * Generate photo URLs
 */
function generatePhotoUrls(count: number, seed: number): string[] {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    // Use different seeds for each photo to get unique images
    const photoSeed = seed * 100 + i + 20000; // Offset to avoid conflicts with other scripts
    urls.push(`https://picsum.photos/500?random=${photoSeed}`);
  }
  return urls;
}

/**
 * Main function
 */
async function main() {
  console.log('Starting reset and seed script...\n');
  console.log(`Current user ID: ${CURRENT_USER_ID}\n`);

  try {
    // Step 1: Clear existing data
    await clearExistingData(CURRENT_USER_ID);

    // Step 2: Get current user's gym
    const gym = await getCurrentUserGym(CURRENT_USER_ID);
    console.log(`Using gym: ${gym.name} (${gym.id})\n`);

    let gymOrigin = parseLocation(gym.location);
    if (!gymOrigin) {
      // Fallback so script still runs; seeded last_locations will be 2–10 mi from this point
      const fallbackLat = 37.7749;
      const fallbackLng = -122.4194;
      console.warn(
        `  ⚠ Gym "${gym.name}" has no valid location. Using fallback origin (${fallbackLat}, ${fallbackLng}) for last_location seeding (${MIN_DISTANCE_MILES}–${MAX_DISTANCE_MILES} mi). Set gym.location (PostGIS or GeoJSON) for accurate positions.\n`
      );
      gymOrigin = { lat: fallbackLat, lng: fallbackLng };
    }

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('approach_prompt')
      .eq('id', CURRENT_USER_ID)
      .single();
    const currentUserApproachPrompt = currentUserProfile?.approach_prompt ?? null;

    // Step 3: Create profiles (80 females, 20 males), all at current user's home gym, various distances
    const createdProfiles = [];

    // Create 80 female profiles
    for (let i = 0; i < NUM_FEMALE; i++) {
      const name = getFemaleDisplayName(i);
      const age = 22 + Math.floor(Math.random() * 13); // Ages 22-34
      const email = `test-female-${i}@gymcrush.test`;
      const password = 'TestPassword123!';
      const disciplines = disciplineCombos[i % disciplineCombos.length];
      const bio = bioTemplates[i % bioTemplates.length];
      const prompt = promptTemplates[i % promptTemplates.length];
      const intents = generateIntents();

      console.log(`Creating profile ${i + 1}/${NUM_FEMALE + NUM_MALE}: ${name} (${age}, female, intents: ${intents.join(', ')})...`);

      try {
        const user = await createAuthUser(email, password);
        console.log(`  ✓ Created auth user: ${email}`);

        const photoCount = 2 + Math.floor(Math.random() * 3);
        const photoUrls = generatePhotoUrls(photoCount, i);

        const distanceMiles = MIN_DISTANCE_MILES + Math.random() * (MAX_DISTANCE_MILES - MIN_DISTANCE_MILES);
        const dest = pointAtDistanceMiles(gymOrigin, distanceMiles);
        const lastLocationWkt = `SRID=4326;POINT(${dest.lng} ${dest.lat})`;
        const lastLocationUpdatedAt = new Date().toISOString();

        const profile = await createProfile(
          user.id,
          name,
          age,
          'female',
          gym.id,
          photoUrls,
          bio,
          prompt,
          disciplines,
          intents,
          lastLocationWkt,
          lastLocationUpdatedAt
        );
        console.log(`  ✓ Created profile: ${profile.display_name} with ${photoUrls.length} photos`);

        createdProfiles.push(profile);

        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create profile for ${name}:`, error.message);
      }
    }

    // Create 20 male profiles
    for (let i = 0; i < NUM_MALE; i++) {
      const name = getMaleDisplayName(i);
      const age = 22 + Math.floor(Math.random() * 13);
      const email = `test-male-${i}@gymcrush.test`;
      const password = 'TestPassword123!';
      const disciplines = disciplineCombos[(NUM_FEMALE + i) % disciplineCombos.length];
      const bio = bioTemplates[(NUM_FEMALE + i) % bioTemplates.length];
      const prompt = promptTemplates[(NUM_FEMALE + i) % promptTemplates.length];
      const intents = generateIntents();

      console.log(`Creating profile ${NUM_FEMALE + i + 1}/${NUM_FEMALE + NUM_MALE}: ${name} (${age}, male, intents: ${intents.join(', ')})...`);

      try {
        const user = await createAuthUser(email, password);
        console.log(`  ✓ Created auth user: ${email}`);

        const photoCount = 2 + Math.floor(Math.random() * 3);
        const photoUrls = generatePhotoUrls(photoCount, NUM_FEMALE + i);

        const distanceMiles = MIN_DISTANCE_MILES + Math.random() * (MAX_DISTANCE_MILES - MIN_DISTANCE_MILES);
        const dest = pointAtDistanceMiles(gymOrigin, distanceMiles);
        const lastLocationWkt = `SRID=4326;POINT(${dest.lng} ${dest.lat})`;
        const lastLocationUpdatedAt = new Date().toISOString();

        const profile = await createProfile(
          user.id,
          name,
          age,
          'male',
          gym.id,
          photoUrls,
          bio,
          prompt,
          disciplines,
          intents,
          lastLocationWkt,
          lastLocationUpdatedAt
        );
        console.log(`  ✓ Created profile: ${profile.display_name} with ${photoUrls.length} photos`);

        createdProfiles.push(profile);

        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create profile for ${name}:`, error.message);
      }
    }

    console.log(`\n✓ Created ${createdProfiles.length} profiles\n`);

    // Step 4: Categorize profiles and create relationships
    const shuffledProfiles = [...createdProfiles].sort(() => Math.random() - 0.5);

    const matchProfiles = shuffledProfiles.slice(0, NUM_MATCHES);
    const messageRequestProfiles = shuffledProfiles.slice(NUM_MATCHES, NUM_MATCHES + NUM_MESSAGE_REQUESTS);
    const oneWayLikeProfiles = shuffledProfiles.slice(NUM_MATCHES + NUM_MESSAGE_REQUESTS, NUM_MATCHES + NUM_MESSAGE_REQUESTS + NUM_ONE_WAY_LIKES);

    const swipeUpProfiles = messageRequestProfiles.slice(0, NUM_MESSAGE_REQUESTS_SWIPE_UP);
    const imageCommentProfiles = messageRequestProfiles.slice(NUM_MESSAGE_REQUESTS_SWIPE_UP, NUM_MESSAGE_REQUESTS_SWIPE_UP + NUM_MESSAGE_REQUESTS_IMAGE);
    const promptCommentProfiles = messageRequestProfiles.slice(NUM_MESSAGE_REQUESTS_SWIPE_UP + NUM_MESSAGE_REQUESTS_IMAGE, NUM_MESSAGE_REQUESTS);

    console.log('Creating relationships...\n');

    // Step 4a: Create matches (subset with conversations and reaction messages)
    console.log(`Creating matches (${NUM_MATCHES} users, ${NUM_MATCHES_WITH_CONVERSATIONS} with messages)...\n`);
    let matchesCreated = 0;
    let messagesInMatches = 0;

    for (let i = 0; i < matchProfiles.length; i++) {
      const profile = matchProfiles[i];
      if (!profile) continue;

      try {
        console.log(`Creating match with ${profile.display_name}...`);

        const match = await createMutualLike(profile.id, CURRENT_USER_ID);

        if (match) {
          console.log(`  ✓ Match created: ${match.id}`);
          matchesCreated++;

          if (i < NUM_MATCHES_WITH_CONVERSATIONS) {
            console.log(`  Creating conversation with ${profile.display_name}...`);
            const conversation = getRandomConversation();
            const messages = await seedConversation(match.id, profile.id, conversation);
            console.log(`  ✓ Created ${messages.length} messages`);
            messagesInMatches += messages.length;

            const reactionCount = await seedReactionMessages(
              match.id,
              profile.id,
              currentUserApproachPrompt
            );
            if (reactionCount > 0) {
              console.log(`  ✓ Created ${reactionCount} reaction messages (prompt/image)`);
              messagesInMatches += reactionCount;
            }
          }
        } else {
          console.log(`  ⚠ Match not found after creating mutual likes`);
        }
        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create match:`, error.message);
      }
    }

    // Step 4b: Create message requests (swipe-up, comment-on-image, comment-on-prompt)
    let messageRequestsSwipeUp = 0;
    let messageRequestsImage = 0;
    let messageRequestsPrompt = 0;

    console.log(`Creating message requests - swipe up (${swipeUpProfiles.length})...\n`);
    for (const profile of swipeUpProfiles) {
      if (!profile) continue;
      try {
        console.log(`Creating message request (swipe up) from ${profile.display_name}...`);
        await createLike(profile.id, CURRENT_USER_ID);
        const messageText = messageRequestTemplates[Math.floor(Math.random() * messageRequestTemplates.length)];
        await createMessageRequest(profile.id, CURRENT_USER_ID, messageText);
        console.log(`  ✓ Message request created`);
        messageRequestsSwipeUp++;
        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create message request:`, error.message);
      }
    }

    console.log(`Creating message requests - comment on image (${imageCommentProfiles.length})...\n`);
    for (const profile of imageCommentProfiles) {
      if (!profile) continue;
      try {
        console.log(`Creating message request (image comment) from ${profile.display_name}...`);
        await createLike(profile.id, CURRENT_USER_ID);
        const content = imageReactionTemplates[Math.floor(Math.random() * imageReactionTemplates.length)];
        await createMessageRequest(profile.id, CURRENT_USER_ID, content, { reactionType: 'image' });
        console.log(`  ✓ Message request created`);
        messageRequestsImage++;
        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create message request:`, error.message);
      }
    }

    console.log(`Creating message requests - comment on prompt (${promptCommentProfiles.length})...\n`);
    for (const profile of promptCommentProfiles) {
      if (!profile) continue;
      try {
        console.log(`Creating message request (prompt comment) from ${profile.display_name}...`);
        await createLike(profile.id, CURRENT_USER_ID);
        const template = promptReactionTemplates[Math.floor(Math.random() * promptReactionTemplates.length)];
        const promptTitle = currentUserApproachPrompt?.trim() ?? 'My gym hot take is...';
        await createMessageRequest(profile.id, CURRENT_USER_ID, template.content, {
          reactionType: 'prompt',
          reactionPromptTitle: promptTitle,
          reactionPromptAnswer: template.answer,
        });
        console.log(`  ✓ Message request created`);
        messageRequestsPrompt++;
        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create message request:`, error.message);
      }
    }

    const messageRequestsCreated = messageRequestsSwipeUp + messageRequestsImage + messageRequestsPrompt;

    // Step 4c: Create one-way likes (mix of directions)
    console.log(`Creating one-way likes (${oneWayLikeProfiles.length} users)...\n`);
    let oneWayLikesCreated = 0;

    for (let i = 0; i < oneWayLikeProfiles.length; i++) {
      const profile = oneWayLikeProfiles[i];
      if (!profile) continue;

      try {
        if (i % 2 === 0) {
          console.log(`Creating like from ${profile.display_name} to current user...`);
          await createLike(profile.id, CURRENT_USER_ID);
        } else {
          console.log(`Creating like from current user to ${profile.display_name}...`);
          await createLike(CURRENT_USER_ID, profile.id);
        }
        console.log(`  ✓ Like created`);
        oneWayLikesCreated++;
        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create like:`, error.message);
      }
    }

    console.log(`\n✓ Seed script completed!`);
    console.log(`  Created ${createdProfiles.length} profiles at ${gym.name} (last_location ${MIN_DISTANCE_MILES}–${MAX_DISTANCE_MILES} mi from gym)`);
    console.log(`  Created ${matchesCreated} matches (${messagesInMatches} messages in ${NUM_MATCHES_WITH_CONVERSATIONS} matches)`);
    console.log(`  Created ${messageRequestsCreated} message requests (${messageRequestsSwipeUp} swipe-up, ${messageRequestsImage} image, ${messageRequestsPrompt} prompt)`);
    console.log(`  Created ${oneWayLikesCreated} one-way likes`);
    console.log(`\nSummary:`);
    console.log(`  - ${matchesCreated} matched users (swipe up to see messages)`);
    console.log(`  - ${messageRequestsCreated} message requests (swipe-up, comment on image, comment on prompt)`);
    console.log(`  - ${oneWayLikesCreated} one-way likes (some you liked, some liked you)`);
    console.log(`\nTest user credentials (first 5 female, first 3 male; all use password TestPassword123!):`);

    createdProfiles.slice(0, NUM_FEMALE).forEach((profile, i) => {
      if (i < 5) {
        console.log(`  ${profile.display_name} (female): test-female-${i}@gymcrush.test / TestPassword123!`);
      }
    });
    createdProfiles.slice(NUM_FEMALE, NUM_FEMALE + NUM_MALE).forEach((profile, i) => {
      if (i < 3) {
        console.log(`  ${profile.display_name} (male): test-male-${i}@gymcrush.test / TestPassword123!`);
      }
    });
    console.log(`  ... (${NUM_FEMALE} female: test-female-0@..test-female-${NUM_FEMALE - 1}@gymcrush.test, ${NUM_MALE} male: test-male-0@..test-male-${NUM_MALE - 1}@gymcrush.test)`);
  } catch (error: any) {
    console.error('\n✗ Seed script failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
