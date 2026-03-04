import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface FilterRangeSliderProps {
  value: [number, number] | null;
  onValueChange: (value: [number, number] | null) => void;
  min?: number;
  max?: number;
  label: string;
  style?: ViewStyle | ViewStyle[];
  onOpen?: () => void;
}

export function FilterRangeSlider({
  value,
  onValueChange,
  min = 18,
  max = 65,
  label,
  style,
  onOpen,
}: FilterRangeSliderProps) {
  const displayValue = value ? `${value[0]}-${value[1] === max ? value[1] + '+' : value[1]}` : label;
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

export interface FilterRangeSliderContentProps {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  onValueChange: (value: [number, number]) => void;
  onClear: () => void;
}

export function FilterRangeSliderContent({
  label,
  value,
  min,
  max,
  onValueChange,
  onClear,
}: FilterRangeSliderContentProps) {
  const [minValue, setMinValue] = useState(value[0]);
  const [maxValue, setMaxValue] = useState(value[1]);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setMinValue(value[0]);
      setMaxValue(value[1]);
    }
  }, [value]);

  const handleMinChange = useCallback((newMin: number) => {
    isDraggingRef.current = true;
    const clampedMin = Math.min(newMin, maxValue - 1);
    setMinValue(clampedMin);
    const newValue: [number, number] = [clampedMin, maxValue];
    onValueChange(newValue);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  }, [maxValue, onValueChange]);

  const handleMaxChange = useCallback((newMax: number) => {
    isDraggingRef.current = true;
    const clampedMax = Math.max(newMax, minValue + 1);
    setMaxValue(clampedMax);
    onValueChange([minValue, clampedMax]);
    // Reset dragging flag after a short delay
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  }, [minValue, onValueChange]);

  const displayMax = maxValue === max ? `${max}+` : maxValue;

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
        <Pressable onPress={onClear}>
          <Text style={styles.clearButton}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.sliderContent}>
        <Text style={styles.currentValue}>{minValue} - {displayMax}</Text>

        <View style={styles.slidersContainer}>
          {/* Min Slider */}
          <View style={styles.sliderWrapper}>
            <Text style={styles.sliderLabel}>Min: {minValue}</Text>
            <Slider
              style={styles.slider}
              minimumValue={min}
              maximumValue={max - 1}
              value={minValue}
              onValueChange={handleMinChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.muted}
              thumbTintColor={colors.primary}
              step={1}
            />
          </View>

          {/* Max Slider */}
          <View style={styles.sliderWrapper}>
            <Text style={styles.sliderLabel}>Max: {displayMax}</Text>
            <Slider
              style={styles.slider}
              minimumValue={min + 1}
              maximumValue={max}
              value={maxValue}
              onValueChange={handleMaxChange}
              minimumTrackTintColor={colors.muted}
              maximumTrackTintColor={colors.primary}
              thumbTintColor={colors.primary}
              step={1}
            />
          </View>
        </View>

        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>{min}</Text>
          <Text style={styles.rangeLabel}>{max}+</Text>
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
  clearButton: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  sliderContent: {
    paddingHorizontal: spacing[2],
  },
  currentValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  slidersContainer: {
    marginBottom: spacing[4],
  },
  sliderWrapper: {
    marginBottom: spacing[4],
  },
  sliderLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[2],
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
