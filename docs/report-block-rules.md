# Report / Block rules

This doc describes the **current** reporting behavior (as implemented today) and the **TBD** rule slots for blocking and moderation policy.

## Reporting (current implementation)

Reporting is defined by the `reports` table and its RLS policy in [supabase/migrations/00001_initial_schema.sql](supabase/migrations/00001_initial_schema.sql).

### Data model

`reports` columns:

- `reporter_id` (who submits the report)
- `reported_user_id` (who is being reported)
- `reason` (enum-like text constraint)
- `details` (optional freeform text, length-limited)
- `status` (`pending` → `reviewed` → `action_taken`, per constraint)
- `created_at`

### Allowed reasons

As constrained by the table:

- `inappropriate`
- `fake`
- `harassment`
- `other`

### Status lifecycle

As constrained by the table:

- `pending`
- `reviewed`
- `action_taken`

### Constraints

As implemented in the table definition:

- Cannot report self (`CHECK (reporter_id != reported_user_id)`)
- `details` length is capped at 500 chars (`CHECK (length(details) <= 500)`)

### Access control (RLS)

RLS is enabled on `reports`. Current policy:

- Users can **insert** reports only when `reporter_id = auth.uid()` (policy: “Users can insert own reports”).

No additional `SELECT` / `UPDATE` / `DELETE` policies are defined in the initial schema migration, so access beyond inserts depends on later migrations (if any) and/or SECURITY DEFINER RPCs (none discovered yet by name).

## Blocking (TBD)

No block tables/policies/RPCs were found in the current codebase search (e.g., `blocks`, `user_blocks`, `block_user`). This section is a placeholder for when blocking is designed.

### Proposed schema (placeholder)

Typical options:

- `blocks` table: (`blocker_id`, `blocked_user_id`, `created_at`, optional `reason`)
- Optional: `blocked_by` denormalized arrays/counters on `profiles` (only if needed for performance)

### Expected enforcement points (placeholder)

Blocking usually needs to be enforced consistently across:

- **Discover**: exclude blocked users (both directions)
- **Likes/Matches**: prevent likes, prevent match creation, and/or hide existing matches
- **Chat/Messages**: prevent sending and optionally hide history
- **Gym Gems**: exclude blocked users from candidate sets
- **Profile visibility**: prevent viewing profile details when blocked

Enforcement mechanisms to decide:

- RLS policies (preferred for hard guarantees)
- RPC gating (SECURITY DEFINER functions used by the client)
- Client-side filters (helpful for UX, not security)

### Moderation / admin workflow (placeholder)

Define how reports feed into actions:

- Who can read/update `reports.status`
- What “action taken” means (warning, shadowban, hide profile, delete content, etc.)
- Audit trail requirements

## Policy TBD checklist

When we define report/block rules, capture these explicitly:

- **Rule list** (human-readable)
- **Source-of-truth enforcement** (RLS vs RPC vs client)
- **Data needed** (new tables/columns)
- **User-facing UX** (what the reporter/blocker sees, confirmation, undo, etc.)

