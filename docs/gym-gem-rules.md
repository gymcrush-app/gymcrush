# Gym Gem rules

This doc describes the **current** Gym Gem behavior (as implemented today) and the **TBD** rule slots we expect to evolve.

## System overview

Gym Gems is made up of two related systems:

1. **Gym Gems feed ranking**: returns nearby profiles ordered by an engagement score (database RPC).
2. **Daily gem gifting**: enforces “one gem per giver per day”, records gifts, and updates gem counters (database RPC).

## Gym Gems feed ranking (current implementation)

The ranking is implemented in the database RPC `get_gym_gems` in [supabase/migrations/00019_get_gym_gems_rpc.sql](supabase/migrations/00019_get_gym_gems_rpc.sql). The app calls it via [lib/api/gymGems.ts](lib/api/gymGems.ts).

### Data flow

1. **Client**: `useGymGems(maxDistanceMiles?)` converts miles → km and calls `supabase.rpc('get_gym_gems', { p_max_distance_km })`.
2. **RPC**: `get_gym_gems(p_max_distance_km integer default 48)`:
   - Resolves the viewer’s reference location and max distance via `get_viewer_location_and_max_km()`.
   - Caps the effective radius to `LEAST(p_max_distance_km, viewer.max_distance_km)`.
   - Filters to candidates in radius (`ST_DWithin(get_user_reference_location(profile_id), viewer_ref, radius_m)`).
   - Computes engagement metrics and `engagement_score`.
   - Returns rows ordered by score, then recency.

### Candidate filtering

Candidates must satisfy:

- `id <> auth.uid()` (viewer excluded)
- `is_visible = true`
- `is_onboarded = true`
- Within radius of the viewer’s reference location (see `ST_DWithin(...)` usage in the RPC).

### Metrics

All metrics are “received” by the candidate profile:

| Metric | Definition (SQL) |
|--------|------------------|
| **likes_received** | Count of `likes` where `to_user_id = candidate` and `is_crush_signal` is NULL or false |
| **crush_received** | Count of `likes` where `to_user_id = candidate` and `is_crush_signal = true` |
| **matches_count** | Count of `matches` where `user1_id = candidate` or `user2_id = candidate` |
| **first_messages_received** | For each match involving the candidate, count where the **first** message sender is the *other user* |

### Engagement score

As implemented in `get_gym_gems`:

```
engagement_score = likes_received
                 + 2 × crush_received
                 + 0.5 × matches_count
                 + 1.5 × first_messages_received
```

### Sort order / tie-breakers

RPC returns rows ordered by:

1. `engagement_score DESC`
2. `created_at DESC NULLS LAST`
3. `id` (stable final tie-break)

## Daily gem gifting (current implementation)

Daily gem gifting is implemented by the `give_gym_gem` RPC in [supabase/migrations/00022_gem_gifts_and_profile_gem_fields.sql](supabase/migrations/00022_gem_gifts_and_profile_gem_fields.sql). The app calls it via [lib/api/gemGifts.ts](lib/api/gemGifts.ts).

### Data model

- `gem_gifts`: append-only log of gem gifts (`from_user_id`, `to_user_id`, `created_at`)
- `profiles.last_gem_given_at`: last time the giver gave a gem (used for daily gating)
- `profiles.gems_received_count`: cached counter incremented for recipients

### Eligibility rules

As implemented in `give_gym_gem`:

- Must be authenticated (`auth.uid()` present)
- Cannot gift to self
- Recipient must exist and be onboarded (`profiles.is_onboarded = true`)

### One gem per day (gating)

The RPC enforces at-most-one gift per giver “day” by comparing `profiles.last_gem_given_at` to a computed `today_start`:

- The client sends `p_giver_today_start`, computed as **start of today in the giver’s local timezone** (`getStartOfTodayLocal()` in [lib/api/gemGifts.ts](lib/api/gemGifts.ts)).
- The server uses `v_today_start := COALESCE(p_giver_today_start, date_trunc('day', now() AT TIME ZONE 'UTC'))`.
- If `last_gem_given_at >= v_today_start`, RPC returns `{ ok: false, error: 'no_gem_available' }`.

### Side effects when gift succeeds

On success the RPC:

- Inserts a row into `gem_gifts`
- Updates giver profile: `last_gem_given_at = now()` (and `updated_at = now()`)
- Updates recipient profile: `gems_received_count = gems_received_count + 1` (and `updated_at = now()`)
- Returns `{ ok: true, sender_display_name, ... }`

## TBD / future rule slots

These are intentionally not implemented yet (or not documented elsewhere). When we define them, this section should be split into explicit “rules” with owners and enforcement points.

- **Anti-abuse / rate limits**: spam/brigading detection, suspicious gifting patterns, throttles.
- **Eligibility gates**: minimum profile completeness, account age, phone/email verification, etc.
- **Visibility/exclusions**: exclude blocked/reported users, recent matches, existing conversations, etc.
- **Fairness/diversity**: avoid repeatedly surfacing the same top-engagement profiles.
- **Decay / time windows**: engagement score based on recent activity window vs lifetime totals.

