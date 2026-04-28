import { Text } from "@/components/ui/Text"
import { fontFamily, fontSize, spacing } from "@/theme"
import React from "react"
import { StyleSheet, View } from "react-native"

const NAME_FONT = { fontFamily: fontFamily.manropeExtrabold }
const AGE_FONT = { fontFamily: fontFamily.manropeLight }
const DISTANCE_FONT = { fontFamily: fontFamily.manrope }

interface ProfileHeaderProps {
  displayName: string
  age: number
  /** Distance in km (rounded up). Rendered as number + small "km". */
  distanceKm?: number | null
  /** Compact variant for above-photo row (smaller text) */
  variant?: "default" | "compact"
}

export const ProfileHeader = React.memo<ProfileHeaderProps>(
  ({ displayName, age, distanceKm, variant = "default" }) => {
    const isCompact = variant === "compact"
    const showDistance = distanceKm != null
    // const nameSize = isCompact ? fontSize.xl : fontSize["4xl"]
    // const ageSize = isCompact ? fontSize.xl : fontSize["4xl"]
    const distanceNumSize = isCompact ? fontSize.xl : fontSize["4xl"]
    const distanceUnitSize = isCompact ? 10 : fontSize.sm // smaller "km"
    return (
      <View
        style={[
          styles.container,
          isCompact && styles.containerCompact,
          showDistance && styles.row,
        ]}
      >
        <Text
          variant={isCompact ? "body" : "h1"}
          style={
            isCompact
              ? [styles.nameText, styles.nameTextCompact, NAME_FONT]
              : [styles.nameText, NAME_FONT]
          }
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          <Text
            style={{ fontSize: 28, lineHeight: 38, ...NAME_FONT }}
          >
            {`${displayName}  `}
          </Text>
          <Text
            style={{ fontSize: 28, lineHeight: 38, ...AGE_FONT }}
          >
            {age}
          </Text>
        </Text>
        {showDistance && (
          <View style={styles.distanceRow}>
            <Text
              variant={isCompact ? "body" : "h1"}
              style={[
                { fontSize: distanceNumSize, ...DISTANCE_FONT },
                styles.distanceText,
                ...(isCompact ? [styles.distanceTextCompact] : []),
              ]}
            >
              {distanceKm}
            </Text>
            <Text
              style={[
                { fontSize: distanceUnitSize, ...DISTANCE_FONT },
                styles.distanceUnit,
              ]}
            >
              km
            </Text>
          </View>
        )}
      </View>
    )
  },
)

ProfileHeader.displayName = "ProfileHeader"

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[2],
  },
  containerCompact: {
    marginBottom: 0,
    marginHorizontal: spacing[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  nameText: {
    flex: 1,
    minWidth: 0,
  },
  nameTextCompact: {
    // Compact header uses larger custom font than body variant default line-height.
    // Explicit line-height prevents ascender clipping (e.g. top of "E").
    lineHeight: 38,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  distanceText: {},
  distanceTextCompact: {
    lineHeight: 38,
  },
  distanceUnit: {
    marginLeft: 2,
  },
})
