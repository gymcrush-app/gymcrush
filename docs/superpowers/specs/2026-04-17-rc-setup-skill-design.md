# `rc-setup` Skill — Design

**Date:** 2026-04-17
**Status:** Approved for planning
**Target skill location:** `~/.claude/skills/rc-setup/`
**First target app:** `gymcrush` (Expo 54, iOS bundle `com.gymcrushdating.app`)
**Reusable for:** any Expo / React Native + Supabase app adopting RevenueCat

---

## Purpose

A personal Claude skill that programmatically sets up RevenueCat + App Store Connect subscriptions end-to-end for new apps. Goal: every new app I ship uses the same opinionated pipeline, run with one command, with as few manual touchpoints as possible.

Gymcrush is the pilot. Subsequent apps reuse the same skill unchanged.

---

## Scope

**In scope (Phase 1–4):**

- Create ASC subscription group, products, prices, localizations, intro offers, review assets via ASC API
- Set ASC App Store Server Notifications URL so Apple notifies RC directly
- Create RC project, iOS app, products, entitlement, offering, packages via RC v2 REST API
- Upload ASC In-App Purchase `.p8` key into RC to enable ASC ↔ RC sync
- Scaffold Supabase migration (`plus_entitlements` + `revenuecat_events` audit log) and a RevenueCat webhook edge function
- Scaffold app-side code: install `react-native-purchases` + `react-native-purchases-ui`, wire provider, expose `useIsPlus()`, wire `Purchases.logIn(supabase_user_id)`, create `/paywall` route using RC `PaywallView`, add Settings restore/manage rows

**Stubbed only (Phase 5):**

- Google Play Store subscription setup. Directory + README + skeleton scripts exist; not implemented. `/rc-setup` detects Android and prints instructions for manual configuration.

**Out of scope:**

