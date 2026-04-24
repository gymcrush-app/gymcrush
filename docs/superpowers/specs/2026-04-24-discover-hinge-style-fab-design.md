# Discover — Hinge-style FAB redesign — Design

**Date:** 2026-04-24
**Status:** Approved for planning
**Target screens:** `app/(tabs)/discover.tsx`, `components/discover/SwipeDeck/*`
**Related:** supersedes "flick-to-swipe-away" item in `doc/TODO.md` UI/UX polish

---

## Purpose

Replace the current Tinder-style stacked-card swipe UX with a Hinge-style single-profile-with-floating-action-bar UX.

Drivers:
- Swipe-up-to-crush and swipe-down-to-skip gestures conflict with the vertical profile-scroll gesture users instinctively reach for. The two-gesture-overload is a source of friction and accidental actions.
- The stacked "back card peek" adds visual noise and render cost without helping the user make a decision.
- A dedicated action bar gives each action (X / Gem / Heart) a persistent, discoverable target and frees vertical-scroll for what users actually want — reading the profile top-to-bottom.

---

## Scope

**In scope:**
- Remove pan-based swipe gestures (up = crush, down = skip) from discover.
- Remove stacked-card rendering in favor of single-profile view.
- Add `DiscoverActionBar` component — three floating action buttons (X / Gem / Heart) with gradient+blur backdrop, always visible above the tab bar.
- Scroll-driven intensification of the action bar (gradient, blur, button brightness) as the user scrolls into the profile.
- Optimistic transition animation on X/Heart/Gem tap (fade + upward slide, 220ms).
- Simplified post-like match-check flow (no prefetch; always check post-mutation for correctness).
- Truncate tooltip walkthrough from 5 steps to 3 (remove swipe-down/swipe-up steps).
- Delete obsolete components: `SwipeCard.tsx`, `SwipeDeck/SwipeIndicator.tsx`, `CrushSignalButton.tsx`.
- Delete `DISCOVER_SWIPE_DOWN_PASS_DONE` storage key and associated plumbing.

**Explicitly out of scope** (tracked as follow-ups in `doc/TODO.md` UI/UX polish):
- Haptic feedback on button taps.
- Ripple / particle animation on button tap.
- Keyboard-driven actions for accessibility.

**Also out of scope** (firm non-goals):
- Platform-conventional button positioning (iOS left-primary vs Android right-primary). Keep consistent across platforms.
- Renaming analytics event names (`discover_swipe_like` / `discover_swipe_pass` stay as-is for historical continuity).
- Changes to photo carousel, pinch-to-zoom, `MessageBottomSheet`, `ProfileDetailSheet`, filters header, skipped-profiles revisit flow, match modal, offer-wall modal, report/block flow.

---

## Icon assets

Three PNGs already exist and are the source of truth for button visuals (no re-tinting in code):

- `assets/images/X Button.png` — skip/pass
- `assets/images/Gem Button.png` — crush signal (1-per-day, gated)
- `assets/images/Heart Button.png` — like

Left-to-right order in the action bar: **X · Gem · Heart**. Heart is visually largest (primary); Gem is smallest / outlined (secondary, special); X is medium (destructive, neutralized).

---

## Component structure

### Rename: `SwipeDeck` → `ProfileView`

`components/discover/SwipeDeck/index.tsx` (~995 LOC) is renamed to `components/discover/ProfileView/index.tsx`. Its responsibility shrinks: render a single profile, expose scroll offset as a `SharedValue`, and emit a `onTransitionComplete` callback when the exit animation finishes. The component no longer handles gestures beyond the inner vertical scroll.

What survives:
- Photo carousel (horizontal), pinch-to-zoom, image-tap-to-comment.
- `ApproachableInfoBox`, prompt taps → `MessageBottomSheet`.
- `ProfileDetailSheet` presentation, report/block flow.
- Header-shrink behavior (first-name-only when scrolled past 50pt).
- Reset-on-profile-change: scroll to top, dismiss sheets.

