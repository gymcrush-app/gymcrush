# Discover profile ranking algorithm

Discover feed ranking is implemented **client-side** in the Discover tab. The app fetches a candidate set from the API (RLS-scoped to nearby users), then filters, scores, and sorts profiles in the browser.

## Data flow

1. **Candidate set**: [useDiscoverProfiles](lib/api/profiles.ts) queries the `profiles` table. RLS policy "Users can view visible nearby profiles" ([00014_profiles_rls_viewer_lookup.sql](supabase/migrations/00014_profiles_rls_viewer_lookup.sql)) restricts rows to:
   - `id <> auth.uid()`
   - `is_visible = true`, `is_onboarded = true`
   - Within the viewer's max distance of the viewer's reference location (see below).

2. **Viewer/candidate reference location**: From [00008_add_profile_last_location.sql](supabase/migrations/00008_add_profile_last_location.sql) and the RLS:
   - Viewer: `COALESCE(viewer.last_location, viewer_home_gym.location)`; max distance from `discovery_preferences.max_distance` (default 50 km, min 2 km).
   - Candidate: `COALESCE(profile.last_location, profile_home_gym.location)`.
   - Distance is computed with PostGIS `ST_DWithin` in meters (`max_distance_km * 1000`).

3. **Client-side pipeline** ([app/(tabs)/discover.tsx](app/(tabs)/discover.tsx)): From the candidates, the app:
   - Excludes already swiped profiles.
   - Applies gender, discipline, and distance filters (workout types do **not** filter; they affect sort so matching profiles appear first).
   - Computes a **relevance score** and **distance** (miles) for each profile.
   - Sorts by relevance (desc), then distance (asc).

## Relevance score (client-side)

Computed per profile; all components are additive.

| Factor | Points | Definition |
|--------|--------|------------|
| **Shared fitness disciplines** | 10 per shared | Count of disciplines in both viewer's and profile's `fitness_disciplines`. |
| **Bio** | 2 | Profile has a non-empty `bio`. |
| **Approach prompt** | 2 | Profile has a non-empty `approach_prompt`. |
| **Photos** | 1 per extra photo, cap 3 | `photo_urls.length - 1`, max +3 (e.g. 2 photos → +1, 4+ → +3). |
| **Recency** | 0–5, linear decay | If `updated_at` within last 7 days: `5 × (1 - daysSinceUpdate / 7)`; else 0. |

## Sort order

1. **Workout types (when selected)**: If the user has selected one or more workout types in the discover filter, profiles whose `fitness_disciplines` include at least one of those types are ordered **first**; everyone else follows. Within each group, the order is determined by the next two rules.
2. **Primary**: Relevance score **descending** (higher score first).
3. **Secondary**: Distance in miles **ascending** (closer first). Profiles with unknown distance (`null`) are ordered last within the same relevance score.

## Filtering (before scoring/sort)

- **Swiped**: Excluded from the main feed (tracked in component state).
- **Gender**: From discovery preferences (`men` / `women`); must match profile `gender`.
- **Disciplines**: If preferences specify disciplines, profile must have at least one matching `fitness_disciplines` entry.
- **Workout types**: Not used as a filter. When the user selects workout types (e.g. CrossFit), everyone is still shown; the list is sorted so profiles with a matching workout type appear first, then everyone else (each group ordered by relevance and distance).
- **Distance**: If a max distance filter is set (km), profile's distance (miles) must be ≤ that limit; profiles with unknown distance are excluded when this filter is active.

Distance for filtering and sort is computed on the client using viewer and candidate reference locations (same logic as RLS: `last_location` else home gym location), via `calculateDistanceMiles` in the discover screen.

## Skipped pool

When the main feed is exhausted, the app can show a "skipped" pool (profiles the user previously passed). The same filters and the same sort (including the workout-types tier when workout types are selected) are applied to that pool.
