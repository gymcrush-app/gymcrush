/**
 * Reset and Seed Script (Staging — two regions)
 *
 * Clears all existing user data except three staging users, then seeds 100 profiles:
 * - 50 profiles (40 F, 10 M) within 30 miles of Meridian, ID:
 *   - 3 female profiles match with Chris; 3 female swiped up (message request, no action); rest unseen.
 *   - 2 "gym gem" profiles (first 2 women) get extra likes/matches/messages from others so they rank as gems.
 * - 50 profiles (40 F, 10 M) within 100 km of Kelowna, BC, Canada:
 *   - 3 women match with Brendan, 3 swiped up (no action); 3 women match with Timmy, 3 swiped up; rest of 28 women unseen; 10 men profiles only.
 *
 * Usage:
 *   npx tsx scripts/reset-and-seed.ts
 *
 * Requires:
 *   - .env (or ENVFILE) with EXPO_PUBLIC_SUPABASE_URL and either
 *     SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY (for local).
 *   - Two gyms pre-created (run scripts/seed-staging-gyms.sql if needed):
 *     - Uplifted Gym, Meridian, ID (bcf71d28-660b-4d10-9361-096a19f2b66e)
 *     - Global Fitness & Racquet Centre, Kelowna, BC (8e0be0e0-bc19-431d-aa6f-1bfe386e8db1)
 */

import { createClient } from "@supabase/supabase-js"
import { parseLocation } from "../lib/utils/distance"
import type { Database } from "../types/database"
import type { Intent } from "../types/onboarding"
import { getSupabaseConfig } from "./env"

const { url: supabaseUrl, serviceRoleKey } = getSupabaseConfig()

// Create admin client with service role key
const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Staging user IDs (preserved on clear; used as relationship targets)
const MERIDIAN_CURRENT_USER_ID = "3d122eec-0d3d-4d0b-afec-409051199d4d" // Chris
const CANADA_CURRENT_USER_IDS = [
  "b151f877-40fe-499c-adba-ddf44d1307a0", // Brendan
  "90e27fb0-525a-4ee1-a79f-1f238f00604a", // Timmy
]
const PRESERVED_USER_IDS = [
  MERIDIAN_CURRENT_USER_ID,
  ...CANADA_CURRENT_USER_IDS,
]

// Staging gym IDs
const MERIDIAN_GYM_ID = "bcf71d28-660b-4d10-9361-096a19f2b66e" // Uplifted Gym, Meridian, ID
const KELOWNA_GYM_ID = "8e0be0e0-bc19-431d-aa6f-1bfe386e8db1" // Global Fitness & Racquet Centre, Kelowna, BC

// Region origins (lat, lng)
const MERIDIAN_ORIGIN = { lat: 43.61417, lng: -116.39889 }
const KELOWNA_ORIGIN = { lat: 49.8879519, lng: -119.4960106 }

// Per-region profile counts (50 + 50 = 100 total)
const NUM_MERIDIAN_FEMALE = 40
const NUM_MERIDIAN_MALE = 10
const NUM_KELOWNA_FEMALE = 40
const NUM_KELOWNA_MALE = 10

// Meridian relationship counts: 3 female profiles match with Chris, 3 swiped up (no action), rest unseen. Gems get their engagement separately.
const NUM_MERIDIAN_MATCHES = 3
const NUM_MERIDIAN_MESSAGE_REQUESTS = 3 // swipe-up only (they swiped up, we have not taken action)
const NUM_MERIDIAN_ONE_WAY_LIKES = 0
const NUM_MERIDIAN_MATCHES_WITH_CONVERSATIONS = 2

// Gym Gems: 2 Meridian profiles receive many likes/matches/first messages so they rank as gems
const NUM_GEM_PROFILES = 2
const NUM_LIKES_TO_EACH_GEM = 18
const NUM_MATCHES_TO_EACH_GEM = 5
const NUM_CRUSH_LIKES_TO_EACH_GEM = 3

// Canada: 3 women match + 3 women swipe-up (no action) per user; rest of 40 women unseen
const NUM_CANADA_WOMEN_PER_USER = 6
const NUM_CANADA_MATCHES_PER_USER = 3
const NUM_CANADA_MESSAGE_REQUESTS_PER_USER = 3 // swipe-up only
const NUM_CANADA_ONE_WAY_LIKES_PER_USER = 0

// Distance bounds
const MERIDIAN_MIN_MILES = 0.5
const MERIDIAN_MAX_MILES = 30
const KELOWNA_MAX_KM = 100

// Base names (cycled with suffix for 80 female / 20 male distinct display names)
const femaleNames = [
  "Emma",
  "Olivia",
  "Sophia",
  "Isabella",
  "Ava",
  "Mia",
  "Charlotte",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Emily",
  "Ella",
  "Elizabeth",
]
const maleNames = [
  "James",
  "Michael",
  "David",
  "Daniel",
  "Matthew",
  "Christopher",
  "Andrew",
  "Joseph",
  "William",
  "Alexander",
  "Ryan",
  "John",
  "Nathan",
  "Samuel",
  "Benjamin",
  "Henry",
  "Owen",
  "Jack",
  "Luke",
  "Leo",
]

function getFemaleDisplayName(index: number): string {
  return `${femaleNames[index % femaleNames.length]}-${index}`
}
function getMaleDisplayName(index: number): string {
  return `${maleNames[index % maleNames.length]}-${index}`
}

// Fitness disciplines combinations
const disciplineCombos = [
  ["bodybuilding", "powerlifting"],
  ["yoga", "functional"],
  ["running", "yoga"],
  ["powerlifting", "olympic"],
  ["crossfit", "functional"],
  ["bodybuilding", "running"],
  ["yoga", "general"],
  ["functional", "general"],
  ["crossfit", "sports"],
  ["bodybuilding", "general"],
  ["powerlifting", "bodybuilding"],
  ["yoga", "running"],
  ["functional", "crossfit"],
  ["olympic", "powerlifting"],
  ["sports", "general"],
  ["bodybuilding", "crossfit"],
  ["yoga", "functional"],
  ["running", "general"],
  ["powerlifting", "general"],
  ["bodybuilding", "functional"],
]

