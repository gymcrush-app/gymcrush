# v1 iOS App Store release — knockdown list

Single prioritized list. Work top-to-bottom; delete items as they’re completed. Add **Owner** + **Target date** as you go.

---

## Ship blockers (must be done before submission)

- [ ] **RLS review + hardening (Supabase)**
  - [ ] Verify signed-out users cannot read/write protected tables
  - [ ] Verify signed-in users cannot read/write other users’ data (profiles/messages/matches/etc.)
  - [ ] Verify storage policies (avatars/photos) prevent cross-user writes
  - [ ] Confirm no service-role keys are shipped to the client

- [ ] **RevenueCat integration (IAP / subscriptions)**
  - [x] Add RevenueCat SDK + configure iOS app in RevenueCat
  - [x] Create IAP/subscription products in App Store Connect and sync to RevenueCat
  - [x] Define entitlements + offerings
  - [x] Implement purchase flow + restore purchases + entitlement gating
  - [ ] **BLOCKED ON CLIENT (ASC):** Offerings return `CONFIGURATION_ERROR` in preview build 0.1.0+11 (Sentry GYM-CRUSH-E, 2026-04-23). RC SDK initializes fine and logIn succeeds — the failure is ASC-side. Root cause per `https://rev.cat/why-are-offerings-empty`:
    - [ ] **Client: sign Paid Applications Agreement** — ASC → Business → Agreements. Must show **Active**. Requires Account Holder login.
    - [ ] **Client: complete Tax forms + Banking info** — agreement stays inactive without these, even if signed.
    - [ ] Verify **In-App Purchase** capability is checked on the App ID (developer.apple.com → Identifiers → `com.gymcrushdating.app`).
    - [ ] Verify each IAP product is in **"Ready to Submit"** state on ASC (not "Missing Metadata").
    - [ ] Verify RC dashboard Bundle ID + product Store Identifiers exactly match ASC.
  - [x] Paywall UI: fallback info panel when offerings fail ("Pending App Store Connect paid apps agreement and tax info") — shipped so preview builds are usable without subs.

- [x] **Sentry production setup** — `config/sentry.ts`
  - [x] Initialize Sentry on app start (DSN via env)
  - [x] Add production config (release tracking/sourcemaps/environment separation/PII scrubbing)

- [x] **Mixpanel production setup + core events** — `config/mixpanel.ts`, `lib/utils/analytics.ts`
  - [x] Initialize Mixpanel on app start
  - [x] Add `identify(userId)` after login and set core user traits
  - [x] Add minimum viable funnel events (see “Analytics events” below)

- [x] **iOS permission strings (required for image picker)**
  - [x] Add `NSPhotoLibraryUsageDescription` (image picker is used)
  - [x] Add `NSCameraUsageDescription` if camera is used now or planned
  - [ ] Add `NSUserTrackingUsageDescription` only if implementing ATT/Meta SDK tracking

- [x] **Auth UX decision: implement or remove OAuth buttons** — `app/(auth)/login.tsx`
  - [x] Apple OAuth: native Sign in with Apple via `expo-apple-authentication` + Supabase `signInWithIdToken` — verified working in preview build 0.1.0+11 (2026-04-23)
  - [x] Google OAuth: native Google Sign-In via `@react-native-google-signin/google-signin` + Supabase `signInWithIdToken` — verified working on simulator (2026-04-23). Web + iOS client IDs both configured in Supabase → Auth → Providers → Google. Note: `ios/GymCrush/Info.plist` was manually patched with the Google reversed-client URL scheme; `npx expo prebuild --clean --platform ios` will regenerate it from the plugin config — EAS cloud builds re-prebuild fresh so they already pick this up automatically.
  - [x] If offering any third‑party sign-in, ensure Apple Sign‑In is offered too (App Store guideline)

- [x] **Password reset flow (email/password accounts)** — `app/(auth)/reset-password.tsx`, `app/_layout.tsx`, `lib/stores/authStore.ts`
  - [x] "Forgot password?" on login passes `redirectTo: gymcrush://reset-password` to Supabase
  - [x] New `/reset-password` screen (password + confirm, min 8 chars, match check) calls `supabase.auth.updateUser`, then signs out and routes back to login
  - [x] `_layout.tsx` listens for `PASSWORD_RECOVERY` auth event + `inPasswordRecovery` flag in authStore overrides the normal routing guard
  - [x] Supabase → Authentication → URL Configuration → Redirect URLs includes `gymcrush://reset-password`
  - [ ] **BLOCKED on Resend SMTP** (see item below) — email delivery fails with `535 Invalid username`. Code path is complete; once SMTP is valid the flow works end-to-end.

