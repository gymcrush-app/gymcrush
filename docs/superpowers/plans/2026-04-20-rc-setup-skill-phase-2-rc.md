# `rc-setup` Skill — Plan 2: RevenueCat Phase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build idempotent scripts that configure the RevenueCat side of the subscription pipeline — iOS app, ASC IAP key upload, products, entitlement, offering, packages, webhook — against the gymcrush RC project (`proj7b897d04`) via RC's v2 REST API.

**Architecture:** Scripts under `~/.claude/skills/rc-setup/scripts/rc/` that share a `client.js` (Bearer-auth fetch helper with retry, mirrors `AscClient`). Each script is idempotent: query RC for existing state before creating. Orchestrator `rc/run.js` runs them in order and persists generated values back to the project `.env`.

**Tech Stack:** Node 20+, `undici` (global fetch), `crypto` (for webhook secret), vitest + msw/node (no new deps over Plan 1).

**Spec reference:** [`docs/superpowers/specs/2026-04-17-rc-setup-skill-design.md`](../specs/2026-04-17-rc-setup-skill-design.md) — Phase 2 section.

**Dependencies on Plan 1:**
- Plan 1's `AscClient`, `ensureSubscriptions`, `GYMCRUSH_CATALOG` remain unchanged
- `scripts/lib/env.js` gains `requireRcEnv` helper
- `scripts/lib/errors.js` gains `RcApiError`, `RcAuthError`

---

## Preconditions

Target project (e.g. `~/dev/gymcrush`) `.env` must contain:

```
RC_API_KEY_V2=sk_...                   # project-write secret from RC Dashboard
RC_PROJECT_ID=proj7b897d04             # the RC project ID (gymcrush-specific)
```

Also (populated by Plan 1 or manually):
```
ASC_BUNDLE_ID=com.gymcrushdating.app
ASC_IAP_KEY_ID=...                     # optional for Plan 2: if absent, skip IAP upload with warn
ASC_IAP_KEY_PATH=...                   # optional for Plan 2
```

Populated by this plan's orchestrator:
```
RC_IOS_PUBLIC_KEY=appl_...             # public SDK key for the iOS app (RC Dashboard URL safe)
EXPO_PUBLIC_RC_IOS_KEY=appl_...        # same value, used by app-side code in Plan 4
RC_WEBHOOK_ID=wh_...                   # Plan 3 PATCHes this webhook with the real Supabase URL
RC_WEBHOOK_AUTH=<generated>            # shared secret for Supabase edge-function auth header
```

---

## File Structure

**Created in this plan:**
```
~/.claude/skills/rc-setup/
├── scripts/
│   ├── rc/
│   │   ├── client.js                  # Bearer-auth fetch + retry + errors
│   │   ├── ensure-app.js              # Idempotent iOS app in project
│   │   ├── upload-iap-key.js          # Multipart upload ASC IAP .p8 to RC
│   │   ├── ensure-products.js         # 3 products (idempotent by store_identifier)
│   │   ├── ensure-entitlement.js      # `plus` entitlement
│   │   ├── attach-products.js         # Attach products to entitlement
│   │   ├── ensure-offering.js         # `default` offering, is_current
│   │   ├── ensure-packages.js         # 3 packages with product refs
│   │   ├── set-webhook.js             # Placeholder URL + RC_WEBHOOK_AUTH
│   │   └── run.js                     # Phase-2 orchestrator
└── test/
    └── rc/                            # Corresponding MSW-backed tests for each script
```

**Modified in this plan:**
```
~/.claude/skills/rc-setup/
├── scripts/lib/env.js                 # Add requireRcEnv
├── scripts/lib/errors.js              # Add RcApiError, RcAuthError
└── bin/rc-setup.js                    # Register `rc` phase
```

---

## RC v2 API Notes

RC's v2 base URL: `https://api.revenuecat.com/v2`
Auth: `Authorization: Bearer <RC_API_KEY_V2>`
List responses use `{ items: [...] }` (NOT JSON:API `data`)
Create responses return the created object at top level (e.g. `{ id, ... }`)

