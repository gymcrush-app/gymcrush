# Fullscreen Pinch-to-Zoom on Discover Photos

**Date:** 2026-03-23
**Status:** Approved

## Problem

When a user pinch-zooms a profile photo in the SwipeDeck, the image scales within its container but is clipped by `overflow: "hidden"` at multiple levels: the `ZoomableImage` wrapper (`PhotoCarousel.tsx:65`), `PhotoSection`'s `insetContainer` (`PhotoSection.tsx:110`) and `roundedOverflow` (`PhotoSection.tsx:117`), plus the `photoWrapper` and ScrollView in SwipeDeck. The user expects the image to expand over the entire screen.

## Solution: Overlay Clone

Render a fullscreen `Animated.View` overlay in `SwipeDeck` (same level as the existing tick/confetti overlays). When a pinch starts in `ZoomableImage`, measure the image's screen position, pass the URI and layout up via a one-shot callback, and drive the overlay's scale via a shared value written directly on the UI thread. On release, animate back and hide.

## Requirements

- **Trigger:** Pinch only. No double-tap. No tap-to-open lightbox.
- **Pan:** No panning while zoomed.
- **Backdrop:** Semi-transparent dark overlay fades in as image scales up (max opacity `ZOOM_BACKDROP_MAX_OPACITY = 0.85`).
- **Centering:** Image transitions from its original position to screen center as zoom increases.
- **Snap-back:** On release, image animates back to original position/size and overlay hides.

## Constants

```ts
const ZOOM_BACKDROP_MAX_OPACITY = 0.85
const ZOOM_SPRING_CONFIG = { damping: 40, stiffness: 300 } // matches existing snap-back
const MIN_ZOOM = 1
const MAX_ZOOM = 4
```

## Architecture

### Data Flow: Shared Values vs Callbacks

To avoid frame drops from JS bridge crossings during the pinch gesture:

- **Scale:** `SwipeDeck` creates an `overlayScale` shared value and passes it down through `PhotoSection` → `PhotoCarousel` → `ZoomableImage`. The pinch gesture writes to this shared value directly on the UI thread. No callback needed for per-frame updates.
- **Zoom start:** `onZoomStart` callback fires once via `runOnJS` at pinch start. One frame of delay is acceptable for a one-shot event. This sets React state for the overlay URI and layout.
- **Zoom end:** `onZoomEnd` callback fires once via `runOnJS` at pinch finalize. Triggers the snap-back animation and cleanup.

### State & Shared Value Coordination

`SwipeDeck` owns:
- `zoomOverlay` (React state): `{ uri: string; layout: { x, y, width, height } } | null` — set by `onZoomStart`, cleared after snap-back animation settles
- `overlayScale` (shared value): Written by `ZoomableImage` pinch gesture on UI thread, read by overlay animated styles

The overlay renders conditionally on `zoomOverlay !== null`. Since `onZoomStart` fires via `runOnJS` before the first `onUpdate` that writes a scale > 1, the overlay mounts with scale 1 (invisible change) and is ready before any visible zoom happens.

### Component Changes

#### `PhotoCarousel.tsx` — `ZoomableImage`

New props:
- `onZoomStart(data: { uri: string; layout: { x, y, width, height } })` — called once on pinch start
- `onZoomEnd()` — called once on pinch finalize
- `overlayScale` (SharedValue<number>) — written to on each pinch update

Measurement: Use `useAnimatedRef` + reanimated's `measure()` (from `react-native-reanimated`) which runs synchronously on the UI thread. No bridge-crossing delay.

On pinch start: call reanimated `measure(animatedRef)` to get screen-space position, then `runOnJS(onZoomStart)({ uri, layout })`.

On pinch update: write `overlayScale.value = clampedScale` directly on UI thread.

On pinch finalize: call `runOnJS(onZoomEnd)()`. Also reset local scale to 1.

**Local scale suppression:** While the overlay is active, hold the local `ZoomableImage` scale at 1 to prevent the clipped zoom from showing through at edges. Use an `isZooming` shared value (set to 1 on start, 0 on end) to gate local scale updates.

#### `PhotoCarousel.tsx` — `PhotoCarousel`

Accept and forward `onZoomStart`, `onZoomEnd`, `overlayScale` props to each `ZoomableImage`.

