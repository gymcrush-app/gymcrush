# `rc-setup` Skill — Plan 1: Skill Foundation + ASC Phase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `rc-setup` skill at `~/.claude/skills/rc-setup/` and build Phase 1 — a set of idempotent scripts that create the gymcrush subscription catalog in App Store Connect end-to-end.

**Architecture:** Node.js scripts under `~/.claude/skills/rc-setup/scripts/asc/` that share a single `client.js` (JWT auth + fetch helper). Each script is idempotent: it queries ASC for existing state before creating anything. The phase orchestrator `asc/run.js` invokes them in order. Credentials come from the target project's `.env`. Tests are vitest + MSW-Node, co-located at `~/.claude/skills/rc-setup/test/`.

**Tech Stack:** Node 20+, `jsonwebtoken` (ES256 for ASC `.p8`), `undici` fetch, `dotenv`, `vitest`, `msw/node`.

**Spec reference:** [`docs/superpowers/specs/2026-04-17-rc-setup-skill-design.md`](../specs/2026-04-17-rc-setup-skill-design.md) — Phase 1 section.

**Testing strategy:** Unit tests (vitest + MSW) for the client and each script's idempotency logic. Orchestration acceptance test is a manual smoke run against the real gymcrush ASC app at the end.

---

## File Structure

**Skill directory (new):**

```
~/.claude/skills/rc-setup/
├── SKILL.md                              # Trigger + phase guide (minimal for Plan 1)
├── README.md                             # Human docs
├── package.json                          # Node project; vitest + deps
├── .gitignore                            # node_modules, *.log
├── scripts/
│   ├── lib/
│   │   ├── env.js                        # Load + validate project .env
│   │   ├── logger.js                     # Tiny leveled logger
│   │   └── errors.js                     # Error classes
│   └── asc/
│       ├── client.js                     # JWT + fetch + retry
│       ├── create-subscription-group.js
│       ├── create-group-localization.js
│       ├── create-subscriptions.js
│       ├── create-subscription-localizations.js
│       ├── set-prices.js
│       ├── create-intro-offers.js
│       ├── set-server-notifications-url.js
│       ├── create-iap-key.js
│       ├── upload-review-screenshot.js
│       ├── assets/
│       │   └── placeholder-paywall.png   # Bundled fallback review screenshot
│       └── run.js                        # Phase 1 orchestrator
├── bin/
│   └── rc-setup.js                       # CLI entry; dispatches to phase runners
└── test/
    ├── setup.js                          # MSW handlers registry
    ├── asc/
    │   ├── client.test.js
    │   ├── create-subscription-group.test.js
    │   ├── create-group-localization.test.js
    │   ├── create-subscriptions.test.js
    │   ├── create-subscription-localizations.test.js
    │   ├── set-prices.test.js
    │   ├── create-intro-offers.test.js
    │   ├── set-server-notifications-url.test.js
    │   ├── create-iap-key.test.js
    │   └── upload-review-screenshot.test.js
    └── lib/
        └── env.test.js
```

**Target project (gymcrush) — only reads `.env`. No writes in this plan.**

---

## Credentials expected in target project `.env`

```
ASC_KEY_ID=...
ASC_ISSUER_ID=...
ASC_KEY_PATH=/Users/chris/.appstoreconnect/private_keys/AuthKey_XXX.p8
ASC_APP_ID=...
ASC_BUNDLE_ID=com.gymcrushdating.app
```

`env.js` reads these. Nothing else.

---

## Task 1: Skill scaffolding

**Files:**
- Create: `~/.claude/skills/rc-setup/package.json`
- Create: `~/.claude/skills/rc-setup/.gitignore`
- Create: `~/.claude/skills/rc-setup/SKILL.md`
- Create: `~/.claude/skills/rc-setup/README.md`
- Create: `~/.claude/skills/rc-setup/bin/rc-setup.js`

- [ ] **Step 1: Create skill directory and package.json**

```bash
mkdir -p ~/.claude/skills/rc-setup/{bin,scripts/{lib,asc/assets},test/{asc,lib}}
cd ~/.claude/skills/rc-setup
```

`package.json`:

```json
{
  "name": "rc-setup",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "rc-setup": "./bin/rc-setup.js"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "rc-setup": "node bin/rc-setup.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "jsonwebtoken": "^9.0.2",
    "undici": "^7.0.0"
  },
  "devDependencies": {
    "msw": "^2.7.0",
    "vitest": "^3.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
*.log
.DS_Store
```

- [ ] **Step 3: Create `SKILL.md` (minimal, Phase 1 only; later plans expand)**

```markdown
---
name: rc-setup
description: >
  Use to configure RevenueCat + App Store Connect subscriptions for a new app
  end-to-end. Run from inside the target project directory. Reads ASC/RC
  creds from project .env. Trigger words: "set up subscriptions", "configure
  revenuecat", "/rc-setup", "rc setup asc".
allowed-tools: Read, Write, Edit, Bash
---

# rc-setup — Subscription + RevenueCat Pipeline

Sets up ASC subscription products, RC project, Supabase webhook, and app-side
SDK scaffolding for any Expo + Supabase app.

## Status

- [x] Phase 1 — ASC (this plan)
- [ ] Phase 2 — RC
- [ ] Phase 3 — Supabase
- [ ] Phase 4 — App scaffolding
- [ ] Phase 5 — Play (stub)
- [ ] Phase 6 — verify

## Preconditions (Phase 1)

Target project `.env` must contain:

- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, `ASC_APP_ID`, `ASC_BUNDLE_ID`

## Commands

| Command | Action |
|---------|--------|
| `node ~/.claude/skills/rc-setup/bin/rc-setup.js asc` | Run ASC phase against the project |

## Catalog config

For now, catalog is hard-coded for gymcrush:

- Subscription group: `GymCrush Plus`
- Products: `gymcrush_plus_monthly` ($14.99), `gymcrush_plus_3month` ($29.99), `gymcrush_plus_annual` ($83.99)
- Intro offer: 7-day free trial on all
```

- [ ] **Step 4: Create `README.md` (human-facing docs)**

```markdown
# rc-setup

Claude skill that configures RevenueCat + App Store Connect subscriptions for
a new app via ASC REST API + RC v2 REST API.

## Why this exists

Every new app I ship uses the same opinionated subscription pipeline. Manual
setup across ASC + RC takes ~4 hours of careful clicking. This skill does it
in one command.

## Plan 1 scope

Phase 1: ASC-side setup. Creates subscription group, products, prices,
localizations, intro offers, review screenshot, server notifications URL, and
the IAP `.p8` key that Phase 2 will upload to RC.

## Usage

From inside a project that has ASC creds in `.env`:

    node ~/.claude/skills/rc-setup/bin/rc-setup.js asc

Re-running is safe — every step is idempotent.
```

- [ ] **Step 5: Create `bin/rc-setup.js` (CLI entry; dispatch stub for now)**

```js
#!/usr/bin/env node
import { run as runAsc } from '../scripts/asc/run.js';

const [phase] = process.argv.slice(2);

const phases = {
  asc: runAsc,
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

Make executable:

```bash
chmod +x ~/.claude/skills/rc-setup/bin/rc-setup.js
```

- [ ] **Step 6: Install deps + init git**

```bash
cd ~/.claude/skills/rc-setup
npm install
git init
git add .
git commit -m "feat: scaffold rc-setup skill (Plan 1 Task 1)"
```

---

## Task 2: Env loader (`scripts/lib/env.js`)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/lib/env.js`
- Test: `~/.claude/skills/rc-setup/test/lib/env.test.js`

- [ ] **Step 1: Write failing test**

