/**
 * Shared helpers for seed scripts: load prompt catalog from DB and insert profile_prompts
 * (3 rows per profile, one prompt per section — matches onboarding / migrations).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../types/database"

export type PromptCatalogRow = {
  sectionId: string
  promptId: string
  promptText: string
  displayOrder: number
}

/** Synthetic answers for seeded profiles (titles come from `prompts` table). */
const ANSWER_POOL = [
  "Leg day is sacred. Everything else is optional.",
  "Coffee first, then heavy singles.",
  "I show up for people who show up for themselves.",
  "I used to chase numbers—now I chase consistency.",
  "Thai food, loud playlists, and early bedtimes.",
  "Quiet mornings, loud gym sessions.",
  "I overthink everything except the last rep.",
  "Dry humor, wet hair from cardio sweat.",
  "I’m softer than I look and stronger than I admit.",
  "Books, barbells, and bad reality TV.",
  "I say yes to adventures and no to bad form.",
  "Small talk drains me; deep talk charges me.",
  "I’m loyal to a fault and picky with my energy.",
  "I’m learning to rest without guilt.",
  "I want a life that feels intentional, not impressive.",
  "Spot me on bench and I’ll trust you with my playlist.",
  "5am crew—no excuses, just coffee breath.",
  "Progress photos over scale drama.",
  "Mobility is a personality trait now.",
  "I train because it keeps my head clear.",
  "Yoga on Sundays, PRs on Mondays.",
  "Functional strength over mirror muscles—mostly.",
  "I’ll try any workout once. Twice if there’s snacks.",
  "Recovery is where the gains hide.",
  "I’m here for the long game, not the quick fix.",
  "Community over ego, always.",
  "I want a partner who texts ‘on my way’ and means it.",
  "Leg day is the best day. Fight me (after squats).",
  "Protein shakes count as a love language.",
  "Empty gym + good headphones = my happy place.",
]

/**
 * One prompt per section: first `display_order` in each section (stable seed data).
 */
export async function loadPromptCatalogFirstPerSection(
  supabase: SupabaseClient<Database>,
): Promise<PromptCatalogRow[]> {
  const { data: sections, error: sErr } = await supabase
    .from("prompt_sections")
    .select("id, display_order")
    .order("display_order", { ascending: true })

  if (sErr) throw sErr
  if (!sections?.length) {
    throw new Error("No prompt_sections in DB. Apply migrations first.")
  }

  const rows: PromptCatalogRow[] = []
  for (const s of sections) {
    const { data: prompt, error: pErr } = await supabase
      .from("prompts")
      .select("id, prompt_text")
      .eq("section_id", s.id)
      .eq("display_order", 1)
      .eq("is_active", true)
      .maybeSingle()

    if (pErr) throw pErr
    if (!prompt) {
      throw new Error(
        `No active prompt with display_order=1 for section display_order=${s.display_order}`,
      )
    }
    rows.push({
      sectionId: s.id,
      promptId: prompt.id,
      promptText: prompt.prompt_text,
      displayOrder: s.display_order,
    })
  }
  return rows
}

export function generateAnswersForProfileSeed(seed: number): string[] {
  return Array.from({ length: 3 }, (_, i) => {
    const idx = (seed * 3 + i) % ANSWER_POOL.length
    return ANSWER_POOL[idx]!
  })
}

export async function insertProfilePromptsForUser(
  supabase: SupabaseClient<Database>,
  profileId: string,
  catalog: PromptCatalogRow[],
  answers: string[],
): Promise<void> {
  // Use only the first 3 sections (matching the 3-prompt onboarding flow)
  const usedCatalog = catalog.slice(0, 3)
  const usedAnswers = answers.slice(0, 3)
  const rows = usedCatalog.map((c, i) => ({
    profile_id: profileId,
    prompt_id: c.promptId,
    section_id: c.sectionId,
    answer: usedAnswers[i] ?? "",
  }))

  const { error } = await supabase.from("profile_prompts").insert(rows)
  if (error) throw error
}

export async function replaceProfilePromptsForUser(
  supabase: SupabaseClient<Database>,
  profileId: string,
  catalog: PromptCatalogRow[],
  seed: number,
): Promise<void> {
  const { error: delErr } = await supabase
    .from("profile_prompts")
    .delete()
    .eq("profile_id", profileId)
  if (delErr) throw delErr

  const answers = generateAnswersForProfileSeed(seed)
  await insertProfilePromptsForUser(supabase, profileId, catalog, answers)
}

/** Sweat Life section — gym-themed reactions in seeded chats. */
export function getSweatLifeSectionId(
  catalog: PromptCatalogRow[],
): string | undefined {
  return catalog.find((c) => c.displayOrder === 7)?.sectionId
}

/**
 * Title = catalog prompt text; answer = profile's answer (for message reaction fields).
 */
export async function getProfilePromptReactionContext(
  supabase: SupabaseClient<Database>,
  profileId: string,
  sectionId: string,
): Promise<{ promptTitle: string; promptAnswer: string } | null> {
  const { data, error } = await supabase
    .from("profile_prompts")
    .select("answer, prompts(prompt_text)")
    .eq("profile_id", profileId)
    .eq("section_id", sectionId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const prompts = data.prompts as { prompt_text: string } | null
  if (!prompts?.prompt_text) return null
  return { promptTitle: prompts.prompt_text, promptAnswer: data.answer }
}