What is removed:
- Pan gesture + composedGesture + `GestureDetector` wrapper.
- Stacked `backCard` rendering (the `nextProfile` peek).
- `animatedCardStyle`, `animatedBackCardStyle` driven by pan.
- Swipe-direction match/no-match overlay animations tied to `swipeResult`.
- Props: `showSwipeDownTooltip`, `showSwipeUpTooltip`, `hideSwipeDownRibbon`, `onSwipeDownTooltipClose`, `onSwipeUpTooltipClose`.

New props:
- `scrollY: SharedValue<number>` — shared with `DiscoverActionBar` for scroll-driven animation.
- `isTransitioning: boolean` — set by parent to guard against re-tap during exit animation.
- `onTransitionComplete: () => void` — fires after exit animation completes.

### New: `DiscoverActionBar`

**Location:** `components/discover/DiscoverActionBar.tsx` (new file, ~100 LOC target).

**Props:**
- `scrollY: SharedValue<number>` — drives gradient/blur/brightness animation.
- `onSkip: () => void`
- `onCrush: () => void`
- `onLike: () => void`
- `disabled?: boolean` — disables all three during transition or when no profile.

**Responsibilities:**
- Render three `Pressable` buttons backed by the three PNG assets.
- Render gradient+blur backdrop.
- Animate backdrop opacity/blur-intensity and button-container opacity based on `scrollY`.
- Pure presentational — no business logic, no direct data access.

### Files deleted

- `components/discover/SwipeCard.tsx` (30 LOC) — only used by stacked-card path.
- `components/discover/CrushSignalButton.tsx` (28 LOC) — superseded by Gem FAB. Before deletion, verify no other consumers via `grep -r CrushSignalButton`.
- `SwipeIndicator.tsx` (57 LOC) — swipe-direction arrows. Currently at `components/discover/SwipeDeck/SwipeIndicator.tsx`; deleted as part of the directory rename below (not moved to the new `ProfileView/` dir).

### Files renamed

`components/discover/SwipeDeck/` → `components/discover/ProfileView/`. The moved files are:

- `index.tsx`
- `ApproachableInfoBox.tsx`
- `MessageBottomSheet.tsx`
- `ProfileDetailSheet.tsx`

`SwipeIndicator.tsx` is **not** moved — it's deleted. Import paths updated accordingly in any file that references `SwipeDeck`.

---

## Action-bar visual design

### Layout

- Absolutely positioned inside the deck area: `position: absolute`, `bottom: 0`, `left: 0`, `right: 0`.
- Sits above the tab bar (which is outside the deck area / managed by expo-router).
- Total visual height: ~140pt (button row 120pt + 20pt gradient fade-in above).

### Button sizing

- **X**: 64pt diameter circle, dark charcoal fill, white X glyph (from PNG).
- **Gem**: 56pt diameter circle, transparent fill with orange outline, orange gem glyph (from PNG). Visually secondary.
- **Heart**: 72pt diameter circle, peach/coral gradient fill, white heart glyph (from PNG). Visually primary.

All three rendered via `<Image source={require(...)} />` — PNGs encode their intended appearance; no runtime tinting. Touch target is the full circle. Press feedback: `transform: scale(0.94)` while pressed.

### Backdrop composition

Two stacked layers behind the buttons:

1. **`BlurView`** (from `expo-blur`) — `tint="dark"`, dynamic `intensity` (see animation below). Base layer, full width, ~140pt tall.
2. **`LinearGradient`** (from `expo-linear-gradient`) — colors `['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']`, vertical top → bottom. Overlays the blur so the treatment fades *into* the screen edge rather than ending in a hard horizontal line.

### Scroll-driven intensification

Client direction: *"Behind the buttons it's a gradient and blur black. So it fades into the bottom of the screen, and as you scroll down the card it just comes into focus and brightness."*

An `intensity` factor is derived from `scrollY`, clamped to `[0, 1]` across the scroll range `[0, 300]pt`:

