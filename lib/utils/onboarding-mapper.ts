/**
 * Onboarding Data Mapper
 * 
 * Maps between Lovable OnboardingData structure and Supabase database schema.
 * The Lovable prototype uses a different structure than our database, so we need
 * to transform the data when saving to the database.
 */

import { filterBadWords } from '@/lib/utils/filterBadWords';
import type { OnboardingData } from '@/types';
import type { Database } from '@/types/database';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age >= 18 && age <= 100 ? age : null;
}

/**
 * Convert Lovable OnboardingData to database Profile insert format
 */
export function mapOnboardingDataToProfile(
  onboardingData: OnboardingData,
  userId: string
): ProfileInsert {
  const age = calculateAge(onboardingData.dateOfBirth);
  
  if (!age) {
    throw new Error('Invalid date of birth. Must be 18-100 years old.');
  }

  // Store additional Lovable fields in discovery_preferences JSONB
  const gendersFromInterest =
    onboardingData.interestedInGender === 'everyone'
      ? ['male', 'female', 'non-binary', 'prefer-not-to-say']
      : onboardingData.interestedInGender === 'men'
        ? ['male']
        : onboardingData.interestedInGender === 'women'
          ? ['female']
          : [];
  const discoveryPreferences = {
    min_age: 18, // Default, can be updated later
    max_age: 100, // Default, can be updated later
    genders: gendersFromInterest,
    intents: onboardingData.intents,
    training_frequency: onboardingData.trainingFrequency,
    fitness_lifestyle: onboardingData.fitnessLifestyle,
    approach_preference: onboardingData.approachPreference,
    height: onboardingData.height,
  };

  // Use first selected gym as home_gym_id (or null if none)
  const homeGymId = onboardingData.selectedGyms.length > 0 
    ? onboardingData.selectedGyms[0] 
    : null;

  return {
    id: userId,
    display_name: filterBadWords(onboardingData.fullName),
    age,
    gender: onboardingData.gender || 'prefer-not-to-say', // Use gender from onboarding data, default to 'prefer-not-to-say' if not set
    bio: null, // Can be added later
    fitness_disciplines: onboardingData.disciplines,
    photo_urls: onboardingData.photos,
    home_gym_id: homeGymId,
    is_visible: onboardingData.showStatusPublicly,
    is_onboarded: true,
    discovery_preferences: discoveryPreferences,
    height: onboardingData.height ?? null,
    occupation: onboardingData.occupation ?? null,
  };
}

/**
 * Convert database Profile to OnboardingData format (for editing)
 */
export function mapProfileToOnboardingData(
  profile: Database['public']['Tables']['profiles']['Row'],
  email: string
): Partial<OnboardingData> {
  const discoveryPrefs = profile.discovery_preferences as any;
  
  return {
    fullName: profile.display_name,
    // dateOfBirth would need to be calculated from age (approximate)
    email,
    intents: discoveryPrefs?.intents || [],
    disciplines: profile.fitness_disciplines as any,
    trainingFrequency: discoveryPrefs?.training_frequency || null,
    fitnessLifestyle: discoveryPrefs?.fitness_lifestyle || null,
    approachPreference: discoveryPrefs?.approach_preference || null,
    showStatusPublicly: profile.is_visible ?? undefined,
    photos: profile.photo_urls,
    selectedGyms: profile.home_gym_id ? [profile.home_gym_id] : [],
    height: profile.height ?? null,
    occupation: profile.occupation ?? null,
    interestedInGender: (() => {
      const g = discoveryPrefs?.genders as string[] | undefined;
      if (!Array.isArray(g) || g.length === 0) return null;
      if (g.length >= 4 || (g.includes('male') && g.includes('female'))) return 'everyone';
      if (g.includes('male')) return 'men';
      if (g.includes('female')) return 'women';
      return null;
    })(),
  };
}
