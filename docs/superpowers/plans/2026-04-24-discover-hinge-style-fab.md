# Discover — Hinge-style FAB redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace swipe-based gesture UX with a Hinge-style single-profile view plus a floating X/Gem/Heart action bar with scroll-driven visual intensification.

**Architecture:** Extract action-bar UI into a new presentational component (`DiscoverActionBar`), simplify `SwipeDeck` into `ProfileView` (drop stacked cards and pan gestures, keep scroll + photo carousel + message sheet), wire button handlers into existing like/crush/skip logic with a simplified post-like match-check (no prefetch Set).

**Tech Stack:** React Native (Expo SDK 54), Reanimated 4, expo-blur, expo-linear-gradient, react-native-gesture-handler, Zustand, Supabase, RevenueCat.

**Related spec:** `docs/superpowers/specs/2026-04-24-discover-hinge-style-fab-design.md`

**Test approach:** This codebase has no unit-test framework configured. Verification in each task is manual device testing using Expo Dev Client (`yarn start` or `yarn ios`). Standing up Jest + RN Testing Library is out of scope; tracked as a separate follow-up.

---

## File inventory

**Files to create:**
- `components/discover/DiscoverActionBar.tsx` — new floating action bar with 3 buttons, gradient+blur backdrop, scroll-driven animation.

**Files to modify:**
- `app/(tabs)/discover.tsx` — rewire handlers, simplify match-check, remove swipe-down-pass-done plumbing, truncate tooltip walkthrough, render action bar, pass shared scrollY.
- `components/discover/SwipeDeck/index.tsx` — strip pan gesture, stacked cards, swipe indicators, swipe-direction tooltip steps; keep scroll + photo carousel + messaging; expose `scrollY` SharedValue and `onTransitionComplete` callback; add exit/entry transition.
- `theme/tokens.ts:136` — remove `DISCOVER_SWIPE_DOWN_PASS_DONE` storage key entry.

**Files to rename (directory):**
- `components/discover/SwipeDeck/` → `components/discover/ProfileView/` (four files moved: `index.tsx`, `ApproachableInfoBox.tsx`, `MessageBottomSheet.tsx`, `ProfileDetailSheet.tsx`).

**Files to delete:**
- `components/discover/SwipeCard.tsx` (only used by stacked-card path).
- `components/discover/SwipeDeck/SwipeIndicator.tsx` (swipe-direction arrows) — dropped during the rename in Task 10.
- `components/discover/CrushSignalButton.tsx` (superseded by Gem FAB; no other consumers verified in Task 11).

**Assets (already present, no action):**
- `assets/images/X Button.png`
- `assets/images/Gem Button.png`
- `assets/images/Heart Button.png`

---

## Pre-flight

- [ ] **Step P.1: Verify dev environment builds cleanly**

Run:
```bash
cd /Users/chrischidgey/dev/gymcrush
yarn start --reset-cache
```

Open on iOS simulator or device. Navigate to Discover tab. Verify the existing swipe deck works (can swipe up for crush, down for skip, horizontal for photos). This is the baseline.

- [ ] **Step P.2: Confirm required libraries**

Run: `grep -E "expo-blur|expo-linear-gradient|react-native-reanimated|react-native-gesture-handler" package.json`

Expected output must include all four. If any missing, stop and install before continuing.

---

## Task 1: Create `DiscoverActionBar` (static, non-animated)

**Goal:** Build the presentational component with 3 buttons, gradient+blur backdrop, absolute-bottom positioning. No scroll animation yet (that comes in Task 8).

**Files:**
- Create: `components/discover/DiscoverActionBar.tsx`

- [ ] **Step 1.1: Create the component file**

Create `components/discover/DiscoverActionBar.tsx` with the following content:

```tsx
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"

interface DiscoverActionBarProps {
  onSkip: () => void
  onCrush: () => void
  onLike: () => void
  disabled?: boolean
}

export function DiscoverActionBar({
  onSkip,
  onCrush,
  onLike,
  disabled = false,
}: DiscoverActionBarProps) {
  return (
    <View
      style={styles.container}
      pointerEvents={disabled ? "none" : "box-none"}
    >
      <BlurView intensity={30} tint="dark" style={styles.blurLayer} />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
        style={styles.gradientLayer}
        pointerEvents="none"
      />
      <View style={styles.buttonRow} pointerEvents="box-none">
        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [
            styles.button,
            styles.xButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Skip"
        >
          <Image
            source={require("../../assets/images/X Button.png")}
            style={styles.xIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onCrush}
          style={({ pressed }) => [
            styles.button,
            styles.gemButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Crush signal"
        >
          <Image
            source={require("../../assets/images/Gem Button.png")}
            style={styles.gemIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onLike}
          style={({ pressed }) => [
            styles.button,
            styles.heartButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Like"
        >
          <Image
            source={require("../../assets/images/Heart Button.png")}
            style={styles.heartIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    zIndex: 11,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  xButton: {
    width: 64,
    height: 64,
  },
  gemButton: {
    width: 56,
    height: 56,
  },
  heartButton: {
    width: 72,
    height: 72,
  },
  xIcon: {
    width: 64,
    height: 64,
  },
  gemIcon: {
    width: 56,
    height: 56,
  },
  heartIcon: {
    width: 72,
    height: 72,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
})
```

- [ ] **Step 1.2: Verify component compiles**

