# TODO audit — remaining work

Single prioritized list of genuine TODOs after audit. Work down in order; remove or update items as you complete them.

---

## High

- [ ] **Apple OAuth** — `app/(auth)/login.tsx`  
  Implement Apple Sign-In. Required for iOS App Store if you offer Apple Sign-In.

- [ ] **Google OAuth** — `app/(auth)/login.tsx`  
  Implement Google Sign-In if you offer it.

---

## Medium

- [ ] **bracelet_status** — `components/profile/ProfileView.tsx`  
  Add `bracelet_status` field to database and persist (currently local state only).

- [x] **DiscoveryPreferences selectedGym** — `components/discover/DiscoveryPreferences.tsx`  
  When preferences are loaded, `selectedGym` is stored as a gym ID; the UI needs the full Gym (name, address) to show "Your gym: Gold's Gym". Fetch gym by ID (e.g. `useGymById(loadedPrefs.selectedGym)`) and call `setSelectedGym(gym)` so the selected-gym block displays when reopening the modal.

- [ ] **Sentry** — `config/sentry.ts`  
  Initialize Sentry with full production config (release tracking, etc.).

- [ ] **Mixpanel** — `config/mixpanel.ts`  
  Ensure Mixpanel is initialized on app start and wired in `app/_layout.tsx` if needed.

---

## Low

- [ ] **CrushSignalButton** — `components/discover/CrushSignalButton.tsx`  
  Wire onPress, disabled state, and cooldown timer (appStore.checkCrushAvailability, recordCrushSignal).

- [x] **GymSearchInput** — `components/onboarding/GymSearchInput.tsx`  
  Currently a stub (Input + local query state only). Add debouncing (e.g. 300ms), wire `useSearchGyms(query)`, and show a dropdown of results; on select, call `onSelectGym(gym)` and optionally show selected gym chip.

- [ ] **ProfileCard** — `components/profile/ProfileCard.tsx`  
  Not done: still a stub (only renders `display_name`). No PhotoCarousel, overlay, FitnessBadges, ApproachBadge, or bio. Implement full card if you need this component elsewhere; currently the app uses SwipeDeck for discover cards.

---

## Optional (edge functions / polish)

- [ ] **moderate-image** — `supabase/functions/moderate-image/index.ts`  
  Implement image moderation in edge function.

- [ ] **check-match** — `supabase/functions/check-match/index.ts`  
  Optional. Your DB trigger already creates a match when mutual likes exist. This edge function would be an explicit API: given `from_user_id` and `to_user_id`, check for mutual like and create match if missing, then return the match. Only implement if you need that from the client or another service (e.g. immediate response without waiting for the trigger).

- [ ] **handle-crush-signal** — `supabase/functions/handle-crush-signal/index.ts`  
  Implement crush signal handler in edge function.

---

## Obsolete / skip

- **SwipeCard** — `components/discover/SwipeCard.tsx` is unused; discover uses **SwipeDeck** instead. No need to implement SwipeCard unless you want a separate reusable card component. Consider removing the file or leaving as a stub.