**Endpoints used (verify against [RC v2 docs](https://www.revenuecat.com/docs/api-v2) before running):**

| Action | Method + Path |
|---|---|
| List apps in project | `GET /projects/{id}/apps` |
| Create iOS app | `POST /projects/{id}/apps` |
| Upload ASC API key | `POST /projects/{id}/apps/{app_id}/app_store_connect_api_key` (multipart) |
| List products | `GET /projects/{id}/products` |
| Create product | `POST /projects/{id}/products` |
| List entitlements | `GET /projects/{id}/entitlements` |
| Create entitlement | `POST /projects/{id}/entitlements` |
| Attach products to entitlement | `POST /projects/{id}/entitlements/{id}/actions/attach_products` |
| List offerings | `GET /projects/{id}/offerings` |
| Create offering | `POST /projects/{id}/offerings` |
| List packages in offering | `GET /projects/{id}/offerings/{offering_id}/packages` |
| Create package | `POST /projects/{id}/offerings/{offering_id}/packages` |
| List webhooks | `GET /projects/{id}/webhooks` |
| Create webhook | `POST /projects/{id}/webhooks` |
| Update webhook | `PATCH /projects/{id}/webhooks/{id}` |

If the real API diverges (e.g. `attach_products` is actually named differently), update the MSW handlers and the script implementation together — tests will catch the shape mismatch.

---

## Task 1: RC env validation + typed errors + Bearer client

**Files:**
- Modify: `~/.claude/skills/rc-setup/scripts/lib/env.js`
- Test: `~/.claude/skills/rc-setup/test/lib/env.test.js` (add tests for `requireRcEnv`)
- Modify: `~/.claude/skills/rc-setup/scripts/lib/errors.js`
- Create: `~/.claude/skills/rc-setup/scripts/rc/client.js`
- Test: `~/.claude/skills/rc-setup/test/rc/client.test.js`

- [ ] **Step 1: Extend `env.js` with `requireRcEnv`**

Append to `scripts/lib/env.js`:

```js
const RC_KEYS = ['RC_API_KEY_V2', 'RC_PROJECT_ID'];

export function requireRcEnv(env) {
  const missing = RC_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`Missing RC env vars: ${missing.join(', ')}`);
  }
  return {
    apiKey: env.RC_API_KEY_V2,
    projectId: env.RC_PROJECT_ID,
  };
}
```

- [ ] **Step 2: Add env tests**

Append to `test/lib/env.test.js`:

```js
import { requireRcEnv } from '../../scripts/lib/env.js';

describe('requireRcEnv', () => {
  it('returns typed config when RC keys present', () => {
    const env = { RC_API_KEY_V2: 'sk_xxx', RC_PROJECT_ID: 'proj_abc' };
    const cfg = requireRcEnv(env);
    expect(cfg.apiKey).toBe('sk_xxx');
    expect(cfg.projectId).toBe('proj_abc');
  });

  it('throws listing every missing key', () => {
    expect(() => requireRcEnv({})).toThrow(/RC_API_KEY_V2.*RC_PROJECT_ID/s);
  });
});
```

Also fix the `requireAscEnv` "returns typed config" test to spot-check all 5 mapped fields (carryover polish from Task 2 review):

```js
it('returns a typed config when all keys present', () => {
  const env = {
    ASC_KEY_ID: 'K',
    ASC_ISSUER_ID: 'I',
    ASC_KEY_PATH: '/tmp/k.p8',
    ASC_APP_ID: '123',
    ASC_BUNDLE_ID: 'com.test.app',
  };
  const cfg = requireAscEnv(env);
  expect(cfg).toEqual({
    keyId: 'K',
    issuerId: 'I',
    keyPath: '/tmp/k.p8',
    appId: '123',
    bundleId: 'com.test.app',
  });
});
```

- [ ] **Step 3: Extend `errors.js` with RC error classes**

Append to `scripts/lib/errors.js`:

```js
export class RcApiError extends Error {
  constructor(status, body, method, path) {
    super(`RC ${method} ${path} → ${status}: ${JSON.stringify(body).slice(0, 400)}`);
    this.status = status;
    this.body = body;
    this.method = method;
    this.path = path;
  }
}

export class RcAuthError extends RcApiError {}
```

- [ ] **Step 4: Write failing client tests**

`test/rc/client.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { RcApiError, RcAuthError } from '../../scripts/lib/errors.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test123', projectId: 'proj_abc' });
}

describe('RcClient', () => {
  it('sends Authorization: Bearer <apiKey> on GET', async () => {
    let seenAuth = null;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/apps', ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ items: [] });
      })
    );
    await makeClient().get('/projects/proj_abc/apps');
    expect(seenAuth).toBe('Bearer sk_test123');
  });

  it('sends JSON body and Content-Type on POST', async () => {
    let captured = null;
    server.use(
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/apps', async ({ request }) => {
        captured = { body: await request.json(), ct: request.headers.get('content-type') };
        return HttpResponse.json({ id: 'app_new' }, { status: 201 });
      })
    );
    const res = await makeClient().post('/projects/proj_abc/apps', { name: 'X' });
    expect(captured.body).toEqual({ name: 'X' });
    expect(captured.ct).toMatch(/application\/json/);
    expect(res.id).toBe('app_new');
  });

  it('throws RcAuthError on 401', async () => {
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/apps', () =>
        HttpResponse.json({ code: 7001, message: 'Unauthorized' }, { status: 401 })
      )
    );
    await expect(makeClient().get('/projects/proj_abc/apps')).rejects.toBeInstanceOf(RcAuthError);
  });

  it('throws RcApiError on 4xx (non-401)', async () => {
    server.use(
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/entitlements', () =>
        HttpResponse.json({ code: 7101, message: 'Conflict' }, { status: 409 })
      )
    );
    await expect(
      makeClient().post('/projects/proj_abc/entitlements', {})
    ).rejects.toMatchObject({ status: 409, constructor: RcApiError });
  });

  it('retries once on 429 with Retry-After', async () => {
    let calls = 0;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/apps', () => {
        calls++;
        if (calls === 1) return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } });
        return HttpResponse.json({ items: [] });
      })
    );
    await makeClient().get('/projects/proj_abc/apps');
    expect(calls).toBe(2);
  });

  it('supports multipart POST with file + fields', async () => {
    let formBodyRaw = null;
    server.use(
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/apps/app_1/app_store_connect_api_key', async ({ request }) => {
        formBodyRaw = await request.text();
        return HttpResponse.json({ ok: true });
      })
    );
    await makeClient().postMultipart('/projects/proj_abc/apps/app_1/app_store_connect_api_key', {
      fields: { key_id: 'K1', issuer_id: 'I1' },
      files: [{ name: 'private_key', filename: 'AuthKey.p8', contentType: 'application/x-pem-file', content: Buffer.from('fake-pem') }],
    });
    expect(formBodyRaw).toMatch(/name="key_id"/);
    expect(formBodyRaw).toMatch(/K1/);
    expect(formBodyRaw).toMatch(/filename="AuthKey\.p8"/);
    expect(formBodyRaw).toContain('fake-pem');
  });
});
```

- [ ] **Step 5: Run tests, verify they fail (module missing)**

```bash
cd ~/.claude/skills/rc-setup
npm test -- test/rc/client.test.js
```
Expected: FAIL — `Cannot find module '../../scripts/rc/client.js'`.

- [ ] **Step 6: Implement `scripts/rc/client.js`**

```js
import { RcApiError, RcAuthError } from '../lib/errors.js';

const BASE = 'https://api.revenuecat.com/v2';

export class RcClient {
  constructor({ apiKey, projectId }) {
    if (!apiKey) throw new Error('RC apiKey required');
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  async _request(method, path, { body, headers = {}, retried = false } = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429 && !retried) {
      const wait = Number(res.headers.get('retry-after') ?? 1) * 1000;
      await new Promise((r) => setTimeout(r, wait));
      return this._request(method, path, { body, headers, retried: true });
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (res.status === 401) throw new RcAuthError(res.status, data, method, path);
    if (!res.ok) throw new RcApiError(res.status, data, method, path);
    return data;
  }

  get(path)          { return this._request('GET', path); }
  post(path, body)   { return this._request('POST', path, { body }); }
  patch(path, body)  { return this._request('PATCH', path, { body }); }
  delete(path)       { return this._request('DELETE', path); }

  async postMultipart(path, { fields = {}, files = [] }) {
    const boundary = '----rc-setup-' + Math.random().toString(36).slice(2);
    const parts = [];
    for (const [name, value] of Object.entries(fields)) {
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`
      );
    }
    for (const f of files) {
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${f.name}"; filename="${f.filename}"\r\n` +
        `Content-Type: ${f.contentType}\r\n\r\n`
      );
      parts.push(f.content);
      parts.push('\r\n');
    }
    parts.push(`--${boundary}--\r\n`);

    const bodyBuf = Buffer.concat(
      parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p, 'utf8')))
    );

    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuf,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (res.status === 401) throw new RcAuthError(res.status, data, 'POST', path);
    if (!res.ok) throw new RcApiError(res.status, data, 'POST', path);
    return data;
  }
}
```

- [ ] **Step 7: Run tests, verify all pass**

```bash
npm test
```
Expected: existing 28 tests pass + 5 new RcClient tests + 2 new requireRcEnv tests = 35 total.

- [ ] **Step 8: Commit**

```bash
cd ~/.claude/skills/rc-setup
git add scripts/lib/env.js scripts/lib/errors.js scripts/rc/client.js test/lib/env.test.js test/rc/client.test.js
git commit -m "feat(rc): Bearer v2 client, RC env validation, typed errors"
```

---

## Task 2: `ensureApp` — idempotent iOS app in project

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/ensure-app.js`
- Test: `~/.claude/skills/rc-setup/test/rc/ensure-app.test.js`