`test/lib/env.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadProjectEnv, requireAscEnv } from '../../scripts/lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('loadProjectEnv', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-env-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads .env from the given project directory', () => {
    fs.writeFileSync(path.join(tmpDir, '.env'), 'ASC_KEY_ID=abc123\nASC_BUNDLE_ID=com.test.app\n');
    const env = loadProjectEnv(tmpDir);
    expect(env.ASC_KEY_ID).toBe('abc123');
    expect(env.ASC_BUNDLE_ID).toBe('com.test.app');
  });

  it('does not leak into process.env', () => {
    fs.writeFileSync(path.join(tmpDir, '.env'), 'RC_SETUP_TEST_ONLY=xyz\n');
    loadProjectEnv(tmpDir);
    expect(process.env.RC_SETUP_TEST_ONLY).toBeUndefined();
  });
});

describe('requireAscEnv', () => {
  it('returns a typed config when all keys present', () => {
    const env = {
      ASC_KEY_ID: 'K',
      ASC_ISSUER_ID: 'I',
      ASC_KEY_PATH: '/tmp/k.p8',
      ASC_APP_ID: '123',
      ASC_BUNDLE_ID: 'com.test.app',
    };
    const cfg = requireAscEnv(env);
    expect(cfg.keyId).toBe('K');
    expect(cfg.appId).toBe('123');
  });

  it('throws listing every missing key', () => {
    expect(() => requireAscEnv({})).toThrow(/ASC_KEY_ID.*ASC_ISSUER_ID.*ASC_KEY_PATH.*ASC_APP_ID.*ASC_BUNDLE_ID/s);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ~/.claude/skills/rc-setup
npx vitest run test/lib/env.test.js
```
Expected: FAIL — "Cannot find module '../../scripts/lib/env.js'".

- [ ] **Step 3: Implement `scripts/lib/env.js`**