Run: `yarn tsc --noEmit` (or the project's existing TypeScript check). Fix any errors. Expected: no errors.

- [ ] **Step 1.3: Commit**

```bash
git add components/discover/DiscoverActionBar.tsx
git commit -m "feat(discover): add DiscoverActionBar component (static)

Three floating action buttons (X / Gem / Heart) with gradient+blur
backdrop. Pure presentational, no scroll animation or handler wiring
yet — integrated into discover screen in next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Integrate `DiscoverActionBar` into discover screen (log-only handlers)

**Goal:** Render the action bar above the swipe deck. Buttons log to console only. Swipe gestures still work — both paths coexist during this interim step so we can verify layout without breaking the app.

**Files:**
- Modify: `app/(tabs)/discover.tsx`

- [ ] **Step 2.1: Import `DiscoverActionBar`**

In `app/(tabs)/discover.tsx`, find the imports near the top (around line 13 where `SwipeDeck` is imported):

```tsx
import { SwipeDeck } from "@/components/discover/SwipeDeck"
```

Add directly below it:

```tsx
import { DiscoverActionBar } from "@/components/discover/DiscoverActionBar"
```

- [ ] **Step 2.2: Render the action bar inside the deck area**

In `app/(tabs)/discover.tsx`, locate the `deckArea` `View` at around line 1534:

```tsx
<View style={styles.deckArea}>
  {(hasMainFeed || hasSkippedToShow) && currentUser ? (
    ...
```

Find the closing `</View>` of this `deckArea` block (around line 1585, after the `deckLoadingOverlay` conditional). Just **inside** the closing `</View>` — after the loading overlay conditional, before the `</View>` — insert:

```tsx
{(hasMainFeed || hasSkippedToShow) && currentUser ? (
  <DiscoverActionBar
    onSkip={() => console.log("[ActionBar] Skip tapped")}
    onCrush={() => console.log("[ActionBar] Crush tapped")}
    onLike={() => console.log("[ActionBar] Like tapped")}
  />
) : null}
```

The full block around the change should look like this (relevant portion):

```tsx
<View style={styles.deckArea}>
  {(hasMainFeed || hasSkippedToShow) && currentUser ? (
    <View style={layout.flex1}>
      {/* ... existing SwipeDeck and skipped banner ... */}
    </View>
  ) : !showDeckLoading ? (
    <EmptyFeed ... />
  ) : null}
  {showDeckLoading ? (
    <View style={styles.deckLoadingOverlay} pointerEvents="box-none">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  ) : null}
  {(hasMainFeed || hasSkippedToShow) && currentUser ? (
    <DiscoverActionBar
      onSkip={() => console.log("[ActionBar] Skip tapped")}
      onCrush={() => console.log("[ActionBar] Crush tapped")}
      onLike={() => console.log("[ActionBar] Like tapped")}
    />
  ) : null}
</View>
```

- [ ] **Step 2.3: Manual verification on device**

Run: `yarn start` (reload app). Navigate to Discover tab.

Verify:
1. The three FAB buttons (X / Gem / Heart) appear at the bottom of the discover screen, centered, above the tab bar.
2. The gradient+blur backdrop is visible behind the buttons, fading into the bottom of the screen.
3. Tapping each button prints `[ActionBar] Skip tapped` / `Crush tapped` / `Like tapped` in the Metro logs.
4. The existing swipe-up-for-crush and swipe-down-for-skip gestures still work (we haven't removed them yet).
5. Profile photos can still be scrolled horizontally.
6. The empty-feed and gym-crush-blocked states do not show the action bar.

- [ ] **Step 2.4: Commit**

```bash
git add app/\(tabs\)/discover.tsx
git commit -m "feat(discover): render DiscoverActionBar above swipe deck

Action bar renders over the existing swipe deck; buttons log only.
Swipe gestures remain functional during this interim step.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire real handlers to the action bar

**Goal:** Tapping X/Gem/Heart performs the actual skip/crush/like action via the existing `handleSwipe` function. Both the swipe gestures and the button taps fire the same handler during this step (dual-path interim).

**Files:**
- Modify: `app/(tabs)/discover.tsx`

- [ ] **Step 3.1: Replace log-only handlers with real ones**

In `app/(tabs)/discover.tsx`, find the `DiscoverActionBar` you added in Task 2. Replace its three `onSkip`/`onCrush`/`onLike` props with:

```tsx
<DiscoverActionBar
  onSkip={() => currentUser && handleSwipe("pass")}
  onCrush={() => currentUser && handleSwipe("crush")}
  onLike={() => currentUser && handleSwipe("like")}
/>
```

`handleSwipe` is defined above at around line 986 and already handles like/crush/pass. It looks up `currentUser` internally and guards against a missing profile, so this wiring is safe.

- [ ] **Step 3.2: Manual verification on device**

Reload the app. Navigate to Discover tab.

Verify:
1. Tapping **X** skips the profile — next profile appears, skipped profile persists to AsyncStorage and will surface in the skipped-revisit flow after feed exhaustion.
2. Tapping **Heart** sends a like — if matched, the MatchModal appears; otherwise advances to next profile. (There may be a brief pause around the 200ms match-check; that's addressed in Task 4.)
3. Tapping **Gem** sends a crush signal — cooldown toast appears if already used today.
4. Swipe-up (crush) and swipe-down (skip) gestures still work too; firing either gesture or the corresponding button produces the same result.

- [ ] **Step 3.3: Commit**

```bash
git add app/\(tabs\)/discover.tsx
git commit -m "feat(discover): wire action bar buttons to handleSwipe

Buttons now perform real skip/crush/like actions via the existing
handler. Swipe gestures are preserved during this step; removed
in a later task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Simplify match-check — drop the 200ms setTimeout

**Goal:** Run `useCheckMatch` immediately after `likeMutation.mutateAsync` resolves rather than via a fixed 200ms delay. Verify the match modal still surfaces correctly.

**Files:**
- Modify: `app/(tabs)/discover.tsx`

- [ ] **Step 4.1: Remove the setTimeout inside `handleSwipe`**

In `app/(tabs)/discover.tsx`, find the block inside `handleSwipe` around line 1020-1037:

```tsx
          // Invalidate and refetch the match check query after a short delay
          // to allow the database trigger to complete creating the match
          if (currentProfile?.id) {
            setTimeout(() => {
              // Invalidate both possible query key orders
              queryClient.invalidateQueries({
                queryKey: ["match", currentProfile.id, profileId],
              })
              queryClient.invalidateQueries({
                queryKey: ["match", profileId, currentProfile.id],
              })
              // Refetch the match check query
              queryClient.refetchQueries({
                queryKey: ["match", currentProfile.id, profileId],
              })
              queryClient.refetchQueries({
                queryKey: ["match", profileId, currentProfile.id],
              })
            }, 200) // 200ms delay to allow database trigger to complete
          }
```

Replace the entire block with:

```tsx
          // Match-check runs immediately post-mutation. likeMutation.mutateAsync
          // awaits the server response which includes the trigger-created match
          // row (if any). No defensive delay needed — if tests surface a race,
          // restore a short delay here.
          if (currentProfile?.id) {
            queryClient.invalidateQueries({
              queryKey: ["match", currentProfile.id, profileId],
            })
            queryClient.invalidateQueries({
              queryKey: ["match", profileId, currentProfile.id],
            })
            queryClient.refetchQueries({
              queryKey: ["match", currentProfile.id, profileId],
            })
            queryClient.refetchQueries({
              queryKey: ["match", profileId, currentProfile.id],
            })
          }
```

- [ ] **Step 4.2: Manual verification (requires two test accounts)**

On device, log in as User A. From the Discover tab, like User B (tap Heart).

On a second device (or a second session), log in as User B. Like User A (tap Heart).

Verify:
1. When the second user likes back, the MatchModal appears for them within ~1 second of the tap.
2. No regression: single-direction likes (A likes B, B doesn't like A) do not show a match modal.
3. If, in practice, the match modal fails to appear reliably, the DB trigger may not have completed by the time `mutateAsync` resolves. In that case, add `await new Promise(resolve => setTimeout(resolve, 150))` before the `invalidateQueries` calls and retest — note the regression in the commit message.

- [ ] **Step 4.3: Commit**

```bash
git add app/\(tabs\)/discover.tsx
git commit -m "refactor(discover): run match-check immediately post-mutation

Replaces 200ms setTimeout defensive delay with synchronous
invalidate+refetch right after likeMutation.mutateAsync resolves.
The mutation already awaits the server response including the
match-creation trigger, so the delay is redundant.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Strip swipe gestures and stacked cards from `SwipeDeck`

**Goal:** Remove pan gesture, stacked back-card rendering, swipe-direction overlays from `SwipeDeck/index.tsx`. After this, the only remaining gestures are: photo horizontal swipe, pinch-to-zoom, vertical scroll. The action bar is now the sole source of like/crush/skip actions.

**Files:**
- Modify: `components/discover/SwipeDeck/index.tsx`

- [ ] **Step 5.1: Remove the pan gesture definition**

In `components/discover/SwipeDeck/index.tsx`, find the `composedGesture` line around line 404:

```tsx
  // Compose: only pinch + zoom-pan (swipe is now scroll-driven, no pan gesture)
  const composedGesture = Gesture.Simultaneous(pinchGesture, zoomPanGesture)
```

This is the existing composition (no swipe pan was added here already — the swipe logic lived inside `scrollHandler` as overscroll). Keep this line. The work happens in the next steps.

- [ ] **Step 5.2: Strip overscroll-based swipe visuals from `scrollHandler`**

Find the `scrollHandler` definition around line 224:

```tsx
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (isDismissing.value) return

      const y = event.contentOffset.y
      const maxScroll = Math.max(
        0,
        event.contentSize.height - event.layoutMeasurement.height,
      )
      scrollY.value = Math.max(0, Math.min(y, maxScroll))
      runOnJS(notifyScrollState)(y)

      // Overscroll at top → pass visual (pull down, y < 0)
      if (y < 0) {
        const pullDown = -y
        pullDownAmount.value = pullDown
        translateY.value = pullDown
        crushImageSize.value = 0
        const maxSize = SCREEN_WIDTH * 0.8
        dropImageSize.value = Math.min(maxSize, 80 + pullDown * 1.5)
        return
      }

      // Overscroll at bottom → like visual (pull up, y > maxScroll)
      if (maxScroll > 0 && y > maxScroll) {
        const pullUp = y - maxScroll
        // ... (remaining overscroll logic) ...
      }
      // (rest of handler, may include reset logic for pullDownAmount etc.)
    },
  })
```

Replace the entire `scrollHandler` with the simplified version:

```tsx
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y
      const maxScroll = Math.max(
        0,
        event.contentSize.height - event.layoutMeasurement.height,
      )
      scrollY.value = Math.max(0, Math.min(y, maxScroll))
      runOnJS(notifyScrollState)(y)
    },
  })
```

- [ ] **Step 5.3: Remove the back-card JSX**

Find the back-card rendering block around lines 612-638:

```tsx
      <View style={styles.stackContainer}>
        {/* Back card (next profile peeking) */}
        {nextProfile ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.backCard, animatedBackCardStyle]}
          >
            {/* ... contents ... */}
          </Animated.View>
        ) : null}

        {/* Front card */}
        <GestureDetector gesture={composedGesture}>
```

Delete the entire `{nextProfile ? (...) : null}` block (the back-card rendering). Keep the `{/* Front card */}` comment and the `GestureDetector` + front-card rendering.

- [ ] **Step 5.4: Remove the swipe-direction match/no-match overlay animations**

Search the file for uses of `swipeResult`, `awaitingResult`, `setAwaitingResult`, `showTick`, `setShowTick`, `crushImageSize`, `dropImageSize`, `pullDownAmount`, `triggerPass`, `triggerLike`, `CARD_EXIT_MS`, `TICK_DISPLAY_MS`, `SWIPE_THRESHOLD`, `VELOCITY_THRESHOLD`, `CRUSH_DEAD_ZONE`, `SWIPE_DOWN_LABEL`, `getSwipeUpMatchLabel`, `TOOLTIP_SWIPE_DOWN`, `TOOLTIP_SWIPE_UP`, `animatedBackCardStyle`, `dropImageAnimatedStyle`, `crushImageAnimatedStyle`, `BACK_CARD_SCALE`, `BACK_CARD_PEEK`, `BACK_CARD_OPACITY`, `START_OPACITY`, `SwipeIndicator`.

For each reference:
- Remove the import, declaration, or usage.
- If a state setter is removed, also remove its state declaration.
- Leave the `translateY` and `opacity` shared values — they'll be re-purposed for the exit/entry transition in Task 9.

Run: `grep -n "swipeResult\|awaitingResult\|showTick\|crushImageSize\|dropImageSize\|pullDownAmount\|triggerPass\|triggerLike\|SwipeIndicator\|animatedBackCardStyle\|dropImageAnimatedStyle\|crushImageAnimatedStyle\|BACK_CARD_\|START_OPACITY\|SWIPE_THRESHOLD\|VELOCITY_THRESHOLD\|CRUSH_DEAD_ZONE\|SWIPE_DOWN_LABEL\|getSwipeUpMatchLabel\|TOOLTIP_SWIPE_DOWN\|TOOLTIP_SWIPE_UP\|CARD_EXIT_MS\|TICK_DISPLAY_MS" components/discover/SwipeDeck/index.tsx` after cleanup — expected: no matches.

Also remove the `nextProfile` variable if it's no longer referenced:

```tsx
const nextProfile = profiles[1]
```

- [ ] **Step 5.5: Remove the swipe-direction props from the interface and destructure**

In `SwipeDeckProps` around line 96-113, remove:

```tsx
  swipeResult?: "match" | "no-match" | null
  onSwipeComplete?: () => void
  showSwipeDownTooltip?: boolean
  hideSwipeDownRibbon?: boolean
  showSwipeUpTooltip?: boolean
  onSwipeDownTooltipClose?: () => void
  onSwipeUpTooltipClose?: () => void
```

In the function signature around line 115-132, remove the corresponding destructured parameters.

Also remove the matching props passed from `discover.tsx`. In `app/(tabs)/discover.tsx`, find the `<SwipeDeck ... />` rendering around line 1544:

```tsx
<SwipeDeck
  profiles={deckProfiles}
  onSwipe={handleDeckSwipe}
  swipeResult={swipeResultForDeck}
  onSwipeComplete={handleSwipeComplete}
  showPhotoSwipeTooltip={tooltipStep === 1}
  showImageCommentTooltip={tooltipStep === 2}
  showSwipeDownTooltip={tooltipStep === 3 && !swipeDownPassDone}
  hideSwipeDownRibbon={swipeDownPassDone}
  showSwipeUpTooltip={tooltipStep === 4}
  onPhotoSwipeTooltipClose={advanceTooltip}
  onImageCommentTooltipClose={advanceTooltip}
  onSwipeDownTooltipClose={advanceTooltip}
  onSwipeUpTooltipClose={advanceTooltip}
  onScrollStateChange={handleDeckScrollStateChange}
  onReportAndBlock={handleReportAndBlock}
  distances={deckDistances}
/>
```

Replace with:

```tsx
<SwipeDeck
  profiles={deckProfiles}
  onSwipe={handleDeckSwipe}
  showPhotoSwipeTooltip={tooltipStep === 1}
  showImageCommentTooltip={tooltipStep === 2}
  onPhotoSwipeTooltipClose={advanceTooltip}
  onImageCommentTooltipClose={advanceTooltip}
  onScrollStateChange={handleDeckScrollStateChange}
  onReportAndBlock={handleReportAndBlock}
  distances={deckDistances}
/>
```

- [ ] **Step 5.6: Remove `matchCheckReducer` hookup consumers from discover.tsx**

In `app/(tabs)/discover.tsx`, find `swipeResultForDeck` around line 1163:

```tsx
  // Derive swipeResult for SwipeDeck from reducer state
  const swipeResultForDeck =
    matchCheck.status === "result" ? matchCheck.result : null
```

Delete this declaration (no longer passed to SwipeDeck).

Find `handleSwipeComplete` at around line 1167:

```tsx
  /** Called by SwipeDeck after all exit animations are done */
  const handleSwipeComplete = useCallback(async () => {
    if (matchCheck.status === "result" && matchCheck.result === "match") {
      setShowMatchModal(true)
      return // Don't advance — match modal handlers will advance
    }

    // No-match — advance to next profile immediately, persist in background
    const userId = matchCheckUserId
    dispatchMatchCheck({ type: "reset" })
    advanceToNextProfile()
    if (userId) {
      markProfileAsSwiped(userId)
    }
  }, [matchCheck, matchCheckUserId, markProfileAsSwiped, advanceToNextProfile])
```

**Keep** `handleSwipeComplete` — it's still the "after animation, finalize" callback. But `SwipeDeck` no longer invokes it; `discover.tsx` itself will invoke it directly after the transition in Task 9. For now, leave it defined but unused — it'll be rewired in Task 9.

Temporarily, to keep the existing match flow working, we need `handleSwipe` to do what `handleSwipeComplete` used to: after the match check resolves, show the match modal OR advance. Update `handleSwipe` around line 986 to inline the finalize step.

Locate the existing post-`dispatchMatchCheck({ type: "start_check" ... })` block in `handleSwipe`. The `useEffect` at around lines 1088-1118 listens for `matchData` and dispatches `match_found` or `no_match`. That effect already sets `matchedUser` on match. Keep it.

Then add a new `useEffect` that responds to `matchCheck` reaching `"result"` status:

```tsx
  // After match check resolves: show modal (match) or advance (no-match)
  useEffect(() => {
    if (matchCheck.status !== "result") return
    if (matchCheck.result === "match") {
      setShowMatchModal(true)
    } else {
      const userId = matchCheck.userId
      dispatchMatchCheck({ type: "reset" })
      advanceToNextProfile()
      if (userId) {
        markProfileAsSwiped(userId)
      }
    }
  }, [
    matchCheck,
    advanceToNextProfile,
    markProfileAsSwiped,
  ])
```

Insert this effect just after the existing "Signal match/no-match result to SwipeDeck" effect (the one starting at line 1088). Both effects can coexist temporarily.

- [ ] **Step 5.7: Run TypeScript check**

Run: `yarn tsc --noEmit`

Fix any resulting errors. Most likely: unused imports (`SwipeIndicator`, `ChevronUp`, various constants). Remove them.

- [ ] **Step 5.8: Manual verification on device**

Reload the app. Navigate to Discover tab.

Verify:
1. No back-card peek behind the top profile (stacked cards are gone).
2. Vertical scroll moves the profile content — it does **not** trigger pass or like anymore.
3. Swipe-up and swipe-down gestures no longer trigger crush/skip. (They may still scroll, which is the new correct behavior.)
4. Tapping the X/Heart/Gem buttons still works end-to-end: like → match check → match modal (when applicable) / advance; skip → advance; crush → signal sent.
5. Photo horizontal swipe and pinch-to-zoom still work.
6. Profile transitions between profiles are instant / jarring — that's expected until Task 9.

- [ ] **Step 5.9: Commit**

```bash
git add app/\(tabs\)/discover.tsx components/discover/SwipeDeck/index.tsx
git commit -m "refactor(discover): remove swipe gestures and stacked cards

Strips pan-based swipe (up = crush, down = skip) and stacked back-card
rendering from SwipeDeck. Only vertical scroll, photo carousel, and
pinch-to-zoom remain. Action bar is now the sole source of
like/crush/skip. Transition between profiles is instant for now;
fade+slide animation added in a later task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Remove `DISCOVER_SWIPE_DOWN_PASS_DONE` plumbing + truncate tooltip walkthrough

**Goal:** Strip the swipe-down-pass-done state key and tooltip steps 3 (swipe-down) and 4 (swipe-up). Tooltip walkthrough becomes 3 steps: filter / photo swipe / image comment.

**Files:**
- Modify: `theme/tokens.ts`
- Modify: `app/(tabs)/discover.tsx`

- [ ] **Step 6.1: Remove the storage key from tokens**

In `theme/tokens.ts`, find around line 136:

```tsx
    DISCOVER_SWIPE_DOWN_PASS_DONE: 'gymcrush_discover_swipe_down_pass_done',
```

Delete this line.

- [ ] **Step 6.2: Remove storage-key plumbing from discover.tsx**

In `app/(tabs)/discover.tsx`, delete:

Line 94-95 (the `STORAGE_KEY_SWIPE_DOWN_PASS_DONE` constant):

```tsx
const STORAGE_KEY_SWIPE_DOWN_PASS_DONE =
  APP.STORAGE_KEYS.DISCOVER_SWIPE_DOWN_PASS_DONE
```

Lines 208-224 (the two helper functions):

```tsx
const getSwipeDownPassDone = async (): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_SWIPE_DOWN_PASS_DONE)
    return stored === "true"
  } catch (error) {
    console.error("Failed to load swipe-down pass done:", error)
    return false
  }
}

const setSwipeDownPassDone = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SWIPE_DOWN_PASS_DONE, "true")
  } catch (error) {
    console.error("Failed to save swipe-down pass done:", error)
  }
}
```

Line 647 (the React state declaration):

```tsx
const [swipeDownPassDone, setSwipeDownPassDoneState] = useState(false)
```

Lines 666-676 (the useEffect that loads the flag):

```tsx
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const done = await getSwipeDownPassDone()
      if (!cancelled) setSwipeDownPassDoneState(done)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])
