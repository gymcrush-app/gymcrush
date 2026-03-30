import { Image } from "expo-image"
import { Plus, X } from "lucide-react-native"
import React, { useCallback, useMemo, useRef } from "react"
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import type { SharedValue } from "react-native-reanimated"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { borderRadius, colors, spacing } from "@/theme"

const COLUMNS = 3
const GAP = spacing[3]
const SPRING_CONFIG = { damping: 28, stiffness: 200 }

interface DraggablePhotoGridProps {
  photoUrls: string[]
  maxPhotos: number
  isPickingPhoto: boolean
  onReorder: (urls: string[]) => void
  onRemove: (url: string) => void
  onAdd: () => void
}

export function DraggablePhotoGrid({
  photoUrls,
  maxPhotos,
  isPickingPhoto,
  onReorder,
  onRemove,
  onAdd,
}: DraggablePhotoGridProps) {
  const gridLayoutRef = useRef({ x: 0, y: 0, width: 0 })
  const cellWidth = useSharedValue(0)
  const cellHeight = useSharedValue(0)
  // Which slot index is currently being hovered over (-1 = none)
  const hoverTarget = useSharedValue(-1)
  // How many filled slots (shared so worklets can read it)
  const filledCount = useSharedValue(photoUrls.length)
  filledCount.value = photoUrls.length

  const slots = useMemo(() => {
    const result: (string | null)[] = [...photoUrls]
    while (result.length < maxPhotos) result.push(null)
    return result
  }, [photoUrls, maxPhotos])

  const onGridLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width } = e.nativeEvent.layout
      gridLayoutRef.current.width = width
      const w = (width - GAP * (COLUMNS - 1)) / COLUMNS
      cellWidth.value = w
      cellHeight.value = w * (4 / 3)
    },
    [cellWidth, cellHeight],
  )

  // Compute which grid index (0-5) a point is over; -1 if none
  const getSlotAtPosition = useCallback(
    (absX: number, absY: number): number => {
      "worklet"
      if (cellWidth.value === 0) return -1
      const cw = cellWidth.value
      const ch = cellHeight.value
      const col = Math.floor((absX + GAP / 2) / (cw + GAP))
      const row = Math.floor((absY + GAP / 2) / (ch + GAP))
      if (col < 0 || col >= COLUMNS || row < 0 || row >= 2) return -1
      return row * COLUMNS + col
    },
    [cellWidth, cellHeight],
  )

  const swapPhotos = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return
      // Only swap between filled slots
      if (fromIdx >= photoUrls.length || toIdx >= photoUrls.length) return
      const next = [...photoUrls]
      const tmp = next[fromIdx]
      next[fromIdx] = next[toIdx]
      next[toIdx] = tmp
      onReorder(next)
    },
    [photoUrls, onReorder],
  )

  return (
    <View style={styles.grid} onLayout={onGridLayout}>
      {[0, 1].map((row) => (
        <View
          key={row}
          style={[styles.row, row === 1 && styles.rowLast]}
        >
          {slots.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map((url, colIdx) => {
            const index = row * COLUMNS + colIdx
            return (
              <DraggableSlot
                key={url ? `p-${url}` : `e-${index}`}
                url={url}
                index={index}
                totalFilled={photoUrls.length}
                maxPhotos={maxPhotos}
                isPickingPhoto={isPickingPhoto}
                cellWidth={cellWidth}
                cellHeight={cellHeight}
                filledCount={filledCount}
                hoverTarget={hoverTarget}
                getSlotAtPosition={getSlotAtPosition}
                onSwap={swapPhotos}
                onRemove={onRemove}
                onAdd={onAdd}
              />
            )
          })}
        </View>
      ))}
    </View>
  )
}

// ─── Individual draggable slot ────────────────────────────────────────

interface DraggableSlotProps {
  url: string | null
  index: number
  totalFilled: number
  maxPhotos: number
  isPickingPhoto: boolean
  cellWidth: SharedValue<number>
  cellHeight: SharedValue<number>
  filledCount: SharedValue<number>
  hoverTarget: SharedValue<number>
  getSlotAtPosition: (x: number, y: number) => number
  onSwap: (from: number, to: number) => void
  onRemove: (url: string) => void
  onAdd: () => void
}