```js
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadProjectEnv(projectDir = process.cwd()) {
  const envPath = path.join(projectDir, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  return dotenv.parse(raw); // does NOT mutate process.env
}

const ASC_KEYS = ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_PATH', 'ASC_APP_ID', 'ASC_BUNDLE_ID'];

export function requireAscEnv(env) {
  const missing = ASC_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Missing ASC env vars: ${missing.join(', ')}`);
  }
  return {
    keyId: env.ASC_KEY_ID,
    issuerId: env.ASC_ISSUER_ID,
    keyPath: env.ASC_KEY_PATH,
    appId: env.ASC_APP_ID,
    bundleId: env.ASC_BUNDLE_ID,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run test/lib/env.test.js
```
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/env.js test/lib/env.test.js
git commit -m "feat(env): project .env loader + ASC requirement check"
```

---

## Task 3: ASC client — JWT + fetch helper

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/client.js`
- Create: `~/.claude/skills/rc-setup/scripts/lib/errors.js`
- Create: `~/.claude/skills/rc-setup/test/setup.js` (MSW server)
- Test: `~/.claude/skills/rc-setup/test/asc/client.test.js`

- [ ] **Step 1: Create errors module**

`scripts/lib/errors.js`:

```js
export class AscApiError extends Error {
  constructor(status, body, method, path) {
    super(`ASC ${method} ${path} → ${status}: ${JSON.stringify(body).slice(0, 400)}`);
    this.status = status;
    this.body = body;
    this.method = method;
    this.path = path;
  }
}

export class AscAuthError extends AscApiError {}
```

- [ ] **Step 2: Create MSW test setup**

`test/setup.js`:

```js
import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';

export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Update `package.json` to register the setup file:

```json
{
  "scripts": {
    "test": "vitest run --setupFiles ./test/setup.js",
    "test:watch": "vitest --setupFiles ./test/setup.js"
  }
}
```

- [ ] **Step 3: Write failing client tests**

`test/asc/client.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { AscApiError, AscAuthError } from '../../scripts/lib/errors.js';

function makeKey() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const p8Path = path.join(os.tmpdir(), `rc-test-${Date.now()}.p8`);
  fs.writeFileSync(p8Path, pem);
  return p8Path;
}

function makeClient() {
  return new AscClient({
    keyId: 'TESTKEY10',
    issuerId: '69a6de70-03ab-47e3-e053-5b8c7c11a4d1',
    keyPath: makeKey(),
    appId: '1234567890',
  });
}

describe('AscClient', () => {
  it('signs requests with ES256 JWT in Authorization header', async () => {
    let seenAuth = null;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/:id', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ data: { id: '1234567890' } });
      })
    );

    const client = makeClient();
    await client.get('/v1/apps/1234567890');

    expect(seenAuth).toMatch(/^Bearer eyJ/);
    const token = seenAuth.replace('Bearer ', '');
    const [headerB64, payloadB64] = token.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    expect(header.alg).toBe('ES256');
    expect(header.kid).toBe('TESTKEY10');
    expect(payload.iss).toBe('69a6de70-03ab-47e3-e053-5b8c7c11a4d1');
    expect(payload.aud).toBe('appstoreconnect-v1');
  });

  it('throws AscAuthError on 401', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/:id', () =>
        HttpResponse.json({ errors: [{ status: '401', title: 'NOT_AUTHORIZED' }] }, { status: 401 })
      )
    );
    const client = makeClient();
    await expect(client.get('/v1/apps/1234567890')).rejects.toBeInstanceOf(AscAuthError);
  });

  it('retries once on 429 with Retry-After', async () => {
    let calls = 0;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/:id', () => {
        calls++;
        if (calls === 1) {
          return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } });
        }
        return HttpResponse.json({ data: { id: '1234567890' } });
      })
    );
    const client = makeClient();
    const res = await client.get('/v1/apps/1234567890');
    expect(calls).toBe(2);
    expect(res.data.id).toBe('1234567890');
  });

  it('throws AscApiError with status + body on 4xx (non-401)', async () => {
    server.use(
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionGroups', () =>
        HttpResponse.json({ errors: [{ status: '409', title: 'CONFLICT' }] }, { status: 409 })
      )
    );
    const client = makeClient();
    await expect(client.post('/v1/subscriptionGroups', { data: {} }))
      .rejects.toMatchObject({ status: 409, constructor: AscApiError });
  });
});
```

- [ ] **Step 4: Run to verify failure**

```bash
npm test -- test/asc/client.test.js
```
Expected: FAIL — "Cannot find module '../../scripts/asc/client.js'".

- [ ] **Step 5: Implement `scripts/asc/client.js`**

```js
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { fetch } from 'undici';
import { AscApiError, AscAuthError } from '../lib/errors.js';

const BASE = 'https://api.appstoreconnect.apple.com';
const TOKEN_TTL_SECONDS = 60 * 19; // ASC max is 20 min; stay under

export class AscClient {
  constructor({ keyId, issuerId, keyPath, appId }) {
    if (!keyId || !issuerId || !keyPath) throw new Error('keyId/issuerId/keyPath required');
    if (!fs.existsSync(keyPath)) throw new Error(`ASC .p8 not found at ${keyPath}`);
    this.keyId = keyId;
    this.issuerId = issuerId;
    this.privateKey = fs.readFileSync(keyPath, 'utf8');
    this.appId = appId;
    this._token = null;
    this._tokenExpires = 0;
  }

  _token_() {
    const now = Math.floor(Date.now() / 1000);
    if (this._token && this._tokenExpires - now > 60) return this._token;
    this._token = jwt.sign(
      { iss: this.issuerId, aud: 'appstoreconnect-v1', exp: now + TOKEN_TTL_SECONDS },
      this.privateKey,
      { algorithm: 'ES256', header: { kid: this.keyId, typ: 'JWT' } }
    );
    this._tokenExpires = now + TOKEN_TTL_SECONDS;
    return this._token;
  }

  async _request(method, path, { body, headers = {}, retried = false } = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${this._token_()}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429 && !retried) {
      const wait = Number(res.headers.get('retry-after') ?? 1) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      return this._request(method, path, { body, headers, retried: true });
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (res.status === 401) throw new AscAuthError(res.status, data, method, path);
    if (!res.ok) throw new AscApiError(res.status, data, method, path);

    return data;
  }

  get(path) { return this._request('GET', path); }
  post(path, body) { return this._request('POST', path, { body }); }
  patch(path, body) { return this._request('PATCH', path, { body }); }
  delete(path) { return this._request('DELETE', path); }
}
```

- [ ] **Step 6: Run tests**

```bash
npm test -- test/asc/client.test.js
```
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add scripts/asc/client.js scripts/lib/errors.js test/setup.js test/asc/client.test.js package.json
git commit -m "feat(asc): JWT + fetch client with retry and typed errors"
```

---

## Task 4: Create subscription group (idempotent)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/create-subscription-group.js`
- Test: `~/.claude/skills/rc-setup/test/asc/create-subscription-group.test.js`

- [ ] **Step 1: Write failing test**

`test/asc/create-subscription-group.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureSubscriptionGroup } from '../../scripts/asc/create-subscription-group.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureSubscriptionGroup', () => {
  it('returns existing group id without posting when one already exists', async () => {
    let posted = false;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/123/subscriptionGroups', () =>
        HttpResponse.json({
          data: [{ id: 'grp_existing', attributes: { referenceName: 'GymCrush Plus' } }],
        })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionGroups', () => {
        posted = true;
        return HttpResponse.json({ data: { id: 'grp_new' } }, { status: 201 });
      })
    );

    const id = await ensureSubscriptionGroup(makeClient(), { referenceName: 'GymCrush Plus' });

    expect(id).toBe('grp_existing');
    expect(posted).toBe(false);
  });

  it('creates the group when not found and returns the new id', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/123/subscriptionGroups', () =>
        HttpResponse.json({ data: [] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionGroups', async ({ request }) => {
        const body = await request.json();
        expect(body.data.attributes.referenceName).toBe('GymCrush Plus');
        expect(body.data.relationships.app.data.id).toBe('123');
        return HttpResponse.json({ data: { id: 'grp_new' } }, { status: 201 });
      })
    );

    const id = await ensureSubscriptionGroup(makeClient(), { referenceName: 'GymCrush Plus' });
    expect(id).toBe('grp_new');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- test/asc/create-subscription-group.test.js
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`scripts/asc/create-subscription-group.js`:

```js
export async function ensureSubscriptionGroup(client, { referenceName }) {
  const list = await client.get(`/v1/apps/${client.appId}/subscriptionGroups`);
  const existing = (list.data ?? []).find(
    (g) => g.attributes?.referenceName === referenceName
  );
  if (existing) return existing.id;

  const created = await client.post('/v1/subscriptionGroups', {
    data: {
      type: 'subscriptionGroups',
      attributes: { referenceName },
      relationships: { app: { data: { type: 'apps', id: client.appId } } },
    },
  });
  return created.data.id;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- test/asc/create-subscription-group.test.js
```
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/create-subscription-group.js test/asc/create-subscription-group.test.js
git commit -m "feat(asc): idempotent ensureSubscriptionGroup"
```

---

## Task 5: Create group localization

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/create-group-localization.js`
- Test: `~/.claude/skills/rc-setup/test/asc/create-group-localization.test.js`

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { ensureGroupLocalization } from '../../scripts/asc/create-group-localization.js';
// (reuse makeClient helper — inline in each test file for independence)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { AscClient } from '../../scripts/asc/client.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureGroupLocalization', () => {
  it('returns existing localization id for matching locale', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptionGroups/grp1/subscriptionGroupLocalizations', () =>
        HttpResponse.json({
          data: [{ id: 'loc1', attributes: { locale: 'en-US', customAppName: 'GymCrush Plus' } }],
        })
      )
    );
    const id = await ensureGroupLocalization(makeClient(), {
      groupId: 'grp1',
      locale: 'en-US',
      customAppName: 'GymCrush Plus',
    });
    expect(id).toBe('loc1');
  });

  it('creates localization if missing', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptionGroups/grp1/subscriptionGroupLocalizations', () =>
        HttpResponse.json({ data: [] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionGroupLocalizations', async ({ request }) => {
        const body = await request.json();
        expect(body.data.attributes.locale).toBe('en-US');
        expect(body.data.attributes.customAppName).toBe('GymCrush Plus');
        expect(body.data.relationships.subscriptionGroup.data.id).toBe('grp1');
        return HttpResponse.json({ data: { id: 'loc_new' } }, { status: 201 });
      })
    );
    const id = await ensureGroupLocalization(makeClient(), {
      groupId: 'grp1',
      locale: 'en-US',
      customAppName: 'GymCrush Plus',
    });
    expect(id).toBe('loc_new');
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- test/asc/create-group-localization.test.js
```

- [ ] **Step 3: Implement**

`scripts/asc/create-group-localization.js`:

```js
export async function ensureGroupLocalization(client, { groupId, locale, customAppName }) {
  const list = await client.get(
    `/v1/subscriptionGroups/${groupId}/subscriptionGroupLocalizations`
  );
  const existing = (list.data ?? []).find((l) => l.attributes?.locale === locale);
  if (existing) return existing.id;

  const created = await client.post('/v1/subscriptionGroupLocalizations', {
    data: {
      type: 'subscriptionGroupLocalizations',
      attributes: { locale, customAppName },
      relationships: {
        subscriptionGroup: { data: { type: 'subscriptionGroups', id: groupId } },
      },
    },
  });
  return created.data.id;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- test/asc/create-group-localization.test.js
```
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/create-group-localization.js test/asc/create-group-localization.test.js
git commit -m "feat(asc): idempotent ensureGroupLocalization"
```

---

## Task 6: Create subscriptions (3 products, idempotent)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/create-subscriptions.js`
- Test: `~/.claude/skills/rc-setup/test/asc/create-subscriptions.test.js`

The catalog is declared as a constant in the script (for now — Plan 2 moves this to a config file):

```js
export const GYMCRUSH_CATALOG = [
  { productId: 'gymcrush_plus_monthly', name: 'GymCrush Plus Monthly',  subscriptionPeriod: 'ONE_MONTH',     groupLevel: 1 },
  { productId: 'gymcrush_plus_3month',  name: 'GymCrush Plus 3-Month',  subscriptionPeriod: 'THREE_MONTHS',  groupLevel: 1 },
  { productId: 'gymcrush_plus_annual',  name: 'GymCrush Plus Annual',   subscriptionPeriod: 'ONE_YEAR',      groupLevel: 1 },
];
```

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureSubscriptions, GYMCRUSH_CATALOG } from '../../scripts/asc/create-subscriptions.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureSubscriptions', () => {
  it('creates only missing products, returns a map of productId→subscriptionId', async () => {
    const posts = [];
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptionGroups/grp1/subscriptions', () =>
        HttpResponse.json({
          data: [{ id: 'sub_existing', attributes: { productId: 'gymcrush_plus_monthly' } }],
        })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptions', async ({ request }) => {
        const body = await request.json();
        posts.push(body.data.attributes.productId);
        return HttpResponse.json({ data: { id: `sub_${body.data.attributes.productId}` } }, { status: 201 });
      })
    );

    const map = await ensureSubscriptions(makeClient(), { groupId: 'grp1', catalog: GYMCRUSH_CATALOG });

    expect(map.gymcrush_plus_monthly).toBe('sub_existing');
    expect(map.gymcrush_plus_3month).toBe('sub_gymcrush_plus_3month');
    expect(map.gymcrush_plus_annual).toBe('sub_gymcrush_plus_annual');
    expect(posts.sort()).toEqual(['gymcrush_plus_3month', 'gymcrush_plus_annual']);
  });

  it('posts with correct period and groupLevel', async () => {
    let captured;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptionGroups/grp1/subscriptions', () =>
        HttpResponse.json({ data: [] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptions', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ data: { id: 'sub1' } }, { status: 201 });
      })
    );
    await ensureSubscriptions(makeClient(), {
      groupId: 'grp1',
      catalog: [{ productId: 'x', name: 'X', subscriptionPeriod: 'ONE_MONTH', groupLevel: 1 }],
    });
    expect(captured.data.attributes.subscriptionPeriod).toBe('ONE_MONTH');
    expect(captured.data.attributes.groupLevel).toBe(1);
    expect(captured.data.relationships.group.data.id).toBe('grp1');
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

`scripts/asc/create-subscriptions.js`:

```js
export const GYMCRUSH_CATALOG = [
  { productId: 'gymcrush_plus_monthly', name: 'GymCrush Plus Monthly',  subscriptionPeriod: 'ONE_MONTH',     groupLevel: 1 },
  { productId: 'gymcrush_plus_3month',  name: 'GymCrush Plus 3-Month',  subscriptionPeriod: 'THREE_MONTHS',  groupLevel: 1 },
  { productId: 'gymcrush_plus_annual',  name: 'GymCrush Plus Annual',   subscriptionPeriod: 'ONE_YEAR',      groupLevel: 1 },
];

export async function ensureSubscriptions(client, { groupId, catalog }) {
  const list = await client.get(`/v1/subscriptionGroups/${groupId}/subscriptions`);
  const existingByProductId = new Map();
  for (const s of list.data ?? []) {
    existingByProductId.set(s.attributes?.productId, s.id);
  }

  const result = {};
  for (const item of catalog) {
    if (existingByProductId.has(item.productId)) {
      result[item.productId] = existingByProductId.get(item.productId);
      continue;
    }
    const created = await client.post('/v1/subscriptions', {
      data: {
        type: 'subscriptions',
        attributes: {
          productId: item.productId,
          name: item.name,
          subscriptionPeriod: item.subscriptionPeriod,
          groupLevel: item.groupLevel,
        },
        relationships: {
          group: { data: { type: 'subscriptionGroups', id: groupId } },
        },
      },
    });
    result[item.productId] = created.data.id;
  }
  return result;
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/create-subscriptions.js test/asc/create-subscriptions.test.js
git commit -m "feat(asc): idempotent subscription product creation"
```

---

## Task 7: Create subscription localizations

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/create-subscription-localizations.js`
- Test: `~/.claude/skills/rc-setup/test/asc/create-subscription-localizations.test.js`

Localization per product:

```js
export const GYMCRUSH_LOCALIZATIONS = {
  gymcrush_plus_monthly: { locale: 'en-US', name: 'GymCrush Plus (Monthly)', description: 'Unlock GymCrush Plus features — billed monthly.' },
  gymcrush_plus_3month:  { locale: 'en-US', name: 'GymCrush Plus (3 Months)', description: 'Unlock GymCrush Plus features — billed every 3 months.' },
  gymcrush_plus_annual:  { locale: 'en-US', name: 'GymCrush Plus (Annual)',  description: 'Unlock GymCrush Plus features — billed yearly.' },
};
```

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureSubscriptionLocalization } from '../../scripts/asc/create-subscription-localizations.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureSubscriptionLocalization', () => {
  it('skips if locale already present', async () => {
    let posted = false;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/subscriptionLocalizations', () =>
        HttpResponse.json({ data: [{ id: 'loc1', attributes: { locale: 'en-US' } }] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionLocalizations', () => {
        posted = true;
        return HttpResponse.json({ data: { id: 'x' } }, { status: 201 });
      })
    );
    const id = await ensureSubscriptionLocalization(makeClient(), {
      subscriptionId: 'sub1', locale: 'en-US', name: 'A', description: 'B',
    });
    expect(id).toBe('loc1');
    expect(posted).toBe(false);
  });

  it('creates with name + description relationship to subscription', async () => {
    let captured;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/subscriptionLocalizations', () =>
        HttpResponse.json({ data: [] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionLocalizations', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ data: { id: 'loc_new' } }, { status: 201 });
      })
    );
    await ensureSubscriptionLocalization(makeClient(), {
      subscriptionId: 'sub1', locale: 'en-US', name: 'Name', description: 'Desc',
    });
    expect(captured.data.attributes).toEqual({ locale: 'en-US', name: 'Name', description: 'Desc' });
    expect(captured.data.relationships.subscription.data.id).toBe('sub1');
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

`scripts/asc/create-subscription-localizations.js`:

```js
export const GYMCRUSH_LOCALIZATIONS = {
  gymcrush_plus_monthly: { locale: 'en-US', name: 'GymCrush Plus (Monthly)',   description: 'Unlock GymCrush Plus features — billed monthly.' },
  gymcrush_plus_3month:  { locale: 'en-US', name: 'GymCrush Plus (3 Months)',  description: 'Unlock GymCrush Plus features — billed every 3 months.' },
  gymcrush_plus_annual:  { locale: 'en-US', name: 'GymCrush Plus (Annual)',    description: 'Unlock GymCrush Plus features — billed yearly.' },
};

export async function ensureSubscriptionLocalization(client, { subscriptionId, locale, name, description }) {
  const list = await client.get(`/v1/subscriptions/${subscriptionId}/subscriptionLocalizations`);
  const existing = (list.data ?? []).find((l) => l.attributes?.locale === locale);
  if (existing) return existing.id;

  const created = await client.post('/v1/subscriptionLocalizations', {
    data: {
      type: 'subscriptionLocalizations',
      attributes: { locale, name, description },
      relationships: { subscription: { data: { type: 'subscriptions', id: subscriptionId } } },
    },
  });
  return created.data.id;
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/create-subscription-localizations.js test/asc/create-subscription-localizations.test.js
git commit -m "feat(asc): idempotent per-subscription localization"
```

---

## Task 8: Set prices (price-point lookup)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/set-prices.js`
- Test: `~/.claude/skills/rc-setup/test/asc/set-prices.test.js`

ASC requires price-point IDs, not raw dollars. Strategy: fetch USA price points for each subscription, pick the one whose `customerPrice` is closest to target dollar amount, then `POST /v1/subscriptionPrices` with that price-point ID.

Target prices:

```js
export const TARGET_USD = {
  gymcrush_plus_monthly: 14.99,
  gymcrush_plus_3month:  29.99,
  gymcrush_plus_annual:  83.99,
};
```

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureUsdPrice } from '../../scripts/asc/set-prices.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureUsdPrice', () => {
  it('skips if active USA price already matches target', async () => {
    let posted = false;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/prices', () =>
        HttpResponse.json({
          data: [{
            id: 'price_existing',
            attributes: { preserveCurrentPrice: false },
            relationships: {
              territory: { data: { id: 'USA' } },
              subscriptionPricePoint: { data: { id: 'pp_1499' } },
            },
          }],
          included: [
            { type: 'territories', id: 'USA' },
            { type: 'subscriptionPricePoints', id: 'pp_1499', attributes: { customerPrice: '14.99' } },
          ],
        })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionPrices', () => {
        posted = true;
        return HttpResponse.json({ data: { id: 'x' } }, { status: 201 });
      })
    );

    const id = await ensureUsdPrice(makeClient(), { subscriptionId: 'sub1', targetUsd: 14.99 });
    expect(id).toBe('price_existing');
    expect(posted).toBe(false);
  });

  it('picks closest price point and posts a new price when missing', async () => {
    let postedBody;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/prices', () =>
        HttpResponse.json({ data: [] })
      ),
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/pricePoints', () =>
        HttpResponse.json({
          data: [
            { id: 'pp_1299', attributes: { customerPrice: '12.99' }, relationships: { territory: { data: { id: 'USA' } } } },
            { id: 'pp_1499', attributes: { customerPrice: '14.99' }, relationships: { territory: { data: { id: 'USA' } } } },
            { id: 'pp_1999', attributes: { customerPrice: '19.99' }, relationships: { territory: { data: { id: 'USA' } } } },
          ],
        })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionPrices', async ({ request }) => {
        postedBody = await request.json();
        return HttpResponse.json({ data: { id: 'price_new' } }, { status: 201 });
      })
    );

    const id = await ensureUsdPrice(makeClient(), { subscriptionId: 'sub1', targetUsd: 14.99 });
    expect(id).toBe('price_new');
    expect(postedBody.data.relationships.subscriptionPricePoint.data.id).toBe('pp_1499');
    expect(postedBody.data.relationships.territory.data.id).toBe('USA');
    expect(postedBody.data.attributes.preserveCurrentPrice).toBe(false);
  });

  it('throws if no USA price points returned', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/prices', () =>
        HttpResponse.json({ data: [] })
      ),
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/pricePoints', () =>
        HttpResponse.json({ data: [] })
      )
    );
    await expect(
      ensureUsdPrice(makeClient(), { subscriptionId: 'sub1', targetUsd: 14.99 })
    ).rejects.toThrow(/no USA price points/i);
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