```

Inside `handleSwipe`, the lines that set the flag (around 1043-1046):

```tsx
          if (!swipeDownPassDone) {
            setSwipeDownPassDoneState(true)
            setSwipeDownPassDone()
          }
```

Delete these three lines (the surrounding `track("discover_swipe_pass")` line stays).

- [ ] **Step 6.3: Truncate the tooltip walkthrough**

Find `advanceTooltip` around line 748:

```tsx
  const advanceTooltip = useCallback(() => {
    setTooltipStep((prev) => {
      if (prev === null) return null
      const next = prev + 1
      if (next >= 5) {
        setTooltipsSeen()
        return null
      }
      // Hide current tooltip, then show next after delay
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = setTimeout(() => setTooltipStep(next), 300)
      return null
    })
  }, [])
```

Change `if (next >= 5)` to `if (next >= 3)`:

```tsx
  const advanceTooltip = useCallback(() => {
    setTooltipStep((prev) => {
      if (prev === null) return null
      const next = prev + 1
      if (next >= 3) {
        setTooltipsSeen()
        return null
      }
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = setTimeout(() => setTooltipStep(next), 300)
      return null
    })
  }, [])
```

- [ ] **Step 6.4: Update the comment on `tooltipStep` state**

Around line 644-645:

```tsx
  // Tooltip walkthrough: null = inactive, 0-4 = sequential steps
  // 0=filter, 1=photoSwipe, 2=imageComment, 3=swipeDown, 4=swipeUp
  const [tooltipStep, setTooltipStep] = useState<number | null>(null)
