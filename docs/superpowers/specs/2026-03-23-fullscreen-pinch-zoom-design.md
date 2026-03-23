# Fullscreen Pinch-to-Zoom on Discover Photos

**Date:** 2026-03-23
**Status:** Approved

## Problem

When a user pinch-zooms a profile photo in the SwipeDeck, the image scales within its container but is clipped by `overflow: "hidden"` on the `ZoomableImage` wrapper and several parent containers (ScrollView, photoWrapper, frontCard). The user expects the image to expand over the entire screen.

## Solution: Overlay Clone

Render a fullscreen `Animated.View` overlay in `SwipeDeck` (same level as the existing tick/confetti overlays). When a pinch starts in `ZoomableImage`, measure the image's screen position, pass the URI and layout up via callbacks, and drive the overlay's scale/opacity from the pinch gesture. On release, animate back and hide.

Fallback: If the overlay approach proves insufficient, explore a React context portal pattern.

## Requirements

- **Trigger:** Pinch only. No double-tap. No tap-to-open lightbox.
- **Pan:** No panning while zoomed.
- **Backdrop:** Semi-transparent dark overlay fades in as image scales up.
- **Centering:** Image transitions from its original position to screen center as zoom increases.
- **Snap-back:** On release, image animates back to original position/size and overlay hides.

## Architecture

### Component Changes

#### `PhotoCarousel.tsx` — `ZoomableImage`

New callback props:
- `onZoomStart(data: { uri: string; layout: { x: number; y: number; width: number; height: number } })` — called on pinch start after `measure()`
- `onZoomUpdate(data: { scale: number })` — called on each pinch update
- `onZoomEnd()` — called on pinch finalize

On pinch start, call `ref.measure()` on the container to get screen-space position (`pageX`, `pageY`, `width`, `height`), then invoke `onZoomStart`. On update, forward the scale. On finalize, call `onZoomEnd`.

The existing local scale animation continues to run but is visually hidden behind the overlay.

#### `PhotoCarousel.tsx` — `PhotoCarousel`

Accept and forward `onZoomStart`, `onZoomUpdate`, `onZoomEnd` props to each `ZoomableImage`.

#### `SwipeDeck/index.tsx`

New state:
- `zoomOverlay: { uri: string; layout: { x: number; y: number; width: number; height: number } } | null`

New shared values:
- `overlayScale` — drives the image scale in the overlay
- `overlayOpacity` — drives the backdrop opacity

New overlay (rendered at the same level as tick/confetti overlays, ~line 766):
- `zIndex: 12` (above cards at 1, above tick at 8)
- `pointerEvents="none"` throughout (pinch gesture still drives from the original component)
- Dark backdrop `Animated.View` with opacity driven by zoom progress
- `Animated.View` containing an `expo-image` `Image` of the zoomed photo

### Animation Flow

1. **Pinch start:** `ZoomableImage` measures its screen position via `ref.measure()`. Calls `onZoomStart({ uri, layout })`. Overlay becomes visible at opacity 0, image positioned at the measured layout rect.

2. **Pinch update:** Scale forwarded via `onZoomUpdate({ scale })`. Overlay computes:
   - `progress = (scale - 1) / (MAX_ZOOM - 1)` (0 at no zoom, 1 at max zoom)
   - Image interpolates from original position/size toward screen center as progress increases
   - Backdrop opacity fades from 0 to ~0.85 following progress

3. **Pinch end:** `onZoomEnd()` fires. Overlay animates:
   - Scale back to 1 via `withSpring({ damping: 40, stiffness: 300 })` (matches existing snap-back config)
   - Backdrop opacity to 0 via same spring
   - Once settled, clear `zoomOverlay` state

The overlay image starts at exactly the same screen position and size as the original — no visual jump on activation.

### Edge Cases

**Gesture conflicts with SwipeDeck pan:**
The pan gesture on the card and the pinch gesture inside `ZoomableImage` are different gesture types — no conflict expected. As a safeguard, the pan handler's `onUpdate` short-circuits if `zoomOverlay` is non-null.

**ScrollView interference:**
The horizontal `ScrollView` in `PhotoCarousel` could conflict with pinch. Set `scrollEnabled={false}` on the ScrollView while a pinch is active (tracked via a `zooming` boolean state).

**Image loading:**
Use the same `expo-image` `Image` component with `cachePolicy="memory-disk"`. The image is already cached from the carousel, so no loading flash.

**Profile change cleanup:**
The existing `useEffect` on `topProfile?.id` (SwipeDeck line 276) resets all shared values. Add `zoomOverlay` state reset there.

**Performance:**
The overlay is always mounted but invisible (opacity 0, no image source when `zoomOverlay` is null). Only when `zoomOverlay` is set does it render an image. No mount/unmount cost during the gesture.

## Files Modified

| File | Change |
|------|--------|
| `components/profile/PhotoCarousel.tsx` | Add zoom callback props to `ZoomableImage` and `PhotoCarousel`, add ref for `measure()`, disable ScrollView scroll during pinch |
| `components/discover/SwipeDeck/index.tsx` | Add zoom overlay state/shared values, render fullscreen overlay, wire callbacks through `PhotoSection`, short-circuit pan during zoom |
| `components/profile/PhotoSection.tsx` | Forward zoom callback props from SwipeDeck to PhotoCarousel |