`scripts/asc/set-prices.js`:

```js
export const TARGET_USD = {
  gymcrush_plus_monthly: 14.99,
  gymcrush_plus_3month:  29.99,
  gymcrush_plus_annual:  83.99,
};

export async function ensureUsdPrice(client, { subscriptionId, targetUsd }) {
  const current = await client.get(
    `/v1/subscriptions/${subscriptionId}/prices?include=subscriptionPricePoint,territory&limit=200`
  );
  const usaCurrent = findCurrentUsa(current);
  if (usaCurrent && Math.abs(usaCurrent.priceUsd - targetUsd) < 0.01) {
    return usaCurrent.id;
  }

  const points = await client.get(
    `/v1/subscriptions/${subscriptionId}/pricePoints?filter[territory]=USA&limit=200`
  );
  const usaPoints = (points.data ?? []).filter(
    (p) => p.relationships?.territory?.data?.id === 'USA'
  );
  if (!usaPoints.length) throw new Error(`no USA price points available for subscription ${subscriptionId}`);

  const best = usaPoints.reduce((best, p) => {
    const price = Number(p.attributes?.customerPrice);
    const diff = Math.abs(price - targetUsd);
    return !best || diff < best.diff ? { id: p.id, price, diff } : best;
  }, null);

  const created = await client.post('/v1/subscriptionPrices', {
    data: {
      type: 'subscriptionPrices',
      attributes: { preserveCurrentPrice: false },
      relationships: {
        subscription:            { data: { type: 'subscriptions',            id: subscriptionId } },
        subscriptionPricePoint:  { data: { type: 'subscriptionPricePoints',  id: best.id } },
        territory:               { data: { type: 'territories',              id: 'USA' } },
      },
    },
  });
  return created.data.id;
}

function findCurrentUsa(response) {
  const includedById = new Map();
  for (const i of response.included ?? []) includedById.set(`${i.type}:${i.id}`, i);
  for (const p of response.data ?? []) {
    const tId = p.relationships?.territory?.data?.id;
    if (tId !== 'USA') continue;
    const ppId = p.relationships?.subscriptionPricePoint?.data?.id;
    const pp = includedById.get(`subscriptionPricePoints:${ppId}`);
    if (!pp) continue;
    return { id: p.id, priceUsd: Number(pp.attributes?.customerPrice) };
  }
  return null;
}
```