```

Replace the comment with:

```tsx
  // Tooltip walkthrough: null = inactive, 0-2 = sequential steps
  // 0=filter, 1=photoSwipe, 2=imageComment
  const [tooltipStep, setTooltipStep] = useState<number | null>(null)
```

- [ ] **Step 6.5: Verify TypeScript and manual check**

Run: `yarn tsc --noEmit`

Expected: no errors.

Reload app. Clear AsyncStorage (or uninstall/reinstall) to reset the "tooltips seen" flag. Verify on fresh discover session:
1. Tooltip 0 appears over the filter pill area.
2. Tap to advance → tooltip 1 appears over photo-swipe affordance.
3. Tap to advance → tooltip 2 appears over image-comment affordance.
4. Tap to advance → no more tooltips (walkthrough complete, flag saved).

Verify normal flow after tooltips:
1. X/Heart/Gem buttons still work.
2. No swipe-down-tooltip or swipe-up-tooltip appears.

- [ ] **Step 6.6: Commit**

```bash
git add theme/tokens.ts app/\(tabs\)/discover.tsx
git commit -m "refactor(discover): truncate tooltip walkthrough; drop swipe-down-pass-done

Walkthrough shrinks from 5 steps to 3 (filter / photo-swipe /
image-comment); swipe-down and swipe-up tooltip steps are obsolete
with the action bar. Storage key DISCOVER_SWIPE_DOWN_PASS_DONE and
its helpers are removed; orphaned AsyncStorage values for existing
users are harmless.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Expose `scrollY` SharedValue; pass into `DiscoverActionBar`

