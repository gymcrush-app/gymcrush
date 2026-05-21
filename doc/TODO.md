# v1 iOS App Store release — knockdown list

Single prioritized list. Work top-to-bottom; delete items as they’re completed. Add **Owner** + **Target date** as you go.

---

## Ship blockers (must be done before submission)

- [x] **RLS audit + hardening + drift cleanup (Supabase)** — full audit run 2026-05-20; migrations 00041 (RLS hardening — findings #1/#3/#4/#5/#9/#10), 00042 (finding #2 — last_location lockdown via new `discover_profiles` RPC + column-level REVOKE + `PROFILE_COLUMNS` client constant), and 00043 (Vault-backed `notify_match_created` trigger replacing the Studio webhook) applied to remote 2026-05-21 via `supabase db push`. Vault secret `service_role_key` seeded (219-char JWT). Post-push synthetic match-insert test confirmed 1 trigger / 1 invocation / 1 push.
  - [ ] **App smoke tests in preview build** (the heavier RLS/distance changes weren't exercised pre-push — run these against the live preview build now that remote has all three migrations):
    - Discover feed loads, cards show distance text, distance filter trims correctly
    - Tap into a profile (uses `get_profile_by_id`) — renders without errors
    - Gym Crush Mode toggle — same-gym candidates appear with distance
    - Gym Gems screen renders — no `last_location` in network payload
    - Block another user from discover → confirm they vanish from feed + can no longer message/like
    - Recipient marks a message read → tick changes; sender's `content` cannot be tampered with
    - Onboarding a brand-new account end-to-end (profile insert + first match if applicable)
    - Negative probe (Studio SQL): `select last_location from profiles where id <> auth.uid() limit 1` from any non-service role should 403
  - [x] **Playground stub cleanup + typegen done** (2026-05-22) — `last_location` / `last_location_updated_at` removed from `playground/swiper.tsx` + `modals.tsx`; `types/database.ts` regenerated against remote schema.
  - [ ] **CLIENT (likely already done — confirm at meeting):** `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` in Google Cloud Console is restricted to iOS bundle ID `com.gymcrushdating.app` + Places API only. Bundled client-side, so without restrictions anyone with the app bundle can use it for arbitrary Places billing.

- [ ] **RevenueCat integration (IAP / subscriptions)**
  - [x] Add RevenueCat SDK + configure iOS app in RevenueCat
  - [x] Create IAP/subscription products in App Store Connect and sync to RevenueCat
  - [x] Define entitlements + offerings
  - [x] Implement purchase flow + restore purchases + entitlement gating
  - [ ] **BLOCKED ON APPLE (24h verification window):** Client meeting 2026-05-21 — Paid Apps agreement signed, tax forms + banking info submitted. Apple now verifying bank account (says ~24 hours). Once status shows **Active** in ASC → Business → Agreements, RC offerings should populate. Then re-verify in this order:
    - [ ] Confirm **In-App Purchase** capability is checked on the App ID (developer.apple.com → Identifiers → `com.gymcrushdating.app`)
    - [ ] Each IAP/subscription product shows **"Ready to Submit"** in ASC (not "Missing Metadata")
    - [ ] RC dashboard Bundle ID + product Store Identifiers exactly match ASC
    - [ ] Run RC SDK locally (or in preview build) — offerings should resolve, `CONFIGURATION_ERROR` gone
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

- [x] **Domain decision locked: `gymcrush.com`** (NOT `gymcrushdating.com`). iOS bundle ID `com.gymcrushdating.app` stays as-is — it's an immutable ASC/RC identifier, not user-visible.
  - [x] `MARKETING_SITE_URL` in `app/(tabs)/profile/settings.tsx` removed (was unused after wiring per-page URLs)
  - [x] `TERMS_URL` + `PRIVACY_URL` in `components/discover/OfferWallModal.tsx` → `gymcrush.com`
  - [x] Grep audit clean (`git grep -n gymcrushdating.com -- ':!docs/superpowers/' ':!doc/TODO.md'` returns zero)

- [ ] **Settings polish — replace placeholder URLs and stub support flow**
  - Settings screen now ships with Privacy Policy / Terms / Cookie Policy / Community Guidelines / Help & Support / Rate.
  - [x] Privacy Policy → `https://gymcrush.com/privacy` (live)
  - [x] Terms of Service → `https://gymcrush.com/terms` (live)
  - [x] Cookie Policy → `https://gymcrush.com/cookie-policy` (live; added new row in settings)
  - [ ] **CLIENT:** publish `https://gymcrush.com/community-guidelines` (constant wired, page not yet live — required for App Review on UGC/dating apps)
  - [x] Help & Support → `mailto:support@gymcrush.com` (subject prefilled). Inbox must exist before submission.
  - [ ] **CLIENT:** confirm `support@gymcrush.com` inbox is monitored (or swap to a different address)
  - [ ] Verify `APP_STORE_ID` (`6762858426`) and `ANDROID_PACKAGE` constants once the app is live in stores so Rate links open the correct review sheets

- [x] **Versioning + EAS production config** (2026-05-21)
  - [x] `app.json` version bumped `0.1.0` → `1.0.0`
  - [x] iOS build number — `autoIncrement: true` in `eas.json` production profile, EAS Cloud manages it
  - [x] All six `EXPO_PUBLIC_*` vars confirmed set in EAS production: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN`, `MIXPANEL_TOKEN`, `GOOGLE_PLACES_API_KEY`, `RC_IOS_KEY`. `SENTRY_AUTH_TOKEN` also set (build-time sourcemap upload).

- [x] **Notifications end-to-end**
  - [x] Permission prompts + token registration (useNotifications hook)
  - [x] Deep link routing from notification tap (foreground/background/cold start)
  - [x] Match notifications (DB trigger → edge function → Expo push)
  - [x] Message notifications — match chat (shows sender name + preview) and message requests (anonymous)
  - [x] Foreground query invalidation (messages, conversations, matches refresh on notification)

- [ ] **Rate limiting / abuse protection** _(may tie to paid tier — revisit after RevenueCat)_
  - [ ] Signup/login throttling (Supabase built-in covers basics)
  - [ ] Messaging/likes throttling

- [ ] **Supabase custom SMTP (Resend) — BLOCKED ON CLIENT (DNS at Namecheap)**
  - Client meeting 2026-05-21 — DNS records for `gymcrush.com` (SPF / DKIM / DMARC) being added in Namecheap to verify domain in Resend. Once Resend shows the domain as **Verified**:
  - [ ] Configure Supabase Dashboard → Authentication → Emails → SMTP Settings → Enable Custom SMTP with:
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
  - [x] **DEPLOYMENT (one-time):** Supabase secrets set (`FACEBOOK_PIXEL_ID=996455392805924`, `FACEBOOK_PIXEL_ACCESS_TOKEN=<token>`), edge function `meta-capi-event` deployed to remote 2026-05-21.
  - [ ] **CLIENT (verify at meeting):** in Meta Events Manager → your Pixel → **Test Events** tab, grab the `TEST...` event code, then trigger a signup in the preview build and confirm a `CompleteRegistration` event lands within ~30s with the hashed email + user_id. Once verified, no further action — events start flowing to production stats automatically.
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
