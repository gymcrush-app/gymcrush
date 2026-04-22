# `rc-setup` Skill — Plan 3: Supabase Webhook Phase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `node ~/.claude/skills/rc-setup/bin/rc-setup.js webhook` command that (a) scaffolds a Supabase migration and edge function into the target project repo, (b) deploys the edge function via the Supabase CLI, and (c) wires the RC webhook to the deployed URL (or graceful-degrades to dashboard instructions if RC v2 has no API path). Event handler is unit-tested end-to-end against a fake Supabase client so purchase/renewal/cancellation/expiration flows are covered before a single real RC event arrives.

**Architecture:** Skill-side code is a thin orchestrator: write two template files into the target project, run `supabase db push`, run `supabase functions deploy`, optionally PATCH the RC webhook. Domain logic (event → entitlement write) lives inside the edge function itself, implemented as a pure `handleEvent(event, client)` export that vitest drives via MSW-free stubs. Migration numbering is discovered at scaffold time by globbing the target project's `supabase/migrations/` — no hardcoded numbers.

**Tech Stack:** Node 20+ on the skill side (vitest + existing `RcClient`); Deno on the deployed side (`supabase/functions/revenuecat-webhook/index.ts` imports `@supabase/supabase-js@2` from esm.sh). No new npm deps over Plan 2 beyond a dev-only fake client for event-handler tests.

**Spec reference:** [`docs/superpowers/specs/2026-04-17-rc-setup-skill-design.md`](../specs/2026-04-17-rc-setup-skill-design.md) — Phase 3 section.

**Dependencies on Plan 2:**
- `scripts/rc/client.js` (RcClient) reused as-is
- `scripts/lib/env.js` `requireRcEnv` reused; extended with `requireSupabaseEnv`
- `RC_WEBHOOK_AUTH` already populated in target `.env` by Plan 2 Task 10

---

## Preconditions

Target project (e.g. `~/dev/gymcrush`) `.env` must contain (in addition to Plan 2 vars):

```
SUPABASE_PROJECT_REF=<slug>         # e.g. "abcdef123456" — from Supabase dashboard URL
SUPABASE_DB_PASSWORD=<...>          # required by `supabase db push` against remote
```

Optional (not required for Plan 3, surfaced only for reference):
```
SUPABASE_SERVICE_ROLE_KEY=<jwt>     # only needed if you add a smoke-test command that
                                    # POSTs to the deployed function directly
```

Populated by this plan's orchestrator:
```
RC_WEBHOOK_URL=<https://<ref>.supabase.co/functions/v1/revenuecat-webhook>
                                    # the deployed URL, written so Plan 4 and verify
                                    # can cross-check without a second API call
```

Target project repo must have:
- `supabase/migrations/` — existing numbered migrations (Plan 3 appends the next one)
- `supabase/functions/` — existing directory (Plan 3 creates a subdir for the new fn)
- Supabase CLI installed and authenticated (`supabase login` done, `supabase link` done against `SUPABASE_PROJECT_REF`)

---

## File Structure

**Created on the skill side (`~/.claude/skills/rc-setup/`):**
```
scripts/
├── supabase/
│   ├── next-migration-number.js     # Pure fn: globs target migrations, returns next NNNNN
│   ├── scaffold-migration.js        # Renders migration template → writes to target repo
│   ├── scaffold-webhook.js          # Renders edge-fn template → writes to target repo
│   ├── deploy.js                    # Wraps `supabase db push` + `supabase functions deploy`
│   ├── wire-rc-webhook.js           # Probes RC v2 webhook endpoint; PATCHes or degrades
│   └── run.js                       # Phase-3 orchestrator: scaffold → deploy → wire
└── lib/
    └── env.js                       # Extended with requireSupabaseEnv

templates/
└── revenuecat-webhook/
    ├── index.ts.tpl                 # Edge-fn entry (Deno)
    ├── handle-event.ts.tpl          # Pure handler (Deno-compatible but vitest-testable)
    └── migration.sql.tpl            # Migration SQL

test/
└── supabase/
    ├── next-migration-number.test.js
    ├── scaffold-migration.test.js
    ├── scaffold-webhook.test.js
    ├── deploy.test.js               # Execa/child_process mocked
    ├── wire-rc-webhook.test.js      # MSW-backed RC API
    └── handle-event.test.js         # Pure fn tests against fake Supabase client
```

**Modified on the skill side:**
```
bin/rc-setup.js                      # Register `webhook` phase
SKILL.md                             # Tick Phase 3 box; document preconditions
```

**Created in the target project repo (gymcrush, by Phase 3's scaffold steps):**
```
supabase/migrations/00038_create_plus_entitlements.sql
supabase/functions/revenuecat-webhook/
├── index.ts                         # Deno entry, boots the handler
└── handle-event.ts                  # Pure domain logic (idempotent upsert + audit)
```

**NOT modified in the target project repo:** app code, `.env.example` (those stay Plan 4's territory).

---

## RC v2 Webhook API Notes

Plan 2's acceptance test observed `GET /v2/projects/{id}/webhooks → 404`. RC community docs hint webhooks live under an "integrations" resource in v2 rather than a direct `/webhooks` path. Plan 3 **Task 9** explicitly probes the real path before committing to either a programmatic PATCH or a dashboard-degrade. The two known candidates to try:

1. `GET /v2/projects/{id}/integrations` — list integrations, filter by type=`webhook`
2. `GET /v2/projects/{id}/apps/{app_id}/integrations` — nested under app

If either returns 200 with a webhook item, Plan 3 uses that path's corresponding POST/PATCH. If both 404, `wire-rc-webhook.js` prints dashboard instructions with the deployed URL + `RC_WEBHOOK_AUTH` and returns `{ status: 'api-not-exposed' }` — mirroring the pattern already established for `.p8` upload in Plan 2.

---

## Supabase CLI conventions used by this plan

- `supabase db push --password $SUPABASE_DB_PASSWORD` — applies pending migrations to the linked remote
- `supabase functions deploy revenuecat-webhook --project-ref $SUPABASE_PROJECT_REF` — deploys the function, idempotent
- `supabase secrets set RC_WEBHOOK_AUTH=<token> --project-ref $SUPABASE_PROJECT_REF` — writes the shared secret so the edge function can read `Deno.env.get('RC_WEBHOOK_AUTH')`
- Deployed URL pattern: `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`

All three commands are idempotent. Re-running Plan 3 is always safe.

---

## Task 1: Supabase env validation

**Files:**
- Modify: `~/.claude/skills/rc-setup/scripts/lib/env.js`
- Test: `~/.claude/skills/rc-setup/test/lib/env.test.js`

- [ ] **Step 1: Write failing test**

Append to `test/lib/env.test.js`:

```js
import { requireSupabaseEnv } from '../../scripts/lib/env.js';

describe('requireSupabaseEnv', () => {
  it('returns typed config when all keys present', () => {
    const env = {
      SUPABASE_PROJECT_REF: 'abc123',
      SUPABASE_DB_PASSWORD: 'pw',
    };
    expect(requireSupabaseEnv(env)).toEqual({
      projectRef: 'abc123',
      dbPassword: 'pw',
    });
  });

  it('throws listing every missing key', () => {
    expect(() => requireSupabaseEnv({})).toThrow(/SUPABASE_PROJECT_REF.*SUPABASE_DB_PASSWORD/s);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd ~/.claude/skills/rc-setup
npm test -- test/lib/env.test.js
```
Expected: FAIL with `requireSupabaseEnv is not a function`.

- [ ] **Step 3: Implement**

Append to `scripts/lib/env.js`:

```js
const SUPABASE_KEYS = ['SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD'];

export function requireSupabaseEnv(env) {
  const missing = SUPABASE_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Missing Supabase env vars: ${missing.join(', ')}`);
  }
  return {
    projectRef: env.SUPABASE_PROJECT_REF,
    dbPassword: env.SUPABASE_DB_PASSWORD,
  };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/lib/env.test.js