- [x] **Account deletion (App Store requirement for account-based apps)**
  - [x] In-app delete account flow (two-step confirmation in ProfileView)
  - [x] Backend delete/anonymize strategy (`supabase/functions/delete-account` — deletes all user data, storage, and auth record)

- [x] **UGC safety: report/block + moderation**
  - [x] Report/block works end-to-end (discover + chat)
  - [x] Blocks table + migration, blocked users filtered from discover feed and chat list
  - [ ] Automated image moderation (v2 — manual review via Supabase dashboard for v1)

---

## High priority (strongly recommended for v1)

- [ ] **Review login screen footer text** — `app/(auth)/login.tsx`
  - [ ] Decide whether to keep `getAppVersionLabel()` visible or remove for production

- [ ] **Versioning + EAS production config**
  - [ ] Set v1 version string in `app.json` (currently `0.1.0`)
  - [ ] Align iOS build number for TestFlight/App Store
  - [x] Add `EXPO_PUBLIC_MIXPANEL_TOKEN` to EAS production profile env vars
  - [ ] Confirm all prod env vars are set (Supabase, Sentry, Mixpanel, Google Places)

- [x] **Notifications end-to-end**
  - [x] Permission prompts + token registration (useNotifications hook)
  - [x] Deep link routing from notification tap (foreground/background/cold start)
  - [x] Match notifications (DB trigger → edge function → Expo push)
  - [x] Message notifications — match chat (shows sender name + preview) and message requests (anonymous)
  - [x] Foreground query invalidation (messages, conversations, matches refresh on notification)

- [ ] **Rate limiting / abuse protection** _(may tie to paid tier — revisit after RevenueCat)_
  - [ ] Signup/login throttling (Supabase built-in covers basics)
  - [ ] Messaging/likes throttling

- [ ] **Supabase custom SMTP (Resend) — BLOCKED ON CLIENT**
  - Current state: password reset emails fail with `535 Invalid username` (SMTP auth rejected). Custom SMTP is partially/incorrectly configured in Supabase. Built-in Supabase email is rate-limited (~3/hr) and sends from `noreply@mail.app.supabase.io` — not acceptable for production.
  - [ ] Verify domain in Resend dashboard (DNS records: SPF, DKIM, DMARC) — e.g. `mail.gymcrush.com` or `gymcrushdating.app`
  - [ ] Client: Supabase Dashboard → Authentication → Emails → SMTP Settings → Enable Custom SMTP with:
    - Host: `smtp.resend.com`
    - Port: `465` (TLS) or `587` (STARTTLS)
    - Username: `resend`
    - Password: `RESEND_API_KEY` value from `.env` (starts with `re_`)
    - Sender email: address at the verified Resend domain
    - Sender name: `GymCrush`
  - [ ] Test: trigger password reset → email should arrive from branded sender and deep-link back into the app
  - [ ] Also review + brand these Supabase email templates: Confirm signup, Magic link, Invite, Reset password, Change email

---

## Analytics events (minimum viable)

- [x] `app_open`
- [x] `signup_started`, `signup_completed`
- [x] `login_success`, `login_failed`
- [x] `onboarding_step_completed` (include step name/index)
- [x] `profile_photo_added`, `profile_photo_removed`
- [x] `discover_swipe_like`, `discover_swipe_pass`
- [x] `match_created`
- [x] `message_sent`
- [x] `paywall_viewed`, `purchase_started`, `purchase_success`, `purchase_failed`, `restore_started`, `restore_success`
- [x] `report_submitted`, `block_user`

---

## “Facebook pixel id” / Meta tracking

- [x] **iOS attribution via Meta Conversions API (server-side)** — `supabase/functions/meta-capi-event/` edge function forwards `signup_completed` (CompleteRegistration) and `purchase_success` (Purchase) from Mixpanel `track()` to Meta CAPI. PII (email, user_id) is SHA-256 hashed in the edge function before sending. Access Token stays in Supabase secrets — never on the client. No native SDK, no ATT prompt, no rebuild required.
  - [ ] **DEPLOYMENT (one-time):** set Supabase secrets and deploy the edge function:
    ```
    supabase secrets set FACEBOOK_PIXEL_ID=996455392805924
    supabase secrets set FACEBOOK_PIXEL_ACCESS_TOKEN=<token from .env>
    supabase functions deploy meta-capi-event
    ```
  - [ ] **Verify in Meta Events Manager → Test Events:** in dev, pass `testEventCode` from Events Manager to `sendMetaCapiEvent` to see live events without affecting prod stats.
