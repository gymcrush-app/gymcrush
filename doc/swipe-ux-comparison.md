# Discover Card UX — Comparison & Options

## Side-by-Side: Hinge vs GymCrush (Current) vs Proposed Options

| | **Hinge** | **GymCrush (Current)** | **Option A: Scroll + Flick** | **Option B: Card + Detail Sheet** |
|---|---|---|---|---|
| **Profile browsing** | Full-screen scrollable feed (photos + prompts interleaved) | Scrollable card (photos + prompts inside a card) | Same as Hinge — full-screen scrollable profile | Fixed card shows photo + name + key stats (not scrollable) |
| **Pass (not interested)** | Tap X button | Pull card down (overscroll) | Quick flick down dismisses | Swipe card down OR tap X button |
| **Like** | Tap heart button, or like a specific photo/prompt | Pull card up past end of scroll | Quick flick up dismisses | Swipe card up OR tap heart button |
| **Next card preview** | None — one profile at a time, simple transition | Next card peeks behind current card | None — crossfade/slide transition between profiles | Next card visible behind current during swipe |
| **Card stack visual** | No | Yes | No | Yes |
| **Scroll vs swipe conflict** | None — swiping not used for decisions | Yes — scroll bounce fights swipe gesture, causing visual bugs (gap, double movement) | Minimal — gesture arbitration separates slow drag (scroll) from fast flick (dismiss) | None — card doesn't scroll, so swipe is unambiguous |
| **Full profile access** | Scroll down to see everything | Scroll down within the card | Scroll down to see everything | Tap card to open scrollable detail sheet |
| **Gesture complexity** | Simple (scroll only, buttons for actions) | High (scroll + overscroll-swipe in both directions on same axis) | Medium (scroll + flick arbitration) | Low (swipe only on card, scroll only in sheet) |

---

## The Core Problem

GymCrush currently tries to combine **scrollable profile content** with **vertical swipe-to-dismiss** on the same card, on the same axis. This creates a fundamental gesture conflict:

- **Scrolling down** and **swiping down to pass** are the same physical gesture
- **Scrolling up** and **swiping up to like** are the same physical gesture
- The system must guess user intent based on scroll position (at top? at bottom? mid-scroll?)
- ScrollView "bounce" and card translation fight each other, causing visual artifacts (growing gaps, double movement)

**Hinge avoids this entirely** by not using swipe gestures for pass/like decisions. Scroll is only for browsing. Decisions are button-driven.

**Tinder avoids this entirely** by not having scrollable cards. The card shows limited info. Swipe is only for decisions. Full profile is accessed by tapping.

No major dating app combines vertical scroll + vertical swipe-to-dismiss on the same view.

---

## Option A: Scroll + Flick (Hinge-inspired)

**How it works:** The profile is a full-screen scrollable page. Fast flick gestures are interpreted as pass/like, while normal scroll speed is treated as browsing.

**Gesture arbitration logic:**
- Velocity below threshold → scroll the profile
- Velocity above threshold + at/near scroll boundaries → dismiss (pass or like)
- Mid-profile fast flick → could either be ignored or treated as dismiss (design choice)

**Pros:**
- Closest to "Hinge but with flick to dismiss"
- Users see the full profile without tapping into a detail view
- Modern, content-forward feel

**Cons:**
- Gesture arbitration is imprecise — users may accidentally dismiss when trying to scroll quickly, or fail to dismiss when they intended to
- No "next card preview" (revealing the next profile behind the current one requires card translation, which reintroduces the scroll conflict)
- Needs careful velocity tuning — too sensitive = accidental dismissals, too conservative = feels unresponsive
- Less proven pattern (no major app does exactly this)

**Risk level:** Medium — achievable but requires iteration to get gesture thresholds right.

---

## Option B: Card + Detail Sheet (Tinder-inspired)

**How it works:** The discover view shows a swipeable card with the hero photo, name, age, key stats, and first prompt. Swiping up/down is purely for like/pass. Tapping the card opens a scrollable bottom sheet or full-screen modal with the complete profile.

**Pros:**
- Clean gesture separation — no scroll/swipe conflict possible
- Card stack animation works perfectly (next card peeks behind current)
- DROP/CRUSH overlays work naturally with card translation
- Proven, well-understood UX pattern
- Most robust and maintainable
- We already have `ProfileDetailSheet` that could serve as the detail view

**Cons:**
- Requires an extra tap to see full profile details
- Some users may not discover the tap-to-expand interaction
- Less content visible upfront (need to design the card to show enough to make a decision)

**Risk level:** Low — straightforward to implement, well-tested pattern.

---

## Option C: Hybrid (Recommended)

**How it works:** Combine the best of both:

1. **Card shows rich preview** — hero photo, name/age/distance, first prompt, key info badges. Enough to make a quick decision without tapping.
2. **Swipe up/down** on the card for like/pass (no scroll conflict — card content is fixed)
3. **Tap card** to expand into full scrollable profile (bottom sheet slides up)
4. **In the expanded view**, swipe gestures are disabled — it's pure scroll. Like/pass buttons are available at the bottom.

This gives you:
- The quick-swipe dopamine of Tinder
- The content depth of Hinge (one tap away)
- Zero gesture conflicts
- Card stack animation with next-card preview

**This is essentially Option B with a richer card preview** — the card itself shows more info so the detail sheet feels like a bonus, not a requirement.

---

## Recommendation

**Option C (Hybrid)** gives clients the "best of both worlds" without the fragility. The current scroll-inside-card approach will continue to produce edge cases and visual bugs because the fundamental gesture conflict can't be fully resolved — only mitigated.

The question for clients: **Is the ability to scroll within the card (without tapping) important enough to accept ongoing UX trade-offs?** If yes, Option A. If not, Option B/C gives a more polished, reliable experience.