- [ ] **Step 1: Write failing test**

`test/rc/ensure-app.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { ensureIosApp } from '../../scripts/rc/ensure-app.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('ensureIosApp', () => {
  it('returns existing iOS app by bundle_id without posting', async () => {
    let posted = false;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/apps', () =>
        HttpResponse.json({
          items: [
            { id: 'app_android', type: 'play_store', bundle_id: 'com.other.app' },
            { id: 'app_ios', type: 'app_store', bundle_id: 'com.gymcrushdating.app', public_api_key: 'appl_existing' },
          ],
        })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/apps', () => {
        posted = true;
        return HttpResponse.json({ id: 'app_new' }, { status: 201 });
      })
    );

    const result = await ensureIosApp(makeClient(), { bundleId: 'com.gymcrushdating.app', name: 'GymCrush iOS' });
    expect(result.appId).toBe('app_ios');
    expect(result.publicKey).toBe('appl_existing');
    expect(posted).toBe(false);
  });

  it('creates iOS app when missing, returns appId + publicKey', async () => {
    let captured;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/apps', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/apps', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ id: 'app_new', type: 'app_store', bundle_id: captured.bundle_id, public_api_key: 'appl_new' }, { status: 201 });
      })
    );

    const result = await ensureIosApp(makeClient(), { bundleId: 'com.gymcrushdating.app', name: 'GymCrush iOS' });
    expect(result.appId).toBe('app_new');
    expect(result.publicKey).toBe('appl_new');
    expect(captured).toEqual({
      name: 'GymCrush iOS',
      type: 'app_store',
      bundle_id: 'com.gymcrushdating.app',
    });
  });
});
```

- [ ] **Step 2: Run, verify fails**

```bash
npm test -- test/rc/ensure-app.test.js
```

- [ ] **Step 3: Implement `scripts/rc/ensure-app.js`**

```js
export async function ensureIosApp(client, { bundleId, name }) {
  const list = await client.get(`/projects/${client.projectId}/apps`);
  const existing = (list.items ?? []).find(
    (a) => a.type === 'app_store' && a.bundle_id === bundleId
  );
  if (existing) {
    return { appId: existing.id, publicKey: existing.public_api_key };
  }

  const created = await client.post(`/projects/${client.projectId}/apps`, {
    name,
    type: 'app_store',
    bundle_id: bundleId,
  });
  return { appId: created.id, publicKey: created.public_api_key };
}
```