**Goal:** Route the existing scrollY SharedValue out of `SwipeDeck` and into `DiscoverActionBar`. Action bar still renders unanimated; wiring the value is a separate step so regressions are easy to isolate.

**Files:**
- Modify: `components/discover/SwipeDeck/index.tsx`
- Modify: `components/discover/DiscoverActionBar.tsx`
- Modify: `app/(tabs)/discover.tsx`

- [ ] **Step 7.1: Accept `scrollY` as an optional prop on `SwipeDeck`**

In `components/discover/SwipeDeck/index.tsx`, update `SwipeDeckProps`:

```tsx
interface SwipeDeckProps {
  profiles: Profile[]
  onSwipe: (profileId: string, action: SwipeAction) => void
  showPhotoSwipeTooltip?: boolean
  showImageCommentTooltip?: boolean
  onPhotoSwipeTooltipClose?: () => void
  onImageCommentTooltipClose?: () => void
  onScrollStateChange?: (state: { scrollY: number; isAtTop: boolean }) => void
  onReportAndBlock?: (profileId: string) => void
  distances?: Map<string, number | null>
  /** Optional shared value the parent can read to drive scroll-linked UI. */
  scrollY?: Animated.SharedValue<number>
}
```

Import `SharedValue` type if not already:

```tsx
import Animated, {
  /* ...existing imports... */
  type SharedValue,
} from "react-native-reanimated"
```

Then update the interface to use the imported type:

```tsx
  scrollY?: SharedValue<number>
```

In the function signature destructure, add `scrollY: externalScrollY`:

```tsx
export function SwipeDeck({
  profiles,
  onSwipe,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
  onScrollStateChange,
  onReportAndBlock,
  distances,
  scrollY: externalScrollY,
}: SwipeDeckProps) {
```

- [ ] **Step 7.2: Write into the external `scrollY` inside the scroll handler**

In `components/discover/SwipeDeck/index.tsx`, find the internal `scrollY` shared value declaration around line 204:

```tsx
  const scrollY = useSharedValue(0)
```

This internal value is still used by other parts of the component (header-shrink notification via `notifyScrollState`). Keep it. We'll additionally mirror to `externalScrollY` if provided.

Find the `scrollHandler` and update to write both:

```tsx
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y
      const maxScroll = Math.max(
        0,
        event.contentSize.height - event.layoutMeasurement.height,
      )
      const clamped = Math.max(0, Math.min(y, maxScroll))
      scrollY.value = clamped
      if (externalScrollY) {
        externalScrollY.value = clamped
      }
      runOnJS(notifyScrollState)(y)
    },
  })
```

Also update the reset-on-profile-change `useEffect` (around line 447-465) so the external value resets too. Find:

```tsx
    scrollY.value = 0
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
```

Add after `scrollY.value = 0`:

```tsx
    if (externalScrollY) {
      externalScrollY.value = 0
    }
```

- [ ] **Step 7.3: Accept `scrollY` on `DiscoverActionBar`**

In `components/discover/DiscoverActionBar.tsx`, update the props interface:

```tsx
import type { SharedValue } from "react-native-reanimated"

interface DiscoverActionBarProps {
  onSkip: () => void
  onCrush: () => void
  onLike: () => void
  disabled?: boolean
  /** Optional shared scroll offset; reserved for scroll-driven animation (Task 8). */
  scrollY?: SharedValue<number>
}
```

Update the function signature:

```tsx
export function DiscoverActionBar({
  onSkip,
  onCrush,
  onLike,
  disabled = false,
  scrollY: _scrollY,
}: DiscoverActionBarProps) {
```

The underscore prefix suppresses the unused-variable warning; the next task will actually consume it.

- [ ] **Step 7.4: Wire the shared value in `discover.tsx`**

In `app/(tabs)/discover.tsx`, add a `useSharedValue` import from Reanimated if not already present:

```tsx
import { useSharedValue } from "react-native-reanimated"
```

Inside `DiscoverScreen` component body (near the top, alongside other hooks — e.g., after `const [currentIndex, setCurrentIndex] = useState(0)` around line 633), add:

```tsx
  const deckScrollYShared = useSharedValue(0)
```

Pass it to both children. In the `<SwipeDeck ... />` JSX:

```tsx
<SwipeDeck
  profiles={deckProfiles}
  onSwipe={handleDeckSwipe}
  showPhotoSwipeTooltip={tooltipStep === 1}
  showImageCommentTooltip={tooltipStep === 2}
  onPhotoSwipeTooltipClose={advanceTooltip}
  onImageCommentTooltipClose={advanceTooltip}
  onScrollStateChange={handleDeckScrollStateChange}
  onReportAndBlock={handleReportAndBlock}
  distances={deckDistances}
  scrollY={deckScrollYShared}
/>
```

And in the `<DiscoverActionBar ... />` JSX:

```tsx
<DiscoverActionBar
  onSkip={() => currentUser && handleSwipe("pass")}
  onCrush={() => currentUser && handleSwipe("crush")}
  onLike={() => currentUser && handleSwipe("like")}
  scrollY={deckScrollYShared}
/>
```

- [ ] **Step 7.5: Verify TypeScript and manual**

Run: `yarn tsc --noEmit`

Expected: no errors.

Reload app. Navigate to Discover tab. Scroll a profile. Verify nothing visually changed (the shared value is wired but not yet consumed for animation). Header still collapses to first-name at scroll > 50.

- [ ] **Step 7.6: Commit**

