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
  - [ ] Add RevenueCat SDK + configure iOS app in RevenueCat
  - [ ] Create IAP/subscription products in App Store Connect and sync to RevenueCat
  - [ ] Define entitlements + offerings
  - [ ] Implement purchase flow + restore purchases + entitlement gating

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
  - [x] Apple OAuth: native Sign in with Apple via `expo-apple-authentication` + Supabase `signInWithIdToken`
  - [ ] Google OAuth: currently stubbed (“Coming soon”) — requires Google Cloud OAuth client setup
  - [x] If offering any third‑party sign-in, ensure Apple Sign‑In is offered too (App Store guideline)

- [x] **Account deletion (App Store requirement for account-based apps)**
  - [x] In-app delete account flow (two-step confirmation in ProfileView)
  - [x] Backend delete/anonymize strategy (`supabase/functions/delete-account` — deletes all user data, storage, and auth record)

- [ ] **UGC safety: report/block + moderation**
  - [ ] Verify report/block works end-to-end
  - [ ] Decide moderation approach (manual vs automated) and implement accordingly

---

## High priority (strongly recommended for v1)

- [ ] **Remove debug info from UI** — `app/(auth)/login.tsx`
  - [ ] `supabaseUrl` is currently rendered on the login screen (remove for production)

- [ ] **Versioning sanity**
  - [ ] Align app versioning + iOS build number for TestFlight/App Store
  - [ ] Confirm EAS production profile has correct env vars for prod services

- [ ] **Notifications end-to-end**
  - [ ] Permission prompts + token registration
  - [ ] Deep link routing from notification tap (foreground/background/cold start)

- [ ] **Rate limiting / abuse protection**
  - [ ] Signup/login throttling
  - [ ] Messaging/likes throttling

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
- [ ] `paywall_viewed`, `purchase_started`, `purchase_success`, `purchase_failed`, `restore_started`, `restore_success`
- [x] `report_submitted`, `block_user`

---

## “Facebook pixel id” / Meta tracking

- [ ] **Decide which tracking you need**
  - [ ] Web landing site: Meta Pixel (pixel id) belongs on web, not iOS
  - [ ] iOS attribution: integrate Meta SDK + App Events (and ATT prompt if needed)

---

## Existing app stubs / incomplete pieces (from prior audit)

- [ ] **bracelet_status** — `components/profile/ProfileView.tsx`
  - Add `bracelet_status` field to database and persist (currently local state only).

- [ ] **CrushSignalButton** — `components/discover/CrushSignalButton.tsx`
  - Wire onPress, disabled state, and cooldown timer (appStore.checkCrushAvailability, recordCrushSignal).

- [ ] **ProfileCard** — `components/profile/ProfileCard.tsx`
  - Still a stub (renders `display_name` only). Implement only if you actually need this component; discover uses **SwipeDeck**.

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