- [ ] **Step 4: Run, verify pass (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/ensure-app.js test/rc/ensure-app.test.js
git commit -m "feat(rc): idempotent ensureIosApp by bundle_id"
```

---

## Task 3: `uploadIapKey` — multipart upload ASC IAP .p8

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/upload-iap-key.js`
- Test: `~/.claude/skills/rc-setup/test/rc/upload-iap-key.test.js`

Gracefully skips (returns `{ uploaded: false, reason }`) if the IAP `.p8` is not on disk — letting the orchestrator continue the RC-only work even when Phase 1 hasn't produced the key yet.

- [ ] **Step 1: Write failing test**

`test/rc/upload-iap-key.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { uploadIapKey } from '../../scripts/rc/upload-iap-key.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('uploadIapKey', () => {
  let tmpDir;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p8-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips and returns reason when .p8 path is empty', async () => {
    const result = await uploadIapKey(makeClient(), {
      appId: 'app_1',
      keyId: '',
      issuerId: 'I',
      keyPath: '',
    });
    expect(result).toEqual({ uploaded: false, reason: 'missing-env' });
  });

  it('skips and returns reason when .p8 file does not exist on disk', async () => {
    const result = await uploadIapKey(makeClient(), {
      appId: 'app_1',
      keyId: 'K1',
      issuerId: 'I1',
      keyPath: path.join(tmpDir, 'nope.p8'),
    });
    expect(result).toEqual({ uploaded: false, reason: 'file-missing' });
  });

  it('uploads multipart when all inputs present, returns uploaded: true', async () => {
    const keyPath = path.join(tmpDir, 'AuthKey_K1.p8');
    fs.writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----');

    let formBody = null;
    server.use(
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/apps/app_1/app_store_connect_api_key', async ({ request }) => {
        formBody = await request.text();
        return HttpResponse.json({ ok: true });
      })
    );

    const result = await uploadIapKey(makeClient(), {
      appId: 'app_1',
      keyId: 'K1',
      issuerId: 'I1',
      keyPath,
    });
    expect(result).toEqual({ uploaded: true });
    expect(formBody).toMatch(/name="key_id"[\s\S]+K1/);
    expect(formBody).toMatch(/name="issuer_id"[\s\S]+I1/);
    expect(formBody).toMatch(/filename="AuthKey_K1\.p8"/);
    expect(formBody).toContain('FAKE');
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/upload-iap-key.js`**

```js
import fs from 'node:fs';
import path from 'node:path';

export async function uploadIapKey(client, { appId, keyId, issuerId, keyPath }) {
  if (!keyId || !keyPath) {
    return { uploaded: false, reason: 'missing-env' };
  }
  if (!fs.existsSync(keyPath)) {
    return { uploaded: false, reason: 'file-missing' };
  }

  const content = fs.readFileSync(keyPath);
  const filename = path.basename(keyPath);

  await client.postMultipart(
    `/projects/${client.projectId}/apps/${appId}/app_store_connect_api_key`,
    {
      fields: { key_id: keyId, issuer_id: issuerId },
      files: [{ name: 'private_key', filename, contentType: 'application/x-pem-file', content }],
    }
  );

  return { uploaded: true };
}
```

- [ ] **Step 4: Run, verify pass (3 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/upload-iap-key.js test/rc/upload-iap-key.test.js
git commit -m "feat(rc): upload ASC IAP .p8 to RC (skips gracefully if absent)"
```

---

## Task 4: `ensureProducts` — 3 RC products idempotent by store_identifier

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/ensure-products.js`
- Test: `~/.claude/skills/rc-setup/test/rc/ensure-products.test.js`

Hard-codes no catalog itself — the orchestrator imports `GYMCRUSH_CATALOG` from Plan 1's `scripts/asc/create-subscriptions.js` and passes it. Single source of truth for product IDs.

- [ ] **Step 1: Write failing test**

`test/rc/ensure-products.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { ensureProducts } from '../../scripts/rc/ensure-products.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('ensureProducts', () => {
  it('creates only missing products, returns a map of storeIdentifier→productId', async () => {
    const posts = [];
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/products', () =>
        HttpResponse.json({
          items: [
            { id: 'prod_existing', store_identifier: 'gymcrush_plus_monthly', app_id: 'app_1' },
          ],
        })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/products', async ({ request }) => {
        const body = await request.json();
        posts.push(body.store_identifier);
        return HttpResponse.json({ id: `prod_${body.store_identifier}`, store_identifier: body.store_identifier }, { status: 201 });
      })
    );

    const catalog = [
      { productId: 'gymcrush_plus_monthly', name: 'Monthly' },
      { productId: 'gymcrush_plus_3month',  name: '3-Month' },
      { productId: 'gymcrush_plus_annual',  name: 'Annual' },
    ];
    const map = await ensureProducts(makeClient(), { appId: 'app_1', catalog });

    expect(map.gymcrush_plus_monthly).toBe('prod_existing');
    expect(map.gymcrush_plus_3month).toBe('prod_gymcrush_plus_3month');
    expect(map.gymcrush_plus_annual).toBe('prod_gymcrush_plus_annual');
    expect(posts.sort()).toEqual(['gymcrush_plus_3month', 'gymcrush_plus_annual']);
  });

  it('posts with type: subscription and app_id relationship', async () => {
    let captured;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/products', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/products', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ id: 'prod_1', store_identifier: captured.store_identifier }, { status: 201 });
      })
    );

    await ensureProducts(makeClient(), {
      appId: 'app_1',
      catalog: [{ productId: 'x', name: 'X' }],
    });
    expect(captured).toEqual({
      store_identifier: 'x',
      display_name: 'X',
      type: 'subscription',
      app_id: 'app_1',
    });
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/ensure-products.js`**

```js
export async function ensureProducts(client, { appId, catalog }) {
  const list = await client.get(`/projects/${client.projectId}/products`);
  const existingByStoreId = new Map();
  for (const p of list.items ?? []) {
    existingByStoreId.set(p.store_identifier, p.id);
  }

  const result = {};
  for (const item of catalog) {
    if (existingByStoreId.has(item.productId)) {
      result[item.productId] = existingByStoreId.get(item.productId);
      continue;
    }
    const created = await client.post(`/projects/${client.projectId}/products`, {
      store_identifier: item.productId,
      display_name: item.name,
      type: 'subscription',
      app_id: appId,
    });
    result[item.productId] = created.id;
  }
  return result;
}
```

- [ ] **Step 4: Run, verify pass (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/ensure-products.js test/rc/ensure-products.test.js
git commit -m "feat(rc): idempotent product creation by store_identifier"
```

---

## Task 5: `ensureEntitlement` — idempotent `plus` entitlement

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/ensure-entitlement.js`
- Test: `~/.claude/skills/rc-setup/test/rc/ensure-entitlement.test.js`

- [ ] **Step 1: Write failing test**

`test/rc/ensure-entitlement.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { ensureEntitlement } from '../../scripts/rc/ensure-entitlement.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('ensureEntitlement', () => {
  it('returns existing entitlement id for matching lookup_key', async () => {
    let posted = false;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/entitlements', () =>
        HttpResponse.json({ items: [{ id: 'ent_existing', lookup_key: 'plus' }] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/entitlements', () => {
        posted = true;
        return HttpResponse.json({ id: 'ent_new' }, { status: 201 });
      })
    );
    const id = await ensureEntitlement(makeClient(), { lookupKey: 'plus', displayName: 'GymCrush Plus' });
    expect(id).toBe('ent_existing');
    expect(posted).toBe(false);
  });

  it('creates entitlement with lookup_key and display_name', async () => {
    let captured;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/entitlements', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/entitlements', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ id: 'ent_new' }, { status: 201 });
      })
    );
    const id = await ensureEntitlement(makeClient(), { lookupKey: 'plus', displayName: 'GymCrush Plus' });
    expect(id).toBe('ent_new');
    expect(captured).toEqual({ lookup_key: 'plus', display_name: 'GymCrush Plus' });
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/ensure-entitlement.js`**

```js
export async function ensureEntitlement(client, { lookupKey, displayName }) {
  const list = await client.get(`/projects/${client.projectId}/entitlements`);
  const existing = (list.items ?? []).find((e) => e.lookup_key === lookupKey);
  if (existing) return existing.id;

  const created = await client.post(`/projects/${client.projectId}/entitlements`, {
    lookup_key: lookupKey,
    display_name: displayName,
  });
  return created.id;
}
```

- [ ] **Step 4: Run, verify pass (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/ensure-entitlement.js test/rc/ensure-entitlement.test.js
git commit -m "feat(rc): idempotent entitlement by lookup_key"
```

---

## Task 6: `attachProducts` — attach product IDs to entitlement

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/attach-products.js`
- Test: `~/.claude/skills/rc-setup/test/rc/attach-products.test.js`

RC's attach endpoint should be idempotent server-side (attaching an already-attached product is a no-op or returns 200), but we also check before posting to avoid unnecessary calls and surface the existing state for logging.

- [ ] **Step 1: Write failing test**

`test/rc/attach-products.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { attachProductsToEntitlement } from '../../scripts/rc/attach-products.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('attachProductsToEntitlement', () => {
  it('skips attach when all product IDs are already attached', async () => {
    let attached = false;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/entitlements/ent_plus/products', () =>
        HttpResponse.json({ items: [{ id: 'prod_m' }, { id: 'prod_3' }, { id: 'prod_y' }] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/entitlements/ent_plus/actions/attach_products', () => {
        attached = true;
        return HttpResponse.json({ ok: true });
      })
    );
    const result = await attachProductsToEntitlement(makeClient(), {
      entitlementId: 'ent_plus',
      productIds: ['prod_m', 'prod_3', 'prod_y'],
    });
    expect(result).toEqual({ attached: [], skipped: ['prod_m', 'prod_3', 'prod_y'] });
    expect(attached).toBe(false);
  });

  it('attaches only missing product ids', async () => {
    let captured;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/entitlements/ent_plus/products', () =>
        HttpResponse.json({ items: [{ id: 'prod_m' }] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/entitlements/ent_plus/actions/attach_products', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );
    const result = await attachProductsToEntitlement(makeClient(), {
      entitlementId: 'ent_plus',
      productIds: ['prod_m', 'prod_3', 'prod_y'],
    });
    expect(captured).toEqual({ product_ids: ['prod_3', 'prod_y'] });
    expect(result).toEqual({ attached: ['prod_3', 'prod_y'], skipped: ['prod_m'] });
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/attach-products.js`**

```js
export async function attachProductsToEntitlement(client, { entitlementId, productIds }) {
  const list = await client.get(
    `/projects/${client.projectId}/entitlements/${entitlementId}/products`
  );
  const already = new Set((list.items ?? []).map((p) => p.id));
  const toAttach = productIds.filter((id) => !already.has(id));
  const skipped = productIds.filter((id) => already.has(id));

  if (toAttach.length === 0) {
    return { attached: [], skipped };
  }

  await client.post(
    `/projects/${client.projectId}/entitlements/${entitlementId}/actions/attach_products`,
    { product_ids: toAttach }
  );
  return { attached: toAttach, skipped };
}
```

- [ ] **Step 4: Run, verify pass (2 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/attach-products.js test/rc/attach-products.test.js
git commit -m "feat(rc): idempotent product attach to entitlement"
```

---

## Task 7: `ensureOffering` — `default` offering with is_current

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/ensure-offering.js`
- Test: `~/.claude/skills/rc-setup/test/rc/ensure-offering.test.js`

- [ ] **Step 1: Write failing test**

`test/rc/ensure-offering.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { ensureOffering } from '../../scripts/rc/ensure-offering.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('ensureOffering', () => {
  it('returns existing offering id and does not PATCH when already is_current', async () => {
    let patched = false;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/offerings', () =>
        HttpResponse.json({
          items: [{ id: 'off_default', lookup_key: 'default', is_current: true }],
        })
      ),
      http.patch('https://api.revenuecat.com/v2/projects/proj_abc/offerings/off_default', () => {
        patched = true;
        return HttpResponse.json({ id: 'off_default', is_current: true });
      })
    );
    const id = await ensureOffering(makeClient(), { lookupKey: 'default', displayName: 'Default' });
    expect(id).toBe('off_default');
    expect(patched).toBe(false);
  });

  it('PATCHes to set is_current when offering exists but is not current', async () => {
    let patched;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/offerings', () =>
        HttpResponse.json({
          items: [{ id: 'off_default', lookup_key: 'default', is_current: false }],
        })
      ),
      http.patch('https://api.revenuecat.com/v2/projects/proj_abc/offerings/off_default', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ id: 'off_default', is_current: true });
      })
    );
    const id = await ensureOffering(makeClient(), { lookupKey: 'default', displayName: 'Default' });
    expect(id).toBe('off_default');
    expect(patched).toEqual({ is_current: true });
  });

  it('creates offering with is_current when missing', async () => {
    let captured;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/offerings', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/offerings', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ id: 'off_new' }, { status: 201 });
      })
    );
    const id = await ensureOffering(makeClient(), { lookupKey: 'default', displayName: 'Default' });
    expect(id).toBe('off_new');
    expect(captured).toEqual({ lookup_key: 'default', display_name: 'Default', is_current: true });
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/ensure-offering.js`**

```js
export async function ensureOffering(client, { lookupKey, displayName }) {
  const list = await client.get(`/projects/${client.projectId}/offerings`);
  const existing = (list.items ?? []).find((o) => o.lookup_key === lookupKey);

  if (existing) {
    if (!existing.is_current) {
      await client.patch(
        `/projects/${client.projectId}/offerings/${existing.id}`,
        { is_current: true }
      );
    }
    return existing.id;
  }

  const created = await client.post(`/projects/${client.projectId}/offerings`, {
    lookup_key: lookupKey,
    display_name: displayName,
    is_current: true,
  });
  return created.id;
}
```

- [ ] **Step 4: Run, verify pass (3 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/ensure-offering.js test/rc/ensure-offering.test.js
git commit -m "feat(rc): idempotent default offering with is_current"
```

---

## Task 8: `ensurePackages` — 3 packages with product refs

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/ensure-packages.js`
- Test: `~/.claude/skills/rc-setup/test/rc/ensure-packages.test.js`

Package-to-product mapping for gymcrush:

| Package `lookup_key` | RC standard identifier | Product (from Task 4) |
|---|---|---|
| `$rc_monthly` | Monthly | `gymcrush_plus_monthly` |
| `$rc_three_month` | Three Month | `gymcrush_plus_3month` |
| `$rc_annual` | Annual | `gymcrush_plus_annual` |

- [ ] **Step 1: Write failing test**

`test/rc/ensure-packages.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { ensurePackages, PACKAGE_MAP } from '../../scripts/rc/ensure-packages.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('ensurePackages', () => {
  it('creates only missing packages and returns lookup_key→packageId map', async () => {
    const posts = [];
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/offerings/off_default/packages', () =>
        HttpResponse.json({
          items: [{ id: 'pkg_monthly_existing', lookup_key: '$rc_monthly' }],
        })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/offerings/off_default/packages', async ({ request }) => {
        const body = await request.json();
        posts.push(body.lookup_key);
        return HttpResponse.json({ id: `pkg_${body.lookup_key.replace('$rc_', '')}_new` }, { status: 201 });
      })
    );

    const productIdByStoreId = {
      gymcrush_plus_monthly: 'prod_m',
      gymcrush_plus_3month: 'prod_3',
      gymcrush_plus_annual: 'prod_y',
    };
    const map = await ensurePackages(makeClient(), { offeringId: 'off_default', productIdByStoreId });

    expect(map['$rc_monthly']).toBe('pkg_monthly_existing');
    expect(map['$rc_three_month']).toBe('pkg_three_month_new');
    expect(map['$rc_annual']).toBe('pkg_annual_new');
    expect(posts.sort()).toEqual(['$rc_annual', '$rc_three_month']);
  });

  it('POSTs body with lookup_key, display_name, product_id, position', async () => {
    const captured = [];
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/offerings/off_default/packages', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/offerings/off_default/packages', async ({ request }) => {
        captured.push(await request.json());
        return HttpResponse.json({ id: 'pkg_x' }, { status: 201 });
      })
    );

    await ensurePackages(makeClient(), {
      offeringId: 'off_default',
      productIdByStoreId: {
        gymcrush_plus_monthly: 'prod_m',
        gymcrush_plus_3month: 'prod_3',
        gymcrush_plus_annual: 'prod_y',
      },
    });

    expect(captured).toHaveLength(3);
    const monthly = captured.find((c) => c.lookup_key === '$rc_monthly');
    expect(monthly).toEqual({
      lookup_key: '$rc_monthly',
      display_name: 'Monthly',
      product_id: 'prod_m',
      position: 1,
    });
  });

  it('exports PACKAGE_MAP for external reference', () => {
    expect(PACKAGE_MAP).toEqual([
      { lookupKey: '$rc_monthly',     displayName: 'Monthly',     storeId: 'gymcrush_plus_monthly', position: 1 },
      { lookupKey: '$rc_three_month', displayName: 'Three Month', storeId: 'gymcrush_plus_3month',  position: 2 },
      { lookupKey: '$rc_annual',      displayName: 'Annual',      storeId: 'gymcrush_plus_annual',  position: 3 },
    ]);
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/ensure-packages.js`**

```js
export const PACKAGE_MAP = [
  { lookupKey: '$rc_monthly',     displayName: 'Monthly',     storeId: 'gymcrush_plus_monthly', position: 1 },
  { lookupKey: '$rc_three_month', displayName: 'Three Month', storeId: 'gymcrush_plus_3month',  position: 2 },
  { lookupKey: '$rc_annual',      displayName: 'Annual',      storeId: 'gymcrush_plus_annual',  position: 3 },
];

export async function ensurePackages(client, { offeringId, productIdByStoreId }) {
  const list = await client.get(
    `/projects/${client.projectId}/offerings/${offeringId}/packages`
  );
  const existingByLookupKey = new Map();
  for (const p of list.items ?? []) {
    existingByLookupKey.set(p.lookup_key, p.id);
  }

  const result = {};
  for (const pkg of PACKAGE_MAP) {
    if (existingByLookupKey.has(pkg.lookupKey)) {
      result[pkg.lookupKey] = existingByLookupKey.get(pkg.lookupKey);
      continue;
    }
    const productId = productIdByStoreId[pkg.storeId];
    if (!productId) {
      throw new Error(`ensurePackages: no RC product id for ${pkg.storeId}`);
    }
    const created = await client.post(
      `/projects/${client.projectId}/offerings/${offeringId}/packages`,
      {
        lookup_key: pkg.lookupKey,
        display_name: pkg.displayName,
        product_id: productId,
        position: pkg.position,
      }
    );
    result[pkg.lookupKey] = created.id;
  }
  return result;
}
```

- [ ] **Step 4: Run, verify pass (3 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/ensure-packages.js test/rc/ensure-packages.test.js
git commit -m "feat(rc): idempotent 3 packages with product refs"
```

---

## Task 9: `setWebhook` — placeholder URL + bearer auth

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/set-webhook.js`
- Test: `~/.claude/skills/rc-setup/test/rc/set-webhook.test.js`

Creates or updates the RC webhook. Plan 2 sets a placeholder URL that Plan 3 patches once the Supabase edge function is deployed. The authorization header is a shared secret — generated if not present in env.

- [ ] **Step 1: Write failing test**

`test/rc/set-webhook.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../setup.js';
import { RcClient } from '../../scripts/rc/client.js';
import { ensureWebhook } from '../../scripts/rc/set-webhook.js';

function makeClient() {
  return new RcClient({ apiKey: 'sk_test', projectId: 'proj_abc' });
}

describe('ensureWebhook', () => {
  it('creates webhook when none exists, returns webhookId + authToken', async () => {
    let captured;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/webhooks', () =>
        HttpResponse.json({ items: [] })
      ),
      http.post('https://api.revenuecat.com/v2/projects/proj_abc/webhooks', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ id: 'wh_new' }, { status: 201 });
      })
    );

    const result = await ensureWebhook(makeClient(), {
      url: 'https://placeholder.example/revenuecat',
      authToken: 'shared_secret_abc',
    });

    expect(result).toEqual({ webhookId: 'wh_new', authToken: 'shared_secret_abc', created: true });
    expect(captured.url).toBe('https://placeholder.example/revenuecat');
    expect(captured.authorization_header).toBe('Bearer shared_secret_abc');
  });

  it('updates existing webhook when URL or auth token differ', async () => {
    let patched;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/webhooks', () =>
        HttpResponse.json({
          items: [{
            id: 'wh_existing',
            url: 'https://old.example/hook',
            authorization_header: 'Bearer old_token',
          }],
        })
      ),
      http.patch('https://api.revenuecat.com/v2/projects/proj_abc/webhooks/wh_existing', async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ id: 'wh_existing' });
      })
    );

    const result = await ensureWebhook(makeClient(), {
      url: 'https://placeholder.example/revenuecat',
      authToken: 'shared_secret_abc',
    });

    expect(result).toEqual({ webhookId: 'wh_existing', authToken: 'shared_secret_abc', created: false });
    expect(patched).toEqual({
      url: 'https://placeholder.example/revenuecat',
      authorization_header: 'Bearer shared_secret_abc',
    });
  });

  it('skips PATCH when existing webhook already matches', async () => {
    let patched = false;
    server.use(
      http.get('https://api.revenuecat.com/v2/projects/proj_abc/webhooks', () =>
        HttpResponse.json({
          items: [{
            id: 'wh_existing',
            url: 'https://placeholder.example/revenuecat',
            authorization_header: 'Bearer shared_secret_abc',
          }],
        })
      ),
      http.patch('https://api.revenuecat.com/v2/projects/proj_abc/webhooks/wh_existing', () => {
        patched = true;
        return HttpResponse.json({ id: 'wh_existing' });
      })
    );

    const result = await ensureWebhook(makeClient(), {
      url: 'https://placeholder.example/revenuecat',
      authToken: 'shared_secret_abc',
    });

    expect(result.webhookId).toBe('wh_existing');
    expect(patched).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fails**

- [ ] **Step 3: Implement `scripts/rc/set-webhook.js`**

```js
export async function ensureWebhook(client, { url, authToken }) {
  const list = await client.get(`/projects/${client.projectId}/webhooks`);
  const existing = (list.items ?? []).find((w) => w.url === url || w.id);

  const desiredAuthHeader = `Bearer ${authToken}`;

  if (existing) {
    if (existing.url === url && existing.authorization_header === desiredAuthHeader) {
      return { webhookId: existing.id, authToken, created: false };
    }
    await client.patch(
      `/projects/${client.projectId}/webhooks/${existing.id}`,
      { url, authorization_header: desiredAuthHeader }
    );
    return { webhookId: existing.id, authToken, created: false };
  }

  const created = await client.post(`/projects/${client.projectId}/webhooks`, {
    url,
    authorization_header: desiredAuthHeader,
  });
  return { webhookId: created.id, authToken, created: true };
}
```

- [ ] **Step 4: Run, verify pass (3 tests)**

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/set-webhook.js test/rc/set-webhook.test.js
git commit -m "feat(rc): idempotent webhook with bearer authorization"
```

---

## Task 10: Phase-2 orchestrator (`scripts/rc/run.js`)

**Files:**
- Create: `~/.claude/skills/rc-setup/scripts/rc/run.js`
- Modify: `~/.claude/skills/rc-setup/bin/rc-setup.js`

No unit test; acceptance test is manual in Task 12.

- [ ] **Step 1: Implement orchestrator**

`scripts/rc/run.js`:

```js
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { loadProjectEnv, requireRcEnv, requireAscEnv } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { RcClient } from './client.js';
import { ensureIosApp } from './ensure-app.js';
import { uploadIapKey } from './upload-iap-key.js';
import { ensureProducts } from './ensure-products.js';
import { ensureEntitlement } from './ensure-entitlement.js';
import { attachProductsToEntitlement } from './attach-products.js';
import { ensureOffering } from './ensure-offering.js';
import { ensurePackages } from './ensure-packages.js';
import { ensureWebhook } from './set-webhook.js';
import { GYMCRUSH_CATALOG } from '../asc/create-subscriptions.js';

const PLACEHOLDER_WEBHOOK_URL = 'https://placeholder.example/revenuecat-webhook-pending-plan-3';

export async function run() {
  const projectDir = process.cwd();
  const env = loadProjectEnv(projectDir);
  const rcCfg = requireRcEnv(env);
  const ascCfg = requireAscEnv(env); // need bundle_id; may also have iap key info
  const client = new RcClient(rcCfg);

  log.step('Phase 2: RevenueCat');

  log.info('Verifying RC credentials + project access...');
  await client.get(`/projects/${rcCfg.projectId}`);
  log.ok(`RC project ${rcCfg.projectId} accessible`);

  log.info('Ensuring iOS app in RC project...');
  const { appId, publicKey } = await ensureIosApp(client, {
    bundleId: ascCfg.bundleId,
    name: 'GymCrush iOS',
  });
  log.ok(`iOS app ${appId} (public key: ${publicKey})`);

  log.info('Uploading ASC IAP key to RC...');
  const iap = await uploadIapKey(client, {
    appId,
    keyId: env.ASC_IAP_KEY_ID ?? '',
    issuerId: ascCfg.issuerId,
    keyPath: env.ASC_IAP_KEY_PATH ?? '',
  });
  if (iap.uploaded) {
    log.ok('IAP key uploaded, RC will sync products from ASC');
  } else {
    log.warn(`IAP key not uploaded (reason: ${iap.reason}). RC products created but will not sync to ASC until upload.`);
  }

  log.info('Ensuring products...');
  const productIdByStoreId = await ensureProducts(client, { appId, catalog: GYMCRUSH_CATALOG });
  for (const [storeId, prodId] of Object.entries(productIdByStoreId)) log.ok(`${storeId} → ${prodId}`);

  log.info('Ensuring entitlement "plus"...');
  const entitlementId = await ensureEntitlement(client, { lookupKey: 'plus', displayName: 'GymCrush Plus' });
  log.ok(`entitlement ${entitlementId}`);

  log.info('Attaching products to entitlement...');
  const attach = await attachProductsToEntitlement(client, {
    entitlementId,
    productIds: Object.values(productIdByStoreId),
  });
  log.ok(`attached ${attach.attached.length}, skipped ${attach.skipped.length}`);

  log.info('Ensuring offering "default"...');
  const offeringId = await ensureOffering(client, { lookupKey: 'default', displayName: 'Default' });
  log.ok(`offering ${offeringId}`);

  log.info('Ensuring packages...');
  const packageIds = await ensurePackages(client, { offeringId, productIdByStoreId });
  for (const [lookupKey, pkgId] of Object.entries(packageIds)) log.ok(`${lookupKey} → ${pkgId}`);

  log.info('Ensuring webhook (placeholder URL; Plan 3 will patch with Supabase fn URL)...');
  const webhookAuth = env.RC_WEBHOOK_AUTH || crypto.randomBytes(32).toString('hex');
  const wh = await ensureWebhook(client, { url: PLACEHOLDER_WEBHOOK_URL, authToken: webhookAuth });
  log.ok(`webhook ${wh.webhookId} (${wh.created ? 'created' : 'updated'})`);

  const envPath = path.join(projectDir, '.env');
  appendEnvOnce(envPath, 'RC_IOS_PUBLIC_KEY', publicKey);
  appendEnvOnce(envPath, 'EXPO_PUBLIC_RC_IOS_KEY', publicKey);
  appendEnvOnce(envPath, 'RC_WEBHOOK_ID', wh.webhookId);
  appendEnvOnce(envPath, 'RC_WEBHOOK_AUTH', webhookAuth);

  log.step('Phase 2 complete.');
  console.log(`
.env updated:
  RC_IOS_PUBLIC_KEY=${publicKey}
  EXPO_PUBLIC_RC_IOS_KEY=${publicKey}
  RC_WEBHOOK_AUTH=${webhookAuth.slice(0, 8)}...

Next: run "rc-setup webhook" (Plan 3) after deploying the Supabase edge function.
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

- [ ] **Step 2: Wire `rc` phase into `bin/rc-setup.js`**

Replace `bin/rc-setup.js` contents with:

```js
#!/usr/bin/env node
import { run as runAsc } from '../scripts/asc/run.js';
import { run as runRc } from '../scripts/rc/run.js';

const [phase] = process.argv.slice(2);

const phases = {
  asc: runAsc,
  rc: runRc,
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
node -e "import('./scripts/rc/run.js').then(m => console.log('rc orchestrator imports OK, exports:', Object.keys(m)))"
node bin/rc-setup.js 2>&1 | head -3
```
Expected: `rc orchestrator imports OK, exports: [ 'run' ]` and `Usage: rc-setup <phase>\nPhases: asc, rc`.

- [ ] **Step 4: Full test suite still passes**

```bash
npm test
```
Expected: 35 + 17 new tests = 52 total, all green.

- [ ] **Step 5: Commit**

```bash
git add scripts/rc/run.js bin/rc-setup.js
git commit -m "feat(rc): phase-2 orchestrator wires all ensure* + exposes /rc-setup rc"
```

---

## Task 11: Update SKILL.md Phase 2 status

**Files:**
- Modify: `~/.claude/skills/rc-setup/SKILL.md`

- [ ] **Step 1: Update phase checklist**

In `SKILL.md`, update the status table and commands block:

Replace:
```markdown
## Status

- [x] Phase 1 — ASC (this plan)
- [ ] Phase 2 — RC
...
```

With:
```markdown
## Status

- [x] Phase 1 — ASC
- [x] Phase 2 — RC (Plan 2)
- [ ] Phase 3 — Supabase webhook
- [ ] Phase 4 — App scaffolding
- [ ] Phase 5 — Play (stub)
- [ ] Phase 6 — verify

## Preconditions (Phase 2)

Target project `.env` must contain (in addition to Phase 1):

- `RC_API_KEY_V2` (from RC Dashboard → profile → API keys, project-write scope)
- `RC_PROJECT_ID` (from RC dashboard URL)

Optional — only needed for the ASC↔RC linking step:
- `ASC_IAP_KEY_ID`, `ASC_IAP_KEY_PATH` (Phase 1 produces these; if absent, Phase 2 completes RC-side work with a warning and no sync)
```

Add to Commands table:
```markdown
| `node ~/.claude/skills/rc-setup/bin/rc-setup.js rc` | Run RC phase against the project |
```

- [ ] **Step 2: Commit**

```bash
git add SKILL.md
git commit -m "docs(skill): mark Phase 2 complete; document RC preconditions"
```

---

## Task 12: Manual acceptance test against real RC project

This task runs against the real gymcrush RC project `proj7b897d04`. Unlike the ASC phase, RC lets you delete resources from the dashboard without any "Removed from Sale" state to worry about — so you can recover easily if something misbehaves.

**Preconditions:**

- gymcrush `~/dev/gymcrush/.env` contains:
  - `RC_API_KEY_V2=sk_...` (real project-write key)
  - `RC_PROJECT_ID=proj7b897d04`
  - `ASC_ISSUER_ID=...` (required for multipart upload even when .p8 absent, because requireAscEnv enforces it)
  - `ASC_BUNDLE_ID=com.gymcrushdating.app`
  - Other ASC_* keys (required by requireAscEnv; the values need to exist in env but the file at ASC_KEY_PATH does NOT need to be valid for Phase 2)
- The IAP `.p8` may or may not exist — Phase 2 handles both paths.

- [ ] **Step 1: Verify RC credentials**

```bash
cd ~/dev/gymcrush
node -e "
const env = (await import('/Users/chrischidgey/.claude/skills/rc-setup/scripts/lib/env.js')).loadProjectEnv(process.cwd());
const cfg = (await import('/Users/chrischidgey/.claude/skills/rc-setup/scripts/lib/env.js')).requireRcEnv(env);
const { RcClient } = await import('/Users/chrischidgey/.claude/skills/rc-setup/scripts/rc/client.js');
const c = new RcClient(cfg);
const proj = await c.get('/projects/' + cfg.projectId);
console.log('OK — project:', proj.name ?? proj.id);
"
```

Expected: prints `OK — project: gymcrush` (or whatever you named it). If 401: API key wrong or wrong scope. If 404: `RC_PROJECT_ID` wrong.

- [ ] **Step 2: Run Phase 2**

```bash
cd ~/dev/gymcrush
node ~/.claude/skills/rc-setup/bin/rc-setup.js rc
```

Expected output (abbreviated, values will differ):

```
▸ Phase 2: RevenueCat
  › Verifying RC credentials + project access...
  ✓ RC project proj7b897d04 accessible
  › Ensuring iOS app in RC project...
  ✓ iOS app <app_id> (public key: appl_xxx)
  › Uploading ASC IAP key to RC...
  ! IAP key not uploaded (reason: missing-env). RC products created but will not sync to ASC until upload.
  › Ensuring products...
  ✓ gymcrush_plus_monthly → <prod_id>
  ✓ gymcrush_plus_3month → <prod_id>
  ✓ gymcrush_plus_annual → <prod_id>
  › Ensuring entitlement "plus"...
  ✓ entitlement <ent_id>
  › Attaching products to entitlement...
  ✓ attached 3, skipped 0
  › Ensuring offering "default"...
  ✓ offering <off_id>
  › Ensuring packages...
  ✓ $rc_monthly → <pkg_id>
  ✓ $rc_three_month → <pkg_id>
  ✓ $rc_annual → <pkg_id>
  › Ensuring webhook (placeholder URL; Plan 3 will patch with Supabase fn URL)...
  ✓ webhook <wh_id> (created)
▸ Phase 2 complete.
```

- [ ] **Step 3: Verify in RC dashboard (`app.revenuecat.com/projects/proj7b897d04`)**

Confirm each of the following appears:

- [ ] iOS app with bundle_id `com.gymcrushdating.app` under Apps/Platforms
- [ ] Products list shows `gymcrush_plus_monthly`, `gymcrush_plus_3month`, `gymcrush_plus_annual`
- [ ] Entitlements shows `plus` with 3 products attached
- [ ] Offerings shows `default` marked "Current" with 3 packages (`$rc_monthly`, `$rc_three_month`, `$rc_annual`)
- [ ] Each package has the correct product attached
- [ ] Integrations → Webhooks shows one webhook pointing at `https://placeholder.example/revenuecat-webhook-pending-plan-3` with `Bearer ...` auth header

- [ ] **Step 4: Verify `.env` was updated**

```bash
grep -E '^(RC_IOS_PUBLIC_KEY|EXPO_PUBLIC_RC_IOS_KEY|RC_WEBHOOK_ID|RC_WEBHOOK_AUTH)=' ~/dev/gymcrush/.env
```

Expected: all four lines present, single entry per key.

- [ ] **Step 5: Re-run to confirm idempotency**

```bash
cd ~/dev/gymcrush
node ~/.claude/skills/rc-setup/bin/rc-setup.js rc
```

Expected: same output; every step shows `skipped` for already-existing state, no duplicate products/packages created. `.env` is not duplicated.

- [ ] **Step 6: If IAP `.p8` is available (Phase 1 Task 14 complete), re-run to pick up the upload**

```bash
cd ~/dev/gymcrush
node ~/.claude/skills/rc-setup/bin/rc-setup.js rc
```

The IAP upload step should now show `✓ IAP key uploaded, RC will sync products from ASC` instead of the warning. Verify in RC dashboard → App Store Connect API Key is now present.

- [ ] **Step 7: Commit the successful smoke-test state (skill repo)**

```bash
cd ~/.claude/skills/rc-setup
git add -A && git commit -m "chore: Plan 2 acceptance test passed against proj7b897d04" --allow-empty
```

---

## Spec coverage check

| Spec requirement (Phase 2) | Task |
|---|---|
| Verify RC credentials | Task 10 orchestrator + Task 12 Step 1 |
| Create iOS app in project (bundle id, app_store type) | Task 2 |
| Capture app_id + public SDK key → `.env` as RC_IOS_PUBLIC_KEY / EXPO_PUBLIC_RC_IOS_KEY | Task 2 + Task 10 `appendEnvOnce` |
| Upload ASC IAP .p8 (multipart) | Task 3 |
| Wait for product import or explicit POST (we chose explicit POST — more reliable) | Task 4 |
| Create `plus` entitlement | Task 5 |
| Attach products to `plus` | Task 6 |
| Create `default` offering with is_current=true | Task 7 |
| Create 3 packages (`$rc_monthly`, `$rc_three_month`, `$rc_annual`) with product refs | Task 8 |
| Webhook placeholder with auth | Task 9 |
| Persist RC_WEBHOOK_ID + RC_WEBHOOK_AUTH to .env (Plan 3 PATCHes by ID) | Task 10 |
| Idempotency — safe to re-run | Every ensure* uses GET-before-POST; Task 12 Step 5 verifies |

---

## Deferred to later plans

- Real webhook URL (Plan 3 replaces the placeholder after Supabase deploy)
- Product/entitlement/offering deletion — out of scope; user deletes via RC dashboard if needed
- Multi-platform (Android) packaging — Plan 5 (Play stub)
- Per-project catalog config — currently imports `GYMCRUSH_CATALOG` from Plan 1. When we generalize for other apps, this will move to `rc-setup.config.json`.