- [ ] **Step 4: Run — expect pass (3 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/set-prices.js test/asc/set-prices.test.js
git commit -m "feat(asc): USD price setter using closest price-point"
```

---

## Task 9: Create intro offers (7-day free trial)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/create-intro-offers.js`
- Test: `~/.claude/skills/rc-setup/test/asc/create-intro-offers.test.js`

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureFreeTrial } from '../../scripts/asc/create-intro-offers.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureFreeTrial', () => {
  it('skips when an active FREE_TRIAL offer already exists', async () => {
    let posted = false;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/introductoryOffers', () =>
        HttpResponse.json({
          data: [{ id: 'offer_existing', attributes: { offerMode: 'FREE_TRIAL', duration: 'ONE_WEEK' } }],
        })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionIntroductoryOffers', () => {
        posted = true;
        return HttpResponse.json({ data: { id: 'x' } }, { status: 201 });
      })
    );
    const id = await ensureFreeTrial(makeClient(), { subscriptionId: 'sub1', duration: 'ONE_WEEK' });
    expect(id).toBe('offer_existing');
    expect(posted).toBe(false);
  });

  it('creates FREE_TRIAL offer when absent, all territories', async () => {
    let captured;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/introductoryOffers', () =>
        HttpResponse.json({ data: [] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionIntroductoryOffers', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ data: { id: 'offer_new' } }, { status: 201 });
      })
    );
    const id = await ensureFreeTrial(makeClient(), { subscriptionId: 'sub1', duration: 'ONE_WEEK' });
    expect(id).toBe('offer_new');
    expect(captured.data.attributes.offerMode).toBe('FREE_TRIAL');
    expect(captured.data.attributes.duration).toBe('ONE_WEEK');
    expect(captured.data.relationships.subscription.data.id).toBe('sub1');
    // Territory is absent → ASC interprets as all territories
    expect(captured.data.relationships.territory).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

`scripts/asc/create-intro-offers.js`:

```js
export async function ensureFreeTrial(client, { subscriptionId, duration = 'ONE_WEEK' }) {
  const list = await client.get(`/v1/subscriptions/${subscriptionId}/introductoryOffers`);
  const existing = (list.data ?? []).find(
    (o) => o.attributes?.offerMode === 'FREE_TRIAL' && o.attributes?.duration === duration
  );
  if (existing) return existing.id;

  const created = await client.post('/v1/subscriptionIntroductoryOffers', {
    data: {
      type: 'subscriptionIntroductoryOffers',
      attributes: {
        offerMode: 'FREE_TRIAL',
        duration,
      },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: subscriptionId } },
      },
    },
  });
  return created.data.id;
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/create-intro-offers.js test/asc/create-intro-offers.test.js
git commit -m "feat(asc): idempotent 7-day free trial intro offer"
```

---

## Task 10: Set App Store Server Notifications URL

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/set-server-notifications-url.js`
- Test: `~/.claude/skills/rc-setup/test/asc/set-server-notifications-url.test.js`

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { setServerNotificationsUrl } from '../../scripts/asc/set-server-notifications-url.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('setServerNotificationsUrl', () => {
  it('PATCHes both prod and sandbox URLs on the app', async () => {
    let captured;
    server.use(
      http.patch('https://api.appstoreconnect.apple.com/v1/apps/123', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ data: { id: '123' } });
      })
    );
    await setServerNotificationsUrl(makeClient(), {
      prodUrl: 'https://rc.example/apple',
      sandboxUrl: 'https://rc.example/apple-sandbox',
    });
    expect(captured.data.id).toBe('123');
    expect(captured.data.type).toBe('apps');
    expect(captured.data.attributes.appStoreServerNotificationsV2Url).toBe('https://rc.example/apple');
    expect(captured.data.attributes.appStoreServerNotificationsV2SandboxUrl).toBe('https://rc.example/apple-sandbox');
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

`scripts/asc/set-server-notifications-url.js`:

```js
export async function setServerNotificationsUrl(client, { prodUrl, sandboxUrl }) {
  await client.patch(`/v1/apps/${client.appId}`, {
    data: {
      type: 'apps',
      id: client.appId,
      attributes: {
        appStoreServerNotificationsV2Url: prodUrl,
        appStoreServerNotificationsV2SandboxUrl: sandboxUrl,
      },
    },
  });
}
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/set-server-notifications-url.js test/asc/set-server-notifications-url.test.js
git commit -m "feat(asc): PATCH app with server-notifications URLs"
```

---

## Task 11: Create IAP `.p8` key for RC connection

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/create-iap-key.js`
- Test: `~/.claude/skills/rc-setup/test/asc/create-iap-key.test.js`

Endpoint: `POST /v1/inAppPurchasesV2/keys`. Response includes a `privateKey` field that is **only downloadable once at creation time** — we write it to `~/.appstoreconnect/iap_keys/` and return the path.

> **⚠️ Verify this endpoint before writing the full implementation.** Apple has historically kept IAP key creation dashboard-only while exposing other ASC REST endpoints. Before Step 1, run this probe against gymcrush:
>
> ```bash
> curl -s -H "Authorization: Bearer $(node -e '... mint a JWT ...')" \
>   https://api.appstoreconnect.apple.com/v1/apps/$ASC_APP_ID/inAppPurchasesV2/keys \
>   | head
> ```
>
> - If it returns a valid JSON:API response (even empty `data: []`), proceed with this task as written.
> - If it returns 404 / `NOT_FOUND` / `PATH_NOT_FOUND`, the endpoint is not exposed. Implement the **fallback version** below instead of the full implementation:
>
> **Fallback implementation** — skip API creation entirely; read the key the user created manually:
>
> ```js
> import fs from 'node:fs';
>
> export async function ensureIapKey(_client, { keyDir, env }) {
>   if (env.ASC_IAP_KEY_ID && env.ASC_IAP_KEY_PATH && fs.existsSync(env.ASC_IAP_KEY_PATH)) {
>     return { keyId: env.ASC_IAP_KEY_ID, keyPath: env.ASC_IAP_KEY_PATH };
>   }
>   throw new Error(
>     `IAP key not found. Create one manually:
>   1. App Store Connect → Users & Access → Integrations → In-App Purchase → + (plus)
>   2. Name it "RevenueCat Sync Key"
>   3. Download the .p8 (one-time only)
>   4. Save it to ${keyDir}/AuthKey_<KEYID>.p8
>   5. Add to project .env:
>        ASC_IAP_KEY_ID=<KEYID>
>        ASC_IAP_KEY_PATH=${keyDir}/AuthKey_<KEYID>.p8
>   6. Re-run rc-setup asc`
>   );
> }
> ```
>
> Update `run.js` to pass `env` into `ensureIapKey` (it already has `env` from `loadProjectEnv`). Skip tests 2 of the 3 (they assume the POST endpoint exists); keep only the "reuse existing .p8 when already on disk" test, rewritten to read from `env`.
>
> Mark which path was taken in a one-line comment at the top of `create-iap-key.js`:
> `// impl: API (verified working on <date>)` or `// impl: fallback (endpoint not available)`.

- [ ] **Step 1: Write failing test**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureIapKey } from '../../scripts/asc/create-iap-key.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureIapKey', () => {
  let keyDir;
  beforeEach(() => {
    keyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iap-keys-'));
  });
  afterEach(() => {
    fs.rmSync(keyDir, { recursive: true, force: true });
  });

  it('reuses an existing key file if a matching key is already on disk', async () => {
    fs.writeFileSync(path.join(keyDir, 'AuthKey_ABC123.p8'), 'dummy-pem-content');
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/123/inAppPurchasesV2/keys', () =>
        HttpResponse.json({ data: [{ id: 'ABC123', attributes: { name: 'RC Sync Key' } }] })
      )
    );

    const result = await ensureIapKey(makeClient(), { name: 'RC Sync Key', keyDir });
    expect(result.keyId).toBe('ABC123');
    expect(result.keyPath).toBe(path.join(keyDir, 'AuthKey_ABC123.p8'));
  });

  it('creates a new key and saves the privateKey to disk', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/123/inAppPurchasesV2/keys', () =>
        HttpResponse.json({ data: [] })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/inAppPurchasesV2/keys', async ({ request }) => {
        const body = await request.json();
        expect(body.data.attributes.name).toBe('RC Sync Key');
        expect(body.data.relationships.app.data.id).toBe('123');
        return HttpResponse.json({
          data: {
            id: 'NEW123',
            attributes: { name: 'RC Sync Key', privateKey: '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----' },
          },
        }, { status: 201 });
      })
    );

    const result = await ensureIapKey(makeClient(), { name: 'RC Sync Key', keyDir });

    expect(result.keyId).toBe('NEW123');
    expect(result.keyPath).toBe(path.join(keyDir, 'AuthKey_NEW123.p8'));
    expect(fs.readFileSync(result.keyPath, 'utf8')).toContain('FAKE');
  });

  it('throws if key exists remotely but matching .p8 is not on disk (unrecoverable)', async () => {
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/apps/123/inAppPurchasesV2/keys', () =>
        HttpResponse.json({ data: [{ id: 'ORPHAN', attributes: { name: 'RC Sync Key' } }] })
      )
    );
    await expect(ensureIapKey(makeClient(), { name: 'RC Sync Key', keyDir }))
      .rejects.toThrow(/private key.*one-time download/i);
  });
});
```

- [ ] **Step 2: Run — expect fail**

- [ ] **Step 3: Implement**

`scripts/asc/create-iap-key.js`:

```js
import fs from 'node:fs';
import path from 'node:path';

