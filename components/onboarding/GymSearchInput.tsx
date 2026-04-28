/**
 * GymSearchInput — Autocomplete gym search with debouncing and dropdown.
 * Uses useSearchGyms; debounces input by APP.GYM_SEARCH_DEBOUNCE_MS.
 */

import { Input } from '@/components/ui/Input';
import { useSearchGyms } from '@/lib/api/gyms';
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  spacing,
  APP,
  shadows,
} from '@/theme';
import type { Gym } from '@/types';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

interface GymSearchInputProps {
  onSelectGym: (gym: Gym) => void;
  selectedGym?: Gym | null;
  /** Called when user taps clear on the selected gym chip. Parent should clear selectedGym state. */
  onClear?: () => void;
}

export function GymSearchInput({ onSelectGym, selectedGym, onClear }: GymSearchInputProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, APP.GYM_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: gymResults = [], isLoading: isSearchingGyms } =
    useSearchGyms(debouncedQuery);

  // When parent sets selectedGym, clear local query so input shows placeholder
  useEffect(() => {
    if (selectedGym) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [selectedGym]);

  const showDropdown = debouncedQuery.length >= 2;
  const hasResults = gymResults.length > 0;

  const handleSelectGym = (gym: Gym) => {
    onSelectGym(gym);
    setQuery('');
    setDebouncedQuery('');
  };

  const handleClearSelection = () => {
    onClear?.();
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <View style={styles.container}>
      <Input
        placeholder="Search for your gym..."
        value={query}
        onChangeText={setQuery}
        editable={!selectedGym}
        style={selectedGym ? styles.inputDisabled : undefined}
      />

      {selectedGym && (
        <View style={styles.selectedContainer}>
          <View style={styles.selectedContent}>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selectedGym.name}
            </Text>
            {selectedGym.address ? (
              <Text style={styles.selectedAddress} numberOfLines={1}>
                {selectedGym.address}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={handleClearSelection}
            style={styles.clearButton}
            accessibilityLabel="Clear gym selection"
            accessibilityRole="button"
          >
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {showDropdown && !selectedGym && (
        <View style={styles.dropdown}>
          {isSearchingGyms ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : hasResults ? (
            <ScrollView
              style={styles.resultsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {gymResults.map((gym) => (
                <Pressable
                  key={gym.id}
                  onPress={() => handleSelectGym(gym)}
                  style={({ pressed }) => [
                    styles.resultItem,
                    pressed && styles.resultItemPressed,
                  ]}
                >
                  <Text style={styles.resultName} numberOfLines={1}>
                    {gym.name}
                  </Text>
                  {gym.address ? (
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {gym.address}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No gyms found</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[2],
  },
  inputDisabled: {
    opacity: 0.7,
  },
  selectedContainer: {
    marginTop: spacing[2],
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedContent: {
    flex: 1,
    minWidth: 0,
  },
  selectedName: {
    color: colors.secondaryForeground,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeMedium,
  },
  selectedAddress: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  clearButton: {
    padding: spacing[2],
    marginLeft: spacing[2],
  },
  dropdown: {
    marginTop: spacing[2],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    ...shadows.card,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  resultsScroll: {
    maxHeight: 200,
  },
  resultItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultItemPressed: {
    backgroundColor: colors.muted,
  },
  resultName: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeMedium,
  },
  resultAddress: {
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  emptyRow: {
    padding: spacing[4],
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
});