New: Track a `zooming` boolean state. When true:
- Set `scrollEnabled={false}` on the horizontal ScrollView to prevent page changes during pinch
- Set `pointerEvents="none"` on the left/right tap zones to prevent accidental page navigation if a finger lands on a tap zone

#### `PhotoSection.tsx`

Forward `onZoomStart`, `onZoomEnd`, `overlayScale` props from SwipeDeck through to `PhotoCarousel`.

#### `SwipeDeck/index.tsx`

New state:
- `zoomOverlay: { uri: string; layout: { x, y, width, height } } | null`

New shared values:
- `overlayScale` (useSharedValue(1))

New overlay (rendered at same level as tick/confetti overlays, ~line 766):
- `zIndex: 12` (above cards at 1, above tick/heart at 8-10)
- `pointerEvents="none"` throughout
- Dark backdrop `Animated.View` with opacity derived from `overlayScale`
- `Animated.View` containing an `expo-image` `Image` of the zoomed photo

Animated styles derived from `overlayScale`:
- `progress = (overlayScale - 1) / (MAX_ZOOM - 1)` (0 at no zoom, 1 at max zoom)
- Image interpolates position from original layout rect toward screen center
- Image interpolates size from original dimensions toward fullscreen
- Backdrop opacity: `progress * ZOOM_BACKDROP_MAX_OPACITY`

### Animation Flow

1. **Pinch start:** `ZoomableImage` measures its screen position via reanimated's synchronous `measure()`. Calls `runOnJS(onZoomStart)({ uri, layout })`. SwipeDeck sets `zoomOverlay` state. Overlay mounts with scale 1 at the image's exact screen position — no visual jump.

2. **Pinch update:** `ZoomableImage` writes `overlayScale.value` on UI thread. Overlay animated styles react immediately (no bridge crossing). Image smoothly transitions from original position toward screen center. Backdrop fades in.

3. **Pinch end:** `ZoomableImage` calls `runOnJS(onZoomEnd)()`. SwipeDeck animates `overlayScale` back to 1 via `withSpring(1, ZOOM_SPRING_CONFIG)`. Backdrop fades out. On spring completion (via `withSpring` callback or `runOnUI` check), clear `zoomOverlay` state.

### Edge Cases

**Gesture conflicts with SwipeDeck pan:**
Pan and pinch are different gesture types — no conflict expected. As a safeguard, the pan handler's `onUpdate` short-circuits if `zoomOverlay` is non-null.

**ScrollView and tap zone interference:**
The horizontal ScrollView in `PhotoCarousel` is disabled (`scrollEnabled={false}`) during pinch. The left/right tap zones get `pointerEvents="none"` during pinch to prevent accidental page navigation.

**Additional clipping ancestors:**
`PhotoSection` has `overflow: "hidden"` on both `insetContainer` (line 110) and `roundedOverflow` (line 117). These clip the original image during zoom, but the overlay is rendered outside these containers entirely, so the clipping is irrelevant to the fullscreen effect. The original image is held at scale 1 during zoom to prevent the clipped version from being visible.

**Image loading:**
Use the same `expo-image` `Image` component with `cachePolicy="memory-disk"`. The image is already cached from the carousel, so no loading flash.

**Profile change during active zoom:**
The existing `useEffect` on `topProfile?.id` (SwipeDeck line 276) resets all shared values. Add: set `overlayScale.value = 1` and clear `zoomOverlay` state immediately (hard cut, no animation). This is acceptable because profile changes during an active pinch are an extreme edge case and a smooth exit animation would add complexity for negligible benefit.

**Performance:**
The overlay only mounts when `zoomOverlay` is non-null. When null, no extra views are rendered. The shared value approach means zero JS bridge traffic during the gesture — all animation runs on the UI thread.

## Files Modified

| File | Change |
|------|--------|
| `components/profile/PhotoCarousel.tsx` | Add `overlayScale` shared value prop, `onZoomStart`/`onZoomEnd` callbacks, `useAnimatedRef` + reanimated `measure()`, `isZooming` gate for local scale, `scrollEnabled`/`pointerEvents` guards during pinch |
| `components/profile/PhotoSection.tsx` | Forward `onZoomStart`, `onZoomEnd`, `overlayScale` props to `PhotoCarousel` |
| `components/discover/SwipeDeck/index.tsx` | Add `zoomOverlay` state, `overlayScale` shared value, fullscreen overlay with backdrop, wire props through `PhotoSection`, short-circuit pan during zoom, reset on profile change |