```bash
git add app/\(tabs\)/discover.tsx components/discover/SwipeDeck/index.tsx components/discover/DiscoverActionBar.tsx
git commit -m "feat(discover): thread scrollY SharedValue through action bar

Parent owns a useSharedValue; SwipeDeck mirrors its internal scrollY
to this external value. DiscoverActionBar accepts the value but does
not yet consume it — animation wiring in next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Scroll-driven animation on `DiscoverActionBar`

**Goal:** Gradient opacity, blur intensity, and button-container opacity ramp from low (top of scroll) to high (scroll > 300pt), driven off the shared `scrollY` on the UI thread.

**Files:**
- Modify: `components/discover/DiscoverActionBar.tsx`

- [ ] **Step 8.1: Rewrite `DiscoverActionBar.tsx` with animated layers**

Replace the full file contents with:

```tsx
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { Image, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated"

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

interface DiscoverActionBarProps {
  onSkip: () => void
  onCrush: () => void
  onLike: () => void
  disabled?: boolean
  /** Shared scroll offset (pt) used to drive visual intensification. */
  scrollY?: SharedValue<number>
}

/** Pixel distance of profile scroll over which the backdrop ramps from subtle → sharp. */
const RAMP_DISTANCE = 300

export function DiscoverActionBar({
  onSkip,
  onCrush,
  onLike,
  disabled = false,
  scrollY,
}: DiscoverActionBarProps) {
  const intensity = useDerivedValue(() => {
    if (!scrollY) return 1
    const y = scrollY.value
    return Math.max(0, Math.min(1, y / RAMP_DISTANCE))
  })

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intensity.value, [0, 1], [0.4, 1]),
  }))

  const buttonRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intensity.value, [0, 1], [0.85, 1]),
  }))

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(intensity.value, [0, 1], [15, 45]),
  }))

  return (
    <View
      style={styles.container}
      pointerEvents={disabled ? "none" : "box-none"}
    >
      <AnimatedBlurView
        tint="dark"
        style={styles.blurLayer}
        animatedProps={blurAnimatedProps}
      />
      <Animated.View style={[styles.gradientLayer, gradientStyle]} pointerEvents="none">
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[styles.buttonRow, buttonRowStyle]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [
            styles.button,
            styles.xButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Skip"
        >
          <Image
            source={require("../../assets/images/X Button.png")}
            style={styles.xIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onCrush}
          style={({ pressed }) => [
            styles.button,
            styles.gemButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Crush signal"
        >
          <Image
            source={require("../../assets/images/Gem Button.png")}
            style={styles.gemIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          onPress={onLike}
          style={({ pressed }) => [
            styles.button,
            styles.heartButton,
            pressed && styles.pressed,
          ]}
          hitSlop={8}
          accessibilityLabel="Like"
        >
          <Image
            source={require("../../assets/images/Heart Button.png")}
            style={styles.heartIcon}
            resizeMode="contain"
          />
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    zIndex: 11,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  xButton: {
    width: 64,
    height: 64,
  },
  gemButton: {
    width: 56,
    height: 56,
  },
  heartButton: {
    width: 72,
    height: 72,
  },
  xIcon: {
    width: 64,
    height: 64,
  },
  gemIcon: {
    width: 56,
    height: 56,
  },
  heartIcon: {
    width: 72,
    height: 72,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
})
```

- [ ] **Step 8.2: Manual verification on device**

Reload the app. Navigate to Discover tab.

Verify:
1. At the top of a profile (scroll = 0), the action bar backdrop is visible but subtle — you can read the profile photo clearly through it.
2. As you scroll down the profile, the backdrop visibly intensifies: the gradient darkens, the blur sharpens, the buttons appear slightly brighter.
3. At full scroll (bottom of profile), the backdrop is at maximum intensity.
4. Scrolling back up smoothly reverses the effect.
5. No flicker, no React re-renders on scroll (open React DevTools / Metro logs — no "render" output during scroll).
6. Performance feels 60fps on a mid-range device.

- [ ] **Step 8.3: Commit**

```bash
git add components/discover/DiscoverActionBar.tsx
git commit -m "feat(discover): scroll-driven gradient+blur intensification on action bar

Action bar's gradient opacity, blur intensity, and button-container
opacity now ramp from subtle (scrollY=0) to sharp (scrollY>=300).
Driven entirely on the UI thread via Reanimated derived/animated
values — zero React re-renders during scroll.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Exit/entry transition animation on profile change

**Goal:** When the user taps X/Gem/Heart, the current profile fades+slides up and out; the new profile fades+slides in. Guard against re-taps during transition.

**Files:**
- Modify: `components/discover/SwipeDeck/index.tsx`
- Modify: `app/(tabs)/discover.tsx`

- [ ] **Step 9.1: Add transition animation to `SwipeDeck`**

In `components/discover/SwipeDeck/index.tsx`, the existing `translateY` and `opacity` shared values (kept from Task 5 cleanup) will now drive the transition.

Locate the existing animated card style around line 407:

```tsx
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))
```

Keep this. It's already correct — we'll drive `translateY` and `opacity` via `useEffect` on profile change.

Locate the existing reset-on-profile-change effect around line 447-465. The effect currently does:

```tsx
  useEffect(() => {
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    // ... (more resets) ...
    translateY.value = 0
    opacity.value = 1
    // ... (scroll reset, sheet dismissals) ...
  }, [topProfile?.id])
```

Replace the body with the animation sequence. Use `withTiming` and a callback to resume after exit completes:

```tsx
  const previousProfileIdRef = useRef<string | undefined>(topProfile?.id)

  useEffect(() => {
    const newId = topProfile?.id
    const oldId = previousProfileIdRef.current

    // Reset sheets and session state regardless of whether this is a first
    // mount or an ID change.
    setSelectedPrompt(null)
    setIsImageChat(false)
    setMessageText("")
    messageSheetRef.current?.dismiss()
    detailSheetRef.current?.dismiss()

    if (newId === undefined || oldId === undefined || newId === oldId) {
      // First mount (or same profile): snap to visible, no animation.
      translateY.value = 0
      opacity.value = 1
      scrollY.value = 0
      if (externalScrollY) externalScrollY.value = 0
      scrollRef.current?.scrollTo?.({ y: 0, animated: false })
      onScrollStateChange?.({ scrollY: 0, isAtTop: true })
      previousProfileIdRef.current = newId
      return
    }

    // Real profile change: animate entry from below.
    translateY.value = 40
    opacity.value = 0
    scrollY.value = 0
    if (externalScrollY) externalScrollY.value = 0
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
    onScrollStateChange?.({ scrollY: 0, isAtTop: true })

    translateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    })
    opacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    })

    previousProfileIdRef.current = newId
  }, [topProfile?.id])
```

Ensure `Easing` and `withTiming` remain imported from `react-native-reanimated` (they were already imported in the original file — verify after the Task 5 cleanup).

- [ ] **Step 9.2: Expose an `exitAnimation` imperative handle**

To run the **exit** animation (before the profile swaps), the parent needs to trigger it. Add an imperative handle via `forwardRef`.

Near the top of `components/discover/SwipeDeck/index.tsx`, wrap `SwipeDeck` as a forwardRef component:

Change:

```tsx
export function SwipeDeck({ /* props */ }: SwipeDeckProps) {
  // body
}
```

To:

```tsx
export interface SwipeDeckHandle {
  runExitAnimation: (onComplete: () => void) => void
}

export const SwipeDeck = React.forwardRef<SwipeDeckHandle, SwipeDeckProps>(
  function SwipeDeck(
    { /* destructured props */ }: SwipeDeckProps,
    ref,
  ) {
    // body

    React.useImperativeHandle(ref, () => ({
      runExitAnimation: (onComplete: () => void) => {
        translateY.value = withTiming(
          -40,
          { duration: 220, easing: Easing.out(Easing.cubic) },
          (finished) => {
            "worklet"
            if (finished) runOnJS(onComplete)()
          },
        )
        opacity.value = withTiming(0, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        })
      },
    }))

    // rest of body
  },
)
```

(Be careful with JSX/prop destructuring syntax when converting to forwardRef. The destructured props should be inside the first argument as before.)

- [ ] **Step 9.3: Drive the transition from `discover.tsx`**

In `app/(tabs)/discover.tsx`, add a ref to `SwipeDeck` and a transitioning state.

Near other refs at the top of the component (around line 421-439), add:

```tsx
import type { SwipeDeckHandle } from "@/components/discover/SwipeDeck"
// (keep existing default import of SwipeDeck too)
```

Inside the component body, add:

```tsx
  const swipeDeckRef = useRef<SwipeDeckHandle>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
```

Create a new transition-aware wrapper around `handleSwipe`:

```tsx
  const runTransitionThenSwipe = useCallback(
    (action: SwipeAction) => {
      if (isTransitioning || !currentUser) return
      setIsTransitioning(true)
      swipeDeckRef.current?.runExitAnimation(() => {
        handleSwipe(action)
        // The useEffect in SwipeDeck on topProfile.id change will run
        // the entry animation. Clear the guard after a frame so re-tap
        // is blocked until the new profile has mounted.
        setTimeout(() => setIsTransitioning(false), 0)
      })
    },
    [isTransitioning, currentUser, handleSwipe],
  )
```

Wire this wrapper to the action bar:

```tsx
<DiscoverActionBar
  onSkip={() => runTransitionThenSwipe("pass")}
  onCrush={() => runTransitionThenSwipe("crush")}
  onLike={() => runTransitionThenSwipe("like")}
  scrollY={deckScrollYShared}
  disabled={isTransitioning}
/>
```

Attach the ref to `SwipeDeck`:

```tsx
<SwipeDeck
  ref={swipeDeckRef}
  profiles={deckProfiles}
  onSwipe={handleDeckSwipe}
  showPhotoSwipeTooltip={tooltipStep === 1}
  showImageCommentTooltip={tooltipStep === 2}
  onPhotoSwipeTooltipClose={advanceTooltip}
  onImageCommentTooltipClose={advanceTooltip}
  onScrollStateChange={handleDeckScrollStateChange}
  onReportAndBlock={handleReportAndBlock}
  distances={deckDistances}
  scrollY={deckScrollYShared}
/>
```

- [ ] **Step 9.4: Add bottom padding to the scroll content**

In `components/discover/SwipeDeck/index.tsx`, find the `<AnimatedGHScrollView ...>` rendering (around line 643). Add `contentContainerStyle`:

```tsx
<AnimatedGHScrollView
  ref={scrollRef as any}
  bounces
  alwaysBounceVertical
  showsVerticalScrollIndicator={false}
  onScroll={scrollHandler}
  scrollEventThrottle={16}
  contentContainerStyle={{ paddingBottom: 140 }}
>
```

- [ ] **Step 9.5: Manual verification on device**

Reload. Navigate to Discover tab.

Verify:
1. Tap X: current profile fades and slides up, new profile fades+slides in from below. Total duration ~440ms.
2. Tap Heart: same transition; match modal (when applicable) appears on top of the next profile after the entry animation.
3. Tap Gem: same transition; crush signal fires.
4. Rapid-tapping is blocked — you can't trigger a second transition until the first completes.
5. First profile (on initial load) appears without animation (snap-in).
6. Bottom of each profile's scroll content clears the action bar — the last item (e.g., details, final prompt) is visible above the FAB with breathing room.

- [ ] **Step 9.6: Commit**

```bash
git add app/\(tabs\)/discover.tsx components/discover/SwipeDeck/index.tsx
git commit -m "feat(discover): exit/entry transition between profiles

Tapping X/Gem/Heart runs a fade + upward slide exit (220ms), swaps
profile data, then a fade + upward slide entry (220ms). Parent drives
the exit via an imperative handle; isTransitioning state blocks
re-tap during the animation. Scroll content adds paddingBottom: 140
so last item clears the action bar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Rename `SwipeDeck` → `ProfileView`

**Goal:** Move the directory and update all imports. `SwipeIndicator.tsx` is not moved — it's deleted as part of this task.

**Files:**
- Rename: `components/discover/SwipeDeck/` → `components/discover/ProfileView/`
- Delete: `components/discover/SwipeDeck/SwipeIndicator.tsx`
- Modify: `app/(tabs)/discover.tsx` (import path)
- Modify: inside the renamed directory, imports that reference sibling files may need verification.

- [ ] **Step 10.1: Verify no remaining references to `SwipeIndicator`**

Run: `grep -rn "SwipeIndicator" components/ app/ lib/`

Expected: No results (it was removed during Task 5). If any show up, remove them before the rename.

- [ ] **Step 10.2: Remove the obsolete `SwipeIndicator.tsx` file**

Run:

```bash
git rm components/discover/SwipeDeck/SwipeIndicator.tsx
```

- [ ] **Step 10.3: Rename the directory**

Run:

```bash
git mv components/discover/SwipeDeck components/discover/ProfileView
```

- [ ] **Step 10.4: Update the import in `discover.tsx`**

In `app/(tabs)/discover.tsx`, find:

```tsx
import { SwipeDeck } from "@/components/discover/SwipeDeck"
```

Replace with:

```tsx
import { ProfileView, type ProfileViewHandle } from "@/components/discover/ProfileView"
```

Replace the other import line that pulls the type (from Task 9, Step 9.3):

```tsx
import type { SwipeDeckHandle } from "@/components/discover/SwipeDeck"
```

Delete this line if present (the named `ProfileViewHandle` import above subsumes it).

- [ ] **Step 10.5: Rename the component export**

In `components/discover/ProfileView/index.tsx`:

- Rename the `SwipeDeck` symbol to `ProfileView` everywhere in the file.
- Rename the `SwipeDeckProps` interface to `ProfileViewProps`.
- Rename the `SwipeDeckHandle` interface to `ProfileViewHandle`.

Run: `grep -n "SwipeDeck" components/discover/ProfileView/index.tsx`

Expected: no matches after rename (except in comments if you want to leave breadcrumbs — prefer removing).

- [ ] **Step 10.6: Update JSX usage in `discover.tsx`**

Find all `<SwipeDeck ... />` occurrences in `app/(tabs)/discover.tsx` (there is one, passed via `swipeDeckRef`) and rename to `<ProfileView ... />`. Rename `swipeDeckRef` → `profileViewRef` for consistency (optional but cleaner).

Also verify any references to `handleDeckSwipe`, `handleDeckScrollStateChange`, `deckProfiles`, `deckDistances`, `deckEntries`, `deckScrollY`, `deckScrollYShared`, `showDeckLoading`, `hasMainFeed`, `hasSkippedToShow`, `deckArea` — these all refer to the "deck" concept. Leave them as-is; they're internal to `discover.tsx` and the user's mental model is still a deck of profiles, just without stacking. Renaming would be churn for churn's sake.

- [ ] **Step 10.7: Verify TypeScript compiles**

Run: `yarn tsc --noEmit`

Fix any resulting errors (typically stale references to the old symbol name).

- [ ] **Step 10.8: Manual verification**

Reload the app. Verify Discover tab loads and all functionality from prior tasks still works: tap X/Heart/Gem, transitions, scroll-driven action bar, tooltips, photo carousel, message sheet, match modal.

- [ ] **Step 10.9: Commit**

```bash
git add -A components/discover/ProfileView components/discover/SwipeDeck app/\(tabs\)/discover.tsx
git commit -m "refactor(discover): rename SwipeDeck to ProfileView

Directory and all exports renamed to reflect that the component no
longer handles swipes — it renders a single profile with scroll, photo
carousel, and messaging. SwipeIndicator.tsx is deleted as part of
this move (swipe-direction arrows are gone with the gestures).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Delete obsolete components

**Goal:** Remove `SwipeCard.tsx` and `CrushSignalButton.tsx` after confirming no lingering consumers.

**Files:**
- Delete: `components/discover/SwipeCard.tsx`
- Delete: `components/discover/CrushSignalButton.tsx`

- [ ] **Step 11.1: Verify no consumers of `SwipeCard`**

Run: `grep -rn "SwipeCard\b" components/ app/ lib/ --include='*.ts' --include='*.tsx'`

Expected: only results inside `components/discover/SwipeCard.tsx` itself. If any other file imports it, stop and investigate.

- [ ] **Step 11.2: Delete `SwipeCard.tsx`**

Run:

```bash
git rm components/discover/SwipeCard.tsx
```

- [ ] **Step 11.3: Verify no consumers of `CrushSignalButton`**

Run: `grep -rn "CrushSignalButton" components/ app/ lib/ --include='*.ts' --include='*.tsx'`

Expected: only results inside `components/discover/CrushSignalButton.tsx` itself. If any other file imports it, stop and investigate.

- [ ] **Step 11.4: Delete `CrushSignalButton.tsx`**

Run:

```bash
git rm components/discover/CrushSignalButton.tsx
```

- [ ] **Step 11.5: Run TypeScript check**

Run: `yarn tsc --noEmit`

Expected: no errors.

- [ ] **Step 11.6: Manual verification**

Reload app. Smoke-test: Discover tab works, tap all three buttons, verify like/skip/crush flows end-to-end.

- [ ] **Step 11.7: Commit**

```bash
git commit -m "chore(discover): delete obsolete SwipeCard and CrushSignalButton

SwipeCard was only used by the stacked-card rendering path (removed
in Task 5). CrushSignalButton is superseded by the Gem FAB in
DiscoverActionBar. Verified no other consumers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Final QA pass

**Goal:** Run the full manual regression checklist from the spec. Capture any defects as follow-up items rather than in-line fixes.

- [ ] **Step 12.1: Fresh-install walkthrough**

On a simulator or test device:
1. Uninstall the app (or clear AsyncStorage).
2. Log in.
3. Navigate to Discover.
4. Verify tooltip walkthrough is exactly 3 steps (filter / photo swipe / image comment) — no swipe-up or swipe-down tooltips appear.
5. Complete walkthrough.

- [ ] **Step 12.2: Like / match flow (two accounts)**

With a second account already configured to like the current user:
1. Scroll through the feed.
2. When the reciprocal profile appears, tap Heart.
3. Verify: exit animation plays → next profile appears → MatchModal overlays shortly after.
4. Tap "Start chatting" — routes to the new chat thread.
5. Return to Discover, scroll another profile.
6. Tap Heart on a non-matching profile — verify: exit → next profile, no modal.

- [ ] **Step 12.3: Crush signal flow**

1. Tap Gem on a profile. Verify: signal sent, profile advances.
2. Tap Gem on another profile. Verify: "Crush signal unavailable — one per day" toast; profile does **not** advance; Gem button remains active (can retry tomorrow).

- [ ] **Step 12.4: Skip flow**

1. Tap X on a profile. Verify: exit animation, next profile appears. Profile persisted to skipped list.
2. Exhaust the main feed. Verify: "Showing people you skipped" banner appears, previously-X'd profiles cycle back.
3. Tap X on a revisit-skipped profile. Verify: advances to next; profile is removed from skipped list.

- [ ] **Step 12.5: Scroll-driven backdrop**

1. On a profile, scroll slowly from top to bottom.
2. Verify: gradient/blur intensifies smoothly as scrollY increases.
3. Scroll back up: reverses smoothly.
4. At bottom of content, last item (detail row or prompt) is visible above the action bar with breathing room.

- [ ] **Step 12.6: Header collapse**

1. Scroll a profile past 50pt.
2. Verify: full filter pills collapse to centered first-name.
3. Scroll back to top: pills return.

- [ ] **Step 12.7: Photo + message sheet flows**

1. Horizontal swipe between photos — works.
2. Pinch-to-zoom on a photo — works.
3. Tap a photo — message bottom sheet appears with image-chat context.
4. Tap a prompt — message bottom sheet appears with prompt-chat context.
5. Send a message — toast confirms.

- [ ] **Step 12.8: Report / block**

1. Tap the "more" button (three dots) on a photo.
2. Tap "Report & Block" from the confirmation dialog.
3. Verify: toast, profile removed, feed advances.

- [ ] **Step 12.9: Filter / preferences**

1. Open filter preferences modal — unchanged behavior.
2. Apply a distance filter / age range / workout type.
3. Verify: feed reloads with filtered results.
4. Toggle Gym Crush Mode (requires Plus). Verify: offer wall appears for free users; applies gym-only filter for Plus users.
5. Gym-crush-blocked state (no home gym set): action bar does **not** appear; "Set your home gym" CTA is shown.

- [ ] **Step 12.10: Empty feed state**

1. Exhaust all profiles (including skipped revisit).
2. Verify: "You've seen everyone" CTA appears; action bar does **not** appear.

- [ ] **Step 12.11: Offer wall / paywall**

1. As a free user, toggle Gym Crush Mode.
2. Verify: OfferWallModal opens; can close or purchase.

- [ ] **Step 12.12: Performance sanity**

1. Scroll a profile rapidly up and down.
2. Verify: no dropped frames; backdrop animation is smooth on mid-range device (iPhone 12 or equivalent).
3. Rapid-tap X on multiple profiles in sequence.
4. Verify: transitions play one after another, no re-tap race conditions.

- [ ] **Step 12.13: Log any defects as new TODO items**

If any of the above steps surfaces a defect, append it to `doc/TODO.md` under UI / UX polish rather than fixing inline. This preserves the PR scope. Keep fixes in a separate follow-up PR.

- [ ] **Step 12.14: Final commit (if any pending fixups)**

If any trivial tweaks were needed during QA (typos, minor style nits), commit them:

```bash
git add -A
git commit -m "chore(discover): final QA fixups

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Otherwise, skip this step.

---

## Post-implementation

After Task 12 completes, the branch is ready for PR. Run:

```bash
git log --oneline main..HEAD
```

Expected: 8-12 commits corresponding to Tasks 1–12 (some tasks combine into single commits, others split).

Open a PR targeting `main`. PR title: `feat(discover): Hinge-style FAB redesign`. PR body should reference the spec path and summarize the user-visible changes + cleanup.

---

## Spec coverage review

Mapping spec sections to tasks:

| Spec section | Covered by |
|---|---|
| Icon assets (X / Gem / Heart PNGs) | Task 1 |
| Component structure — Rename SwipeDeck → ProfileView | Task 10 |
| Component structure — New DiscoverActionBar | Tasks 1, 2, 3, 7, 8 |
| Files deleted (SwipeCard, SwipeIndicator, CrushSignalButton) | Tasks 10, 11 |
| Action-bar layout / sizing / backdrop composition | Tasks 1, 8 |
| Scroll-driven intensification | Tasks 7, 8 |
| Bottom padding in scroll content | Task 9 (Step 9.4) |
| Scroll handling — single useAnimatedScrollHandler | Task 5 (Step 5.2) + existing code |
| Header behavior unchanged | Preserved, verified in Task 12 Step 12.6 |
| Exit + entry animation | Task 9 |
| Match check post-mutation (no prefetch) | Task 4 + Task 5 Step 5.6 |
| Heart / Gem / X handler flows | Task 3, refined in Task 9 |
| Failure modes | Handled by existing `handleSwipe` error branches; preserved |
| Tooltip walkthrough — truncate to 3 steps | Task 6 |
| Storage key DISCOVER_SWIPE_DOWN_PASS_DONE removed | Task 6 |
| Layout sandwich + conditional rendering + loading overlay z-order | Tasks 2, 8, verified in Task 12 |
| Testing strategy — manual only (no unit framework) | Stated in plan header; Task 12 executes the manual checklist |
| Rollout — single PR, no feature flag | Post-implementation section |
