# Fullscreen Pinch-to-Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make profile photo pinch-to-zoom expand fullscreen with a dark backdrop instead of being clipped to the image container.

**Architecture:** Overlay clone pattern — `ZoomableImage` measures its position and writes scale to a shared value on the UI thread; `SwipeDeck` renders a fullscreen overlay that reads the shared value and animates the image from its original position to screen center with a dark backdrop.

**Tech Stack:** React Native, react-native-reanimated (useAnimatedRef, measure, useSharedValue, useAnimatedStyle, withSpring, runOnJS), react-native-gesture-handler (Gesture.Pinch), expo-image

**Spec:** `docs/superpowers/specs/2026-03-23-fullscreen-pinch-zoom-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `components/profile/PhotoCarousel.tsx` | `ZoomableImage` pinch gesture writes `overlayScale` shared value, measures position on start, fires `onZoomStart`/`onZoomEnd` callbacks. `PhotoCarousel` forwards props and disables scroll/tap zones during zoom. |
| `components/profile/PhotoSection.tsx` | Pass-through: forwards zoom props from SwipeDeck to PhotoCarousel. |
| `components/discover/SwipeDeck/index.tsx` | Owns `zoomOverlay` state and `overlayScale` shared value. Renders fullscreen zoom overlay with backdrop. Wires callbacks through PhotoSection. Resets on profile change. |

---

### Task 1: Update `ZoomableImage` to support overlay zoom

**Files:**
- Modify: `components/profile/PhotoCarousel.tsx:28-78`

- [ ] **Step 1: Add new imports and update ZoomableImage props**

Add `useAnimatedRef` and `measure` imports from reanimated. Update the `ZoomableImage` function signature to accept new props:

```tsx
// Add to existing reanimated imports at line 12-17:
import Animated, {
  cancelAnimation,
  measure,
  runOnJS,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated"
```

```tsx
// New ZoomableImage props type (replace the inline type at lines 35-38):
interface ZoomableImageProps {
  uri: string
  width: number
  height: number
  onZoomStart?: (data: { uri: string; layout: { x: number; y: number; width: number; height: number } }) => void
  onZoomEnd?: () => void
  overlayScale?: SharedValue<number>
}
```

- [ ] **Step 2: Add animated ref and isZooming gate to ZoomableImage**

Inside `ZoomableImage`, add the animated ref for measurement and an `isZooming` shared value to suppress local scale while overlay is active:

```tsx
function ZoomableImage({
  uri,
  width,
  height,
  onZoomStart,
  onZoomEnd,
  overlayScale,
}: ZoomableImageProps) {
  const containerRef = useAnimatedRef<Animated.View>()
  const scaleSaved = useSharedValue(1)
  const scale = useSharedValue(1)
  const isZooming = useSharedValue(0)
```

- [ ] **Step 3: Update pinch gesture to write overlayScale and fire callbacks**

Replace the existing pinch gesture (lines 43-58) with the overlay-aware version:

```tsx
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(scale)
      scaleSaved.value = scale.value

      if (overlayScale && onZoomStart) {
        const measured = measure(containerRef)
        if (measured) {
          isZooming.value = 1
          runOnJS(onZoomStart)({
            uri,
            layout: {
              x: measured.pageX,
              y: measured.pageY,
              width: measured.width,
              height: measured.height,
            },
          })
        }
      }
    })
    .onUpdate((e) => {
      const next = scaleSaved.value * e.scale
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))

      if (overlayScale && isZooming.value === 1) {
        overlayScale.value = clamped
        // Hold local scale at 1 so the clipped version doesn't show
        scale.value = 1
      } else {
        scale.value = clamped
      }
    })
    .onFinalize(() => {
      scaleSaved.value = 1

      if (overlayScale && isZooming.value === 1) {
        isZooming.value = 0
        overlayScale.value = 1 // Will be animated by SwipeDeck via onZoomEnd
        if (onZoomEnd) {
          runOnJS(onZoomEnd)()
        }
      }

      scale.value = withSpring(1, {
        damping: 40,
        stiffness: 300,
      })
    })
