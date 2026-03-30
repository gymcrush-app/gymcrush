# 2. Current algorithm for ranking profiles as gems

The ranking is implemented in the database RPC [get_gym_gems](supabase/migrations/00019_get_gym_gems_rpc.sql). The app calls it via [useGymGems](lib/api/gymGems.ts) with a max distance (default 30 miles); the RPC returns nearby profiles ordered by engagement.

## Metrics

All metrics are “received” by the profile:

| Metric | Definition (SQL) |
|--------|------------------|
| **likes_received** | Count of likes where `to_user_id = profile` and `is_crush_signal` is NULL or false |
| **crush_received** | Count of likes where `to_user_id = profile` and `is_crush_signal = true` |
| **matches_count** | Count of matches where `user1_id = profile` or `user2_id = profile` |
| **first_messages_received** | For each match involving the profile, count where the first message in that match was sent by the other user (not the profile) |

## Engagement score formula

```
engagement_score = likes_received
                 + 2 × crush_received
                 + 0.5 × matches_count
                 + 1.5 × first_messages_received
```

So: crush is weighted 2×, first messages 1.5×, regular likes 1×, and matches 0.5×. Ties are broken by `created_at DESC`, then `id`.

## Filtering

- Only profiles within the viewer’s radius (and `is_visible`, `is_onboarded`) are candidates.
- The viewer is excluded.