- [ ] **Web landing site: Meta Pixel (pixel id)** — drops on `gymcrush.com` (or wherever the marketing page lives). Out of scope for this repo.

---

## UI / UX polish

- [x] **Swap typography to Manrope (client-provided) — initial pass** — installed `@expo-google-fonts/manrope`, registered weights 300/400/500/600/700/800 in `lib/fonts.ts`, added `fontFamily.manrope*` tokens, and wired into `useFonts()` in `app/_layout.tsx`. Applied per client mapping: name → ExtraBold, age → Light, distance → Manrope (Regular) in `ProfileHeader`; prompt title → SemiBold, answer → ExtraBold in `PromptItem`; age & distance preference numbers → SemiBold in `DiscoveryPreferences`.
- [x] **Manrope app-wide rollout** — refactored `components/ui/Text.tsx` so `weight` prop maps to `fontFamily.manrope*` (drop synthetic `fontWeight`). Migrated `lib/styles/createStyles.ts` `textStyles` variants to use Manrope families directly. Swept ~50 files (UI primitives, chat, profile, discover, onboarding, auth) replacing `fontWeight: fontWeight.X` with `fontFamily: fontFamily.manropeY`. Inline overrides in paywall fallback panel, CensoredPreview, and CrushUnlockedOverlay also migrated. Expo template scaffolds (`+not-found.tsx`, `modal.tsx`) intentionally left alone.

- [x] **Add race to profile and info box**
- [x] **Add icons to info items**
- [x] ~~**Fix card stretching and overlap layout**~~ — obsoleted by Discover card redesign (2026-04-26).
- [x] **Change background on prompt Q/A**
  - Note: discover card already has a `card` background so prompt boxes blend in there; on profile views the page background is black so the `card`-colored prompt boxes are distinct. May revisit discover card prompt styling later.
- [x] **Add GC logo to slider**
- [ ] ~~**Add flick-to-swipe-away UX**~~ — obsoleted by Hinge-style FAB redesign (swipe gestures removed in favor of tap-to-act action bar)
- [x] **Haptics on FAB button tap (Discover)** — light impact on X/Gem, medium impact on Heart via `expo-haptics`, fired in `DiscoverActionBar` on press.
- [x] **Button-tap feedback animation (Discover FAB)** — spring scale (0.88 → 1) + glow ring overlay on Heart/Gem/X tap for the "endorphin hit" moment. Each FAB has its own glow color (heart=primary, gem=blue, X=red).
- [ ] **Keyboard-driven actions for accessibility (Discover)** — wire hardware keyboard shortcuts (e.g. ←/→/↑) to X/Heart/Gem for external-keyboard users. Not currently an app-wide pattern; deferred until broader a11y pass.
- [ ] **Confirm with client: does a Gym Gem count as a like?** — Currently the Discover Gem FAB sends a gym gem via `useGiveGymGem` with no match-check. If gems should also match people (like a "super-like"), we'd need to either (a) also insert a like row server-side when a gem is given, or (b) trigger `useCheckMatch` on gem send. If client confirms gems should trigger matches, wire a MatchModal path through `handleSendGemMessage` in `app/(tabs)/discover.tsx`.

---

## Existing app stubs / incomplete pieces (from prior audit)

- [ ] **bracelet_status** — `components/profile/ProfileView.tsx`
  - Add `bracelet_status` field to database and persist (currently local state only).

- [x] ~~**CrushSignalButton**~~ — superseded by Gem FAB in `DiscoverActionBar`, deleted.

- [ ] **ProfileCard** — `components/profile/ProfileCard.tsx`
  - Still a stub (renders `display_name` only). Implement only if you actually need this component; discover uses **ProfileView** (`components/discover/ProfileView`).

---

## Optional (edge functions / polish)

- [ ] **moderate-image** — `supabase/functions/moderate-image/index.ts`
  - Implement image moderation edge function (only if you’re enforcing automated moderation).

- [ ] **check-match** — `supabase/functions/check-match/index.ts`
  - Optional. DB trigger already creates a match when mutual likes exist.

- [ ] **handle-crush-signal** — `supabase/functions/handle-crush-signal/index.ts`
  - Implement crush signal handler edge function (if needed for server-side enforcement).

---

## Obsolete / skip

- **SwipeCard** — `components/discover/SwipeCard.tsx` is unused; discover uses **SwipeDeck** instead.
