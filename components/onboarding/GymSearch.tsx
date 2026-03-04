import { Input } from '@/components/ui/Input';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { GooglePlaceGym } from '@/types/onboarding';
import { Check, MapPin, Search } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface SelectedGym {
  id: string;
  name: string;
  address: string;
}

interface GymSearchProps {
  selectedGyms: SelectedGym[];
  searchQuery: string;
  results: GooglePlaceGym[];
  isLoading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onToggleGym: (gym: GooglePlaceGym) => void;
  onRemoveGym: (gymId: string) => void;
}

export function GymSearch({
  selectedGyms,
  searchQuery,
  results,
  isLoading,
  error,
  onSearchChange,
  onToggleGym,
  onRemoveGym,
}: GymSearchProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Your gym(s)
      </Text>

      {/* Selected Gyms */}
      {selectedGyms.length > 0 && (
        <View style={styles.selectedGymsContainer}>
          <Text style={styles.selectedGymsLabel}>Selected gyms:</Text>
          <View style={styles.selectedGymsList}>
            {selectedGyms.map((gym) => (
              <View
                key={gym.id}
                style={styles.selectedGymChip}
              >
                <Text style={styles.selectedGymText} numberOfLines={1}>
                  {gym.name}
                </Text>
                <Pressable
                  onPress={() => onRemoveGym(gym.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Search Input - only show when no gyms are selected */}
      {selectedGyms.length === 0 && (
        <>
          <View>
            <Input
              placeholder="Search for your gym (e.g., Kelowna, Planet Fitness)..."
              value={searchQuery}
              onChangeText={onSearchChange}
              style={styles.searchInput}
              leftIcon={<Search size={16} color={colors.mutedForeground} />}
              rightIcon={isLoading ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : undefined}
            />
          </View>

          {/* Error Message */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Search Results */}
          {searchQuery.length >= 2 && (
        <View style={styles.resultsContainer}>
          {isLoading && results.length === 0 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={styles.loadingText}>Searching gyms...</Text>
            </View>
          )}

          {!isLoading && results.length === 0 && !error && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No gyms found for "{searchQuery}"
              </Text>
              <Text style={styles.emptySubtext}>
                Try searching for a city or gym name
              </Text>
            </View>
          )}

          <ScrollView style={styles.resultsScroll}>
            {results.map((gym) => {
              const isSelected = selectedGyms.some((g) => g.id === gym.place_id);
              return (
                <Pressable
                  key={gym.place_id}
                  onPress={() => onToggleGym(gym)}
                  style={[
                    styles.gymResultCard,
                    isSelected && styles.gymResultCardSelected,
                    {
                      shadowColor: isSelected ? colors.primary : colors.background,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 2,
                      marginBottom: spacing[2],
                    },
                  ]}
                >
                  <MapPin size={20} color={colors.mutedForeground} />
                  <View style={styles.gymResultText}>
                    <Text style={styles.gymResultName} numberOfLines={1}>
                      {gym.name}
                    </Text>
                    <Text style={styles.gymResultAddress} numberOfLines={1}>
                      {gym.formatted_address}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.gymResultCheck}>
                      <Check size={12} color={colors.primaryForeground} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
          )}
        </>
      )}

      {/* Helper Text */}
      {/* {searchQuery.length === 0 && selectedGyms.length === 0 && (
        <Text style={styles.helperText}>
          Start typing to search for gyms near you
        </Text>
      )} */}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[4],
  },
  sectionTitle: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    color: colors.foreground,
  },
  selectedGymsContainer: {
    gap: spacing[2],
  },
  selectedGymsLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  selectedGymsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  selectedGymChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedGymText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    maxWidth: 200,
  },
  removeButton: {
    marginLeft: spacing[1],
  },
  removeButtonText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
  },
  searchInput: {},
  errorText: {
    fontSize: fontSize.sm,
    color: colors.destructive,
  },
  resultsContainer: {
    gap: spacing[2],
    maxHeight: 192, // spacing[48] = 192px
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    color: colors.mutedForeground,
    marginLeft: spacing[2],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  resultsScroll: {
    maxHeight: 192, // spacing[48] = 192px
  },
  gymResultCard: {
    width: '100%',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  gymResultCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  gymResultText: {
    flex: 1,
    minWidth: 0,
  },
  gymResultName: {
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  gymResultAddress: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  gymResultCheck: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
});