// Bio templates
const bioTemplates = [
  "Fitness enthusiast looking for a workout partner!",
  "Love pushing my limits at the gym. Let's train together!",
  "Yoga and strength training keep me balanced.",
  "Always chasing new PRs. Looking for someone to spot me!",
  "Early morning gym sessions are my favorite.",
  "Fitness is my passion. Let's motivate each other!",
  "Love trying new workouts and challenges.",
  "Gym is my happy place. Looking for a training buddy!",
  "Strength training and cardio enthusiast.",
  "Always up for a good workout session!",
  "Fitness model and athlete. Let's get strong together!",
  "Competitive athlete looking for training partners.",
  "Yoga instructor and fitness coach.",
  "Powerlifter chasing new personal records.",
  "CrossFit enthusiast and functional movement lover.",
  "Bodybuilder focused on building strength.",
  "Marathon runner and strength training fan.",
  "Fitness coach looking for motivated partners.",
  "Always training for the next challenge.",
  "Gym regular looking for workout accountability.",
]

// Prompt templates
const promptTemplates = [
  "My gym hot take is... leg day is the best day.",
  "The way to my heart is through... a good protein shake after class.",
  "My ideal post-workout meal is... anything with protein and carbs.",
  "You'll find me at the gym when... the sun is rising.",
  "The exercise I love to hate is... deadlifts.",
  "My gym playlist always includes... high-energy beats.",
  "After leg day, I'm usually... foam rolling everything.",
  "My fitness journey started because... I wanted to feel confident.",
  "The way to win me over is... spot me on bench press.",
  "I'm looking for... someone who understands 5am gym sessions.",
  "My gym hot take is... cardio doesn't kill gains if done right.",
  "The way to my heart is through... perfect squat form.",
  "My ideal workout partner is... someone who pushes me.",
  "You'll find me at the gym when... it's empty and quiet.",
  "The exercise I love to hate is... burpees.",
  "My gym playlist always includes... motivational tracks.",
  "After leg day, I'm usually... walking like a penguin.",
  "My fitness journey started because... I wanted to be strong.",
  "The way to win me over is... share your protein shake.",
  "I'm looking for... a workout partner who shows up consistently.",
]

// Height options (format "5'10\"")
const heightOptions = [
  "5'2\"",
  "5'4\"",
  "5'5\"",
  "5'6\"",
  "5'7\"",
  "5'8\"",
  "5'9\"",
  "5'10\"",
  "5'11\"",
  "6'0\"",
  "6'1\"",
  "6'2\"",
]

// Occupation options (half of seeded profiles get one)
const occupationOptions = [
  "Software Engineer",
  "Personal Trainer",
  "Nurse",
  "Teacher",
  "Student",
  "Marketing Manager",
  "Physical Therapist",
  "Chef",
  "Graphic Designer",
  "Accountant",
  "Firefighter",
  "EMT",
  "Yoga Instructor",
  "Real Estate Agent",
  "Sales Representative",
]

// Intent types
const intentTypes: Intent[] = ["shortterm", "longterm", "open"]

// Conversation templates for matched conversations
const conversationStarters = [
  { from: "other", text: "Hey! Saw you at the gym today. Great workout!" },
  {
    from: "current",
    text: "Thanks! You too. Are you usually here in the mornings?",
  },
  { from: "other", text: "Yeah, usually around 7am. What about you?" },
  { from: "current", text: "Same! Maybe we'll see each other again tomorrow." },
  {
    from: "other",
    text: "Definitely! Would be cool to have a workout partner.",
  },
]

const casualConversations = [
  [
    { from: "other", text: "Hey! 👋" },
    { from: "current", text: "Hey there! How's it going?" },
    {
      from: "other",
      text: "Pretty good! Just finished a leg day. How about you?",
    },
    {
      from: "current",
      text: "Nice! I'm planning to hit legs tomorrow. Any tips?",
    },
    {
      from: "other",
      text: "Definitely focus on form over weight. And don't skip the warm-up!",
    },
  ],
  [
    {
      from: "current",
      text: "Hey! I saw your profile and we have similar fitness goals.",
    },
    { from: "other", text: "Oh cool! What are you working towards?" },
    {
      from: "current",
      text: "Trying to build more functional strength. What about you?",
    },
    {
      from: "other",
      text: "Same! I love functional training. It's so practical.",
    },
    {
      from: "current",
      text: "Exactly! Want to maybe train together sometime?",
    },
    {
      from: "other",
      text: "That sounds great! I'm usually at the gym weekday mornings.",
    },
  ],
  [
    { from: "other", text: "Hi! Your approach prompt made me laugh 😄" },
    {
      from: "current",
      text: "Haha glad you liked it! Belt squats really are underrated.",
    },
    {
      from: "other",
      text: "I've never tried them. Are they better than regular squats?",
    },
    {
      from: "current",
      text: "They're great for targeting quads without loading the spine. Worth trying!",
    },
    {
      from: "other",
      text: "I'll have to give them a shot. Thanks for the tip!",
    },
  ],
]

// Message request templates (single messages, not conversations)
const messageRequestTemplates = [
  "Hey! Saw your profile and thought we'd make great workout partners!",
  "Hi! Your fitness goals align with mine. Want to train together?",
  "Hey there! I noticed we both love powerlifting. Let's connect!",
  "Hi! I'm looking for a workout buddy and you seem like a great fit.",
  "Hey! Your approach prompt caught my attention. Would love to chat!",
  "Hi there! We have similar disciplines. Want to meet up at the gym?",
  "Hey! I'm always looking for motivated training partners. Interested?",
  "Hi! Your profile stood out to me. Would you be interested in training together?",
]