```
Expected: all env tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/env.js test/lib/env.test.js
git commit -m "feat(supabase): add requireSupabaseEnv validation helper"
```

---

## Task 2: `next-migration-number` — pure helper

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/supabase/next-migration-number.js`
- Test: `~/.claude/skills/rc-setup/test/supabase/next-migration-number.test.js`

- [ ] **Step 1: Write failing test**

`test/supabase/next-migration-number.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { nextMigrationNumber } from '../../scripts/supabase/next-migration-number.js';

describe('nextMigrationNumber', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('returns 00001 on empty directory', () => {
    expect(nextMigrationNumber(dir)).toBe('00001');
  });

  it('returns next 5-digit number after the highest existing', () => {
    fs.writeFileSync(path.join(dir, '00036_foo.sql'), '');
    fs.writeFileSync(path.join(dir, '00037_bar.sql'), '');
    fs.writeFileSync(path.join(dir, '00009_old.sql'), '');
    expect(nextMigrationNumber(dir)).toBe('00038');
  });

  it('ignores non-numbered files', () => {
    fs.writeFileSync(path.join(dir, 'README.md'), '');
    fs.writeFileSync(path.join(dir, '00005_x.sql'), '');
    expect(nextMigrationNumber(dir)).toBe('00006');
  });

  it('throws when directory does not exist', () => {
    expect(() => nextMigrationNumber(path.join(dir, 'missing'))).toThrow(/migrations directory/i);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- test/supabase/next-migration-number.test.js
```
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`scripts/supabase/next-migration-number.js`:

```js
import fs from 'node:fs';

export function nextMigrationNumber(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`migrations directory not found: ${migrationsDir}`);
  }
  const entries = fs.readdirSync(migrationsDir);
  let highest = 0;
  for (const entry of entries) {
    const m = /^(\d{5})_/.exec(entry);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n > highest) highest = n;
  }
  return String(highest + 1).padStart(5, '0');
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/supabase/next-migration-number.test.js
```
Expected: 4/4 green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/next-migration-number.js test/supabase/next-migration-number.test.js
git commit -m "feat(supabase): discover next migration number from target repo"
```

---

## Task 3: Migration template

**Files:**
- Create: `~/.claude/skills/rc-setup/templates/revenuecat-webhook/migration.sql.tpl`

- [ ] **Step 1: Write the template (no test needed — it's static content, covered by scaffold-migration test in Task 4)**

`templates/revenuecat-webhook/migration.sql.tpl`:

```sql
-- RevenueCat entitlements + event audit log
-- Generated by ~/.claude/skills/rc-setup/ Plan 3
-- Safe to re-apply: uses IF NOT EXISTS everywhere.

create table if not exists public.plus_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement_id text not null default 'plus',
  product_id text,
  original_transaction_id text,
  period_type text,
  purchase_date timestamptz,
  expires_at timestamptz,
  will_renew boolean,
  unsubscribe_detected_at timestamptz,
  billing_issues_detected_at timestamptz,
  environment text check (environment in ('sandbox','production')),
  updated_at timestamptz not null default now()
);

create index if not exists plus_entitlements_active_idx
  on public.plus_entitlements (expires_at)
  where expires_at > now();

create table if not exists public.revenuecat_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_id text unique,
  app_user_id text,
  environment text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists revenuecat_events_user_idx
  on public.revenuecat_events (user_id, received_at desc);

create index if not exists revenuecat_events_type_idx
  on public.revenuecat_events (event_type, received_at desc);

alter table public.plus_entitlements enable row level security;

drop policy if exists "own_entitlement_read" on public.plus_entitlements;
create policy "own_entitlement_read" on public.plus_entitlements
  for select using (auth.uid() = user_id);

alter table public.revenuecat_events enable row level security;
-- No select policy → service-role only; users never read the audit log.

-- Helper RPC: callers in the app use this for server-trusted gating.
create or replace function public.is_plus(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.plus_entitlements
    where user_id = uid
      and expires_at > now()
  );
$$;

grant execute on function public.is_plus(uuid) to authenticated, anon;
```

- [ ] **Step 2: Commit**

```bash
git add templates/revenuecat-webhook/migration.sql.tpl
git commit -m "feat(supabase): migration template for plus_entitlements + revenuecat_events"
```

---

## Task 4: `scaffoldMigration` — write migration into target repo

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/supabase/scaffold-migration.js`
- Test: `~/.claude/skills/rc-setup/test/supabase/scaffold-migration.test.js`

- [ ] **Step 1: Write failing test**

`test/supabase/scaffold-migration.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scaffoldMigration } from '../../scripts/supabase/scaffold-migration.js';

describe('scaffoldMigration', () => {
  let projectDir;
  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
    fs.mkdirSync(path.join(projectDir, 'supabase', 'migrations'), { recursive: true });
  });
  afterEach(() => { fs.rmSync(projectDir, { recursive: true, force: true }); });

  it('writes next-numbered migration file and returns its path + number', () => {
    fs.writeFileSync(path.join(projectDir, 'supabase/migrations/00037_existing.sql'), '');

    const result = scaffoldMigration({ projectDir });

    expect(result.number).toBe('00038');
    expect(result.created).toBe(true);
    expect(path.relative(projectDir, result.filePath)).toBe('supabase/migrations/00038_create_plus_entitlements.sql');
    const body = fs.readFileSync(result.filePath, 'utf8');
    expect(body).toMatch(/create table if not exists public\.plus_entitlements/);
    expect(body).toMatch(/create table if not exists public\.revenuecat_events/);
    expect(body).toMatch(/create or replace function public\.is_plus/);
  });

  it('is idempotent — returns created=false if the migration name already exists', () => {
    const existingPath = path.join(projectDir, 'supabase/migrations/00038_create_plus_entitlements.sql');
    fs.writeFileSync(existingPath, '-- already here');

    const result = scaffoldMigration({ projectDir });

    expect(result.created).toBe(false);
    expect(result.filePath).toBe(existingPath);
    expect(fs.readFileSync(existingPath, 'utf8')).toBe('-- already here'); // not overwritten
  });

  it('throws when supabase/migrations directory missing', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    expect(() => scaffoldMigration({ projectDir: empty })).toThrow(/migrations directory/i);
    fs.rmSync(empty, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- test/supabase/scaffold-migration.test.js
```
Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

`scripts/supabase/scaffold-migration.js`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextMigrationNumber } from './next-migration-number.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(__dirname, '..', '..', 'templates', 'revenuecat-webhook', 'migration.sql.tpl');
const MIGRATION_BASENAME = 'create_plus_entitlements.sql';

export function scaffoldMigration({ projectDir }) {
  const migrationsDir = path.join(projectDir, 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`migrations directory not found: ${migrationsDir}`);
  }

  // Idempotency: if any existing file ends with _create_plus_entitlements.sql, skip.
  const existing = fs.readdirSync(migrationsDir).find(
    (f) => f.endsWith(`_${MIGRATION_BASENAME}`)
  );
  if (existing) {
    return {
      number: existing.slice(0, 5),
      created: false,
      filePath: path.join(migrationsDir, existing),
    };
  }

  const number = nextMigrationNumber(migrationsDir);
  const filePath = path.join(migrationsDir, `${number}_${MIGRATION_BASENAME}`);
  const body = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  fs.writeFileSync(filePath, body);
  return { number, created: true, filePath };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/supabase/scaffold-migration.test.js
```
Expected: 3/3 green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/scaffold-migration.js test/supabase/scaffold-migration.test.js
git commit -m "feat(supabase): scaffold migration into target repo, idempotent"
```

---

## Task 5: Event handler template (Deno-compatible, vitest-testable)

**Files:**
- Create: `~/.claude/skills/rc-setup/templates/revenuecat-webhook/handle-event.ts.tpl`
- Create: `~/.claude/skills/rc-setup/templates/revenuecat-webhook/index.ts.tpl`

- [ ] **Step 1: Write `handle-event.ts.tpl` (pure domain logic)**

`templates/revenuecat-webhook/handle-event.ts.tpl`:

```ts
// Pure handler — no Deno APIs directly imported, so vitest can drive it via
// stubs. `SupabaseLike` is the minimal interface the handler actually uses.

export interface SupabaseLike {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ error: { code?: string; message: string } | null }>;
    upsert(row: Record<string, unknown>, opts: { onConflict: string }): Promise<{ error: { message: string } | null }>;
  };
}

export interface RcEvent {
  id?: string;
  type: string;
  app_user_id?: string;
  product_id?: string;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number;
  environment?: 'SANDBOX' | 'PRODUCTION';
  original_transaction_id?: string;
  // RC sends many more fields; we pass the whole payload to the audit table
  [key: string]: unknown;
}

export interface HandleResult {
  status: 'ok' | 'duplicate' | 'malformed' | 'db-error';
  detail?: string;
}

export async function handleEvent(
  envelope: { event?: RcEvent } | null,
  supabase: SupabaseLike
): Promise<HandleResult> {
  const event = envelope?.event;
  if (!event || typeof event.type !== 'string') {
    return { status: 'malformed', detail: 'missing event.type' };
  }

  // Step 1: audit insert (dedupe by event_id via unique constraint)
  const auditRow = {
    event_id: event.id ?? null,
    event_type: event.type,
    app_user_id: event.app_user_id ?? null,
    user_id: isUuid(event.app_user_id) ? event.app_user_id : null,
    environment: event.environment?.toLowerCase() ?? null,
    payload: event,
  };
  const auditResult = await supabase.from('revenuecat_events').insert(auditRow);
  if (auditResult.error) {
    if (auditResult.error.code === '23505') {
      // Unique violation on event_id → already processed; return duplicate
      return { status: 'duplicate' };
    }
    return { status: 'db-error', detail: auditResult.error.message };
  }

  // Step 2: entitlement upsert (skipped for events that don't change entitlement)
  const userId = isUuid(event.app_user_id) ? event.app_user_id : null;
  if (!userId) {
    // Events for non-UUID app_user_ids (legacy aliases, SUBSCRIBER_ALIAS, TEST) → audit only
    return { status: 'ok' };
  }

  const write = entitlementWrite(event, userId);
  if (!write) return { status: 'ok' };

  const upsertResult = await supabase
    .from('plus_entitlements')
    .upsert(write, { onConflict: 'user_id' });
  if (upsertResult.error) {
    return { status: 'db-error', detail: upsertResult.error.message };
  }

  return { status: 'ok' };
}

function entitlementWrite(event: RcEvent, userId: string): Record<string, unknown> | null {
  const base = {
    user_id: userId,
    entitlement_id: 'plus',
    product_id: event.product_id ?? null,
    original_transaction_id: event.original_transaction_id ?? null,
    period_type: event.period_type ?? null,
    purchase_date: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
    expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    environment: event.environment?.toLowerCase() ?? null,
    updated_at: new Date().toISOString(),
  };

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
      return {
        ...base,
        will_renew: true,
        unsubscribe_detected_at: null,
        billing_issues_detected_at: null,
      };
    case 'CANCELLATION':
      return {
        ...base,
        will_renew: false,
        unsubscribe_detected_at: new Date().toISOString(),
      };
    case 'EXPIRATION':
      return { ...base, will_renew: false };
    case 'BILLING_ISSUE':
      return {
        ...base,
        billing_issues_detected_at: new Date().toISOString(),
      };
    case 'SUBSCRIBER_ALIAS':
    case 'TEST':
    case 'TRANSFER':
      return null; // audit-only
    default:
      return null; // unknown types: audit-only, no write
  }
}