```

- [ ] **Step 4: Update the ZoomableImage return to use animated ref**

Change the outer `View` to `Animated.View` with the ref (currently line 65):

```tsx
  return (
    <Animated.View
      ref={containerRef}
      style={{ width, height, overflow: "hidden" }}
      collapsable={false}
    >
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Image
            source={{ uri }}
            style={{ width, height }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
```

- [ ] **Step 5: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "PhotoCarousel" | head -20`
Expected: No errors related to PhotoCarousel.tsx

- [ ] **Step 6: Commit**

```bash
git add components/profile/PhotoCarousel.tsx
git commit -m "feat(zoom): update ZoomableImage to support overlay scale and measurement"
```

---

### Task 2: Update `PhotoCarousel` to forward zoom props and guard scroll/taps

**Files:**
- Modify: `components/profile/PhotoCarousel.tsx:20-26,112-193`

- [ ] **Step 1: Update PhotoCarouselProps interface**

Add zoom props to the interface (currently lines 21-26):

```tsx
interface PhotoCarouselProps {
  photos: string[]
  height?: number
  /** Width of each photo page (default SCREEN_WIDTH). Use for inset discover layout. */
  width?: number
  onZoomStart?: (data: { uri: string; layout: { x: number; y: number; width: number; height: number } }) => void
  onZoomEnd?: () => void
  overlayScale?: SharedValue<number>
}
```

- [ ] **Step 2: Add zooming state and update component signature**

Update the `PhotoCarousel` function to destructure new props and add zooming state:

```tsx
export function PhotoCarousel({
  photos,
  height = 400,
  width = SCREEN_WIDTH,
  onZoomStart,
  onZoomEnd,
  overlayScale,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zooming, setZooming] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
```

- [ ] **Step 3: Create wrapped zoom callbacks that manage zooming state**

Add these handlers after the `goToIndex` callback:

```tsx
  const handleZoomStart = useCallback(
    (data: { uri: string; layout: { x: number; y: number; width: number; height: number } }) => {
      setZooming(true)
      onZoomStart?.(data)
    },
    [onZoomStart],
  )

  const handleZoomEnd = useCallback(() => {
    setZooming(false)
    onZoomEnd?.()
  }, [onZoomEnd])
```

- [ ] **Step 4: Forward zoom props to ZoomableImage**

Update the `ZoomableImage` usage in the map (currently lines 149-156):

```tsx
        {photos.map((photo, index) => (
          <ZoomableImage
            key={index}
            uri={photo}
            width={width}
            height={height}
            onZoomStart={handleZoomStart}
            onZoomEnd={handleZoomEnd}
            overlayScale={overlayScale}
          />
        ))}
```

- [ ] **Step 5: Disable scroll and tap zones during zoom**

Update the ScrollView to respect zooming state (currently line 141-147):

```tsx
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={!zooming}
      >
```

Update the tap zones to be disabled during zoom (currently lines 158-168):

```tsx
      {photos.length > 1 && (
        <>
          <Pressable
            style={[styles.tapZone, styles.tapZoneLeft]}
            onPress={() => goToIndex(currentIndex - 1)}
            pointerEvents={zooming ? "none" : "auto"}
            disabled={zooming}
          />
          <Pressable
            style={[styles.tapZone, styles.tapZoneRight]}
            onPress={() => goToIndex(currentIndex + 1)}
            pointerEvents={zooming ? "none" : "auto"}
            disabled={zooming}
          />
        </>
      )}
```

- [ ] **Step 6: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "PhotoCarousel" | head -20`
Expected: No errors related to PhotoCarousel.tsx

- [ ] **Step 7: Commit**

```bash
git add components/profile/PhotoCarousel.tsx
git commit -m "feat(zoom): forward zoom props through PhotoCarousel, guard scroll and taps"
```

---

### Task 3: Update `PhotoSection` to forward zoom props

**Files:**
- Modify: `components/profile/PhotoSection.tsx`

- [ ] **Step 1: Add SharedValue import**

Add the import at the top of the file:

```tsx
import type { SharedValue } from "react-native-reanimated"
```

- [ ] **Step 2: Add zoom props to PhotoSectionProps interface**

Extend the interface (currently lines 16-26):

```tsx
interface PhotoSectionProps {
  photos: string[];
  imageHeight: number;
  photoWidth?: number;
  onOpenImageChat: () => void;
  showPhotoSwipeTooltip?: boolean;
  showImageCommentTooltip?: boolean;
  onPhotoSwipeTooltipClose?: () => void;
  onImageCommentTooltipClose?: () => void;
  onZoomStart?: (data: { uri: string; layout: { x: number; y: number; width: number; height: number } }) => void;
  onZoomEnd?: () => void;
  overlayScale?: SharedValue<number>;
}
```

- [ ] **Step 3: Destructure new props and forward to PhotoCarousel**

Update the component to accept and forward the props (currently line 28-37 for destructuring, line 62 for PhotoCarousel):

```tsx
export const PhotoSection = React.memo<PhotoSectionProps>(({
  photos,
  imageHeight,
  photoWidth = SCREEN_WIDTH,
  onOpenImageChat,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
  onZoomStart,
  onZoomEnd,
  overlayScale,
}) => {
```

Update the PhotoCarousel usage (currently line 62):

```tsx
          <PhotoCarousel
            photos={photos}
            height={imageHeight}
            width={photoWidth}
            onZoomStart={onZoomStart}
            onZoomEnd={onZoomEnd}
            overlayScale={overlayScale}
          />
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "PhotoSection" | head -20`
Expected: No errors related to PhotoSection.tsx

- [ ] **Step 5: Commit**

```bash
git add components/profile/PhotoSection.tsx
git commit -m "feat(zoom): forward zoom props through PhotoSection"
```

---

### Task 4: Add fullscreen zoom overlay to `SwipeDeck`

**Files:**
- Modify: `components/discover/SwipeDeck/index.tsx`

- [ ] **Step 1: Add expo-image import and zoom constants**

Add the `Image` import from expo-image (the existing `Image` import from react-native on line 34 is for the heart PNG — we need expo-image for the cached profile photo). Add constants after the existing constants block (after line 76):

```tsx
import { Image as ExpoImage } from "expo-image"
```

```tsx
// After BACK_CARD_OPACITY on line 76:
const ZOOM_BACKDROP_MAX_OPACITY = 0.85
const ZOOM_SPRING_CONFIG = { damping: 40, stiffness: 300 }
const ZOOM_MAX = 4
```

- [ ] **Step 2: Add zoom state and shared value**

Add inside the component, after the existing shared values (after line 157):

```tsx
  // --- Fullscreen zoom overlay ---
  const overlayScale = useSharedValue(1)
  const zoomLayoutX = useSharedValue(0)
  const zoomLayoutY = useSharedValue(0)
  const zoomLayoutW = useSharedValue(0)
  const zoomLayoutH = useSharedValue(0)
  const [zoomOverlay, setZoomOverlay] = useState<{
    uri: string
    layout: { x: number; y: number; width: number; height: number }
  } | null>(null)
```

- [ ] **Step 3: Add zoom callback handlers**

Add after the `handleReportAndBlock` callback (after line 556):

```tsx
  const handleZoomStart = useCallback(
    (data: { uri: string; layout: { x: number; y: number; width: number; height: number } }) => {
      zoomLayoutX.value = data.layout.x
      zoomLayoutY.value = data.layout.y
      zoomLayoutW.value = data.layout.width
      zoomLayoutH.value = data.layout.height
      setZoomOverlay(data)
    },
    [],
  )

  const handleZoomEnd = useCallback(() => {
    overlayScale.value = withSpring(1, ZOOM_SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(setZoomOverlay)(null)
      }
    })
  }, [])
```

- [ ] **Step 4: Add zoom overlay animated styles**

Add after the existing `devExpandAnimatedStyle` (after line 541):

```tsx
  const zoomBackdropStyle = useAnimatedStyle(() => {
    if (overlayScale.value <= 1) return { opacity: 0 }
    const progress = Math.min(1, (overlayScale.value - 1) / (ZOOM_MAX - 1))
    return { opacity: progress * ZOOM_BACKDROP_MAX_OPACITY }
  })

  // zoomLayout* shared values (declared in Step 2) are written by handleZoomStart
  // (Step 3) and read here — all on the UI thread, no bridge crossing.
  const zoomImageStyle = useAnimatedStyle(() => {
    const w = zoomLayoutW.value
    const h = zoomLayoutH.value
    if (w === 0 || h === 0) return { opacity: 0 }

    const scaleVal = overlayScale.value
    const progress = Math.min(1, (scaleVal - 1) / (ZOOM_MAX - 1))

    // Interpolate from original position to screen center
    const centerX = (SCREEN_WIDTH - w) / 2
    const centerY = (SCREEN_HEIGHT - h) / 2
    const currentX = zoomLayoutX.value + (centerX - zoomLayoutX.value) * progress
    const currentY = zoomLayoutY.value + (centerY - zoomLayoutY.value) * progress

    return {
      position: "absolute" as const,
      left: currentX,
      top: currentY,
      width: w,
      height: h,
      transform: [{ scale: scaleVal }],
      opacity: scaleVal > 1 ? 1 : 0,
    }
  })
```

- [ ] **Step 5: Add pan gesture guard for active zoom**

Add a zoom guard inside the pan gesture's `.onUpdate` handler. Insert the new line immediately after the existing `if (isDismissing.value) return` check (line 193), before the `if (Math.abs(...))` check (line 194):

```tsx
      if (isDismissing.value) return
      if (overlayScale.value > 1) return  // Block pan while zoom overlay is active
      if (Math.abs(event.translationY) > Math.abs(event.translationX)) {
```

- [ ] **Step 6: Add zoom overlay reset on profile change**

Add to the existing `useEffect` on `topProfile?.id` (lines 276-300). Insert after `isDismissing.value = false` (line 297) and before `bottomSheetRef.current?.close()` (line 298):

```tsx
    isDismissing.value = false
    // Zoom overlay reset
    overlayScale.value = 1
    zoomLayoutX.value = 0
    zoomLayoutY.value = 0
    zoomLayoutW.value = 0
    zoomLayoutH.value = 0
    setZoomOverlay(null)
    bottomSheetRef.current?.close()
```

- [ ] **Step 7: Wire zoom props to the top-card PhotoSection**

Update the top-card `PhotoSection` usage (currently lines 638-647) to pass zoom props:

```tsx
                  <PhotoSection
                    photos={topProfile.photo_urls}
                    imageHeight={effectiveImageHeight}
                    photoWidth={DISCOVER_PHOTO_WIDTH}
                    onOpenImageChat={handleOpenImageChat}
                    showPhotoSwipeTooltip={showPhotoSwipeTooltip}
                    showImageCommentTooltip={showImageCommentTooltip}
                    onPhotoSwipeTooltipClose={onPhotoSwipeTooltipClose}
                    onImageCommentTooltipClose={onImageCommentTooltipClose}
                    onZoomStart={handleZoomStart}
                    onZoomEnd={handleZoomEnd}
                    overlayScale={overlayScale}
                  />
```

- [ ] **Step 8: Render the zoom overlay**

Add the overlay JSX after the tick overlay block (after line 788, before the dev-mode heart preview):

```tsx
      {/* Fullscreen zoom overlay */}
      {zoomOverlay && (
        <View style={styles.zoomOverlayContainer} pointerEvents="none">
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: "black" }, zoomBackdropStyle]}
          />
          <Animated.View style={zoomImageStyle}>
            <ExpoImage
              source={{ uri: zoomOverlay.uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </View>
      )}
```

- [ ] **Step 9: Add the zoom overlay container style**

Add to the StyleSheet (after `tickCircle` style, before the closing `})`:

```tsx
  zoomOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
  },