// Reaction messages (from other user reacting to current user's prompt or image)
const promptReactionTemplates: { content: string; answer: string }[] = [
  {
    content: "Haha same! Leg day really is the best.",
    answer: "Same! Leg day is the best day.",
  },
  { content: "That made me laugh 😄", answer: "Leg day is the best day." },
  { content: "Couldn't agree more!", answer: "Focus on form over weight." },
  { content: "Love that take!", answer: "Early morning sessions." },
  { content: "So true!", answer: "Someone who pushes me." },
]
const imageReactionTemplates = [
  "Love that photo!",
  "Great pics 👌",
  "You look strong!",
]

const EARTH_RADIUS_MILES = 3959
const EARTH_RADIUS_KM = 6371

/**
 * Compute a point at a given distance and bearing from an origin (destination point formula).
 * @param origin { lat, lng } in degrees
 * @param distanceMiles distance in miles
 * @param bearingRadians optional bearing in radians (0 = North); default random 0–2π
 */
function pointAtDistanceMiles(
  origin: { lat: number; lng: number },
  distanceMiles: number,
  bearingRadians?: number,
): { lat: number; lng: number } {
  const bearing = bearingRadians ?? Math.random() * 2 * Math.PI
  const dRad = distanceMiles / EARTH_RADIUS_MILES
  const lat1Rad = (origin.lat * Math.PI) / 180
  const lon1Rad = (origin.lng * Math.PI) / 180

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(dRad) +
      Math.cos(lat1Rad) * Math.sin(dRad) * Math.cos(bearing),
  )
  const lon2Rad =
    lon1Rad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dRad) * Math.cos(lat1Rad),
      Math.cos(dRad) - Math.sin(lat1Rad) * Math.sin(lat2Rad),
    )

  return {
    lat: (lat2Rad * 180) / Math.PI,
    lng: (lon2Rad * 180) / Math.PI,
  }
}

/**
 * Compute a point at a given distance (km) and bearing from an origin.
 */
function pointAtDistanceKm(
  origin: { lat: number; lng: number },
  distanceKm: number,
  bearingRadians?: number,
): { lat: number; lng: number } {
  const bearing = bearingRadians ?? Math.random() * 2 * Math.PI
  const dRad = distanceKm / EARTH_RADIUS_KM
  const lat1Rad = (origin.lat * Math.PI) / 180
  const lon1Rad = (origin.lng * Math.PI) / 180

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(dRad) +
      Math.cos(lat1Rad) * Math.sin(dRad) * Math.cos(bearing),
  )
  const lon2Rad =
    lon1Rad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dRad) * Math.cos(lat1Rad),
      Math.cos(dRad) - Math.sin(lat1Rad) * Math.sin(lat2Rad),
    )

  return {
    lat: (lat2Rad * 180) / Math.PI,
    lng: (lon2Rad * 180) / Math.PI,
  }
}

/**
 * Fetch a gym by id.
 */
async function getGymById(gymId: string, label: string) {
  const { data: gym, error } = await supabase
    .from("gyms")
    .select("*")
    .eq("id", gymId)
    .single()
  if (error || !gym) {
    throw new Error(
      `Gym "${label}" (${gymId}) not found: ${error?.message ?? "no gym"}. Run scripts/seed-staging-gyms.sql first.`,
    )
  }
  return gym
}

type TableName = "messages" | "matches" | "likes" | "reports"

/**
 * Try to delete all rows from a table. Logs a warning on error but does not throw
 * (safe on empty tables or tables that don't exist yet in the schema).
 */
async function safeDeleteAll(table: TableName) {
  console.log(`Deleting ${table}...`)
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq("id", "")
  if (error) {
    console.warn(`  ⚠ ${table}: ${error.message} (continuing)`)
  } else {
    console.log(`  ✓ ${table} deleted (${count ?? 0} rows)`)
  }
}

/**
 * Clear all existing data except preserved staging users (messages, matches, likes
 * are all deleted; only profiles whose id is in preservedUserIds are kept).
 */
async function clearExistingData(preservedUserIds: string[]) {
  console.log("Clearing existing data (preserving staging users)...\n")

  try {
    // Delete relational data first (order matters for FK constraints)
    await safeDeleteAll("messages")
    await safeDeleteAll("matches")
    await safeDeleteAll("likes")
    await safeDeleteAll("reports")

    // Fetch all profiles, then delete those not in preserved list
    console.log("Fetching profiles to delete...")
    const { data: allProfiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
    if (fetchError) {
      console.warn(
        `  ⚠ Error fetching profiles: ${fetchError.message} (continuing)`,
      )
    } else if (allProfiles && allProfiles.length > 0) {
      const preservedSet = new Set(preservedUserIds)
      const profilesToDelete = allProfiles.filter(
        (p) => !preservedSet.has(p.id),
      )
      const profileIds = profilesToDelete.map((p) => p.id)
      console.log(
        `  Found ${profileIds.length} profiles to delete (preserving ${preservedUserIds.length} staging users)`,
      )

      if (profileIds.length > 0) {
        const { error: profilesError } = await supabase
          .from("profiles")
          .delete()
          .in("id", profileIds)
        if (profilesError) {
          console.error("  ⚠ Error deleting profiles:", profilesError.message)
        } else {
          console.log("  ✓ Profiles deleted")
          console.log("Deleting auth users...")
          for (const profileId of profileIds) {
            try {
              const { error: authError } =
                await supabase.auth.admin.deleteUser(profileId)
              if (authError && !authError.message.includes("not found")) {
                console.error(
                  `  ⚠ Error deleting auth user ${profileId}:`,
                  authError.message,
                )
              }
            } catch (error: any) {
              if (!error.message?.includes("not found")) {
                console.error(
                  `  ⚠ Error deleting auth user ${profileId}:`,
                  error.message,
                )
              }
            }
          }
          console.log("  ✓ Auth users deleted")
        }
      } else {
        console.log("  ℹ No profiles to delete")
      }
    } else {
      console.log("  ℹ No profiles to delete")
    }

    console.log("\n✓ Data clearing completed\n")
  } catch (error: any) {
    console.error("Error clearing data:", error.message)
    throw error
  }
}

/**
 * Generate random intents for a profile
 * 40% get 1 intent, 40% get 2 intents, 20% get 3 intents
 */
function generateIntents(): Intent[] {
  const random = Math.random()
  let count: number

  if (random < 0.4) {
    count = 1 // 40% get 1 intent
  } else if (random < 0.8) {
    count = 2 // 40% get 2 intents
  } else {
    count = 3 // 20% get 3 intents
  }

  // Shuffle and pick random intents
  const shuffled = [...intentTypes].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
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
    })

    if (error) {
      throw error
    }

    return data.user
  } catch (error: any) {
    console.error(`Error creating auth user for ${email}:`, error.message)
    throw error
  }
}

