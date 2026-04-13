# User Safety

How GymCrush protects users from harmful content and behavior.

---

## Report & Block

### How it works

Users can report and block another user from two places:

1. **Discover feed** — three-dot menu on a profile card triggers "Report & Block" alert
2. **Chat conversation** — three-dot menu in the chat header triggers "Report & Block" alert

Both surfaces use a single confirmation alert. On confirm:

- A **report** is inserted into the `reports` table (reason: `inappropriate`, `fake`, `harassment`, or `other`)
- A **block** is inserted into the `blocks` table
- The blocked user is immediately removed from the discover feed and chat list
- In chat, the user is navigated back to the conversation list

### Database tables

| Table | Purpose |
|---|---|
| `reports` | Audit trail of user reports. Columns: `reporter_id`, `reported_user_id`, `reason`, `details`, `status` (pending/reviewed/action_taken) |
| `blocks` | Persistent blocks. Columns: `user_id`, `blocked_user_id`. Self-block prevented by CHECK constraint |
| `request_ignores` | Declined message requests (separate from blocks — hides a request without blocking) |

### Where blocked users are filtered

- **Discover feed**: `excludedProfileIds` set includes all blocked user IDs
- **Skipped pool**: blocked users excluded from the "show skipped profiles" fallback
- **Chat list**: conversations with blocked users are filtered out before rendering
- **RLS**: blocks table is user-scoped (users can only read/write their own blocks)

### API hooks (`lib/api/safety.ts`)

- `useBlockedUserIds()` — query returning the current user's blocked IDs
- `useReportUser()` — inserts a report
- `useBlockUser()` — inserts a block + report
- `useReportAndBlock()` — combined action used by discover and chat UI

---

## Bad Words Filtering

All user-generated text is filtered through the `bad-words` npm package before being stored.

### Coverage

| Surface | File |
|---|---|
| Display name | `lib/utils/onboarding-mapper.ts`, `lib/api/profiles.ts` |
| Bio | `lib/api/profiles.ts` |
| Messages | `lib/api/messages.ts` (all send paths) |
| Prompt answers | `lib/api/prompts.ts` |
| Text inputs | `hooks/useFilteredInput.ts` (real-time filtering) |

Offensive words are replaced with `****`. The word "face" is allowlisted to prevent false positives.

---

## Image Moderation

**v1 approach: manual review via Supabase dashboard.**

The `supabase/functions/moderate-image/index.ts` edge function exists as a stub. For v1, reported content is reviewed manually by querying the `reports` table in the Supabase dashboard.

Future options for automated moderation:
- AWS Rekognition
- Google Cloud Vision SafeSearch
- OpenAI moderation endpoint

---

## Account Deletion

Users can delete their account from the profile screen (Settings section > "Delete Account"). This is a two-step confirmation flow that calls the `delete-account` edge function, which:

1. Deletes all user data from every table (messages, matches, likes, profile, prompts, etc.)
2. Deletes avatar storage files
3. Deletes the auth user via `auth.admin.deleteUser()`

See `supabase/functions/delete-account/index.ts`.

---

## Moderation Workflow (v1)

For v1, moderation is manual:

1. User taps "Report & Block" on a profile or in chat
2. Report is written to `reports` table with `status: 'pending'`
3. Admin reviews reports in Supabase dashboard (`SELECT * FROM reports WHERE status = 'pending'`)
4. Admin can take action (ban user, remove content) and update status to `'action_taken'`

No admin UI exists in-app. All moderation happens in the Supabase dashboard or via SQL.

---

## What's not yet implemented

- Automated image moderation (edge function is stubbed)
- In-app admin/moderation dashboard
- Automated detection of reported users exceeding a threshold
- Content appeals process