function isUuid(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
```

- [ ] **Step 2: Write `index.ts.tpl` (Deno entry; minimal — delegates to handler)**

`templates/revenuecat-webhook/index.ts.tpl`:

```ts
// RevenueCat webhook endpoint
// Generated by ~/.claude/skills/rc-setup/ Plan 3
// Deploy: supabase functions deploy revenuecat-webhook
//
// Auth:  Authorization: Bearer $RC_WEBHOOK_AUTH
// Body:  { event: { type, app_user_id, expiration_at_ms, ... } }
//
// Response:
//   200 — event processed or duplicate
//   401 — bad/missing bearer token
//   400 — malformed body
//   500 — DB error (RC will retry)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleEvent } from './handle-event.ts';

const RC_WEBHOOK_AUTH = Deno.env.get('RC_WEBHOOK_AUTH') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (!RC_WEBHOOK_AUTH || auth !== `Bearer ${RC_WEBHOOK_AUTH}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const result = await handleEvent(body as { event?: Record<string, unknown> } | null, client as never);
  switch (result.status) {
    case 'ok':
    case 'duplicate':
      return new Response(JSON.stringify({ status: result.status }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    case 'malformed':
      return new Response(JSON.stringify(result), { status: 400 });
    case 'db-error':
      return new Response(JSON.stringify(result), { status: 500 });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add templates/revenuecat-webhook/handle-event.ts.tpl templates/revenuecat-webhook/index.ts.tpl
git commit -m "feat(supabase): edge function templates — pure handler + Deno entry"
```

---

## Task 6: Tests for `handleEvent` — covers every RC event type

**Files:**
- Test: `~/.claude/skills/rc-setup/test/supabase/handle-event.test.js`

Vitest imports the `.tpl` file. Because the template ends in `.ts.tpl`, we'll load it with a small shim: copy the template to a temp `.ts` file and import it via a dynamic loader. That would need a TS loader though — instead, use the simpler approach: **materialize the handler as `.js` source inside the test file** by reading the template, stripping TypeScript types via a tiny regex pass, writing to a `.mjs` temp, and dynamic-importing it.

Actually that's fragile. Better approach: **extract `handleEvent` into a plain `.js` sibling** at `scripts/supabase/handle-event.js` (same source, no types) and have the template import from a relative path. But the edge function runs on Deno, and Deno can import `.js` files fine.

**Decision:** For testability, keep `handle-event.ts.tpl` as the ONLY source-of-truth. In tests, use `ts-node/register` via vitest's built-in TS support. vitest 3 supports TS imports out of the box when a file ends in `.ts`, not `.ts.tpl`. Simplest: have the scaffold step also write `.js` versions to a cache dir the test reads, OR switch the template to a dual-compile approach.

**Final decision (keep it simple):** The tests in Task 6 directly duplicate the `entitlementWrite` and `handleEvent` logic as a `.js` file under `scripts/supabase/handle-event.js` (same logic, no TS types), and the template file contains the TS version. The scaffold step (Task 7) writes the `.ts` template into the target project; the skill's test suite tests the `.js` copy. Each time `handle-event.ts.tpl` changes, the corresponding `.js` change must be made — a lint rule or a manual convention enforces parity. Small enough file that drift is catchable in code review.

- [ ] **Step 1: Write failing test FIRST (TDD red)**

Save the test file described in Step 2 below, then run:

```bash
npm test -- test/supabase/handle-event.test.js
```
Expected: FAIL — `Cannot find module '../../scripts/supabase/handle-event.js'`. Only after confirming failure, write the handler in Step 3.

- [ ] **Step 2: Write the `.js` handler at `scripts/supabase/handle-event.js`**

(Note: this is the sibling of the `.ts.tpl` from Task 5 — the source-of-truth for the deployed function is the `.ts.tpl`; the `.js` here is the vitest-testable mirror. They must stay in sync.)

`scripts/supabase/handle-event.js`:

```js
export async function handleEvent(envelope, supabase) {
  const event = envelope?.event;
  if (!event || typeof event.type !== 'string') {
    return { status: 'malformed', detail: 'missing event.type' };
  }

  const auditRow = {
    event_id: event.id ?? null,
    event_type: event.type,
    app_user_id: event.app_user_id ?? null,
    user_id: isUuid(event.app_user_id) ? event.app_user_id : null,
    environment: event.environment?.toLowerCase() ?? null,
    payload: event,
  };
  const auditResult = await supabase.from('revenuecat_events').insert(auditRow);
  if (auditResult.error) {
    if (auditResult.error.code === '23505') return { status: 'duplicate' };
    return { status: 'db-error', detail: auditResult.error.message };
  }

  const userId = isUuid(event.app_user_id) ? event.app_user_id : null;
  if (!userId) return { status: 'ok' };

  const write = entitlementWrite(event, userId);
  if (!write) return { status: 'ok' };

  const upsertResult = await supabase
    .from('plus_entitlements')
    .upsert(write, { onConflict: 'user_id' });
  if (upsertResult.error) {
    return { status: 'db-error', detail: upsertResult.error.message };
  }
  return { status: 'ok' };
}

function entitlementWrite(event, userId) {
  const base = {
    user_id: userId,
    entitlement_id: 'plus',
    product_id: event.product_id ?? null,
    original_transaction_id: event.original_transaction_id ?? null,
    period_type: event.period_type ?? null,
    purchase_date: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
    expires_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
    environment: event.environment?.toLowerCase() ?? null,
    updated_at: new Date().toISOString(),
  };

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
      return {
        ...base,
        will_renew: true,
        unsubscribe_detected_at: null,
        billing_issues_detected_at: null,
      };
    case 'CANCELLATION':
      return { ...base, will_renew: false, unsubscribe_detected_at: new Date().toISOString() };
    case 'EXPIRATION':
      return { ...base, will_renew: false };
    case 'BILLING_ISSUE':
      return { ...base, billing_issues_detected_at: new Date().toISOString() };
    case 'SUBSCRIBER_ALIAS':
    case 'TEST':
    case 'TRANSFER':
      return null;
    default:
      return null;
  }
}

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
```

- [ ] **Step 3: Create the test file (the one Step 1 asserted would fail without the handler)**

`test/supabase/handle-event.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { handleEvent } from '../../scripts/supabase/handle-event.js';

const UID = '11111111-2222-3333-4444-555555555555';

function fakeSupabase({ auditError = null, upsertError = null } = {}) {
  const inserts = [];
  const upserts = [];
  return {
    inserts,
    upserts,
    from(table) {
      return {
        insert: vi.fn(async (row) => {
          inserts.push({ table, row });
          return { error: auditError };
        }),
        upsert: vi.fn(async (row, opts) => {
          upserts.push({ table, row, opts });
          return { error: upsertError };
        }),
      };
    },
  };
}

describe('handleEvent', () => {
  it('returns malformed when envelope.event is missing', async () => {
    const s = fakeSupabase();
    const r = await handleEvent({}, s);
    expect(r.status).toBe('malformed');
    expect(s.inserts).toHaveLength(0);
  });

  it('returns malformed when event.type is not a string', async () => {
    const r = await handleEvent({ event: { id: 'x' } }, fakeSupabase());
    expect(r.status).toBe('malformed');
  });

  it('INITIAL_PURCHASE: audit + upsert with will_renew=true and cleared flags', async () => {
    const s = fakeSupabase();
    const r = await handleEvent({
      event: {
        id: 'evt_1',
        type: 'INITIAL_PURCHASE',
        app_user_id: UID,
        product_id: 'gymcrush_plus_monthly',
        purchased_at_ms: 1700000000000,
        expiration_at_ms: 1702592000000,
        environment: 'PRODUCTION',
        original_transaction_id: 'orig_1',
        period_type: 'NORMAL',
      },
    }, s);
    expect(r.status).toBe('ok');
    expect(s.inserts).toHaveLength(1);
    expect(s.inserts[0].table).toBe('revenuecat_events');
    expect(s.upserts).toHaveLength(1);
    expect(s.upserts[0].table).toBe('plus_entitlements');
    expect(s.upserts[0].opts).toEqual({ onConflict: 'user_id' });
    expect(s.upserts[0].row.user_id).toBe(UID);
    expect(s.upserts[0].row.entitlement_id).toBe('plus');
    expect(s.upserts[0].row.product_id).toBe('gymcrush_plus_monthly');
    expect(s.upserts[0].row.will_renew).toBe(true);
    expect(s.upserts[0].row.unsubscribe_detected_at).toBeNull();
    expect(s.upserts[0].row.billing_issues_detected_at).toBeNull();
    expect(s.upserts[0].row.environment).toBe('production');
    expect(s.upserts[0].row.expires_at).toBe(new Date(1702592000000).toISOString());
  });

  it('RENEWAL: same shape as INITIAL_PURCHASE', async () => {
    const s = fakeSupabase();
    const r = await handleEvent({
      event: { id: 'evt_r', type: 'RENEWAL', app_user_id: UID, expiration_at_ms: 1703000000000 },
    }, s);
    expect(r.status).toBe('ok');
    expect(s.upserts[0].row.will_renew).toBe(true);
  });

  it('PRODUCT_CHANGE and UNCANCELLATION use purchase/renewal write', async () => {
    for (const type of ['PRODUCT_CHANGE', 'UNCANCELLATION']) {
      const s = fakeSupabase();
      await handleEvent({ event: { id: `evt_${type}`, type, app_user_id: UID } }, s);
      expect(s.upserts[0].row.will_renew).toBe(true);
      expect(s.upserts[0].row.unsubscribe_detected_at).toBeNull();
    }
  });

  it('CANCELLATION: will_renew=false and unsubscribe_detected_at set', async () => {
    const s = fakeSupabase();
    await handleEvent({ event: { id: 'e', type: 'CANCELLATION', app_user_id: UID, expiration_at_ms: 1702000000000 } }, s);
    expect(s.upserts[0].row.will_renew).toBe(false);
    expect(typeof s.upserts[0].row.unsubscribe_detected_at).toBe('string');
    expect(s.upserts[0].row.expires_at).toBe(new Date(1702000000000).toISOString());
  });

  it('EXPIRATION: will_renew=false, unsubscribe flag NOT auto-set', async () => {
    const s = fakeSupabase();
    await handleEvent({ event: { id: 'e', type: 'EXPIRATION', app_user_id: UID, expiration_at_ms: 1700000000000 } }, s);
    expect(s.upserts[0].row.will_renew).toBe(false);
    expect(s.upserts[0].row.unsubscribe_detected_at).toBeUndefined();
  });

  it('BILLING_ISSUE: only flips billing_issues_detected_at', async () => {
    const s = fakeSupabase();
    await handleEvent({ event: { id: 'e', type: 'BILLING_ISSUE', app_user_id: UID } }, s);
    expect(typeof s.upserts[0].row.billing_issues_detected_at).toBe('string');
  });

  it('SUBSCRIBER_ALIAS / TEST / TRANSFER: audit only, no upsert', async () => {
    for (const type of ['SUBSCRIBER_ALIAS', 'TEST', 'TRANSFER']) {
      const s = fakeSupabase();
      const r = await handleEvent({ event: { id: `e_${type}`, type, app_user_id: UID } }, s);
      expect(r.status).toBe('ok');
      expect(s.inserts).toHaveLength(1);
      expect(s.upserts).toHaveLength(0);
    }
  });

  it('non-UUID app_user_id → audit only, no upsert', async () => {
    const s = fakeSupabase();
    const r = await handleEvent({ event: { id: 'e', type: 'INITIAL_PURCHASE', app_user_id: 'legacy-alias-123' } }, s);
    expect(r.status).toBe('ok');
    expect(s.inserts).toHaveLength(1);
    expect(s.inserts[0].row.user_id).toBeNull();
    expect(s.upserts).toHaveLength(0);
  });

  it('duplicate event_id (23505): returns duplicate, no upsert', async () => {
    const s = fakeSupabase({ auditError: { code: '23505', message: 'duplicate' } });
    const r = await handleEvent({ event: { id: 'dup', type: 'INITIAL_PURCHASE', app_user_id: UID } }, s);
    expect(r.status).toBe('duplicate');
    expect(s.upserts).toHaveLength(0);
  });

  it('audit non-23505 db error: returns db-error', async () => {
    const s = fakeSupabase({ auditError: { code: '42P01', message: 'relation missing' } });
    const r = await handleEvent({ event: { id: 'e', type: 'INITIAL_PURCHASE', app_user_id: UID } }, s);
    expect(r.status).toBe('db-error');
    expect(s.upserts).toHaveLength(0);
  });

  it('entitlement upsert db error: returns db-error after successful audit', async () => {
    const s = fakeSupabase({ upsertError: { message: 'constraint' } });
    const r = await handleEvent({ event: { id: 'e', type: 'INITIAL_PURCHASE', app_user_id: UID } }, s);
    expect(r.status).toBe('db-error');
    expect(s.inserts).toHaveLength(1); // audit did succeed
  });

  it('unknown event type: audit only, ok status', async () => {
    const s = fakeSupabase();
    const r = await handleEvent({ event: { id: 'e', type: 'NEW_RC_EVENT_TYPE', app_user_id: UID } }, s);
    expect(r.status).toBe('ok');
    expect(s.upserts).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run — expect pass (handler was written in Step 2)**

```bash
npm test -- test/supabase/handle-event.test.js
```
Expected: 13/13 green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/handle-event.js test/supabase/handle-event.test.js
git commit -m "feat(supabase): handleEvent with full RC event-type coverage"
```

---

## Task 7: `scaffoldWebhook` — write edge-function files into target repo

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/supabase/scaffold-webhook.js`
- Test: `~/.claude/skills/rc-setup/test/supabase/scaffold-webhook.test.js`

- [ ] **Step 1: Write failing test**

`test/supabase/scaffold-webhook.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scaffoldWebhook } from '../../scripts/supabase/scaffold-webhook.js';

describe('scaffoldWebhook', () => {
  let projectDir;
  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proj-'));
    fs.mkdirSync(path.join(projectDir, 'supabase', 'functions'), { recursive: true });
  });
  afterEach(() => { fs.rmSync(projectDir, { recursive: true, force: true }); });

  it('writes index.ts + handle-event.ts under supabase/functions/revenuecat-webhook/', () => {
    const result = scaffoldWebhook({ projectDir });

    expect(result.created).toBe(true);
    expect(result.functionDir).toBe(path.join(projectDir, 'supabase/functions/revenuecat-webhook'));
    const indexPath = path.join(result.functionDir, 'index.ts');
    const handlerPath = path.join(result.functionDir, 'handle-event.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
    expect(fs.existsSync(handlerPath)).toBe(true);
    expect(fs.readFileSync(indexPath, 'utf8')).toMatch(/import.*handleEvent.*handle-event/);
    expect(fs.readFileSync(handlerPath, 'utf8')).toMatch(/export async function handleEvent/);
  });

  it('is idempotent — returns created=false if both files already exist, does not overwrite', () => {
    const dir = path.join(projectDir, 'supabase/functions/revenuecat-webhook');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.ts'), '-- custom');
    fs.writeFileSync(path.join(dir, 'handle-event.ts'), '-- custom handler');

    const result = scaffoldWebhook({ projectDir });

    expect(result.created).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'index.ts'), 'utf8')).toBe('-- custom');
    expect(fs.readFileSync(path.join(dir, 'handle-event.ts'), 'utf8')).toBe('-- custom handler');
  });

  it('throws when supabase/functions directory missing', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    expect(() => scaffoldWebhook({ projectDir: empty })).toThrow(/supabase\/functions/);
    fs.rmSync(empty, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- test/supabase/scaffold-webhook.test.js
```

- [ ] **Step 3: Implement**

`scripts/supabase/scaffold-webhook.js`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, '..', '..', 'templates', 'revenuecat-webhook');
const FUNCTION_NAME = 'revenuecat-webhook';
const FILES = ['index.ts', 'handle-event.ts']; // target filenames

export function scaffoldWebhook({ projectDir }) {
  const functionsRoot = path.join(projectDir, 'supabase', 'functions');
  if (!fs.existsSync(functionsRoot)) {
    throw new Error(`supabase/functions directory not found at ${functionsRoot}`);
  }
  const functionDir = path.join(functionsRoot, FUNCTION_NAME);
  const allExist = fs.existsSync(functionDir) && FILES.every(
    (f) => fs.existsSync(path.join(functionDir, f))
  );
  if (allExist) {
    return { created: false, functionDir };
  }

  fs.mkdirSync(functionDir, { recursive: true });
  for (const basename of FILES) {
    const src = path.join(TEMPLATE_DIR, `${basename}.tpl`);
    const dst = path.join(functionDir, basename);
    if (fs.existsSync(dst)) continue; // preserve user edits to individual files
    fs.writeFileSync(dst, fs.readFileSync(src, 'utf8'));
  }
  return { created: true, functionDir };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/supabase/scaffold-webhook.test.js
```
Expected: 3/3 green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/scaffold-webhook.js test/supabase/scaffold-webhook.test.js
git commit -m "feat(supabase): scaffold edge function files into target repo, idempotent"
```

---

## Task 8: `deploy` — wrap `supabase` CLI commands

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/supabase/deploy.js`
- Test: `~/.claude/skills/rc-setup/test/supabase/deploy.test.js`

- [ ] **Step 1: Write failing test**

`test/supabase/deploy.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deploy } from '../../scripts/supabase/deploy.js';

// Stub child_process.execFile — scripts/supabase/deploy.js reads it lazily.
const calls = [];
vi.mock('node:child_process', () => ({
  execFile: (cmd, args, opts, cb) => {
    calls.push({ cmd, args, cwd: opts?.cwd });
    // default success
    cb(null, { stdout: 'ok\n', stderr: '' });
  },
}));

describe('deploy', () => {
  beforeEach(() => { calls.length = 0; });

  it('runs db push then functions deploy in the target project dir', async () => {
    const result = await deploy({
      projectDir: '/tmp/proj',
      projectRef: 'abc123',
      dbPassword: 'pw',
    });
    expect(result.status).toBe('ok');
    expect(result.functionUrl).toBe('https://abc123.supabase.co/functions/v1/revenuecat-webhook');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({
      cmd: 'supabase',
      args: ['db', 'push', '--password', 'pw'],
      cwd: '/tmp/proj',
    });
    expect(calls[1]).toEqual({
      cmd: 'supabase',
      args: ['functions', 'deploy', 'revenuecat-webhook', '--project-ref', 'abc123'],
      cwd: '/tmp/proj',
    });
  });

  it('sets the RC_WEBHOOK_AUTH secret when provided', async () => {
    await deploy({
      projectDir: '/tmp/proj',
      projectRef: 'abc123',
      dbPassword: 'pw',
      webhookAuth: 'secret-token',
    });
    expect(calls).toHaveLength(3);
    expect(calls[2]).toEqual({
      cmd: 'supabase',
      args: ['secrets', 'set', 'RC_WEBHOOK_AUTH=secret-token', '--project-ref', 'abc123'],
      cwd: '/tmp/proj',
    });
  });

  it('surfaces supabase CLI failures as thrown errors', async () => {
    vi.doMock('node:child_process', () => ({
      execFile: (_cmd, _args, _opts, cb) => cb(new Error('supabase: command not found')),
    }));
    // Re-import to pick up the new mock
    const fresh = await import('../../scripts/supabase/deploy.js?reimport=1');
    await expect(fresh.deploy({ projectDir: '/x', projectRef: 'r', dbPassword: 'p' }))
      .rejects.toThrow(/command not found/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- test/supabase/deploy.test.js
```

- [ ] **Step 3: Implement**

`scripts/supabase/deploy.js`:

```js
import { execFile } from 'node:child_process';

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function deploy({ projectDir, projectRef, dbPassword, webhookAuth }) {
  await run('supabase', ['db', 'push', '--password', dbPassword], projectDir);
  await run('supabase', ['functions', 'deploy', 'revenuecat-webhook', '--project-ref', projectRef], projectDir);
  if (webhookAuth) {
    await run('supabase', ['secrets', 'set', `RC_WEBHOOK_AUTH=${webhookAuth}`, '--project-ref', projectRef], projectDir);
  }
  return {
    status: 'ok',
    functionUrl: `https://${projectRef}.supabase.co/functions/v1/revenuecat-webhook`,
  };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/supabase/deploy.test.js
```
Expected: 3/3 green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/deploy.js test/supabase/deploy.test.js
git commit -m "feat(supabase): deploy wrapper for db push + function deploy + secrets set"
```

---

## Task 9: `wireRcWebhook` — probe real v2 webhook path, PATCH or degrade

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/supabase/wire-rc-webhook.js`
- Test: `~/.claude/skills/rc-setup/test/supabase/wire-rc-webhook.test.js`

Background: Plan 2 observed `GET /v2/projects/{id}/webhooks → 404`. Plan 3 probes the two plausible alternatives in order and uses whichever responds 200.

- [ ] **Step 1: Write failing test**

`test/supabase/wire-rc-webhook.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { wireRcWebhook } from '../../scripts/supabase/wire-rc-webhook.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('wireRcWebhook', () => {
  it('uses /v2/projects/{id}/integrations when that path responds 200', async () => {
    const patched = [];
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/integrations', () =>
        HttpResponse.json({
          items: [
            { id: 'wh_existing', type: 'webhook', url: 'https://old.example' },
            { id: 'other', type: 'slack' },
          ],
        })
      ),
      http.patch('https://api.revenuecat.com/v2/projects/proj_abc/integrations/wh_existing', async ({ request }) => {
        patched.push(await request.json());
        return HttpResponse.json({ id: 'wh_existing' });
      })
    );

    const r = await wireRcWebhook(makeClient(), {
      url: 'https://abc.supabase.co/functions/v1/revenuecat-webhook',
      authToken: 'secret',
    });
    expect(r).toEqual({ status: 'set', webhookId: 'wh_existing', path: '/projects/proj_abc/integrations' });
    expect(patched[0]).toEqual({
      url: 'https://abc.supabase.co/functions/v1/revenuecat-webhook',
      authorization_header: 'Bearer secret',
    });
  });

  it('falls back to /v2/projects/{id}/webhooks when integrations path 404s', async () => {
    const patched = [];
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/integrations', () =>
        HttpResponse.json({ type: 'resource_missing' }, { status: 404 })
      ),
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/webhooks', () =>
        HttpResponse.json({ items: [{ id: 'wh_2', url: 'https://old.example' }] })
      ),
      http.patch('https://api.revenuecat.com/v2/projects/proj_abc/webhooks/wh_2', async ({ request }) => {
        patched.push(await request.json());
        return HttpResponse.json({ id: 'wh_2' });
      })
    );
    const r = await wireRcWebhook(makeClient(), {
      url: 'https://x/y',
      authToken: 't',
    });
    expect(r.status).toBe('set');
    expect(r.path).toBe('/projects/proj_abc/webhooks');
    expect(patched[0].url).toBe('https://x/y');
  });

  it('returns api-not-exposed when both paths 404', async () => {
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/integrations', () =>
        HttpResponse.json({}, { status: 404 })
      ),
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/webhooks', () =>
        HttpResponse.json({}, { status: 404 })
      )
    );
    const r = await wireRcWebhook(makeClient(), { url: 'https://x', authToken: 't' });
    expect(r.status).toBe('api-not-exposed');
    expect(r.webhookId).toBeNull();
  });

  it('creates a webhook via POST when list is empty and integrations path exists', async () => {
    let posted;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/integrations', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/integrations', async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ id: 'wh_new' }, { status: 201 });
      })
    );
    const r = await wireRcWebhook(makeClient(), { url: 'https://x', authToken: 't' });
    expect(r.status).toBe('set');
    expect(r.webhookId).toBe('wh_new');
    expect(posted).toEqual({
      type: 'webhook',
      url: 'https://x',
      authorization_header: 'Bearer t',
    });
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- test/supabase/wire-rc-webhook.test.js
```

- [ ] **Step 3: Implement**

`scripts/supabase/wire-rc-webhook.js`:

```js
const CANDIDATE_PATHS = [
  (projectId) => `/projects/${projectId}/integrations`,
  (projectId) => `/projects/${projectId}/webhooks`,
];