/**
 * Create profile with intents
 */
async function createProfile(
  userId: string,
  name: string,
  age: number,
  gender: "male" | "female",
  gymId: string,
  photoUrls: string[],
  bio: string,
  prompt: string,
  disciplines: string[],
  intents: Intent[],
  lastLocationWkt?: string | null,
  lastLocationUpdatedAt?: string | null,
  height?: string | null,
  occupation?: string | null,
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
  }
  if (lastLocationWkt != null) payload.last_location = lastLocationWkt as any
  if (lastLocationUpdatedAt != null)
    payload.last_location_updated_at = lastLocationUpdatedAt
  if (height != null) payload.height = height
  if (occupation != null) payload.occupation = occupation

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload as Database["public"]["Tables"]["profiles"]["Insert"])
    .select()
    .single()

  if (error) {
    console.error(`Error creating profile for ${name}:`, error)
    throw error
  }

  return data
}

/**
 * Create like
 * @param options.isCrush - if true, inserts with is_crush_signal: true (default false)
 */
async function createLike(
  fromUserId: string,
  toUserId: string,
  options?: { isCrush?: boolean },
) {
  const isCrush = options?.isCrush === true
  const { data, error } = await supabase
    .from("likes")
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      is_crush_signal: isCrush,
    })
    .select()
    .single()

  if (error) {
    // If like already exists, that's okay
    if (error.code === "23505") {
      console.log(`  ℹ Like already exists from ${fromUserId} to ${toUserId}`)
      return null
    }
    throw error
  }

  return data
}

/**
 * Create mutual likes (both directions) to trigger automatic match creation
 */
async function createMutualLike(user1Id: string, user2Id: string) {
  // First create like from other user to current user
  await createLike(user1Id, user2Id)

  // Then create like from current user to other user (this triggers match creation)
  await createLike(user2Id, user1Id)

  // Wait a bit for the trigger to create the match
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Fetch the created match
  const [user1, user2] = [user1Id, user2Id].sort()
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("user1_id", user1)
    .eq("user2_id", user2)
    .single()

  return match
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
    reactionType?: "prompt" | "image" | null
    reactionPromptTitle?: string | null
    reactionPromptAnswer?: string | null
    reactionImageUrl?: string | null
  },
) {
  const payload: Record<string, unknown> = {
    to_user_id: toUserId,
    sender_id: fromUserId,
    content: content.trim(),
  }
  if (options?.reactionType != null)
    payload.reaction_type = options.reactionType
  if (options?.reactionPromptTitle != null)
    payload.reaction_prompt_title = options.reactionPromptTitle
  if (options?.reactionPromptAnswer != null)
    payload.reaction_prompt_answer = options.reactionPromptAnswer
  if (options?.reactionImageUrl != null)
    payload.reaction_image_url = options.reactionImageUrl

  const { data, error } = await supabase
    .from("messages")
    .insert(payload as Database["public"]["Tables"]["messages"]["Insert"])
    .select()
    .single()

  if (error) {
    console.error(`Error creating message request:`, error)
    throw error
  }

  return data
}

/**
 * Create a message in a match (message with match_id)
 */
async function createMatchMessage(
  matchId: string,
  senderId: string,
  content: string,
  createdAt?: Date,
  reactionType?: "prompt" | "image" | null,
  reactionPromptTitle?: string | null,
  reactionPromptAnswer?: string | null,
) {
  const payload: Record<string, unknown> = {
    match_id: matchId,
    sender_id: senderId,
    content: content.trim(),
    created_at: createdAt ? createdAt.toISOString() : undefined,
  }
  if (reactionType != null) payload.reaction_type = reactionType
  if (reactionPromptTitle != null)
    payload.reaction_prompt_title = reactionPromptTitle
  if (reactionPromptAnswer != null)
    payload.reaction_prompt_answer = reactionPromptAnswer

  const { data, error } = await supabase
    .from("messages")
    .insert(payload as Database["public"]["Tables"]["messages"]["Insert"])
    .select()
    .single()

  if (error) {
    console.error(`Error creating match message:`, error)
    throw error
  }

  return data
}

/**
 * Seed a conversation between two users in a match
 * @param currentUserId the "current" user in the conversation (receives the match; sends when from === 'current')
 */
async function seedConversation(
  matchId: string,
  otherUserId: string,
  conversation: typeof conversationStarters,
  currentUserId: string,
) {
  const messages = []
  const now = new Date()

  // Spread messages over the last few days
  let messageTime = new Date(
    now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000,
  ) // Random time in last 3 days

  for (const msg of conversation) {
    const senderId = msg.from === "current" ? currentUserId : otherUserId

    // Add some randomness to message timing (1-6 hours between messages)
    messageTime = new Date(
      messageTime.getTime() + (1 + Math.random() * 5) * 60 * 60 * 1000,
    )

    try {
      const message = await createMatchMessage(
        matchId,
        senderId,
        msg.text,
        messageTime,
      )
      messages.push(message)

      // Mark some messages as read (older messages from other user)
      if (msg.from === "other" && Math.random() > 0.3) {
        await supabase
          .from("messages")
          .update({
            read_at: new Date(
              messageTime.getTime() + 1000 * 60 * 30,
            ).toISOString(),
          }) // Read 30 min later
          .eq("id", message.id)
      }
    } catch (error: any) {
      console.error(`  ✗ Failed to create message:`, error.message)
    }
  }

  return messages
}