- `scrollY === 0` (top of profile) → intensity 0: backdrop is subtle, photo reads through cleanly.
- `scrollY >= 300` → intensity 1: backdrop is sharp and bright, buttons command attention.

`intensity` drives (via `useAnimatedStyle` / `useAnimatedProps` on the UI thread — zero React re-renders during scroll):

- **Gradient opacity**: 0.4 → 1.0
- **Blur intensity**: 15 → 45
- **Button container opacity**: 0.85 → 1.0

### Bottom padding in scroll content

`ProfileView`'s scroll content has `paddingBottom: 140` so the last element (prompts / extended details) can be fully scrolled past the action bar.

---

## Scroll handling

### Single source of truth for scroll offset

One `useAnimatedScrollHandler` on `ProfileView`'s inner scroll view:

- Writes to `scrollY: SharedValue<number>` — shared with `DiscoverActionBar` for UI-thread animation.
- Uses `runOnJS(setDeckScrollY)` to update React state **only** when crossing the 50pt threshold (not every frame) — keeps the existing header-shrink behavior (full filter pills → collapsed first-name) without burning re-renders.

### Header behavior (unchanged)

- `deckScrollY <= 50`: full filter pills row (filter dropdowns + preferences button).
- `deckScrollY > 50`: centered first-name only.

### Distance / age-range sliders (unchanged)

Both remain absolute-positioned at `top: 120` with their own backdrops. They overlay everything including the action bar. Z-index `1000` preserved.

---

## Transitions between profiles

### Exit + entry animation

When the user taps X, Gem, or Heart and the action is committed (see handler flows below), `ProfileView` runs:

1. **Exit**: `translateY: 0 → -40`, `opacity: 1 → 0` over 220ms, `Easing.out(Easing.cubic)`.
2. **Swap** rendered profile data (parent has advanced `currentIndex` / `skippedIndex`).
3. **Reset** scroll to top via `scrollRef.current?.scrollTo({ y: 0, animated: false })`. The non-animated scroll fires `onScroll` once, which updates the `scrollY` shared value to 0 and returns the action bar to its low-intensity state before the entry animation runs.
4. **Entry**: `translateY: 40 → 0`, `opacity: 0 → 1` over 220ms.

Guard: an `isTransitioning` ref on `ProfileView` ignores re-taps during exit. Parent also passes `disabled={isTransitioning}` to `DiscoverActionBar`.

### Timing relative to network

- X: instant commit, exit animation starts immediately, no network involvement.
- Heart / Gem: exit animation and `likeMutation` / `crushMutation` run in **parallel**. See match-check flow below.

---

## Match check flow (revised)

### Decision: post-like server query, not prefetch

The earlier proposed optimization — prefetch `useUsersWhoLikedMe` as a `Set<string>` and check synchronously — was rejected because it can miss matches when two users like each other in overlapping sessions (a scenario that is *more* likely at launch than at scale). The match modal is the product's peak emotional moment; we prioritize correctness over saving a network round-trip.

### Heart handler

```
1. Set isTransitioning = true
2. Fire likeMutation.mutateAsync({ toUserId: profileId })  — in parallel with:
3. Start exit animation (220ms)
4. After likeMutation resolves:
   - Fire useCheckMatch for this profileId
5. Await both (animation complete AND match check complete)
6. Advance to next profile (setCurrentIndex / setSkippedIndex)
7. Reset scroll, run entry animation
8. If match: set matchedUser, show MatchModal (full-screen overlay)
9. Mark profile as swiped in AsyncStorage (background, fire-and-forget)
```

The `matchCheckReducer` state machine (idle → checking → result) is preserved; its trigger point moves from "200ms-after-mutation via setTimeout" to "immediately-after-mutation-resolves." The 200ms defensive delay is removed; if the DB trigger proves to be not-yet-complete at mutation-resolve time, a short delay will be restored (verified during implementation).

### Gem handler

