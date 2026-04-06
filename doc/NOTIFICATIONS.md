# Notifications

This document defines **what push notifications GymCrush sends**, **who receives them**, **what triggers them**, and the **payload shape** the app expects.

## Delivery stack (current)

- **Client**: Expo (`expo-notifications`) collects an **Expo push token** and saves it to Supabase in `push_tokens`.
- **Backend**: on new rows in `matches`, Postgres triggers an async HTTP POST (via `pg_net`) to the edge function `send-match-notification`.
- **Provider**: edge function sends messages via **Expo Push Notification Service**.

## Notification types

### Match created (`type: "match"`)

- **Trigger**: `INSERT` into `public.matches` (created via the mutual-like trigger).
- **Recipients**: both participants in the match (`matches.user1_id` and `matches.user2_id`).
- **Preferences**: if `notification_preferences.match_notifications = false` for a user, they are skipped.
- **When sent**: immediately after the transaction commits (async via `pg_net`).

#### Payload (`data`)

```json
{
  "type": "match",
  "matchId": "uuid"
}
```

#### Tap navigation

- If `matchId` is present: route to `/(tabs)/chat/[matchId]`
- Otherwise: route to `/(tabs)/chat`

## Future notification types (planned)

### Message received (`type: "message"`)

- **Trigger**: insert into `public.messages` where recipient is not the sender.
- **Recipients**: the *other* participant in the match.
- **Payload**:

```json
{
  "type": "message",
  "matchId": "uuid"
}
```

### Crush signal received (`type: "crush_signal"`)

- **Trigger**: insert into `public.likes` with `is_crush_signal = true`.
- **Recipients**: `likes.to_user_id`.
- **Payload**:

```json
{
  "type": "crush_signal"
}
```

## Data model

### `push_tokens`

Stores device tokens for Expo Push Notification Service.

- **Write path**: app upserts `(user_id, expo_push_token)` on login / after permissions grant.
- **Multi-device**: supported (multiple rows per user).
- **Cleanup**: edge function deactivates tokens when Expo returns `DeviceNotRegistered`.

### `notification_preferences` (optional)

Per-user toggles for notification categories.

## Backend configuration notes

### DB trigger → Edge Function settings

The `matches` trigger reads the following Postgres settings:

- `app.settings.edge_functions_url` (example: `https://<project-ref>.supabase.co/functions/v1`)
- `app.settings.edge_functions_anon_key` (project anon key)

You set them with SQL (don’t commit secrets):

```sql
alter database postgres set app.settings.edge_functions_url = 'https://<project-ref>.supabase.co/functions/v1';
alter database postgres set app.settings.edge_functions_anon_key = '<anon key>';
```

For local dev:

```sql
alter database postgres set app.settings.edge_functions_url = 'http://127.0.0.1:54321/functions/v1';
```

## App behavior (receiving)

- **Foreground**: we currently only show the system notification (Expo handler is configured to show alerts/sound). Later we can add in-app banners and query invalidation.
- **Background / killed**: tapping the notification routes into the correct screen based on `data.type`.