/**
 * Get a random conversation template
 */
function getRandomConversation() {
  const allConversations = [conversationStarters, ...casualConversations]
  return allConversations[Math.floor(Math.random() * allConversations.length)]
}

/** Conversations that start with "other" (for seeding gym gem matches so first message is from other user) */
const conversationsWithFirstMessageFromOther = [
  conversationStarters,
  casualConversations[0],
  casualConversations[2],
] as const

function getConversationWithFirstMessageFromOther(): (typeof conversationStarters)[number][] {
  const idx = Math.floor(
    Math.random() * conversationsWithFirstMessageFromOther.length,
  )
  return [...conversationsWithFirstMessageFromOther[idx]]
}

/**
 * Seed a few messages from the other user that react to current user's prompt or image
 */
async function seedReactionMessages(
  matchId: string,
  otherUserId: string,
  currentUserApproachPrompt: string | null,
): Promise<number> {
  const now = new Date()
  let messageTime = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  let count = 0

  // 1 prompt reaction (if we have a prompt to react to)
  if (currentUserApproachPrompt && currentUserApproachPrompt.trim()) {
    const template =
      promptReactionTemplates[
        Math.floor(Math.random() * promptReactionTemplates.length)
      ]
    messageTime = new Date(messageTime.getTime() + 2 * 60 * 60 * 1000)
    try {
      await createMatchMessage(
        matchId,
        otherUserId,
        template.content,
        messageTime,
        "prompt",
        currentUserApproachPrompt.trim(),
        template.answer,
      )
      count++
    } catch (e: any) {
      console.error(`  ✗ Failed to create prompt reaction message:`, e?.message)
    }
  }

  // 1 image reaction
  const imageContent =
    imageReactionTemplates[
      Math.floor(Math.random() * imageReactionTemplates.length)
    ]
  messageTime = new Date(messageTime.getTime() + 3 * 60 * 60 * 1000)
  try {
    await createMatchMessage(
      matchId,
      otherUserId,
      imageContent,
      messageTime,
      "image",
      null,
      null,
    )
    count++
  } catch (e: any) {
    console.error(`  ✗ Failed to create image reaction message:`, e?.message)
  }

  return count
}

/**
 * Generate photo URLs
 */
function generatePhotoUrls(count: number, seed: number): string[] {
  const urls: string[] = []
  for (let i = 0; i < count; i++) {
    // Use different seeds for each photo to get unique images
    const photoSeed = seed * 100 + i + 20000 // Offset to avoid conflicts with other scripts
    urls.push(`https://picsum.photos/500?random=${photoSeed}`)
  }
  return urls
}

/** Profile shape used for seeding (createProfile returns full row; we need id, display_name, gender) */
type SeedProfile = { id: string; display_name: string; gender: string }

/**
 * Main function
 */
