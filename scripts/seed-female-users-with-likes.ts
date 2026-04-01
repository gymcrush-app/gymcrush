/**
 * Seed Script for Female Users with Likes
 * 
 * Creates 20 new female users at the same gym as the current user.
 * 10 of these users will have already swiped up (liked) the current user,
 * so when the current user swipes up on them, it will create a match.
 * 
 * Usage:
 *   npx tsx scripts/seed-female-users-with-likes.ts
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

// Female names for test profiles
const femaleNames = [
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Ava', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila',
  'Luna', 'Sofia', 'Avery', 'Mila', 'Aria'
];

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

async function getCurrentUserGym() {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('home_gym_id')
    .eq('id', CURRENT_USER_ID)
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

async function createProfile(
  userId: string,
  name: string,
  age: number,
  gymId: string,
  photoUrls: string[],
  bio: string,
  prompt: string,
  disciplines: string[]
) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: name,
      age,
      gender: 'female',
      fitness_disciplines: disciplines,
      bio,

      photo_urls: photoUrls,
      home_gym_id: gymId,
      is_visible: true,
      is_onboarded: true,
      discovery_preferences: {
        min_age: 18,
        max_age: 100,
        genders: [],
      },
    })
    .select()
    .single();

  if (error) {
    console.error(`Error creating profile for ${name}:`, error);
    throw error;
  }

  return data;
}

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

function generatePhotoUrls(count: number, seed: number): string[] {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    // Use different seeds for each photo to get unique images
    const photoSeed = seed * 100 + i + 10000; // Offset to avoid conflicts with other scripts
    urls.push(`https://picsum.photos/500?random=${photoSeed}`);
  }
  return urls;
}

async function main() {
  console.log('Starting seed script for female users with likes...\n');
  console.log(`Current user ID: ${CURRENT_USER_ID}\n`);

  try {
    // Get current user's gym
    const gym = await getCurrentUserGym();
    console.log(`Using gym: ${gym.name} (${gym.id})\n`);

    // Create 20 female profiles
    const createdProfiles = [];
    const profilesWithLikes: string[] = []; // Track which profiles will like the current user

    for (let i = 0; i < 20; i++) {
      const name = femaleNames[i];
      const age = 22 + Math.floor(Math.random() * 13); // Ages 22-34
      const email = `test-female-${name.toLowerCase()}-${i}@gymcrush.test`;
      const password = 'TestPassword123!';
      const disciplines = disciplineCombos[i % disciplineCombos.length];
      const bio = bioTemplates[i % bioTemplates.length];
      const prompt = promptTemplates[i % promptTemplates.length];

      console.log(`Creating profile ${i + 1}/20: ${name} (age ${age})...`);

      try {
        // Create auth user
        const user = await createAuthUser(email, password);
        console.log(`  ✓ Created auth user: ${email}`);

        // Generate photo URLs (2-4 photos per profile)
        const photoCount = 2 + Math.floor(Math.random() * 3); // 2-4 photos
        const photoUrls = generatePhotoUrls(photoCount, i);

        // Create profile
        const profile = await createProfile(
          user.id,
          name,
          age,
          gym.id,
          photoUrls,
          bio,
          prompt,
          disciplines
        );
        console.log(`  ✓ Created profile: ${profile.display_name} with ${photoUrls.length} photos`);

        createdProfiles.push(profile);

        // First 10 profiles will like the current user
        if (i < 10) {
          profilesWithLikes.push(profile.id);
        }

        console.log('');
      } catch (error: any) {
        console.error(`  ✗ Failed to create profile for ${name}:`, error.message);
        // Continue with next profile
      }
    }

    console.log(`\n✓ Created ${createdProfiles.length} female profiles\n`);

    // Create likes from first 10 profiles to current user
    console.log('Creating likes from 10 profiles to current user...\n');
    let likesCreated = 0;

    for (const profileId of profilesWithLikes) {
      const profile = createdProfiles.find(p => p.id === profileId);
      if (!profile) continue;

      try {
        console.log(`Creating like from ${profile.display_name} to current user...`);
        const like = await createLike(profileId, CURRENT_USER_ID);
        if (like) {
          console.log(`  ✓ Like created`);
          likesCreated++;
        } else {
          console.log(`  ℹ Like already exists`);
          likesCreated++;
        }
      } catch (error: any) {
        console.error(`  ✗ Failed to create like:`, error.message);
      }
    }

    console.log(`\n✓ Seed script completed!`);
    console.log(`  Created ${createdProfiles.length} female profiles at ${gym.name}`);
    console.log(`  Created ${likesCreated} likes from profiles to current user`);
    console.log(`\nWhen you swipe up on the first 10 profiles, you'll get a match!`);
    console.log(`\nTest user credentials (first 5):`);
    createdProfiles.slice(0, 5).forEach((profile, i) => {
      const name = femaleNames[i];
      const email = `test-female-${name.toLowerCase()}-${i}@gymcrush.test`;
      console.log(`  ${profile.display_name}: ${email} / TestPassword123!`);
    });
  } catch (error: any) {
    console.error('\n✗ Seed script failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