export async function ensureIapKey(client, { name, keyDir }) {
  fs.mkdirSync(keyDir, { recursive: true });

  const list = await client.get(`/v1/apps/${client.appId}/inAppPurchasesV2/keys`);
  const existing = (list.data ?? []).find((k) => k.attributes?.name === name);

  if (existing) {
    const keyPath = path.join(keyDir, `AuthKey_${existing.id}.p8`);
    if (!fs.existsSync(keyPath)) {
      throw new Error(
        `ASC IAP key "${name}" (id=${existing.id}) exists but private key is not on disk at ${keyPath}. ` +
        `The private key is a one-time download and cannot be re-fetched. ` +
        `Remediation: delete the key in ASC (Users & Access → In-App Purchase Keys), then re-run.`
      );
    }
    return { keyId: existing.id, keyPath };
  }

  const created = await client.post('/v1/inAppPurchasesV2/keys', {
    data: {
      type: 'inAppPurchasesV2Keys',
      attributes: { name },
      relationships: { app: { data: { type: 'apps', id: client.appId } } },
    },
  });

  const keyId = created.data.id;
  const privateKey = created.data.attributes.privateKey;
  const keyPath = path.join(keyDir, `AuthKey_${keyId}.p8`);
  fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
  return { keyId, keyPath };
}
```

- [ ] **Step 4: Run — expect pass (3 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/asc/create-iap-key.js test/asc/create-iap-key.test.js
git commit -m "feat(asc): create + persist IAP signing key for RC"
```

---

## Task 12: Upload review screenshot (with bundled placeholder PNG)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/upload-review-screenshot.js`
- Create: `~/.claude/skills/rc-setup/scripts/asc/assets/placeholder-paywall.png` (add a generic PNG — see step 1)
- Test: `~/.claude/skills/rc-setup/test/asc/upload-review-screenshot.test.js`

ASC review-asset flow: POST reservation → PUT bytes to returned upload URL → PATCH commit with `sourceFileChecksum`. Same pattern as [ASC screenshot reservation docs](https://developer.apple.com/documentation/appstoreconnectapi/upload_a_screenshot_for_an_app_store_version).

- [ ] **Step 1: Add placeholder PNG**

Pick any 1242×2688 PNG mockup of a paywall screen (black background, white "GymCrush Plus" title, the 3 tiers listed). If you don't have one, generate a plain-black PNG at that resolution for now — user replaces later:

```bash
# Use any image editor, or generate with ImageMagick if installed:
magick -size 1242x2688 canvas:black -pointsize 64 -fill white -gravity center \
  -annotate 0 "GymCrush Plus\nReview screenshot placeholder" \
  ~/.claude/skills/rc-setup/scripts/asc/assets/placeholder-paywall.png
# If ImageMagick isn't available, manually drop a 1242x2688 PNG into the assets/ dir.
```

- [ ] **Step 2: Write failing test**

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { server } from '../setup.js';
import { AscClient } from '../../scripts/asc/client.js';
import { ensureReviewScreenshot } from '../../scripts/asc/upload-review-screenshot.js';

function makeClient() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const p8 = path.join(os.tmpdir(), `rc-${Date.now()}.p8`);
  fs.writeFileSync(p8, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  return new AscClient({ keyId: 'K', issuerId: 'I', keyPath: p8, appId: '123' });
}

describe('ensureReviewScreenshot', () => {
  it('skips when subscription already has a review screenshot', async () => {
    let reserved = false;
    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/appStoreReviewScreenshot', () =>
        HttpResponse.json({ data: { id: 'shot_existing', attributes: { assetDeliveryState: { state: 'COMPLETE' } } } })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionAppStoreReviewScreenshots', () => {
        reserved = true;
        return HttpResponse.json({ data: { id: 'x' } }, { status: 201 });
      })
    );
    // Use any tiny file for the test
    const tmpPng = path.join(os.tmpdir(), 'fake.png');
    fs.writeFileSync(tmpPng, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const id = await ensureReviewScreenshot(makeClient(), { subscriptionId: 'sub1', pngPath: tmpPng });
    expect(id).toBe('shot_existing');
    expect(reserved).toBe(false);
  });

  it('reserves, uploads, and commits when no screenshot exists', async () => {
    const tmpPng = path.join(os.tmpdir(), 'fake2.png');
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    fs.writeFileSync(tmpPng, bytes);

    const steps = [];

    server.use(
      http.get('https://api.appstoreconnect.apple.com/v1/subscriptions/sub1/appStoreReviewScreenshot', () =>
        HttpResponse.json({ data: null })
      ),
      http.post('https://api.appstoreconnect.apple.com/v1/subscriptionAppStoreReviewScreenshots', async ({ request }) => {
        const body = await request.json();
        expect(body.data.attributes.fileSize).toBe(bytes.length);
        steps.push('reserve');
        return HttpResponse.json({
          data: {
            id: 'shot_new',
            attributes: {
              uploadOperations: [{
                method: 'PUT',
                url: 'https://upload.example/slot',
                requestHeaders: [{ name: 'Content-Type', value: 'image/png' }],
                offset: 0,
                length: bytes.length,
              }],
            },
          },
        }, { status: 201 });
      }),
      http.put('https://upload.example/slot', async ({ request }) => {
        steps.push('upload');
        const received = Buffer.from(await request.arrayBuffer());
        expect(Buffer.compare(received, bytes)).toBe(0);
        return new HttpResponse(null, { status: 204 });
      }),
      http.patch('https://api.appstoreconnect.apple.com/v1/subscriptionAppStoreReviewScreenshots/shot_new', async ({ request }) => {
        const body = await request.json();
        expect(body.data.attributes.uploaded).toBe(true);
        expect(body.data.attributes.sourceFileChecksum).toMatch(/^[a-f0-9]{32}$/);
        steps.push('commit');
        return HttpResponse.json({ data: { id: 'shot_new' } });
      })
    );

    const id = await ensureReviewScreenshot(makeClient(), { subscriptionId: 'sub1', pngPath: tmpPng });
    expect(id).toBe('shot_new');
    expect(steps).toEqual(['reserve', 'upload', 'commit']);
  });
});
```

- [ ] **Step 3: Run — expect fail**

- [ ] **Step 4: Implement**

`scripts/asc/upload-review-screenshot.js`:

```js
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fetch } from 'undici';