async function main() {
  console.log(
    "Starting reset and seed script (staging — Meridian + Kelowna)...\n",
  )
  console.log(`Preserved users: Meridian (Chris), Canada (Brendan, Timmy)\n`)

  try {
    // Step 1: Clear existing data (keep only the three staging users)
    await clearExistingData(PRESERVED_USER_IDS)

    // Step 2: Fetch both gyms by hardcoded IDs
    const meridianGym = await getGymById(MERIDIAN_GYM_ID, "Uplifted Gym")
    console.log(`Meridian gym: ${meridianGym.name} (${meridianGym.id})\n`)

    const kelownaGym = await getGymById(
      KELOWNA_GYM_ID,
      "Global Fitness & Racquet Centre",
    )
    console.log(`Canada gym: ${kelownaGym.name} (${kelownaGym.id})\n`)

    let meridianOrigin = parseLocation(meridianGym.location)
    if (!meridianOrigin) {
      meridianOrigin = MERIDIAN_ORIGIN
      console.warn(
        `  ⚠ Meridian gym has no valid location. Using fallback origin.\n`,
      )
    }

    // Fetch approach_prompt for Meridian user (Chris) and both Canada users
    const { data: chrisProfile } = await supabase
      .from("profiles")
      .select("approach_prompt")
      .eq("id", MERIDIAN_CURRENT_USER_ID)
      .single()
    const meridianApproachPrompt = chrisProfile?.approach_prompt ?? null

    const { data: canadaProfiles } = await supabase
      .from("profiles")
      .select("id, approach_prompt")
      .in("id", CANADA_CURRENT_USER_IDS)
    const canadaApproachPrompts: Record<string, string | null> = {}
    for (const p of canadaProfiles ?? []) {
      canadaApproachPrompts[p.id] = p.approach_prompt ?? null
    }

    const meridianProfiles: SeedProfile[] = []
    const kelownaProfiles: SeedProfile[] = []

    // Step 3a: Create Meridian profiles (40 F, 10 M) — indices 0–39 F, 0–9 M
    let created = 0
    const totalMeridian = NUM_MERIDIAN_FEMALE + NUM_MERIDIAN_MALE
    for (let i = 0; i < NUM_MERIDIAN_FEMALE; i++) {
      created++
      const name = getFemaleDisplayName(i)
      const age = 22 + Math.floor(Math.random() * 13)
      const email = `test-female-${i}@gymcrush.test`
      const password = "TestPassword123!"
      const disciplines = disciplineCombos[i % disciplineCombos.length]
      const bio = bioTemplates[i % bioTemplates.length]
      const prompt = promptTemplates[i % promptTemplates.length]
      const intents = generateIntents()
      console.log(
        `Creating Meridian profile ${created}/${totalMeridian}: ${name} (${age}, female)...`,
      )
      try {
        const user = await createAuthUser(email, password)
        const photoCount = 2 + Math.floor(Math.random() * 3)
        const photoUrls = generatePhotoUrls(photoCount, i)
        const distanceMiles =
          MERIDIAN_MIN_MILES +
          Math.random() * (MERIDIAN_MAX_MILES - MERIDIAN_MIN_MILES)
        const dest = pointAtDistanceMiles(meridianOrigin, distanceMiles)
        const lastLocationWkt = `SRID=4326;POINT(${dest.lng} ${dest.lat})`
        const lastLocationUpdatedAt = new Date().toISOString()
        const height = heightOptions[i % heightOptions.length]
        const occupation = occupationOptions[i % occupationOptions.length]
        const profile = await createProfile(
          user.id,
          name,
          age,
          "female",
          meridianGym.id,
          photoUrls,
          bio,
          prompt,
          disciplines,
          intents,
          lastLocationWkt,
          lastLocationUpdatedAt,
          height,
          occupation,
        )
        meridianProfiles.push(profile)
        console.log(`  ✓ ${profile.display_name}\n`)
      } catch (error: any) {
        console.error(`  ✗ Failed: ${error.message}\n`)
      }
    }
    for (let i = 0; i < NUM_MERIDIAN_MALE; i++) {
      created++
      const name = getMaleDisplayName(i)
      const age = 22 + Math.floor(Math.random() * 13)
      const email = `test-male-${i}@gymcrush.test`
      const password = "TestPassword123!"
      const disciplines =
        disciplineCombos[(NUM_MERIDIAN_FEMALE + i) % disciplineCombos.length]
      const bio = bioTemplates[(NUM_MERIDIAN_FEMALE + i) % bioTemplates.length]
      const prompt =
        promptTemplates[(NUM_MERIDIAN_FEMALE + i) % promptTemplates.length]
      const intents = generateIntents()
      console.log(
        `Creating Meridian profile ${created}/${totalMeridian}: ${name} (${age}, male)...`,
      )
      try {
        const user = await createAuthUser(email, password)
        const photoCount = 2 + Math.floor(Math.random() * 3)
        const photoUrls = generatePhotoUrls(photoCount, NUM_MERIDIAN_FEMALE + i)
        const distanceMiles =
          MERIDIAN_MIN_MILES +
          Math.random() * (MERIDIAN_MAX_MILES - MERIDIAN_MIN_MILES)
        const dest = pointAtDistanceMiles(meridianOrigin, distanceMiles)
        const lastLocationWkt = `SRID=4326;POINT(${dest.lng} ${dest.lat})`
        const lastLocationUpdatedAt = new Date().toISOString()
        const globalIndexM = NUM_MERIDIAN_FEMALE + i
        const height = heightOptions[globalIndexM % heightOptions.length]
        const occupation =
          occupationOptions[globalIndexM % occupationOptions.length]
        const profile = await createProfile(
          user.id,
          name,
          age,
          "male",
          meridianGym.id,
          photoUrls,
          bio,
          prompt,
          disciplines,
          intents,
          lastLocationWkt,
          lastLocationUpdatedAt,
          height,
          occupation,
        )
        meridianProfiles.push(profile)
        console.log(`  ✓ ${profile.display_name}\n`)
      } catch (error: any) {
        console.error(`  ✗ Failed: ${error.message}\n`)
      }
    }

    // Step 3b: Create Kelowna profiles (40 F, 10 M) — indices 40–79 F, 10–19 M
    const totalKelowna = NUM_KELOWNA_FEMALE + NUM_KELOWNA_MALE
    created = 0
    for (let i = 0; i < NUM_KELOWNA_FEMALE; i++) {
      created++
      const globalIndex = NUM_MERIDIAN_FEMALE + i
      const name = getFemaleDisplayName(globalIndex)
      const age = 22 + Math.floor(Math.random() * 13)
      const email = `test-female-${globalIndex}@gymcrush.test`
      const password = "TestPassword123!"
      const disciplines =
        disciplineCombos[globalIndex % disciplineCombos.length]
      const bio = bioTemplates[globalIndex % bioTemplates.length]
      const prompt = promptTemplates[globalIndex % promptTemplates.length]
      const intents = generateIntents()
      console.log(
        `Creating Kelowna profile ${created}/${totalKelowna}: ${name} (${age}, female)...`,
      )
      try {
        const user = await createAuthUser(email, password)
        const photoCount = 2 + Math.floor(Math.random() * 3)
        const photoUrls = generatePhotoUrls(photoCount, globalIndex)
        const distanceKm = Math.random() * KELOWNA_MAX_KM
        const dest = pointAtDistanceKm(KELOWNA_ORIGIN, distanceKm)
        const lastLocationWkt = `SRID=4326;POINT(${dest.lng} ${dest.lat})`
        const lastLocationUpdatedAt = new Date().toISOString()
        const height = heightOptions[globalIndex % heightOptions.length]
        const occupation =
          occupationOptions[globalIndex % occupationOptions.length]
        const profile = await createProfile(
          user.id,
          name,
          age,
          "female",
          kelownaGym.id,
          photoUrls,
          bio,
          prompt,
          disciplines,
          intents,
          lastLocationWkt,
          lastLocationUpdatedAt,
          height,
          occupation,
        )
        kelownaProfiles.push(profile)
        console.log(`  ✓ ${profile.display_name}\n`)
      } catch (error: any) {
        console.error(`  ✗ Failed: ${error.message}\n`)
      }
    }
    for (let i = 0; i < NUM_KELOWNA_MALE; i++) {
      created++
      const globalIndex = NUM_MERIDIAN_MALE + i
      const name = getMaleDisplayName(NUM_MERIDIAN_MALE + i)
      const age = 22 + Math.floor(Math.random() * 13)
      const email = `test-male-${NUM_MERIDIAN_MALE + i}@gymcrush.test`
      const password = "TestPassword123!"
      const disciplines =
        disciplineCombos[
          (NUM_MERIDIAN_FEMALE + NUM_MERIDIAN_MALE + i) %
            disciplineCombos.length
        ]
      const bio =
        bioTemplates[
          (NUM_MERIDIAN_FEMALE + NUM_MERIDIAN_MALE + i) % bioTemplates.length
        ]
      const prompt =
        promptTemplates[
          (NUM_MERIDIAN_FEMALE + NUM_MERIDIAN_MALE + i) % promptTemplates.length
        ]
      const intents = generateIntents()
      console.log(
        `Creating Kelowna profile ${created}/${totalKelowna}: ${name} (${age}, male)...`,
      )
      try {
        const user = await createAuthUser(email, password)
        const photoCount = 2 + Math.floor(Math.random() * 3)
        const photoUrls = generatePhotoUrls(
          photoCount,
          NUM_MERIDIAN_FEMALE + NUM_MERIDIAN_MALE + i,
        )
        const distanceKm = Math.random() * KELOWNA_MAX_KM
        const dest = pointAtDistanceKm(KELOWNA_ORIGIN, distanceKm)
        const lastLocationWkt = `SRID=4326;POINT(${dest.lng} ${dest.lat})`
        const lastLocationUpdatedAt = new Date().toISOString()
        const globalIndexK =
          NUM_MERIDIAN_FEMALE + NUM_MERIDIAN_MALE + NUM_KELOWNA_FEMALE + i
        const height = heightOptions[globalIndexK % heightOptions.length]
        const occupation =
          occupationOptions[globalIndexK % occupationOptions.length]
        const profile = await createProfile(
          user.id,
          name,
          age,
          "male",
          kelownaGym.id,
          photoUrls,
          bio,
          prompt,
          disciplines,
          intents,
          lastLocationWkt,
          lastLocationUpdatedAt,
          height,
          occupation,
        )
        kelownaProfiles.push(profile)
        console.log(`  ✓ ${profile.display_name}\n`)
      } catch (error: any) {
        console.error(`  ✗ Failed: ${error.message}\n`)
      }
    }

    console.log(
      `\n✓ Created ${meridianProfiles.length} Meridian profiles, ${kelownaProfiles.length} Kelowna profiles\n`,
    )

    // Step 4: Meridian relationships (Chris only). Gems excluded — they get engagement in Gym Gems step; rest: 3 match, 3 swipe-up no action, rest unseen.
    const meridianGemProfiles = meridianProfiles.slice(0, NUM_GEM_PROFILES)
    const meridianOthersForChris = meridianProfiles.filter(
      (p) => !meridianGemProfiles.includes(p),
    )
    const shuffledMeridian = [...meridianOthersForChris].sort(
      () => Math.random() - 0.5,
    )
    const meridianMatchProfiles = shuffledMeridian.slice(
      0,
      NUM_MERIDIAN_MATCHES,
    )
    const meridianSwipeUpProfiles = shuffledMeridian.slice(
      NUM_MERIDIAN_MATCHES,
      NUM_MERIDIAN_MATCHES + NUM_MERIDIAN_MESSAGE_REQUESTS,
    )

    console.log("Creating Meridian relationships (Chris)...\n")

    let meridianMatchesCreated = 0
    let meridianMessagesInMatches = 0
    for (let i = 0; i < meridianMatchProfiles.length; i++) {
      const profile = meridianMatchProfiles[i]
      if (!profile) continue
      try {
        const match = await createMutualLike(
          profile.id,
          MERIDIAN_CURRENT_USER_ID,
        )
        if (match) {
          meridianMatchesCreated++
          if (i < NUM_MERIDIAN_MATCHES_WITH_CONVERSATIONS) {
            const conversation = getRandomConversation()
            const messages = await seedConversation(
              match.id,
              profile.id,
              conversation,
              MERIDIAN_CURRENT_USER_ID,
            )
            meridianMessagesInMatches += messages.length
            const reactionCount = await seedReactionMessages(
              match.id,
              profile.id,
              meridianApproachPrompt,
            )
            meridianMessagesInMatches += reactionCount
          }
        }
      } catch (error: any) {
        console.error(`  ✗ Match with ${profile.display_name}:`, error.message)
      }
    }

    let meridianMsgReqCount = 0
    for (const profile of meridianSwipeUpProfiles) {
      if (!profile) continue
      try {
        await createLike(profile.id, MERIDIAN_CURRENT_USER_ID)
        await createMessageRequest(
          profile.id,
          MERIDIAN_CURRENT_USER_ID,
          messageRequestTemplates[
            Math.floor(Math.random() * messageRequestTemplates.length)
          ],
        )
        meridianMsgReqCount++
      } catch (e: any) {
        console.error(`  ✗ Message request:`, e?.message)
      }
    }

    // Gym Gems: seed 2 profiles with high engagement (likes + first messages received)
    const meridianOthers = meridianOthersForChris
    const shuffledOthers = [...meridianOthers].sort(() => Math.random() - 0.5)

    console.log(
      `Creating Gym Gems engagement (${meridianGemProfiles.map((p) => p.display_name).join(", ")})...\n`,
    )

    let gymGemsLikesCount = 0
    let gymGemsMatchesCount = 0
    let gymGemsCrushCount = 0

    for (let g = 0; g < meridianGemProfiles.length; g++) {
      const gem = meridianGemProfiles[g]
      if (!gem) continue

      // Likes to gem from other Meridian profiles
      const othersForLikes = shuffledOthers.slice(0, NUM_LIKES_TO_EACH_GEM)
      for (const other of othersForLikes) {
        try {
          await createLike(other.id, gem.id)
          gymGemsLikesCount++
        } catch (e: any) {
          console.error(`  ✗ Like to ${gem.display_name}:`, e?.message)
        }
      }

      // Chris likes each gem once
      try {
        await createLike(MERIDIAN_CURRENT_USER_ID, gem.id)
        gymGemsLikesCount++
      } catch (e: any) {}

      // Crush likes to gem from a few others
      const crushStart = NUM_LIKES_TO_EACH_GEM
      const crushEnd = crushStart + NUM_CRUSH_LIKES_TO_EACH_GEM
      const othersForCrush = shuffledOthers.slice(crushStart, crushEnd)
      for (const other of othersForCrush) {
        try {
          await createLike(other.id, gem.id, { isCrush: true })
          gymGemsCrushCount++
        } catch (e: any) {
          console.error(`  ✗ Crush to ${gem.display_name}:`, e?.message)
        }
      }

      // Matches with other users where the other sends the first message (gem gets first_messages_received)
      const matchStart = crushEnd + g * NUM_MATCHES_TO_EACH_GEM
      const matchEnd = matchStart + NUM_MATCHES_TO_EACH_GEM
      const othersForMatches = shuffledOthers.slice(matchStart, matchEnd)
      for (const other of othersForMatches) {
        try {
          const match = await createMutualLike(gem.id, other.id)
          if (match) {
            gymGemsMatchesCount++
            const conversation = getConversationWithFirstMessageFromOther()
            await seedConversation(match.id, other.id, conversation, gem.id)
          }
        } catch (e: any) {
          console.error(
            `  ✗ Match ${gem.display_name} + ${other.display_name}:`,
            e?.message,
          )
        }
      }
    }

    // Step 5: Canada relationships (Brendan, Timmy with Kelowna women)
    const kelownaWomen = kelownaProfiles.filter((p) => p.gender === "female")
    const shuffledCanadaWomen = [...kelownaWomen].sort(
      () => Math.random() - 0.5,
    )
    const canadaWomenForBrendan = shuffledCanadaWomen.slice(
      0,
      NUM_CANADA_WOMEN_PER_USER,
    )
    const canadaWomenForTimmy = shuffledCanadaWomen.slice(
      NUM_CANADA_WOMEN_PER_USER,
      NUM_CANADA_WOMEN_PER_USER * 2,
    )

    const createCanadaRelationshipsForUser = async (
      canadaUserId: string,
      women: SeedProfile[],
      label: string,
    ) => {
      const approachPrompt = canadaApproachPrompts[canadaUserId] ?? null
      const matchProfiles = women.slice(0, NUM_CANADA_MATCHES_PER_USER)
      const swipeUpProfiles = women.slice(
        NUM_CANADA_MATCHES_PER_USER,
        NUM_CANADA_MATCHES_PER_USER + NUM_CANADA_MESSAGE_REQUESTS_PER_USER,
      )

      for (const profile of matchProfiles) {
        try {
          const match = await createMutualLike(profile.id, canadaUserId)
          if (match && Math.random() > 0.5) {
            const conversation = getRandomConversation()
            await seedConversation(
              match.id,
              profile.id,
              conversation,
              canadaUserId,
            )
            await seedReactionMessages(match.id, profile.id, approachPrompt)
          }
        } catch (e: any) {
          console.error(
            `  ✗ ${label} match ${profile.display_name}:`,
            e?.message,
          )
        }
      }
      for (const profile of swipeUpProfiles) {
        try {
          await createLike(profile.id, canadaUserId)
          await createMessageRequest(
            profile.id,
            canadaUserId,
            messageRequestTemplates[
              Math.floor(Math.random() * messageRequestTemplates.length)
            ],
          )
        } catch (e: any) {}
      }
    }

    console.log(
      "Creating Canada relationships (Brendan, Timmy with Kelowna women)...\n",
    )
    await createCanadaRelationshipsForUser(
      CANADA_CURRENT_USER_IDS[0],
      canadaWomenForBrendan,
      "Brendan",
    )
    await createCanadaRelationshipsForUser(
      CANADA_CURRENT_USER_IDS[1],
      canadaWomenForTimmy,
      "Timmy",
    )

    // Summary and test credentials
    const createdProfiles = [...meridianProfiles, ...kelownaProfiles]
    console.log(`\n✓ Seed script completed!`)
    console.log(
      `  Meridian: ${meridianProfiles.length} profiles (${MERIDIAN_MIN_MILES}–${MERIDIAN_MAX_MILES} mi from Meridian, ID); 3 matches, 3 swipe-up no action with Chris; rest unseen; gems get engagement below`,
    )
    console.log(
      `  Kelowna: ${kelownaProfiles.length} profiles (within ${KELOWNA_MAX_KM} km); 3 match + 3 swipe-up per Brendan/Timmy; rest of women unseen`,
    )
    console.log(
      `  Gym Gems: ${meridianGemProfiles.map((p) => p.display_name).join(", ")} — ${gymGemsLikesCount} likes, ${gymGemsCrushCount} crush, ${gymGemsMatchesCount} matches (first message from other)`,
    )
    console.log(`\nTest credentials (password TestPassword123!):`)
    meridianProfiles.slice(0, 5).forEach((p, i) => {
      console.log(`  ${p.display_name}: test-female-${i}@gymcrush.test`)
    })
    meridianProfiles
      .slice(NUM_MERIDIAN_FEMALE, NUM_MERIDIAN_FEMALE + 3)
      .forEach((p, i) => {
        console.log(`  ${p.display_name}: test-male-${i}@gymcrush.test`)
      })
    console.log(
      `  ... (Meridian: test-female-0..${NUM_MERIDIAN_FEMALE - 1}, test-male-0..${NUM_MERIDIAN_MALE - 1}; Kelowna: test-female-${NUM_MERIDIAN_FEMALE}..${NUM_MERIDIAN_FEMALE + NUM_KELOWNA_FEMALE - 1}, test-male-${NUM_MERIDIAN_MALE}..${NUM_MERIDIAN_MALE + NUM_KELOWNA_MALE - 1})`,
    )
  } catch (error: any) {
    console.error("\n✗ Seed script failed:", error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
