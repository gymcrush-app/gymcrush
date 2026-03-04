import { z } from 'zod';
import { APP } from '@/theme';

export const signupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Onboarding schema aligned with Lovable OnboardingData
export const onboardingSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(50),
  dateOfBirth: z.date().nullable(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  intents: z.array(z.enum(['meet_trainer', 'casual', 'longterm', 'open'])).min(1, 'Select at least one intent'),
  disciplines: z.array(z.enum(['bodybuilding', 'powerlifting', 'crossfit', 'olympic', 'functional', 'yoga', 'running', 'sports', 'general'])).min(1, 'Select at least one fitness discipline'),
  trainingFrequency: z.enum(['1-2', '3-4', '5+']).nullable(),
  fitnessLifestyle: z.enum(['gym_life', 'balanced', 'starting', 'on_off']).nullable(),
  approachPreference: z.enum(['yes', 'sometimes', 'no']).nullable(),
  showStatusPublicly: z.boolean().default(true),
  photos: z.array(z.string().url('Invalid photo URL')).min(1, 'At least one photo is required').max(APP.MAX_PHOTOS, `Maximum ${APP.MAX_PHOTOS} photos allowed`),
  prompts: z.array(z.object({
    prompt: z.string().min(1, 'Prompt is required'),
    answer: z.string().min(1, 'Answer is required').max(APP.MAX_APPROACH_PROMPT_LENGTH, `Answer must be at most ${APP.MAX_APPROACH_PROMPT_LENGTH} characters`),
  })).min(1, 'At least one prompt is required').max(3, 'Maximum 3 prompts allowed'),
  selectedGyms: z.array(z.string()).min(1, 'Select at least one gym'),
  // Legacy fields (optional for backward compatibility)
  promptAnswer: z.string().max(APP.MAX_APPROACH_PROMPT_LENGTH, `Prompt answer must be at most ${APP.MAX_APPROACH_PROMPT_LENGTH} characters`).optional(),
  selectedPrompt: z.string().optional(),
});

// Legacy profile schema (for backward compatibility)
export const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(APP.MIN_AGE, `Age must be at least ${APP.MIN_AGE}`)
    .max(APP.MAX_AGE, `Age must be at most ${APP.MAX_AGE}`),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']),
  bio: z.string().max(APP.MAX_BIO_LENGTH, `Bio must be at most ${APP.MAX_BIO_LENGTH} characters`).optional(),
  approachPrompt: z
    .string()
    .max(APP.MAX_APPROACH_PROMPT_LENGTH, `Approach prompt must be at most ${APP.MAX_APPROACH_PROMPT_LENGTH} characters`)
    .optional(),
  fitnessDisciplines: z.array(z.string()).min(1, 'Select at least one fitness discipline'),
  photoUrls: z
    .array(z.string().url('Invalid photo URL'))
    .min(1, 'At least one photo is required')
    .max(APP.MAX_PHOTOS, `Maximum ${APP.MAX_PHOTOS} photos allowed`),
  homeGymId: z.string().uuid('Invalid gym ID').optional(),
  discoveryPreferences: z
    .object({
      minAge: z.number().int().min(APP.MIN_AGE).max(APP.MAX_AGE),
      maxAge: z.number().int().min(APP.MIN_AGE).max(APP.MAX_AGE),
      genders: z.array(z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say'])),
    })
    .optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(500, 'Message must be at most 500 characters'),
  matchId: z.string().uuid('Invalid match ID'),
});

export const reportSchema = z.object({
  reportedUserId: z.string().uuid('Invalid user ID'),
  reason: z.enum(['inappropriate', 'fake', 'harassment', 'other']),
  details: z.string().max(500, 'Details must be at most 500 characters').optional(),
});