export async function wireRcWebhook(client, { url, authToken }) {
  const desiredAuthHeader = `Bearer ${authToken}`;

  for (const buildPath of CANDIDATE_PATHS) {
    const basePath = buildPath(client.projectId);
    let list;
    try {
      list = await client.get(basePath);
    } catch (err) {
      if (err.status === 404) continue;
      throw err;
    }

    const existing = (list.items ?? []).find(
      (w) => w?.type === 'webhook' || w?.url // heuristic: treat any webhook-shaped row
    );

    if (existing) {
      await client.patch(`${basePath}/${existing.id}`, {
        url,
        authorization_header: desiredAuthHeader,
      });
      return { status: 'set', webhookId: existing.id, path: basePath };
    }

    const created = await client.post(basePath, {
      type: 'webhook',
      url,
      authorization_header: desiredAuthHeader,
    });
    return { status: 'set', webhookId: created.id, path: basePath };
  }

  return { status: 'api-not-exposed', webhookId: null };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/supabase/wire-rc-webhook.test.js
```
Expected: 4/4 green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/wire-rc-webhook.js test/supabase/wire-rc-webhook.test.js
git commit -m "feat(supabase): probe RC v2 webhook endpoint (integrations → webhooks), PATCH or degrade"
```

---

## Task 10: Phase-3 orchestrator (`scripts/supabase/run.js`) + `bin/rc-setup.js` wiring

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/supabase/run.js`
- Modify: `~/.claude/skills/rc-setup/bin/rc-setup.js`

- [ ] **Step 1: Implement orchestrator**

`scripts/supabase/run.js`:

```js
import path from 'node:path';
import fs from 'node:fs';
import { loadProjectEnv, requireSupabaseEnv, requireRcEnv } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { RcClient } from '../rc/client.js';
import { scaffoldMigration } from './scaffold-migration.js';
import { scaffoldWebhook } from './scaffold-webhook.js';
import { deploy } from './deploy.js';
import { wireRcWebhook } from './wire-rc-webhook.js';

export async function run() {
  const projectDir = process.cwd();
  const env = loadProjectEnv(projectDir);
  const supabaseCfg = requireSupabaseEnv(env);
  const rcCfg = requireRcEnv(env);
  const webhookAuth = env.RC_WEBHOOK_AUTH;
  if (!webhookAuth) {
    throw new Error('RC_WEBHOOK_AUTH missing from .env — run `rc-setup rc` first to generate it.');
  }

  log.step('Phase 3: Supabase webhook');

  log.info('Scaffolding migration...');
  const mig = scaffoldMigration({ projectDir });
  if (mig.created) log.ok(`migration ${path.relative(projectDir, mig.filePath)}`);
  else             log.skip(`migration already present: ${path.relative(projectDir, mig.filePath)}`);

  log.info('Scaffolding edge function...');
  const fn = scaffoldWebhook({ projectDir });
  if (fn.created) log.ok(`${path.relative(projectDir, fn.functionDir)}/ (index.ts + handle-event.ts)`);
  else            log.skip(`edge function already scaffolded: ${path.relative(projectDir, fn.functionDir)}`);

  log.info('Deploying to Supabase (db push + functions deploy + secrets set)...');
  const dep = await deploy({
    projectDir,
    projectRef: supabaseCfg.projectRef,
    dbPassword: supabaseCfg.dbPassword,
    webhookAuth,
  });
  log.ok(`function URL: ${dep.functionUrl}`);

  log.info('Wiring RC webhook to deployed URL...');
  const client = new RcClient(rcCfg);
  const wh = await wireRcWebhook(client, { url: dep.functionUrl, authToken: webhookAuth });
  if (wh.status === 'set') {
    log.ok(`RC webhook ${wh.webhookId} pointing at ${dep.functionUrl} (via ${wh.path})`);
  } else {
    log.warn('RC v2 API does not expose webhooks endpoint — configure manually in RC dashboard:');
    log.warn(`  1) Go to https://app.revenuecat.com/projects/${rcCfg.projectId}/integrations/webhooks`);
    log.warn(`  2) URL: ${dep.functionUrl}`);
    log.warn(`  3) Authorization header: Bearer ${webhookAuth}`);
    log.warn(`  4) Save, then send a test event from the dashboard.`);
  }

  const envPath = path.join(projectDir, '.env');
  appendEnvOnce(envPath, 'RC_WEBHOOK_URL', dep.functionUrl);

  log.step('Phase 3 complete.');
  console.log(`
.env updated:
  RC_WEBHOOK_URL=${dep.functionUrl}

Next:
  1) If "api-not-exposed" above, paste the URL + Bearer token into RC dashboard.
  2) From RC dashboard, trigger a test event → confirm a row lands in public.revenuecat_events.
  3) Proceed to Plan 4 (app scaffolding).
`);
}

function appendEnvOnce(envPath, key, value) {
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (new RegExp(`^${key}=`, 'm').test(current)) {
    const updated = current.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
    fs.writeFileSync(envPath, updated);
  } else {
    const prefix = current.endsWith('\n') || current === '' ? '' : '\n';
    fs.appendFileSync(envPath, `${prefix}${key}=${value}\n`);
  }
}
```

- [ ] **Step 2: Wire `webhook` phase into `bin/rc-setup.js`**

Replace contents of `bin/rc-setup.js`:

```js
#!/usr/bin/env node
import { run as runAsc } from '../scripts/asc/run.js';
import { run as runRc } from '../scripts/rc/run.js';
import { run as runWebhook } from '../scripts/supabase/run.js';

const [phase] = process.argv.slice(2);

const phases = {
  asc: runAsc,
  rc: runRc,
  webhook: runWebhook,
};

async function main() {
  if (!phase || !phases[phase]) {
    console.error(`Usage: rc-setup <phase>\nPhases: ${Object.keys(phases).join(', ')}`);
    process.exit(2);
  }
  try {
    await phases[phase]();
  } catch (err) {
    console.error(`\n[${phase}] failed:`, err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 3: Smoke-test imports**

```bash
cd ~/.claude/skills/rc-setup
node -e "import('./scripts/supabase/run.js').then(m => console.log('supabase orchestrator OK, exports:', Object.keys(m)))"
node bin/rc-setup.js 2>&1 | head -3
```
Expected: `supabase orchestrator OK, exports: [ 'run' ]` and `Usage: rc-setup <phase>\nPhases: asc, rc, webhook`.

- [ ] **Step 4: Full test suite still green**

```bash
npm test
```
Expected: all Plans 1+2 tests (60+) plus new Plan 3 tests = ~95 total, all green.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/run.js bin/rc-setup.js
git commit -m "feat(supabase): phase-3 orchestrator + /rc-setup webhook wiring"
```

---

## Task 11: Update `SKILL.md` Phase 3 status + preconditions

**Files:**
- Modify: `~/.claude/skills/rc-setup/SKILL.md`

- [ ] **Step 1: Update the status block and add Phase-3 preconditions**

In `SKILL.md`, replace:

```markdown
## Status

- [x] Phase 1 — ASC
- [x] Phase 2 — RC
- [ ] Phase 3 — Supabase webhook
- [ ] Phase 4 — App scaffolding
- [ ] Phase 5 — Play (stub)
- [ ] Phase 6 — verify
```

with:

```markdown
## Status

- [x] Phase 1 — ASC
- [x] Phase 2 — RC
- [x] Phase 3 — Supabase webhook (Plan 3)
- [ ] Phase 4 — App scaffolding
- [ ] Phase 5 — Play (stub)
- [ ] Phase 6 — verify

## Preconditions (Phase 3)

Target project `.env` must contain (in addition to Phases 1+2):

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `RC_WEBHOOK_AUTH` (populated by Phase 2)

Target project repo must have a `supabase/` directory with `migrations/` and `functions/` subdirs (gymcrush and all new Expo + Supabase projects satisfy this by default).

Local machine must have the Supabase CLI installed and linked to the project:

```
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <SUPABASE_PROJECT_REF>
```
```

Add to the Commands table:

```markdown
| `node ~/.claude/skills/rc-setup/bin/rc-setup.js webhook` | Run Supabase phase (migration + edge fn + RC webhook wire) |
```

- [ ] **Step 2: Commit**

```bash
git add SKILL.md
git commit -m "docs(skill): mark Phase 3 complete; document Supabase preconditions"
```

---

## Task 12: Manual acceptance test against gymcrush

This task runs against real gymcrush Supabase + RC. No unit tests substitute — edge functions need a real deploy to verify event round-trip.

**Preconditions:**

- `~/dev/gymcrush/.env` contains:
  - `SUPABASE_PROJECT_REF=<gymcrush ref>`
  - `SUPABASE_DB_PASSWORD=<password>`
  - `RC_API_KEY_V2=sk_...`
  - `RC_PROJECT_ID=proj7b897d04`
  - `RC_WEBHOOK_AUTH=<generated by Phase 2>`
- Supabase CLI installed + linked: `supabase link --project-ref <ref>` done previously.
- RC `.p8` has been uploaded via dashboard (Plan 2 manual step).

- [ ] **Step 1: Pre-flight — verify CLI + env**

```bash
cd ~/dev/gymcrush
supabase --version                    # should print v1.x or newer
grep -E '^(SUPABASE_PROJECT_REF|SUPABASE_DB_PASSWORD|RC_WEBHOOK_AUTH)=' .env
```
Expected: version string printed; all three env lines present.

- [ ] **Step 2: Run Phase 3**

```bash
cd ~/dev/gymcrush
node ~/.claude/skills/rc-setup/bin/rc-setup.js webhook
```

Expected output (abbreviated):

```
▸ Phase 3: Supabase webhook
  › Scaffolding migration...
  ✓ migration supabase/migrations/00038_create_plus_entitlements.sql
  › Scaffolding edge function...
  ✓ supabase/functions/revenuecat-webhook/ (index.ts + handle-event.ts)
  › Deploying to Supabase (db push + functions deploy + secrets set)...
  ✓ function URL: https://<ref>.supabase.co/functions/v1/revenuecat-webhook
  › Wiring RC webhook to deployed URL...
  ✓ RC webhook <wh_id> pointing at https://<ref>.supabase.co/functions/v1/revenuecat-webhook (via /projects/proj7b897d04/integrations)
▸ Phase 3 complete.

.env updated:
  RC_WEBHOOK_URL=https://<ref>.supabase.co/functions/v1/revenuecat-webhook
```

If the "Wiring RC webhook" step logs `RC v2 API does not expose webhooks endpoint` and prints a 4-step manual block, that's the expected degrade path when both candidate paths 404'd. In that case, complete the 4-step manual block in RC dashboard before continuing.

- [ ] **Step 3: Verify migration landed**

```bash
cd ~/dev/gymcrush
supabase db remote --project-ref $SUPABASE_PROJECT_REF \
  -c "select table_name from information_schema.tables where table_schema='public' and table_name in ('plus_entitlements','revenuecat_events') order by table_name;"
```
Expected: both `plus_entitlements` and `revenuecat_events` listed.

- [ ] **Step 4: Trigger RC test event from dashboard**

1. Open `https://app.revenuecat.com/projects/proj7b897d04/integrations/webhooks`
2. Click the webhook → "Send test event" or equivalent
3. Wait ~5 seconds

- [ ] **Step 5: Confirm the test event landed in the audit table**

```bash
supabase db remote --project-ref $SUPABASE_PROJECT_REF \
  -c "select event_type, received_at from public.revenuecat_events order by received_at desc limit 1;"
```
Expected: one row with `event_type='TEST'` (or `test`, RC casing varies), timestamp within the last minute.

- [ ] **Step 6: Re-run to confirm idempotency**

```bash
cd ~/dev/gymcrush
node ~/.claude/skills/rc-setup/bin/rc-setup.js webhook
```
Expected:

```
  › Scaffolding migration...
  · migration already present: supabase/migrations/00038_create_plus_entitlements.sql
  › Scaffolding edge function...
  · edge function already scaffolded: supabase/functions/revenuecat-webhook
  › Deploying to Supabase ...
  ✓ function URL: https://<ref>.supabase.co/functions/v1/revenuecat-webhook
  › Wiring RC webhook ...
  ✓ RC webhook <same_wh_id> pointing at <same URL>
```
No new migration file created. No duplicate webhook created in RC.

- [ ] **Step 7: Commit skill-repo state**

```bash
cd ~/.claude/skills/rc-setup
git add -A && git commit --allow-empty -m "chore: Plan 3 acceptance test passed against gymcrush"
```

Also commit the gymcrush repo changes (scaffolded migration + edge function):

```bash
cd ~/dev/gymcrush
git add supabase/migrations/00038_create_plus_entitlements.sql supabase/functions/revenuecat-webhook .env
# Review .env diff — only RC_WEBHOOK_URL should be added
git commit -m "feat(subs): plus entitlement migration + RevenueCat webhook fn (via rc-setup skill)"
```

---

## Spec coverage check

| Spec requirement (Phase 3) | Task |
|---|---|
| Migration: `plus_entitlements` table with all documented columns | Task 3 (template) + Task 4 (scaffold) |
| Migration: `revenuecat_events` audit with unique `event_id` | Task 3 + Task 4 |
| Migration: `is_plus(uid)` RPC + RLS policies | Task 3 |
| Edge fn: bearer auth check, returns 401 | Task 5 (`index.ts.tpl`) |
| Edge fn: JSON parse failure → 400 | Task 5 |
| Edge fn: event-type dispatch per spec table | Task 6 (handler) — full coverage test matrix |
| Edge fn: duplicate `event_id` → 200 silently | Task 6 (duplicate test) |
| Edge fn: DB errors → 500 so RC retries | Task 5 + Task 6 (db-error test) |
| CANCELLATION sets `unsubscribe_detected_at`, preserves `expires_at` | Task 6 |
| EXPIRATION trusts RC's timestamp, not `now()` | Task 6 |
| `SUBSCRIBER_ALIAS` + `TEST` → audit only | Task 6 |
| Deploy edge fn via Supabase CLI | Task 8 |
| PATCH RC webhook to deployed URL (post-deploy) | Task 9 |
| Graceful degrade when RC v2 webhook endpoint missing | Task 9 (api-not-exposed branch) |
| `RC_WEBHOOK_AUTH` injected as edge-fn secret | Task 8 + Task 10 |
| Send test event + verify `revenuecat_events` row | Task 12 Steps 4+5 |
| Idempotency — re-runs safe | Task 4 (migration skip if exists), Task 7 (fn skip if exists), CLI commands idempotent, Task 12 Step 6 |

---

## Deferred to later plans

- `supabase/functions/revenuecat-webhook/` code lives in target repo once scaffolded; if handler logic changes in the skill template, the target repo must manually sync (OR Plan 4 adds a `--force` flag that overwrites with a user-visible diff).
- The `send_test_event` RC API call from the spec (§Phase 3 end) is deferred — manual click in dashboard is faster during acceptance test and doesn't require yet another API path we'd have to probe.
- Handler `.ts` ↔ `.js` parity (Task 6 note) is enforced by convention for now. If it drifts once, add a lint step that compares them.
- `supabase db push` requires the linked remote; local-only testing via `supabase start` + `supabase functions serve` is not part of Plan 3. Developer uses `npm test` for handler logic and real deploy for end-to-end.