```

- [ ] **Step 10: Verify the file compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "SwipeDeck\|PhotoSection\|PhotoCarousel" | head -20`
Expected: No errors related to these files.

- [ ] **Step 11: Commit**

```bash
git add components/discover/SwipeDeck/index.tsx
git commit -m "feat(zoom): add fullscreen zoom overlay to SwipeDeck"
```

---

### Task 5: Manual QA on device

**Files:** None (testing only)

- [ ] **Step 1: Start the dev server**

Run: `npx expo start`

- [ ] **Step 2: Test basic pinch zoom**

On device/simulator, navigate to Discover tab. Pinch-to-zoom on a profile photo. Verify:
- Image expands beyond its container to fill the screen
- Dark backdrop fades in behind the image
- Image transitions smoothly toward screen center as zoom increases

- [ ] **Step 3: Test snap-back**

Release the pinch. Verify:
- Image springs back to original position and size
- Backdrop fades out
- Overlay disappears completely

- [ ] **Step 4: Test scroll and tap isolation**

While pinching, verify:
- Horizontal photo carousel does NOT scroll to next/previous photo
- Tap zones on left/right edges are disabled
- Vertical SwipeDeck pan gesture does NOT activate

- [ ] **Step 5: Test profile change during zoom (edge case)**

If possible, trigger a profile change while zooming (e.g., swipe-up triggers during zoom). Verify the overlay clears immediately without crash.

- [ ] **Step 6: Test with multiple photos**

Swipe to photo 2 or 3 in the carousel, then pinch-to-zoom. Verify the correct photo appears in the overlay at the correct screen position.

- [ ] **Step 7: Commit all changes if any fixes were needed**

```bash
git add -A
git commit -m "fix(zoom): address QA findings from manual testing"
```
