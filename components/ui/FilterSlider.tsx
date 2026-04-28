import { FilterTriggerButton } from '@/components/ui/FilterTriggerButton';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import { usesMiles, kmToMiles, milesToKm, formatDistance } from '@/lib/utils/locale';
import { GymCrushSliderMarker } from '@/components/ui/GymCrushSliderMarker';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

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
    <FilterTriggerButton
      label={displayValue}
      active={hasValue}
      onPress={handlePress}
      style={style}
    />
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
  onRequestClose?: () => void;
}

export function FilterSliderContent({
  label,
  value,
  min,
  max,
  unit,
  onValueChange,
  onClear,
  onRequestClose,
}: FilterSliderContentProps) {
  // Value is always in km internally, convert for display if needed
  const useMiles = unit === 'km' ? usesMiles() : unit === 'mi';
  const isDraggingRef = useRef(false);

  const displayValueFromProp = useMemo(() => (useMiles ? Math.ceil(kmToMiles(value)) : Math.ceil(value)), [value, useMiles]);
  const displayMin = useMiles ? Math.ceil(kmToMiles(min)) : Math.ceil(min);
  const displayMax = useMiles ? Math.ceil(kmToMiles(max)) : Math.ceil(max);
  const displayUnit = useMiles ? 'miles' : 'km';

  const [localDisplayValue, setLocalDisplayValue] = useState(displayValueFromProp);
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalDisplayValue(displayValueFromProp);
    }
  }, [displayValueFromProp]);

  const sliderLength = Dimensions.get('window').width - (spacing[4] * 2 + spacing[2] * 2);

  const handleValuesChange = useCallback(
    (values: number[]) => {
      isDraggingRef.current = true;
      const raw = values[0] ?? localDisplayValue;
      const clamped = Math.max(displayMin, Math.min(displayMax, raw));
      setLocalDisplayValue(clamped);
      // Don't update parent during drag – only on release to avoid refresh flicker
    },
    [displayMin, displayMax, localDisplayValue]
  );

  const handleValuesChangeStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleValuesChangeFinish = useCallback(
    (values: number[]) => {
      const raw = values[0] ?? localDisplayValue;
      const clamped = Math.max(displayMin, Math.min(displayMax, raw));
      setLocalDisplayValue(clamped);
      isDraggingRef.current = false;
      // Don't update parent on release – only when Update is pressed
    },
    [displayMin, displayMax, localDisplayValue]
  );

  const handleUpdate = useCallback(() => {
    const valueInKm = useMiles ? Math.round(milesToKm(localDisplayValue)) : localDisplayValue;
    onValueChange(valueInKm);
    onRequestClose?.();
  }, [localDisplayValue, useMiles, onValueChange, onRequestClose]);

  const _handleClear = useCallback(() => {
    onClear();
    onRequestClose?.();
  }, [onClear, onRequestClose]);

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
        <Pressable onPress={handleUpdate} style={styles.updateButton}>
          <Text style={styles.updateButtonText}>Update</Text>
        </Pressable>
      </View>

      <View style={styles.sliderContent}>
        <Text style={styles.currentValue}>{localDisplayValue} {displayUnit}</Text>

        <View style={styles.multiSliderContainer}>
          <MultiSlider
            values={[localDisplayValue]}
            onValuesChange={handleValuesChange}
            onValuesChangeStart={handleValuesChangeStart}
            onValuesChangeFinish={handleValuesChangeFinish}
            min={displayMin}
            max={displayMax}
            step={1}
            sliderLength={sliderLength}
            selectedStyle={styles.selectedTrack}
            unselectedStyle={styles.unselectedTrack}
            trackStyle={styles.track}
            customMarker={GymCrushSliderMarker}
          />
        </View>

        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>{displayMin} {displayUnit}</Text>
          <Text style={styles.rangeLabel}>{displayMax} {displayUnit}</Text>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
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
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
  },
  sliderContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
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
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
  },
});
