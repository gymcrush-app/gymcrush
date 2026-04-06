/**
 * Seed Script for Test Profiles
 * 
 * Creates 10 test profiles with picsum.photos images, all at the same gym.
 * 
 * Usage:
 *   npx tsx scripts/seed-profiles.ts
 * 
 * Requires:
 *   - .env (or ENVFILE) with EXPO_PUBLIC_SUPABASE_URL and either
 *     SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY (for local).
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { getSupabaseConfig } from './env';
import {
  generateAnswersForProfileSeed,
  insertProfilePromptsForUser,
  loadPromptCatalogFirstPerSection,
} from './seedPromptHelpers';

const { url: supabaseUrl, serviceRoleKey } = getSupabaseConfig();

// Create admin client with service role key
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test profiles data
const testProfiles = [
  { name: 'Alex', age: 25, gender: 'male', disciplines: ['bodybuilding', 'powerlifting'], bio: 'Lifting heavy and living life. Always down for a workout partner!', religion: 'Atheist', alcohol: 'Yes', smoking: 'No', marijuana: 'No', has_kids: 'No' },
  { name: 'Jordan', age: 28, gender: 'female', disciplines: ['yoga', 'functional'], bio: 'Yoga instructor by day, fitness enthusiast by night. Let\'s flow together!', religion: 'Spiritual', alcohol: 'Sometimes', smoking: 'No', marijuana: 'Sometimes', has_kids: 'No' },
  { name: 'Sam', age: 23, gender: 'non-binary', disciplines: ['crossfit', 'functional'], bio: 'CrossFit addict looking for training buddies. Let\'s push each other!', religion: 'Christian', alcohol: 'Yes', smoking: 'No', marijuana: 'No', has_kids: 'No' },
  { name: 'Taylor', age: 30, gender: 'female', disciplines: ['running', 'yoga'], bio: 'Marathon runner and yoga enthusiast. Always training for the next race!', religion: 'Jewish', alcohol: 'Sometimes', smoking: 'No', marijuana: 'No', has_kids: 'Yes' },
  { name: 'Morgan', age: 26, gender: 'male', disciplines: ['bodybuilding', 'general'], bio: 'Bodybuilder focused on building muscle and strength. Let\'s get big together!', religion: 'Catholic', alcohol: 'Yes', smoking: 'Sometimes', marijuana: 'No', has_kids: 'No' },
  { name: 'Casey', age: 24, gender: 'female', disciplines: ['powerlifting', 'olympic'], bio: 'Powerlifter chasing PRs. Looking for someone to spot me!', religion: 'Buddhist', alcohol: 'No', smoking: 'No', marijuana: 'No', has_kids: 'No' },
  { name: 'Riley', age: 29, gender: 'male', disciplines: ['crossfit', 'sports'], bio: 'CrossFit coach and former athlete. Always ready for a challenge!', religion: 'Muslim', alcohol: 'No', smoking: 'No', marijuana: 'No', has_kids: 'Yes' },
  { name: 'Quinn', age: 27, gender: 'non-binary', disciplines: ['yoga', 'functional', 'general'], bio: 'Yoga and functional movement enthusiast. Let\'s move mindfully together!', religion: 'Hindu', alcohol: 'Sometimes', smoking: 'No', marijuana: 'Sometimes', has_kids: 'No' },
  { name: 'Dakota', age: 31, gender: 'female', disciplines: ['bodybuilding', 'running'], bio: 'Fitness model and runner. Balancing strength and cardio!', religion: 'Sikh', alcohol: 'No', smoking: 'No', marijuana: 'No', has_kids: 'Yes' },
  { name: 'Avery', age: 22, gender: 'male', disciplines: ['powerlifting', 'olympic', 'bodybuilding'], bio: 'Competitive powerlifter. Always training for the next meet!', religion: 'Other', alcohol: 'Yes', smoking: 'No', marijuana: 'No', has_kids: 'No' },
];

// Use the existing gym ID from your manually created gym
const TEST_GYM_ID = '35177898-58f2-4983-9cd4-8512d620077c';

async function findOrCreateTestGym() {
  // Fetch the existing gym by ID
  const { data: existingGym, error: fetchError } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', TEST_GYM_ID)
    .single();

  if (fetchError) {
    console.error('Error fetching gym:', fetchError);
    throw fetchError;
  }

  if (!existingGym) {
    throw new Error(`Gym with ID ${TEST_GYM_ID} not found. Please create it manually.`);
  }

  console.log(`Found existing test gym: ${existingGym.name} (${existingGym.id})`);
  return existingGym;
}

async function createAuthUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for test users
    });

    if (error) {
      // Check if it's a permissions error
      if (error.message?.includes('not_admin') || error.code === 'not_admin') {
        console.error('\n❌ Permission denied. The service role key is incorrect or missing admin privileges.');
        console.error('   Make sure you\'re using the SERVICE_ROLE key, not the anon key.');
        console.error('   For local Supabase, run: supabase status');
        console.error('   Look for "service_role key" in the output.\n');
      }
      throw error;
    }

    return data.user;
  } catch (error: any) {
    console.error(`Error creating auth user for ${email}:`, error.message);
    throw error;
  }
}

async function createProfile(userId: string, profileData: (typeof testProfiles)[0], gymId: string, photoUrls: string[]) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      display_name: profileData.name,
      age: profileData.age,
      gender: profileData.gender,
      fitness_disciplines: profileData.disciplines,
      bio: profileData.bio,

      photo_urls: photoUrls,
      home_gym_id: gymId,
      is_visible: true,
      is_onboarded: true,
      discovery_preferences: {
        min_age: 18,
        max_age: 100,
        genders: [],
      },
      religion: profileData.religion,
      alcohol: profileData.alcohol,
      smoking: profileData.smoking,
      marijuana: profileData.marijuana,
      has_kids: profileData.has_kids,
    })
    .select()
    .single();

  if (error) {
    console.error(`Error creating profile for ${profileData.name}:`, error);
    throw error;
  }

  return data;
}

function generatePhotoUrls(count: number, seed: number): string[] {
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    // Use different seeds for each photo to get unique images
    const photoSeed = seed * 100 + i;
    urls.push(`https://picsum.photos/500?random=${photoSeed}`);
  }
  return urls;
}

async function main() {
  console.log('Starting seed script...\n');

  try {
    // Find or create test gym
    const gym = await findOrCreateTestGym();
    console.log(`Using gym: ${gym.name} (${gym.id})\n`);

    const promptCatalog = await loadPromptCatalogFirstPerSection(supabase);

    // Create profiles
    const createdProfiles = [];
    for (let i = 0; i < testProfiles.length; i++) {
      const profileData = testProfiles[i];
      const email = `test-${profileData.name.toLowerCase()}-${i}@gymcrush.test`;
      const password = 'TestPassword123!';

      console.log(`Creating profile ${i + 1}/${testProfiles.length}: ${profileData.name}...`);

      try {
        // Create auth user
        const user = await createAuthUser(email, password);
        console.log(`  ✓ Created auth user: ${email}`);

        // Generate photo URLs (2-4 photos per profile)
        const photoCount = 2 + Math.floor(Math.random() * 3); // 2-4 photos
        const photoUrls = generatePhotoUrls(photoCount, i);

        // Create profile
        const profile = await createProfile(user.id, profileData, gym.id, photoUrls);
        await insertProfilePromptsForUser(
          supabase,
          profile.id,
          promptCatalog,
          generateAnswersForProfileSeed(i + 3000),
        );
        console.log(`  ✓ Created profile: ${profile.display_name} with ${photoUrls.length} photos`);
        console.log(`  ✓ Photos: ${photoUrls.join(', ')}\n`);

        createdProfiles.push(profile);
      } catch (error: any) {
        console.error(`  ✗ Failed to create profile for ${profileData.name}:`, error.message);
        // Continue with next profile
      }
    }

    console.log(`\n✓ Seed script completed!`);
    console.log(`  Created ${createdProfiles.length} profiles`);
    console.log(`  All profiles assigned to: ${gym.name}`);
    console.log(`\nTest user credentials:`);
    createdProfiles.forEach((profile, i) => {
      const email = `test-${testProfiles[i].name.toLowerCase()}-${i}@gymcrush.test`;
      console.log(`  ${profile.display_name}: ${email} / TestPassword123!`);
    });
  } catch (error: any) {
    console.error('\n✗ Seed script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