Same shape as Heart, except:
- Gated by `checkCrushAvailability()` before step 1. If the gate fails, show the existing "Crush signal unavailable — one per day" toast and **do not** advance or animate.
- Uses `crushMutation` instead of `likeMutation`.

### X handler

```
1. Set isTransitioning = true
2. track("discover_swipe_pass")
3. Start exit animation (220ms)
4. Append profile to swipedProfiles + skippedProfiles (AsyncStorage, background)
5. After animation: advance index, reset scroll, run entry animation
```

No network call, no match check.

### Failure modes

- **`likeMutation` / `crushMutation` fails**: error toast; do not advance; do not animate exit. Current profile stays put. (No optimistic-then-revert.)
- **`useCheckMatch` fails after a successful like**: treat as no-match, advance normally. Silent failure — the like itself succeeded, and a match (if one was created by the server trigger) will surface in the user's Matches tab on next load.
- **Re-tap during transition**: ignored via `isTransitioning` guard.

---

## Tooltip walkthrough — truncated to 3 steps

- Step 0: filter preferences — **kept**.
- Step 1: photo horizontal swipe — **kept**.
- Step 2: tap-on-photo to comment — **kept**.
- ~~Step 3: swipe-down-to-pass~~ — **deleted**.
- ~~Step 4: swipe-up-to-crush~~ — **deleted**.

`advanceTooltip`'s terminal condition: `next >= 3` (was `next >= 5`).

No new tooltip for the FAB buttons — icons are self-evident, labels unnecessary.

**Storage key `DISCOVER_TOOLTIPS_SEEN` is preserved**: users who already completed the old 5-step walkthrough will not see a fresh walkthrough after update.

**Storage key `DISCOVER_SWIPE_DOWN_PASS_DONE` is removed** from `constants/index.ts`, along with helpers `getSwipeDownPassDone` / `setSwipeDownPassDone` and state `swipeDownPassDone` in `discover.tsx`. Orphaned AsyncStorage values for existing users are harmless.

---

## Layout interaction: header + scroll content + action bar

```
┌─ SafeAreaView (top) ─────────────────────────────┐
│ ┌─ Sticky Header ────────────────────────────┐   │
│ │  full pills (scrollY ≤ 50)                  │   │
│ │  collapsed first-name (scrollY > 50)        │   │
│ └────────────────────────────────────────────┘   │
│ ┌─ Skipped-mode banner (conditional) ────────┐   │
│ └────────────────────────────────────────────┘   │
│ ┌─ ProfileView (deckArea) ───────────────────┐   │
│ │  scrollable content                         │   │
│ │  ↓ paddingBottom: 140 ↓                     │   │
│ │ ┌─ DiscoverActionBar (absolute, bottom) ─┐  │   │
│ │ │  gradient+blur, 3 FABs                  │  │   │
│ │ └─────────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
↓ tab bar (expo-router, outside SafeAreaView bottom) ↓
```

### Conditional rendering

`DiscoverActionBar` renders only when `hasMainFeed || hasSkippedToShow` — the same condition gating `ProfileView`. Hidden during:
- Gym-crush-blocked empty state ("Set your home gym" CTA).
- General empty-feed state ("You've seen everyone" / "No one at your gym right now").

### Loading overlay interaction

`deckLoadingOverlay` (z-index 10) sits above profile content. Action bar sits above the overlay (z-index 11) — the bar stays visible during next-profile fetch. When `topProfile` is null, the bar is rendered with `pointerEvents="none"` to prevent taps on stale handlers.

---

## Data flow summary

### `discover.tsx` orchestration