export async function ensureReviewScreenshot(client, { subscriptionId, pngPath }) {
  // 1. Short-circuit if screenshot already exists and is COMPLETE
  const existing = await client.get(
    `/v1/subscriptions/${subscriptionId}/appStoreReviewScreenshot`
  );
  if (existing.data?.id && existing.data?.attributes?.assetDeliveryState?.state === 'COMPLETE') {
    return existing.data.id;
  }

  const bytes = fs.readFileSync(pngPath);
  const checksum = crypto.createHash('md5').update(bytes).digest('hex');

  // 2. Reserve
  const reservation = await client.post('/v1/subscriptionAppStoreReviewScreenshots', {
    data: {
      type: 'subscriptionAppStoreReviewScreenshots',
      attributes: { fileName: 'paywall.png', fileSize: bytes.length },
      relationships: { subscription: { data: { type: 'subscriptions', id: subscriptionId } } },
    },
  });

  const shotId = reservation.data.id;
  const op = reservation.data.attributes.uploadOperations[0];

  // 3. Upload bytes
  const uploadHeaders = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
  const uploadRes = await fetch(op.url, {
    method: op.method,
    headers: uploadHeaders,
    body: bytes,
  });
  if (!uploadRes.ok) throw new Error(`Upload PUT failed ${uploadRes.status}`);

  // 4. Commit
  await client.patch(`/v1/subscriptionAppStoreReviewScreenshots/${shotId}`, {
    data: {
      type: 'subscriptionAppStoreReviewScreenshots',
      id: shotId,
      attributes: { uploaded: true, sourceFileChecksum: checksum },
    },
  });

  return shotId;
}
```

- [ ] **Step 5: Run — expect pass (2 tests)**

- [ ] **Step 6: Commit**

```bash
git add scripts/asc/upload-review-screenshot.js scripts/asc/assets/placeholder-paywall.png test/asc/upload-review-screenshot.test.js
git commit -m "feat(asc): review screenshot reserve/upload/commit flow"
```

---

## Task 13: Phase-1 orchestrator (`scripts/asc/run.js`)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/asc/run.js`
- Create: `~/.claude/skills/rc-setup/scripts/lib/logger.js`

This is the glue: loads env, builds client, runs each step in order, prints progress, updates `.env` with IAP key path. No unit test for this file — acceptance test is the manual smoke run in Task 14.

- [ ] **Step 1: Create logger**

`scripts/lib/logger.js`:

```js
const ICONS = { info: '›', ok: '✓', skip: '·', warn: '!', err: '✗' };

function line(kind, msg) {
  const icon = ICONS[kind] ?? '›';
  console.log(`  ${icon} ${msg}`);
}

export const log = {
  step: (title) => console.log(`\n▸ ${title}`),
  info: (msg) => line('info', msg),
  ok:   (msg) => line('ok', msg),
  skip: (msg) => line('skip', msg),
  warn: (msg) => line('warn', msg),
  err:  (msg) => line('err', msg),
};
```

- [ ] **Step 2: Create orchestrator**

`scripts/asc/run.js`:

```js
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { loadProjectEnv, requireAscEnv } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { AscClient } from './client.js';
import { ensureSubscriptionGroup } from './create-subscription-group.js';
import { ensureGroupLocalization } from './create-group-localization.js';
import { ensureSubscriptions, GYMCRUSH_CATALOG } from './create-subscriptions.js';
import { ensureSubscriptionLocalization, GYMCRUSH_LOCALIZATIONS } from './create-subscription-localizations.js';
import { ensureUsdPrice, TARGET_USD } from './set-prices.js';
import { ensureFreeTrial } from './create-intro-offers.js';
import { setServerNotificationsUrl } from './set-server-notifications-url.js';
import { ensureIapKey } from './create-iap-key.js';
import { ensureReviewScreenshot } from './upload-review-screenshot.js';

const PLACEHOLDER_PNG = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'assets/placeholder-paywall.png'
);

const IAP_KEY_DIR = path.join(os.homedir(), '.appstoreconnect/iap_keys');

// RC's Apple server-notifications URLs are the same for every customer using RC.
// https://www.revenuecat.com/docs/platform-resources/webhooks/apple-notifications
const RC_APPLE_PROD    = 'https://api.revenuecat.com/v1/incoming_webhooks/app_store_notifications';
const RC_APPLE_SANDBOX = 'https://api.revenuecat.com/v1/incoming_webhooks/app_store_notifications';

export async function run() {
  const env = loadProjectEnv(process.cwd());
  const cfg = requireAscEnv(env);
  const client = new AscClient(cfg);

  log.step('Phase 1: App Store Connect');

  // Step A: verify creds
  log.info('Verifying ASC credentials...');
  await client.get(`/v1/apps/${cfg.appId}`);
  log.ok(`Credentials OK (app ${cfg.appId})`);

  // Step B: subscription group
  log.info('Ensuring subscription group "GymCrush Plus"...');
  const groupId = await ensureSubscriptionGroup(client, { referenceName: 'GymCrush Plus' });
  log.ok(`Group ${groupId}`);

  // Step C: group localization
  log.info('Ensuring group localization (en-US)...');
  await ensureGroupLocalization(client, { groupId, locale: 'en-US', customAppName: 'GymCrush Plus' });
  log.ok('Group localization ready');

  // Step D: subscriptions
  log.info('Ensuring subscriptions...');
  const subsByProduct = await ensureSubscriptions(client, { groupId, catalog: GYMCRUSH_CATALOG });
  for (const [productId, subId] of Object.entries(subsByProduct)) log.ok(`${productId} → ${subId}`);

  // Step E: per-subscription localization
  log.info('Ensuring subscription localizations...');
  for (const [productId, subId] of Object.entries(subsByProduct)) {
    const spec = GYMCRUSH_LOCALIZATIONS[productId];
    await ensureSubscriptionLocalization(client, { subscriptionId: subId, ...spec });
    log.ok(`${productId} localized`);
  }

  // Step F: prices
  log.info('Ensuring USA prices...');
  for (const [productId, subId] of Object.entries(subsByProduct)) {
    const target = TARGET_USD[productId];
    await ensureUsdPrice(client, { subscriptionId: subId, targetUsd: target });
    log.ok(`${productId} @ $${target}`);
  }

  // Step G: intro offers
  log.info('Ensuring 7-day free trials...');
  for (const [productId, subId] of Object.entries(subsByProduct)) {
    await ensureFreeTrial(client, { subscriptionId: subId, duration: 'ONE_WEEK' });
    log.ok(`${productId} trial`);
  }

  // Step H: review screenshot
  log.info('Ensuring review screenshot...');
  if (fs.existsSync(PLACEHOLDER_PNG)) {
    for (const [productId, subId] of Object.entries(subsByProduct)) {
      await ensureReviewScreenshot(client, { subscriptionId: subId, pngPath: PLACEHOLDER_PNG });
      log.ok(`${productId} screenshot`);
    }
  } else {
    log.warn(`Placeholder PNG missing at ${PLACEHOLDER_PNG}; skipping. Upload manually in ASC before IAP submission.`);
  }

  // Step I: server notifications URL (points at RC, not Supabase)
  log.info('Setting App Store Server Notifications URL to RC...');
  await setServerNotificationsUrl(client, {
    prodUrl: RC_APPLE_PROD,
    sandboxUrl: RC_APPLE_SANDBOX,
  });
  log.ok('Apple → RC notifications wired');

  // Step J: IAP key for RC
  log.info('Ensuring IAP signing key for RC...');
  const { keyId, keyPath } = await ensureIapKey(client, { name: 'RevenueCat Sync Key', keyDir: IAP_KEY_DIR });
  log.ok(`IAP key ${keyId} → ${keyPath}`);

  // Persist the key path in the project .env so Phase 2 can pick it up.
  appendEnvOnce(path.join(process.cwd(), '.env'), 'ASC_IAP_KEY_ID', keyId);
  appendEnvOnce(path.join(process.cwd(), '.env'), 'ASC_IAP_KEY_PATH', keyPath);

  log.step('Phase 1 complete.');
  console.log(`
