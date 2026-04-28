import { FilterTriggerButton } from '@/components/ui/FilterTriggerButton';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import { GymCrushSliderMarker } from '@/components/ui/GymCrushSliderMarker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

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
    <FilterTriggerButton
      label={displayValue}
      active={hasValue}
      onPress={handlePress}
      style={style}
    />
  );
}

export interface FilterRangeSliderContentProps {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  onValueChange: (value: [number, number]) => void;
  onClear: () => void;
  onRequestClose?: () => void;
}

export function FilterRangeSliderContent({
  label,
  value,
  min,
  max,
  onValueChange,
  onClear,
  onRequestClose,
}: FilterRangeSliderContentProps) {
  const [minValue, setMinValue] = useState(value[0]);
  const [maxValue, setMaxValue] = useState(value[1]);
  const isDraggingRef = useRef(false);

  const sliderLength =
    Dimensions.get('window').width - (spacing[4] * 2 + spacing[2] * 2 + spacing[8] * 2);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setMinValue(value[0]);
      setMaxValue(value[1]);
    }
  }, [value]);

  const handleValuesChange = useCallback(
    (values: number[]) => {
      isDraggingRef.current = true;
      const low = Math.min(values[0], values[1] ?? values[0]);
      const high = Math.max(values[0], values[1] ?? values[0]);
      const clampedLow = Math.max(min, Math.min(low, high - 1));
      const clampedHigh = Math.min(max, Math.max(high, clampedLow + 1));
      setMinValue(clampedLow);
      setMaxValue(clampedHigh);
      // Don't update parent during drag – only on release to avoid refresh flicker
    },
    [min, max]
  );

  const handleValuesChangeStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleValuesChangeFinish = useCallback(
    (values: number[]) => {
      const low = Math.min(values[0], values[1] ?? values[0]);
      const high = Math.max(values[0], values[1] ?? values[0]);
      const clampedLow = Math.max(min, Math.min(low, high - 1));
      const clampedHigh = Math.min(max, Math.max(high, clampedLow + 1));
      setMinValue(clampedLow);
      setMaxValue(clampedHigh);
      isDraggingRef.current = false;
      // Don't update parent on release – only when Update is pressed
    },
    [min, max]
  );

  const handleUpdate = useCallback(() => {
    onValueChange([minValue, maxValue]);
    onRequestClose?.();
  }, [minValue, maxValue, onValueChange, onRequestClose]);

  const _handleClear = useCallback(() => {
    onClear();
    onRequestClose?.();
  }, [onClear, onRequestClose]);

  const displayMax = maxValue === max ? `${max}+` : maxValue;

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
        <Pressable onPress={handleUpdate} style={styles.updateButton}>
          <Text style={styles.updateButtonText}>Update</Text>
        </Pressable>
      </View>

      <View style={styles.sliderContent}>
        <Text style={styles.currentValue}>{minValue} - {displayMax}</Text>

        <View style={styles.multiSliderContainer}>
          <MultiSlider
            values={[minValue, maxValue]}
            onValuesChange={handleValuesChange}
            onValuesChangeStart={handleValuesChangeStart}
            onValuesChangeFinish={handleValuesChangeFinish}
            min={min}
            max={max}
            step={1}
            sliderLength={sliderLength}
            selectedStyle={styles.selectedTrack}
            unselectedStyle={styles.unselectedTrack}
            trackStyle={styles.track}
            customMarker={GymCrushSliderMarker}
          />
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
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
  },
  updateButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  updateButtonText: {
    fontSize: fontSize.base,
    color: colors.primaryForeground,
    fontFamily: fontFamily.manropeSemibold,
  },
  sliderContent: {
    paddingHorizontal: spacing[2],
  },
  currentValue: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  multiSliderContainer: {
    marginBottom: spacing[4],
  },
  track: {
    height: 2,
    borderRadius: 2,
  },
  selectedTrack: {
    backgroundColor: colors.primary,
  },
  unselectedTrack: {
    backgroundColor: colors.muted,
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
