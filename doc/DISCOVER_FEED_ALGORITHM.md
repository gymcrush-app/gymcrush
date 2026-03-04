# Discover Feed Algorithm Documentation

This document describes the current implementation of the discover feed matching algorithm - how users are filtered and ordered in the discovery feed.

## Current Algorithm Overview

The discover feed algorithm determines which users are shown and in what order. Currently, it operates in two phases: database query filtering and client-side filtering.

## Phase 1: Database Query

**Location**: `lib/api/profiles.ts` - `useNearbyProfiles` hook

### Base Filters (Always Applied)

- `home_gym_id` = user's home gym (same gym only)
- `is_visible` = true
- Excludes current user (`id != current_user.id`)

### Optional Filters (Applied if provided)

- **Age Range**: `age >= minAge` and `age <= maxAge` (if `preferences.minAge`/`maxAge` are set)
- **Gender**: `gender IN (preferences.genders)` (if `preferences.genders` array is non-empty)

### NOT Applied in Database

- Distance filtering (distance is calculated client-side for display only)
- Fitness disciplines filtering (array field, filtered client-side)
- Sorting/ordering (results returned in database default order)

## Phase 2: Client-Side Filtering & Sorting

**Location**: `app/(tabs)/discover.tsx` - `filteredUsers` useMemo

Applied after database query returns results:

1. **Swiped Profiles**: Excludes profiles already swiped (stored in AsyncStorage)
2. **Gender Double-Check**: Redundant check (already filtered in DB)
3. **Discipline Filter**: If `preferences.disciplines.length > 0`, profile must have at least one matching discipline
4. **Workout Types Filter**: If `filters.workoutTypes.length > 0`, profile must have at least one matching workout type
5. **Distance Filter**: If `filters.distance` is set, profiles beyond the max distance (in km, converted to miles) are excluded
6. **Distance Calculation**: Distance is calculated between the reference gym (selected gym or user's home gym) and each profile's home gym using the haversine formula
7. **Relevance Scoring**: Profiles are scored based on multiple factors:
   - Shared fitness disciplines: 10 points per shared discipline (primary factor)
   - Profile completeness: Points for bio (2), approach prompt (2), and multiple photos (1 per photo beyond first, max 3)
   - Recency boost: Up to 5 points for profiles updated in the last 7 days (decreasing over time)
8. **Sorting**: Profiles are sorted by:
   - Primary: Relevance score (descending - higher scores first)
   - Secondary: Distance (ascending - closer first, null distances last)

## Current Ordering

Profiles are sorted by:
1. **Relevance Score** (descending): Composite score based on:
   - Shared fitness disciplines (10 points each)
   - Profile completeness (bio, approach prompt, multiple photos)
   - Recency boost (up to 5 points for recently updated profiles)
2. **Distance** (ascending): Closer profiles appear first. Profiles with uncalculable distances appear last.

## Distance Calculation

Distance is calculated client-side using the haversine formula (`calculateGymDistance` in `lib/utils/distance.ts`) and is used for both filtering and sorting.

**Implementation Details:**
- Uses haversine formula (returns distance in miles)
- Gym locations stored as PostGIS GEOGRAPHY(POINT, 4326)
- Calculated between reference gym (selected gym or user's home gym) and each profile's home gym
- Used for filtering: Profiles beyond `maxDistance` (stored in km, converted to miles) are excluded
- Used for sorting: Profiles are sorted by distance after relevance score
- Batch fetching: All gyms for profiles are fetched in a single query for efficiency
- Missing locations: Profiles with missing gym locations are excluded when distance filter is active, or sorted last when no distance filter is set

## Gender Preferences

- **User's own gender**: Set during onboarding (`app/(auth)/onboarding/basic-info.tsx`)
- **Who to see**: Set in Discovery Preferences component (`components/discover/DiscoveryPreferences.tsx`), options: 'men', 'women', 'everyone'
- Stored in `discovery_preferences` JSONB field and mapped to `genders` array for API query

## Age Range

- Can be set via frontend age range slider filter
- Applied in database query if provided
- Debounced (500ms) to avoid excessive refetching

## Activity/Discipline Filters

- **Preferences.disciplines**: Set in Discovery Preferences modal (optional)
- **Filters.workoutTypes**: Set via frontend filter dropdown (optional)
- Both applied client-side (array field filtering)

## Key Issues & Limitations

1. ~~**Distance filtering not implemented**~~ ✅ **IMPLEMENTED**: Distance filtering now works based on `maxDistance` preference
2. ~~**No sorting algorithm**~~ ✅ **IMPLEMENTED**: Profiles are now sorted by relevance score (shared disciplines) then by distance
3. ~~**Distance-based ordering missing**~~ ✅ **IMPLEMENTED**: Profiles are sorted by distance after relevance score
4. **Gym-based only**: Currently only shows users from the same home gym (or selected gym)
5. ~~**No relevance scoring**~~ ✅ **IMPLEMENTED**: Basic relevance scoring based on shared fitness disciplines

## Files Involved

- `lib/api/profiles.ts` - Database query logic (`useNearbyProfiles`)
- `app/(tabs)/discover.tsx` - Client-side filtering and feed logic
- `components/discover/DiscoveryPreferences.tsx` - Preferences UI
- `lib/utils/distance.ts` - Distance calculation utilities
- `components/discover/SwipeDeck/index.tsx` - Displays distance (but doesn't filter/sort)

## Implementation Notes

- Distance calculation uses haversine formula (miles)
- Gym locations stored as PostGIS GEOGRAPHY(POINT, 4326)
- Client-side filtering and sorting happens in `filteredUsers` useMemo
- Swiped profiles stored in AsyncStorage (local only, not synced)
- Gyms are batch-fetched using `useGymsByIds` hook for efficiency
- Distance filter value is stored in km but converted to miles for comparison with calculated distances
- Reference gym is determined by: selected gym (if `preferences.searchByGym` is true) or user's home gym

## Recent Improvements (Implemented)

1. **Distance Filtering**: Profiles beyond the max distance threshold are now filtered out
2. **Distance-Based Sorting**: Profiles are sorted by distance (closer first) after relevance score
3. **Relevance Scoring**: Multi-factor scoring system that prioritizes:
   - Shared fitness disciplines (primary factor)
   - Profile completeness (bio, approach prompt, multiple photos)
   - Recent activity (boost for profiles updated in last 7 days)
4. **Batch Gym Fetching**: Efficient batch fetching of gym data for all profiles
5. **Profile Completeness Scoring**: Encourages complete profiles by boosting those with bios, approach prompts, and multiple photos
6. **Recency Boost**: Prioritizes recently active users to improve engagement