Next: run "rc-setup rc" (Plan 2) to create the RC project and upload the IAP key.
The IAP key path has been written to your project .env:
  ASC_IAP_KEY_ID=${keyId}
  ASC_IAP_KEY_PATH=${keyPath}
`);
}

function appendEnvOnce(envPath, key, value) {
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (new RegExp(`^${key}=`, 'm').test(current)) {
    // Replace in place
    const updated = current.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
    fs.writeFileSync(envPath, updated);
  } else {
    const prefix = current.endsWith('\n') || current === '' ? '' : '\n';
    fs.appendFileSync(envPath, `${prefix}${key}=${value}\n`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/asc/run.js scripts/lib/logger.js
git commit -m "feat(asc): phase-1 orchestrator wires all ensure* steps"
```

---

## Task 14: Manual acceptance test against gymcrush ASC

This is the ONE test that exercises the real ASC API. Only run if you're ready to create real products in the gymcrush ASC app. No rollback — ASC products, once created, can be marked "Removed from Sale" but not fully deleted.

**Preconditions:**
- gymcrush ASC creds already set up (`.p8` exists at `~/.appstoreconnect/private_keys/AuthKey_<id>.p8`)
- gymcrush `.env` has the 5 ASC keys
- `ASC_APP_ID` matches the real gymcrush ASC app ID

- [ ] **Step 1: Verify credentials without creating anything**

```bash
cd ~/dev/gymcrush
node -e "
import('/Users/chrischidgey/.claude/skills/rc-setup/scripts/lib/env.js').then(async (m) => {
  const env = m.loadProjectEnv(process.cwd());
  const cfg = m.requireAscEnv(env);
  const { AscClient } = await import('/Users/chrischidgey/.claude/skills/rc-setup/scripts/asc/client.js');
  const c = new AscClient(cfg);
  const app = await c.get('/v1/apps/' + cfg.appId);
  console.log('OK — app name:', app.data.attributes.name, 'bundle:', app.data.attributes.bundleId);
});"
```

Expected: prints "OK — app name: GymCrush bundle: com.gymcrushdating.app". If 401, the `.p8` or key ID is wrong. If 404, the `ASC_APP_ID` is wrong.

- [ ] **Step 2: Run Phase 1 against gymcrush**

```bash
cd ~/dev/gymcrush
node ~/.claude/skills/rc-setup/bin/rc-setup.js asc
```

Expected output (abbreviated):

```
▸ Phase 1: App Store Connect
  › Verifying ASC credentials...
  ✓ Credentials OK (app 1234567890)
  › Ensuring subscription group "GymCrush Plus"...
  ✓ Group ...
  › Ensuring group localization (en-US)...
  ✓ Group localization ready
  › Ensuring subscriptions...
  ✓ gymcrush_plus_monthly → ...
  ✓ gymcrush_plus_3month → ...
  ✓ gymcrush_plus_annual → ...
  ... [further steps] ...
  ✓ IAP key ... → /Users/.../iap_keys/AuthKey_....p8
▸ Phase 1 complete.
```

- [ ] **Step 3: Verify in ASC dashboard**

Open App Store Connect → GymCrush → Monetization → Subscriptions.

Confirm:
- [ ] Subscription group "GymCrush Plus" exists
- [ ] 3 subscriptions exist with the expected product IDs
- [ ] Each subscription's "Subscription Prices" tab shows USA at $14.99 / $29.99 / $83.99
- [ ] Each subscription's "Subscription Localizations" tab shows one en-US entry
- [ ] Each subscription's "Introductory Offers" tab shows a 7-day free trial active in all territories
- [ ] Each subscription's "App Review Information" tab shows the placeholder screenshot (or is empty if the PNG step was skipped — in which case upload manually now)
- [ ] App settings → App Store Server Notifications → V2 URL points to `api.revenuecat.com/v1/incoming_webhooks/...`
- [ ] Users and Access → Integrations → In-App Purchase → a key named "RevenueCat Sync Key" exists
- [ ] `~/.appstoreconnect/iap_keys/AuthKey_<keyId>.p8` exists locally (600 permissions)

- [ ] **Step 4: Re-run to confirm idempotency**

```bash
node ~/.claude/skills/rc-setup/bin/rc-setup.js asc
```

Expected: same output, but every `✓` indicates a skip (no new creates). No 409 Conflict errors. `.env` is not duplicated.

- [ ] **Step 5: Verify `.env` was updated**

```bash
grep -E '^ASC_IAP_KEY_(ID|PATH)=' ~/dev/gymcrush/.env
```

Expected: shows both lines, single entry per key. `.env` is gitignored so no commit needed in the gymcrush repo.

- [ ] **Step 6: Commit the successful smoke-test state (skill repo only)**

```bash
cd ~/.claude/skills/rc-setup
git add -A && git commit -m "chore: Plan 1 acceptance test passed against gymcrush" --allow-empty
```

---

## Spec coverage check

| Spec requirement (Phase 1) | Task |
|---|---|
| Verify ASC creds before mutating | Task 13 orchestrator, Step A + Task 14 Step 1 |
| Subscription group (`GymCrush Plus`) | Task 4 |
| Group localization (en-US, `customAppName`) | Task 5 |
| 3 subscriptions with correct period + groupLevel | Task 6 |
| Per-subscription localization (name, description, en-US) | Task 7 |
| USD prices via ASC price points (not raw $) | Task 8 |
| 7-day free trial intro offer | Task 9 |
| App-level `appStoreServerNotificationsV2Url` = RC | Task 13 step I + Task 10 |
| Review screenshot reserved/uploaded/committed | Task 12 |
| IAP `.p8` created + persisted to `~/.appstoreconnect/iap_keys/` | Task 11 + Task 13 step J |
| `.env` updated with `ASC_IAP_KEY_ID` / `ASC_IAP_KEY_PATH` | Task 13 `appendEnvOnce` |
| Idempotency — safe to re-run | Every `ensure*` uses GET-before-POST; Task 14 Step 4 verifies |
| Fail-fast on bad creds | Task 3 (`AscAuthError`) surfaces through orchestrator |

---

## Deferred to later plans

- Orchestrator skipping when phase already complete (Plan 5 `verify` will formalize this)
- Per-project catalog config (this plan hard-codes gymcrush's; Plan 2 introduces a catalog config file)
- Handling multi-territory pricing beyond USA auto-calculation (not in spec)
- Upgrading `preserveCurrentPrice: true` semantics (not needed for fresh apps)
