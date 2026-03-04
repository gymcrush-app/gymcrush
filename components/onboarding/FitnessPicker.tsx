/**
 * Grid of selectable Chip components for fitness disciplines. Multi-select, uses Chip from ui.
 */

import { spacing } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { WORKOUT_TYPE_OPTIONS } from '@/constants';

interface FitnessPickerProps {
  selected: string[];
  onToggle: (discipline: string) => void;
}

export function FitnessPicker({ selected, onToggle }: FitnessPickerProps) {
  return (
    <View style={styles.container}>
      {WORKOUT_TYPE_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={selected.includes(option.value)}
          onPress={() => onToggle(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
});