- Renders `DiscoverActionBar` with handlers wired to `handleLike(profileId)`, `handleCrush(profileId)`, `handleSkip(profileId)`.
- Holds `isTransitioning` state (React state, not shared value — it gates action-bar interaction but doesn't need 60fps updates).
- Passes `scrollY: SharedValue<number>` created via `useSharedValue(0)` to both `ProfileView` (written by its scroll handler) and `DiscoverActionBar` (read by its animated styles).
- `matchCheckReducer` state machine preserved; dispatch timing adjusted.

### Hooks touched

- `useLike` — unchanged.
- `useCrushSignal` — unchanged.
- `useCheckMatch` — unchanged (called synchronously after `mutateAsync` resolves instead of via 200ms setTimeout).
- `useLikedProfileIds`, `useMatches`, `useBlockedUserIds` — unchanged.

### Hooks NOT added

- `useUsersWhoLikedMe` — considered and rejected (see match-check rationale).

---

## Testing strategy

### Unit
- `discover.tsx` Heart flow: mock `likeMutation` (success) + `useCheckMatch` (match / no-match); assert exit animation completes before match modal shows; assert next-profile index advances.
- `discover.tsx` Heart failure flow: `likeMutation` rejects → no advance, error toast, no animation.
- `discover.tsx` Gem flow: `checkCrushAvailability` returns false → no advance, gate-failure toast.
- `useCheckMatch` failure post-like: treated as no-match, advance proceeds.

### Component
- `DiscoverActionBar` renders three buttons; each `onPress` calls the matching prop; `disabled={true}` neutralizes taps; snapshot test for gradient+blur layout.

### Integration (manual on device, two test accounts)
- Full like → match flow: both accounts like each other; second user to like sees MatchModal immediately on tap.
- Full like → no-match flow: single account likes; no modal; advance to next profile.
- Gem flow: successful crush signal; gate failure on second-same-day tap.
- Skipped-profiles revisit: exhaust feed, revisit banner appears, X on a skipped profile removes from skipped list.
- Gradient/blur intensifies visibly as user scrolls into a profile.
- Bottom-of-scroll: last profile element is fully reachable above action bar.
- Header filter pills collapse to first-name at scrollY > 50.
- Tooltip walkthrough on fresh install: 3 steps total (filter / photo swipe / image comment).
- Report-and-block from photo "more" button works.
- Message sheet still opens on prompt tap and image tap.

### Regression smoke
- Match modal → "Start chatting" → routes to chat thread.
- Match modal → "Keep swiping" → advances to next profile.
- Paywall (offer wall) opens when non-Plus user toggles gym-crush-mode.
- Preferences modal / filters dropdowns unchanged in behavior.

---

## Rollout

- Single PR, no feature flag. The refactor is structural; maintaining two code paths through `SwipeDeck`/`ProfileView` defeats the simplification goal.
- If a critical bug surfaces post-merge: revert the PR rather than toggle.
- No data migration. No backend changes. No breaking schema changes.

---

## Open items for implementation plan

The implementation plan (next step — `writing-plans` skill) will break this design into ordered, test-gated tasks. Expected slice ordering:

1. **Skeleton**: add `DiscoverActionBar` stub + wire into `discover.tsx` behind the current swipe-deck, non-functional (buttons log only). Verify layout / z-indexing / bottom padding.
2. **Handlers**: move `handleLike` / `handleSkip` / `handleCrush` logic out of the swipe handler into button-tap handlers. Both paths coexist briefly.
3. **Match-check refactor**: remove 200ms setTimeout, run `useCheckMatch` synchronously post-mutation. Verify two-account match flow.
4. **Remove swipe gestures**: strip pan gesture, stacked cards, swipe indicators, swipe-tooltip steps, and `DISCOVER_SWIPE_DOWN_PASS_DONE` plumbing. Rename `SwipeDeck` → `ProfileView`.
5. **Scroll-driven action-bar animation**: introduce `scrollY` shared value, wire to gradient / blur / button opacity.
6. **Exit/entry transition**: add `translateY` + `opacity` animation on profile change.
7. **File deletions**: `SwipeCard.tsx`, `SwipeIndicator.tsx`, `CrushSignalButton.tsx` (after grep-verify).
8. **Tooltip truncation**: reduce to 3 steps.
9. **Full device test pass** (integration list above).