function DraggableSlot({
  url,
  index,
  totalFilled,
  maxPhotos,
  isPickingPhoto,
  cellWidth,
  cellHeight,
  filledCount,
  hoverTarget,
  getSlotAtPosition,
  onSwap,
  onRemove,
  onAdd,
}: DraggableSlotProps) {
  const hasPhoto = url != null
  const canAdd = !hasPhoto && index === totalFilled && totalFilled < maxPhotos && !isPickingPhoto

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const zIdx = useSharedValue(0)
  const isDragging = useSharedValue(false)

  const handleSwap = useCallback(
    (from: number, to: number) => onSwap(from, to),
    [onSwap],
  )

  const gesture = useMemo(() => {
    if (!hasPhoto) return Gesture.Manual()

    return Gesture.Pan()
      .activateAfterLongPress(250)
      .onStart(() => {
        isDragging.value = true
        zIdx.value = 100
        scale.value = withSpring(1.08, SPRING_CONFIG)
      })
      .onUpdate((e) => {
        translateX.value = e.translationX
        translateY.value = e.translationY
        // Update hover target for visual feedback
        const col = index % COLUMNS
        const row = Math.floor(index / COLUMNS)
        const originX = col * (cellWidth.value + GAP) + cellWidth.value / 2
        const originY = row * (cellHeight.value + GAP) + cellHeight.value / 2
        const target = getSlotAtPosition(
          originX + e.translationX,
          originY + e.translationY,
        )
        // Only highlight filled slots that aren't the dragged one
        if (target >= 0 && target !== index && target < filledCount.value) {
          hoverTarget.value = target
        } else {
          hoverTarget.value = -1
        }
      })
      .onEnd((e) => {
        const col = index % COLUMNS
        const row = Math.floor(index / COLUMNS)
        const originX = col * (cellWidth.value + GAP) + cellWidth.value / 2
        const originY = row * (cellHeight.value + GAP) + cellHeight.value / 2
        const targetSlot = getSlotAtPosition(
          originX + e.translationX,
          originY + e.translationY,
        )
        if (targetSlot >= 0 && targetSlot !== index) {
          runOnJS(handleSwap)(index, targetSlot)
        }
        hoverTarget.value = -1
        translateX.value = withSpring(0, SPRING_CONFIG)
        translateY.value = withSpring(0, SPRING_CONFIG)
        scale.value = withSpring(1, SPRING_CONFIG)
        isDragging.value = false
        zIdx.value = withTiming(0, { duration: 300 })
      })
      .onFinalize(() => {
        hoverTarget.value = -1
        translateX.value = withSpring(0, SPRING_CONFIG)
        translateY.value = withSpring(0, SPRING_CONFIG)
        scale.value = withSpring(1, SPRING_CONFIG)
        isDragging.value = false
        zIdx.value = withTiming(0, { duration: 300 })
      })
  }, [hasPhoto, index, cellWidth, cellHeight, filledCount, hoverTarget, getSlotAtPosition, handleSwap, translateX, translateY, scale, zIdx, isDragging])

  // 0 → 1 when this slot is the hover target
  const hoverProgress = useDerivedValue(() =>
    withTiming(hoverTarget.value === index ? 1 : 0, { duration: 150 }),
  )

  const animatedStyle = useAnimatedStyle(() => {
    // When being dragged, use drag transforms; when being hovered, shrink slightly
    const hoverScale = 1 - hoverProgress.value * 0.05 // 1 → 0.95
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: isDragging.value ? scale.value : hoverScale },
      ],
      zIndex: zIdx.value,
      shadowOpacity: isDragging.value ? 0.35 : 0,
      shadowRadius: isDragging.value ? 12 : 0,
      elevation: isDragging.value ? 10 : 0,
    }
  })

  // Peach border overlay that fades in/out
  const hoverOverlayStyle = useAnimatedStyle(() => ({
    opacity: hoverProgress.value,
  }))

  if (!hasPhoto) {
    return (
      <View
        style={[
          styles.slot,
          styles.slotEmpty,
        ]}
      >
        <Pressable
          onPress={canAdd ? onAdd : undefined}
          disabled={!canAdd}
          style={[
            styles.addButton,
            canAdd ? styles.addButtonActive : styles.addButtonDisabled,
          ]}
        >
          <Plus size={24} color={colors.mutedForeground} />
        </Pressable>
      </View>
    )
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.slot,
          styles.slotFilled,
          animatedStyle,
        ]}
      >
        <View style={styles.photoWrapper}>
          <Image
            source={{ uri: url }}
            style={styles.photoImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={url}
          />
          {/* Hover highlight overlay */}
          <Animated.View style={[styles.hoverOverlay, hoverOverlayStyle]} pointerEvents="none" />
          <Pressable
            onPress={() => onRemove(url)}
            style={styles.removeButton}
          >
            <X size={12} color={colors.destructiveForeground} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
    marginBottom: GAP,
  },
  rowLast: {
    marginBottom: 0,
  },
  slot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: borderRadius["2xl"],
    overflow: "hidden",
    borderWidth: 2,
  },
  slotFilled: {
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
  },
  slotEmpty: {
    borderColor: colors.ring,
    borderStyle: "dashed",
  },
  photoWrapper: {
    flex: 1,
    position: "relative",
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  hoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius["2xl"],
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  removeButton: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  addButton: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonActive: {
    backgroundColor: `${colors.muted}80`,
  },
  addButtonDisabled: {
    backgroundColor: `${colors.muted}33`,
  },
})
