import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import { usesMiles, kmToMiles, milesToKm, formatDistance } from '@/lib/utils/locale';
import Slider from '@react-native-community/slider';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface FilterSliderProps {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
  style?: ViewStyle | ViewStyle[];
  onOpen?: () => void;
}

export function FilterSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  unit = 'km',
  label,
  style,
  onOpen,
}: FilterSliderProps) {
  // Value is always in km internally, convert for display if needed
  const useMiles = unit === 'km' ? usesMiles() : unit === 'mi';
  const displayValue = useMemo(() => {
    if (value === null) return label;
    return formatDistance(value, useMiles ? 'mi' : 'km');
  }, [value, useMiles, label]);
  const hasValue = value !== null;

  const handlePress = useCallback(() => {
    onOpen?.();
  }, [onOpen]);

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.triggerButton,
        hasValue && styles.triggerButtonActive,
        style,
      ]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text
        style={[
          styles.triggerText,
          hasValue ? styles.triggerTextActive : styles.triggerTextPlaceholder,
        ]}
      >
        {displayValue}
      </Text>
    </Pressable>
  );
}

export interface FilterSliderContentProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onValueChange: (value: number) => void;
  onClear: () => void;
}

export function FilterSliderContent({
  label,
  value,
  min,
  max,
  unit,
  onValueChange,
  onClear,
}: FilterSliderContentProps) {
  // Value is always in km internally, convert for display if needed
  const useMiles = unit === 'km' ? usesMiles() : unit === 'mi';
  
  // Convert km values to miles for display if needed (round up)
  const displayValue = useMiles ? Math.ceil(kmToMiles(value)) : Math.ceil(value);
  const displayMin = useMiles ? Math.ceil(kmToMiles(min)) : Math.ceil(min);
  const displayMax = useMiles ? Math.ceil(kmToMiles(max)) : Math.ceil(max);
  const displayUnit = useMiles ? 'miles' : 'km';
  
  // Convert miles back to km when value changes
  const handleValueChange = useCallback((newValue: number) => {
    const valueInKm = useMiles ? Math.round(milesToKm(newValue)) : newValue;
    onValueChange(valueInKm);
  }, [useMiles, onValueChange]);

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
        <Pressable onPress={onClear}>
          <Text style={styles.clearButton}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.sliderContent}>
        <Text style={styles.currentValue}>{displayValue} {displayUnit}</Text>

        <Slider
          style={styles.slider}
          minimumValue={displayMin}
          maximumValue={displayMax}
          value={displayValue}
          onValueChange={handleValueChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.secondary}
          thumbTintColor={colors.primary}
          step={1}
        />

        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>{displayMin} {displayUnit}</Text>
          <Text style={styles.rangeLabel}>{displayMax} {displayUnit}</Text>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  triggerButton: {
    backgroundColor: colors.input,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.border,
    // minHeight: 44,
    justifyContent: 'center',
  },
  triggerButtonActive: {
    borderColor: colors.primary,
  },
  triggerButtonOpen: {
    borderColor: colors.primary,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sliderContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    marginTop: -1, // Overlap with button border
    zIndex: 1000,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sliderContainerInline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
    width: '100%',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sliderTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  sliderContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  triggerText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  triggerTextActive: {
    color: colors.foreground,
  },
  triggerTextPlaceholder: {
    color: colors.mutedForeground,
  },
  clearButton: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  currentValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: spacing[4],
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: fontSize.sm,
    color: colors.foreground,
  },
  // Styles for FilterSliderContent (kept for backward compatibility)
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
});