- Deciding which features `plus` gates (that's product work, not infra — skill installs the mechanism only)
- Designing paywall visuals (RC Paywall Editor is the chosen surface for that)
- Running `eas build` or submitting to TestFlight
- Handling Apple App Store Server Notifications directly (RC is the single source of truth — we only consume RC webhooks)

---

## First-app catalog (gymcrush)

Single entitlement, three auto-renewable subscriptions, each with a 7-day free trial.

| Product ID | Duration | USA price | Intro offer |
|---|---|---|---|
| `gymcrush_plus_monthly` | 1 month | $14.99 | 7-day free trial |
| `gymcrush_plus_3month` | 3 months | $29.99 | 7-day free trial |
| `gymcrush_plus_annual` | 1 year | $83.99 | 7-day free trial |

- ASC subscription group reference name: `GymCrush Plus`
- RC entitlement lookup key: `plus`
- RC offering lookup key: `default` (is_current = true)
- RC package identifiers: `$rc_monthly`, `$rc_three_month`, `$rc_annual`

Other territories: ASC auto-calculates from USA base.

Per-app override: the skill takes product IDs, prices, and entitlement name from a small interactive prompt at start (no state file; values written only to `.env`).

---

## Architecture

### Split: skill dir vs project repo

| Type | Lives where | Rationale |
|---|---|---|
| One-shot orchestration scripts (create ASC products, configure RC, wire webhook) | `~/.claude/skills/rc-setup/scripts/` | Run once per app; clients don't touch after handoff; centralized updates |
| Permanent app code (migration, edge function, SDK provider, hooks, paywall route, gating helper) | Target project repo | This IS the app — must be versioned and owned by the project |
| Per-project state (RC project ID, product IDs) | Target project `.env` only | No sync or state file; idempotent API lookups handle "already created?" |
| Credentials (ASC .p8, RC API key) | Target project `.env` + files under `~/.appstoreconnect/` | Per-app secrets, never in skill dir |

### Skill directory layout

```
~/.claude/skills/rc-setup/
├── SKILL.md                          # Trigger + phase guide
├── README.md                         # Human docs
├── scripts/
│   ├── asc/
│   │   ├── client.js                 # Shared ASC JWT + fetch helper
│   │   ├── create-subscription-group.js
│   │   ├── create-subscriptions.js   # All 3 products, idempotent
│   │   ├── set-prices.js
│   │   ├── create-intro-offers.js    # 7-day free trial on each
│   │   ├── upload-review-assets.js
│   │   ├── set-server-notifications-url.js
│   │   └── create-iap-key.js         # Creates the .p8 RC needs
│   ├── rc/
│   │   ├── client.js                 # RC v2 JWT helper
│   │   ├── create-project.js
│   │   ├── connect-ios-app.js        # Upload ASC .p8 + bundle ID
│   │   ├── create-products.js        # Imports from ASC
│   │   ├── create-entitlement.js     # `plus`
│   │   ├── create-offering.js        # `default` with 3 packages
│   │   └── set-webhook.js            # Points to Supabase edge fn
│   ├── app/
│   │   ├── install-sdk.js            # expo install purchases + UI
│   │   ├── scaffold-provider.js
│   │   ├── scaffold-hooks.js
│   │   └── wire-login.js             # Hooks Purchases.logIn into auth
│   ├── supabase/
│   │   ├── scaffold-migration.js     # Next-numbered migration
│   │   └── scaffold-webhook.js       # Edge fn skeleton
│   └── play/                         # STUB — READMEs + empty files
└── templates/                        # Code templates the scaffold scripts emit
    ├── purchases-provider.tsx.tpl
    ├── use-is-plus.ts.tpl
    ├── paywall-screen.tsx.tpl
    ├── 00XXX_plus_entitlements.sql.tpl
    └── revenuecat-webhook/index.ts.tpl
```

### Invocation

| Command | What it does |
|---|---|
| `/rc-setup` | Full wizard, resume-aware (detects phase state by probing ASC / RC / repo) |
| `/rc-setup asc` | Phase 1 only |
| `/rc-setup rc` | Phase 2 only |
| `/rc-setup webhook` | Phase 3 only |
| `/rc-setup app` | Phase 4 only |
| `/rc-setup verify` | Read-only end-to-end check |

### Idempotency

No state file. Every script queries the API first ("does this subscription group exist?") and creates only if missing. Re-running is always safe. `/rc-setup verify` formalizes this by making every check a pure read.

### Credentials (`.env` in target project)

```
# ASC (per-app)
ASC_KEY_ID=...
ASC_ISSUER_ID=...
ASC_KEY_PATH=/Users/chris/.appstoreconnect/private_keys/AuthKey_XXX.p8
ASC_APP_ID=12345678
ASC_BUNDLE_ID=com.gymcrushdating.app

# RC (per-app; RC_PROJECT_ID + RC_IOS_PUBLIC_KEY populated by skill)
RC_API_KEY_V2=sk_xxx
RC_PROJECT_ID=proj_xxx
RC_IOS_PUBLIC_KEY=appl_xxx
RC_WEBHOOK_AUTH=<generated-by-skill>

# App runtime (public, safe in bundle)
EXPO_PUBLIC_RC_IOS_KEY=appl_xxx
```

---

## Phase 1 — App Store Connect

Preconditions: `.env` has ASC creds and `.p8` file exists. Skill pings `GET /v1/apps` first; fails fast with remediation text on 401.

Ordered creation:

1. **Subscription group** — `POST /v1/subscriptionGroups` with `referenceName: "GymCrush Plus"`; capture `groupId`.
2. **Group localization (en-US)** — `POST /v1/subscriptionGroupLocalizations` with `customAppName: "GymCrush Plus"`. Required before products go live.
3. **3 subscriptions** — `POST /v1/subscriptions` each:
   - `gymcrush_plus_monthly` — ONE_MONTH, groupLevel 1
   - `gymcrush_plus_3month` — THREE_MONTHS, groupLevel 1
   - `gymcrush_plus_annual` — ONE_YEAR, groupLevel 1
4. **Per-subscription localizations (en-US)** — `POST /v1/subscriptionLocalizations` with user-facing `name` + `description`.
5. **Prices** — `POST /v1/subscriptionPrices` with ASC price points; base territory USA at $14.99 / $29.99 / $83.99; `preserveCurrentPrice: false`; auto-calculate other territories.
6. **Intro offers** — `POST /v1/subscriptionIntroductoryOffers` with `offerMode: FREE_TRIAL`, `duration: ONE_WEEK`, all territories.
7. **Review screenshot + notes** — `POST /v1/subscriptionAppStoreReviewScreenshots` with a generic placeholder PNG bundled in the skill. User replaces later.
8. **App-level server notifications URL** — `PATCH /v1/apps/{id}` setting `appStoreServerNotificationsV2Url` (prod + sandbox). Points Apple → RC, not our Supabase fn.
9. **IAP Key (.p8) for RC** — `POST /v1/inAppPurchasesV2/keys`. Private key is downloadable **once** at creation; skill saves to `~/.appstoreconnect/iap_keys/AuthKey_<id>.p8` and hands path to Phase 2.

Resulting state: 3 products in "Ready to Submit" — which is the expected terminal state until a real app build attaches them.

---

## Phase 2 — RevenueCat

Preconditions: `.env` has `RC_API_KEY_V2` with project-write scope. **This is the one unavoidable manual step** — the root API key is created in the RC dashboard (chicken-and-egg: can't create an API key via API without an API key).

Via RC v2 REST API (`api.revenuecat.com/v2`):

1. **Create project** — `POST /projects`; capture `project_id` → `.env`.
2. **Create iOS app** — `POST /projects/{id}/apps` with `type: app_store`, `bundle_id`; capture `app_id` and public SDK key → `.env` as `RC_IOS_PUBLIC_KEY` and `EXPO_PUBLIC_RC_IOS_KEY`.
3. **Upload ASC IAP key** — `POST /projects/{id}/apps/{app_id}/app_store_connect_api_key`, multipart upload of the `.p8` from Phase 1 step 9, plus `key_id` and `issuer_id`. Unlocks ASC ↔ RC sync.
4. **Wait for product import** — RC auto-imports products once key is uploaded. Poll `GET /projects/{id}/products` for up to 60s until all 3 appear; fall back to explicit `POST /projects/{id}/products` if timeout.
5. **Create entitlement** — `POST /projects/{id}/entitlements` with `lookup_key: "plus"`, `display_name: "GymCrush Plus"`.
6. **Attach products to entitlement** — `POST /projects/{id}/entitlements/plus/actions/attach_products` with all 3 product IDs.
7. **Create offering** — `POST /projects/{id}/offerings` with `lookup_key: "default"`, `is_current: true`.
8. **Create 3 packages in the offering:**
   - `$rc_monthly` → `gymcrush_plus_monthly`
   - `$rc_three_month` → `gymcrush_plus_3month`
   - `$rc_annual` → `gymcrush_plus_annual`
9. **Webhook placeholder** — `POST /projects/{id}/webhooks` with a placeholder URL + `RC_WEBHOOK_AUTH` bearer. Real URL patched in Phase 3 after the edge function deploys.

Paywall design happens in the RC dashboard's Paywall Editor against the `default` offering — the one place the UI is the correct surface.

---

## Phase 3 — Supabase (migration + edge function + webhook wiring)

### Migration — `supabase/migrations/00038_create_plus_entitlements.sql`

```sql
create table public.plus_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement_id text not null default 'plus',
  product_id text,
  original_transaction_id text,
  period_type text,                         -- trial, normal, intro
  purchase_date timestamptz,
  expires_at timestamptz,
  will_renew boolean,
  unsubscribe_detected_at timestamptz,
  billing_issues_detected_at timestamptz,
  environment text check (environment in ('sandbox','production')),
  updated_at timestamptz not null default now()
);
create index on public.plus_entitlements (expires_at) where expires_at > now();

create table public.revenuecat_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_id text unique,                     -- RC's id, dedupe re-deliveries
  app_user_id text,
  environment text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create index on public.revenuecat_events (user_id, received_at desc);
create index on public.revenuecat_events (event_type, received_at desc);

alter table public.plus_entitlements enable row level security;
create policy "own_entitlement_read" on public.plus_entitlements
  for select using (auth.uid() = user_id);

alter table public.revenuecat_events enable row level security;
-- No select policy → service-role only; users never read the audit log
```

Helper RPC: `public.is_plus(uid uuid) returns boolean` — single-row read against `plus_entitlements.expires_at > now()`.

Actual migration number is determined at scaffold time (next integer after existing migrations in the target project) — file above uses `00038_` because that's the current next-number in gymcrush as of this spec.

### Edge function — `supabase/functions/revenuecat-webhook/index.ts`

Contract:

- **Method:** POST
- **Auth:** `Authorization: Bearer ${RC_WEBHOOK_AUTH}` — checked first, 401 otherwise
- **Body:** RC webhook envelope `{ event: { type, app_user_id, product_id, expiration_at_ms, ... } }`
- **Idempotency:** insert into `revenuecat_events` with `event_id` as unique key; on conflict → 200 silently
- **Entitlement write:** upsert `plus_entitlements` by `user_id` using RC's fields; `CANCELLATION` sets `unsubscribe_detected_at` but leaves `expires_at` intact until real expiry
- **Response codes:** 200 on success or duplicate; 4xx only on auth/validation; 5xx only on DB errors (so RC retries)

Event handling:

| RC event | `plus_entitlements` write |
|---|---|
| `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION` | upsert with fresh `expires_at`; clear `unsubscribe_detected_at` + `billing_issues_detected_at` |
| `CANCELLATION` | set `unsubscribe_detected_at`; keep access until `expires_at` |
| `EXPIRATION` | set `expires_at = now()` (or trust RC's timestamp) |
| `BILLING_ISSUE` | set `billing_issues_detected_at` |
| `SUBSCRIBER_ALIAS` | no-op (Supabase user ID is the App User ID from day one) |
| `TEST` | log to events table, return 200 |

### Wire RC webhook to deployed URL

After `supabase functions deploy revenuecat-webhook`, skill `PATCH`es the Phase 2 step 9 webhook with the real URL + generated `RC_WEBHOOK_AUTH`, then calls `POST /projects/{id}/webhooks/{webhook_id}/actions/send_test_event` and verifies a `TEST` row lands in `revenuecat_events`.

---

## Phase 4 — App code scaffolding

Written into the target project repo.

### SDK install

```
npx expo install react-native-purchases react-native-purchases-ui
```

Adds Expo config plugin entry to `app.json` under `plugins`. `expo-dev-client` already present → next `eas build` picks it up.

### `lib/revenuecat/provider.tsx` — root provider

- `Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_RC_IOS_KEY, appUserID: null })` once on mount (iOS only; Android no-op)
- Subscribes to Supabase auth changes (reuses existing auth hook)
- On sign-in: `await Purchases.logIn(user.id)`
- On sign-out: `await Purchases.logOut()`
- React Context exposes `{ customerInfo, isPlus, offerings, refresh }`

Dropped into `app/_layout.tsx` wrapping children. Scaffold uses a marker comment so re-runs don't duplicate.

### `hooks/use-is-plus.ts` — canonical entitlement check

Reads RC `CustomerInfo` first (fast, SDK-cached); falls back to Supabase `is_plus(auth.uid())` RPC if SDK not ready. Returns `false` while loading — fail closed.

Server-trusted version: `lib/revenuecat/require-plus.ts` — for edge functions, calls `is_plus` RPC with the caller's JWT. Feature gates in any server-side edge function import this, not the client hook.

### `app/paywall.tsx` — RC PaywallView screen

```tsx
import { PaywallView } from 'react-native-purchases-ui';
// Full-screen modal route
// PaywallView reads the `default` offering from RC automatically
// onPurchaseCompleted / onRestoreCompleted / onDismiss → router.back()
```

Routed via expo-router as a modal. `router.push('/paywall')` is the one call any gated feature makes.

### `lib/revenuecat/gate.ts` — gating helper

```ts
export function gatePlus(action: () => void, router: Router) {
  if (useIsPlusStore.getState().isPlus) action();
  else router.push('/paywall');
}
```

Installs the mechanism; does not gate any specific feature.

### Settings screen additions

- "Restore Purchases" row → `Purchases.restorePurchases()`
- "Manage Subscription" row → opens `https://apps.apple.com/account/subscriptions` (Apple requires this; rejection reason otherwise)

### `.env` additions

Appends to `.env` and `.env.example` (masked):

```
EXPO_PUBLIC_RC_IOS_KEY=appl_xxx     # public, safe in bundle
```

Server-side secrets (`RC_API_KEY_V2`, ASC creds, `RC_WEBHOOK_AUTH`) stay in `.env` only.

---

## Phase 5 — Google Play (stub only)

Directory + README + skeleton scripts:

```
~/.claude/skills/rc-setup/scripts/play/
├── README.md                  # "Not implemented — see ../asc/ for pattern"
├── client.js                  # Empty JWT helper scaffold
├── create-base-plans.js       # Stub with TODO describing the work
└── connect-play-app.js        # Stub
```

`SKILL.md` marks Phase 5 as **"Not implemented — Android IAP stays manual until this phase lands."** `/rc-setup` detects `android.package` in `app.json` and prints: "Android detected; Play Store setup not yet automated — configure manually in Play Console + RC dashboard, then re-run `/rc-setup verify`."

Re-entering brainstorming for Phase 5 is a separate future task.

---

## Phase 6 — `/rc-setup verify`

Read-only end-to-end check; no side effects. Checklist with per-row remediation text:

| Check | How |
|---|---|
| ASC subscription group exists | `GET /v1/subscriptionGroups?filter[app]=<id>` |
| 3 products exist with correct IDs | `GET /v1/subscriptions?filter[group]=<id>` |
| Each product has 7-day free trial | `GET /v1/subscriptionIntroductoryOffers` |
| Each product has pricing | `GET /v1/subscriptionPrices` |
| ASC→RC IAP key uploaded | `GET /projects/{id}/apps/{app_id}/app_store_connect_api_key` returns 200 |
| RC products imported | `GET /projects/{id}/products` count = 3 |
| RC entitlement `plus` exists + 3 products attached | `GET /projects/{id}/entitlements/plus` |
| RC offering `default` current with 3 packages | `GET /projects/{id}/offerings` |
| RC webhook configured + responding | send test event, poll `revenuecat_events` |
| Supabase migration applied | `select count(*) from plus_entitlements` |
| App has `react-native-purchases` + provider wired | read package.json + grep `PurchasesProvider` in `_layout.tsx` |
| `EXPO_PUBLIC_RC_IOS_KEY` set | env check |

Each row green/red with one-line remediation ("Run `/rc-setup asc` to fix").

---

## Control flow for a new app

```
cd some-new-app
# .env has ASC creds + RC_API_KEY_V2 already
/rc-setup
  → detects nothing configured
  → Phase 1 (ASC)      — creates 3 products; confirm names/prices
  → Phase 2 (RC)       — creates project, connects ASC, imports products
  → Phase 3 (Supabase) — stamps migration, stamps edge fn, wires webhook
  → Phase 4 (App)      — installs SDK, scaffolds provider + paywall route
  → Phase 5 (Play)     — skipped (stub)
  → Phase 6 verify     — green across the board
  → Prints: "Now: design paywall in RC dashboard, run eas build, test on device"
```

**Manual touchpoints total:**

1. Create RC project-write API key once in RC dashboard (chicken-and-egg)
2. Design paywall in RC Paywall Editor
3. Run `eas build` and submit to TestFlight

Everything else is API-driven.

---

## Identity model

- RC App User ID = Supabase `auth.users.id` from day one.
- `Purchases.logIn(user.id)` called on sign-in; `Purchases.logOut()` on sign-out.
- Because the Supabase user ID is used from the first install, RC `SUBSCRIBER_ALIAS` events should never fire in practice; webhook handler logs and ignores them if they do.
- Server-side checks use `auth.uid()` via the `is_plus(uid)` RPC — never trust a client claim.

---

## Non-goals / explicit exclusions

- **No Apple App Store Server Notifications handler in Supabase.** RC subscribes to Apple notifications directly via the URL set in Phase 1 step 8. RC is the single source of truth; Supabase only consumes RC webhooks.
- **No state file.** Idempotency is achieved by API lookups. Re-runs are always safe.
- **No feature gating.** Skill installs the mechanism (`useIsPlus`, `gatePlus`, `require-plus`); product decides what to gate.
- **No paywall visuals.** RC Paywall Editor is the surface.
- **No `eas build` or submission automation.** Those are developer-discretion actions.

---

## Success criteria

A fresh Expo + Supabase app, with ASC creds + an RC API key in `.env`, runs `/rc-setup` and within one interactive session has:

- 3 live subscription products in ASC with prices, localizations, free trials, review screenshot
- RC project with `plus` entitlement, `default` offering, 3 packages, connected to ASC, webhook wired to Supabase
- Supabase migration applied: `plus_entitlements` + `revenuecat_events` + `is_plus()` RPC
- Deployed `revenuecat-webhook` edge function that successfully receives an RC test event
- App code scaffolded: SDK installed, provider mounted, `useIsPlus` hook, `/paywall` route, Settings restore/manage rows
- `/rc-setup verify` green across the board

Developer's remaining work: design the paywall in RC, build, test on device, ship.
