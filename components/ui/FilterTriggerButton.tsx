import { borderRadius, colors, fontSize, spacing } from "@/theme"
import React from "react"
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native"

export interface FilterTriggerButtonProps {
  label: string
  active: boolean
  onPress: () => void
  style?: ViewStyle | ViewStyle[]
  hitSlop?: { top: number; bottom: number; left: number; right: number }
}

const defaultHitSlop = { top: 10, bottom: 10, left: 10, right: 10 }

export function FilterTriggerButton({
  label,
  active,
  onPress,
  style,
  hitSlop = defaultHitSlop,
}: FilterTriggerButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.triggerButton,
        active && styles.triggerButtonActive,
        style,
      ]}
      hitSlop={hitSlop}
    >
      <Text
        style={[
          styles.triggerText,
          active ? styles.triggerTextActive : styles.triggerTextPlaceholder,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  triggerButton: {
    backgroundColor: colors.input,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  triggerButtonActive: {
    borderColor: colors.primary,
  },
  triggerText: {
    fontSize: fontSize.base,
    textAlign: "center",
  },
  triggerTextActive: {
    color: colors.foreground,
  },
  triggerTextPlaceholder: {
    color: colors.mutedForeground,
  },
})
