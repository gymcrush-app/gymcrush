import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { GymCrushSliderMarker } from "@/components/ui/GymCrushSliderMarker"
import { Select } from "@/components/ui/Select"
import { useSearchGyms, useGymById } from "@/lib/api/gyms"
import { useProfile } from "@/lib/api/profiles"
import { kmToMiles, milesToKm, usesMiles } from "@/lib/utils/locale"
import {
  borderRadius,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  palette,
  spacing,
  APP,
} from "@/theme"
import {
  DEFAULT_DISTANCE_MILES,
  FITNESS_DISCIPLINES,
  GENDER_OPTIONS_WITH_EVERYONE,
  MAX_DISTANCE_MILES,
  MIN_DISTANCE_MILES,
} from "@/constants"
import type { Gym } from "@/types"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Settings2, X } from "lucide-react-native"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import MultiSlider from "@ptomasroos/react-native-multi-slider"

export interface DiscoveryPreferencesData {
  gender: "men" | "women" | "everyone"
  maxDistance: number | null
  disciplines: string[]
  searchByGym: boolean
  selectedGym: string | null
  /** Persisted: show same home-gym profiles only (Gym Crush Mode) */
  gymCrushMode?: boolean
}

const DEFAULT_PREFERENCES: DiscoveryPreferencesData = {
  gender: "everyone",
  maxDistance: DEFAULT_DISTANCE_MILES,
  disciplines: [],
  searchByGym: true,
  selectedGym: null,
  gymCrushMode: false,
}

const STORAGE_KEY = APP.STORAGE_KEYS.DISCOVERY_PREFERENCES;

interface DiscoveryPreferencesProps {
  onPreferencesChange: (prefs: DiscoveryPreferencesData) => void
  onOpen: () => void
  disabled?: boolean
}

interface DiscoveryPreferencesContentProps {
  onClose: () => void
  onPreferencesChange: (prefs: DiscoveryPreferencesData) => void
  gender: DiscoveryPreferencesData["gender"]
  onGenderChange: (gender: DiscoveryPreferencesData["gender"]) => void
  ageRange: [number, number] | null
  onAgeRangeChange: (range: [number, number] | null) => void
  gymCrushModeEnabled: boolean
}

export function DiscoveryPreferences({
  onPreferencesChange,
  onOpen,
  disabled = false,
}: DiscoveryPreferencesProps) {
  return (
    <Pressable
      onPress={() => !disabled && onOpen()}
      style={[styles.preferencesButton, disabled && styles.preferencesButtonDisabled]}
    >
      <Settings2 size={20} color={palette.white} />
    </Pressable>
  )
}

export function DiscoveryPreferencesContent({
  onClose,
  onPreferencesChange,
  gender,
  onGenderChange,
  ageRange,
  onAgeRangeChange,
  gymCrushModeEnabled,
}: DiscoveryPreferencesContentProps) {
  const insets = useSafeAreaInsets()
  const [preferences, setPreferences] =
    useState<DiscoveryPreferencesData>(DEFAULT_PREFERENCES)
  const [gymSearchQuery, setGymSearchQuery] = useState("")
  const [_selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const { data: currentProfile } = useProfile()

  // Local slider state so drag doesn't reset when effect overwrites preferences
  const [localDistance, setLocalDistance] = useState<number | null>(
    DEFAULT_PREFERENCES.maxDistance
  )
  const isDraggingRef = useRef(false)

  // When preferences load with a saved gym ID, fetch the gym so selectedGym (name/address) shows in the UI
  const gymIdToResolve = preferences.selectedGym
  const { data: fetchedGym } = useGymById(gymIdToResolve ?? "")

  const { data: _gymResults, isLoading: _isSearchingGyms } =
    useSearchGyms(gymSearchQuery)

  // Load preferences from backend first, then fallback to AsyncStorage
  useEffect(() => {
    const loadPreferences = async () => {
      let loadedPrefs: DiscoveryPreferencesData = DEFAULT_PREFERENCES

      // Try to load from AsyncStorage first (for gender, disciplines, etc.)
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as DiscoveryPreferencesData
          loadedPrefs = { ...DEFAULT_PREFERENCES, ...parsed }
        }
      } catch (error) {
        console.error(
          "Failed to load discovery preferences from AsyncStorage:",
          error,
        )
      }

      // Override maxDistance from backend if available; allow blank (null)
      if (currentProfile?.discovery_preferences) {
        const discoveryPrefs = currentProfile.discovery_preferences as any
        const maxDistanceKm = discoveryPrefs?.max_distance

        if (
          maxDistanceKm !== undefined &&
          maxDistanceKm !== null &&
          maxDistanceKm > 0
        ) {
          const useMiles = usesMiles()
          const miles = useMiles
            ? Math.ceil(kmToMiles(maxDistanceKm))
            : Math.ceil(maxDistanceKm)
          loadedPrefs.maxDistance = Math.min(MAX_DISTANCE_MILES, Math.max(MIN_DISTANCE_MILES, miles))
        } else {
          loadedPrefs.maxDistance = null
        }
      }

      setPreferences(loadedPrefs)

      // selectedGym (Gym | null) will be populated by useGymById + effect below when loadedPrefs.selectedGym is set
    }
    loadPreferences()
  }, [currentProfile?.discovery_preferences])

  // Sync local slider value from preferences when not dragging (e.g. after load or when effect overwrites)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalDistance(preferences.maxDistance)
    }
  }, [preferences.maxDistance])

  // When we have a stored gym ID and the fetch completed, populate selectedGym so name/address show
  useEffect(() => {
    if (
      fetchedGym &&
      gymIdToResolve &&
      fetchedGym.id === gymIdToResolve
    ) {
      setSelectedGym(fetchedGym)
    }
  }, [fetchedGym, gymIdToResolve])

  const handleSave = async () => {
    try {
      const payload: DiscoveryPreferencesData = {
        ...preferences,
        gender,
        gymCrushMode: gymCrushModeEnabled,
      }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      onPreferencesChange(payload)
      onClose()
    } catch (error) {
      console.error("Failed to save discovery preferences:", error)
    }
  }

  const handleDistanceSliderChange = useCallback((values: number[]) => {
    const raw = values[0] ?? DEFAULT_DISTANCE_MILES
    const clamped = Math.min(MAX_DISTANCE_MILES, Math.max(MIN_DISTANCE_MILES, Math.round(raw)))
    setLocalDistance(clamped)
  }, [])

  const handleDistanceSliderChangeStart = useCallback(() => {
    isDraggingRef.current = true
  }, [])

  const handleDistanceSliderChangeFinish = useCallback((values: number[]) => {
    const raw = values[0] ?? DEFAULT_DISTANCE_MILES
    const clamped = Math.min(MAX_DISTANCE_MILES, Math.max(MIN_DISTANCE_MILES, Math.round(raw)))
    setLocalDistance(clamped)
    setPreferences((prev) => ({ ...prev, maxDistance: clamped }))
    isDraggingRef.current = false
  }, [])

  const handleClearDistance = useCallback(() => {
    setLocalDistance(null)
    setPreferences((prev) => ({ ...prev, maxDistance: null }))
  }, [])

  const toggleDiscipline = (discipline: string) => {
    setPreferences((prev) => {
      const isSelected = prev.disciplines.includes(discipline)
      return {
        ...prev,
        disciplines: isSelected
          ? prev.disciplines.filter((d) => d !== discipline)
          : [...prev.disciplines, discipline],
      }
    })
  }

  const _handleGymSelect = (gym: Gym) => {
    setSelectedGym(gym)
    setPreferences((prev) => ({ ...prev, selectedGym: gym.id }))
    setGymSearchQuery("")
  }

  const _handleSearchByGymToggle = (searchByGym: boolean) => {
    setPreferences((prev) => ({ ...prev, searchByGym }))
  }

  return (
    <View style={styles.preferencesRoot}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.modalTitle}>Discovery Preferences</Text>
        <Pressable onPress={onClose}>
          <X size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Show me</Text>
            <Text style={styles.sectionHint}>Who you see in Discover</Text>
            <Select
              value={gender}
              onValueChange={(value) =>
                onGenderChange(value as DiscoveryPreferencesData["gender"])
              }
              options={GENDER_OPTIONS_WITH_EVERYONE}
              placeholder="Select preference"
            />
          </View>

          <AgeRangeSection
            value={ageRange}
            onChange={onAgeRangeChange}
          />

        {/* Max Distance - slider; optional "No limit" to clear */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Maximum Distance ({usesMiles() ? "miles" : "km"})
          </Text>
          <View style={styles.distanceSliderWrap}>
            <Text style={styles.distanceSliderValue}>
              {localDistance != null
                ? usesMiles()
                  ? `${localDistance} mi`
                  : `${Math.round(milesToKm(localDistance))} km`
                : "No limit"}
            </Text>
            <MultiSlider
              values={[localDistance ?? DEFAULT_DISTANCE_MILES]}
              onValuesChange={handleDistanceSliderChange}
              onValuesChangeStart={handleDistanceSliderChangeStart}
              onValuesChangeFinish={handleDistanceSliderChangeFinish}
              min={MIN_DISTANCE_MILES}
              max={MAX_DISTANCE_MILES}
              step={1}
              sliderLength={Dimensions.get("window").width - spacing[4] * 2 - spacing[2] * 2}
              selectedStyle={styles.distanceSelectedTrack}
              unselectedStyle={styles.distanceUnselectedTrack}
              trackStyle={styles.distanceTrack}
              customMarker={GymCrushSliderMarker}
            />
            <View style={styles.distanceRangeLabels}>
              <Text style={styles.rangeLabel}>{MIN_DISTANCE_MILES}</Text>
              <Text style={styles.rangeLabel}>{MAX_DISTANCE_MILES}</Text>
            </View>
            <Pressable onPress={handleClearDistance} style={styles.noLimitLinkWrap}>
              <Text style={styles.noLimitLink}>No limit</Text>
            </Pressable>
          </View>
        </View>

        {/* Fitness Disciplines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Fitness Disciplines (optional)
          </Text>
          <View style={styles.chipsContainer}>
            {FITNESS_DISCIPLINES.map((discipline) => (
              <Chip
                key={discipline}
                label={discipline}
                selected={preferences.disciplines.includes(discipline)}
                onPress={() => toggleDiscipline(discipline)}
              />
            ))}
          </View>
        </View>

        {/* Search by Gym */}
        {/* <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Search by Gym
                </Text>
                <View style={styles.toggleContainer}>
                  <Pressable
                    onPress={() => handleSearchByGymToggle(true)}
                    style={[
                      styles.toggleButton,
                      preferences.searchByGym ? styles.toggleButtonActive : styles.toggleButtonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        preferences.searchByGym ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
                      ]}
                    >
                      Yes
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSearchByGymToggle(false)}
                    style={[
                      styles.toggleButton,
                      !preferences.searchByGym ? styles.toggleButtonActive : styles.toggleButtonInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        !preferences.searchByGym ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive,
                      ]}
                    >
                      No
                    </Text>
                  </Pressable>
                </View>

                {preferences.searchByGym && (
                  <View>
                    <Input
                      value={gymSearchQuery}
                      onChangeText={setGymSearchQuery}
                      placeholder="Search for a gym..."
                      style={styles.gymSearchInput}
                    />
                    {gymSearchQuery.length >= 2 && gymResults && (
                      <View style={styles.gymResultsContainer}>
                        <ScrollView>
                          {gymResults.map((gym) => (
                            <TouchableOpacity
                              key={gym.id}
                              onPress={() => handleGymSelect(gym)}
                              style={styles.gymResultItem}
                            >
                              <Text style={styles.gymResultName}>{gym.name}</Text>
                              <Text style={styles.gymResultAddress}>{gym.address}</Text>
                            </TouchableOpacity>
                          ))}
                          {gymResults.length === 0 && !isSearchingGyms && (
                            <View style={styles.gymResultItem}>
                              <Text style={styles.gymResultAddress}>
                                No gyms found
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                    {selectedGym && (
                      <View style={styles.selectedGymContainer}>
                        <View style={styles.selectedGymContent}>
                          <Text style={styles.selectedGymName}>
                            {selectedGym.name}
                          </Text>
                          <Text style={styles.selectedGymAddress}>
                            {selectedGym.address}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setSelectedGym(null);
                            setPreferences((prev) => ({ ...prev, selectedGym: null }));
                          }}
                        >
                          <X size={16} color={colors.secondaryForeground} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View> */}

        {/* Save Button */}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(spacing[4], insets.bottom) },
          ]}
        >
          <Button onPress={handleSave} variant="primary" size="lg">
            Save Preferences
          </Button>
        </View>
      </View>
    </View>
  )
}

function AgeRangeSection({
  value,
  onChange,
}: {
  value: [number, number] | null
  onChange: (range: [number, number] | null) => void
}) {
  const MIN = 18
  const MAX = 65

  const [local, setLocal] = useState<[number, number]>(value ?? [MIN, MAX])

  useEffect(() => {
    setLocal(value ?? [MIN, MAX])
  }, [value])

  const handleValuesChange = useCallback((values: number[]) => {
    const low = Math.min(values[0] ?? MIN, values[1] ?? MAX)
    const high = Math.max(values[0] ?? MIN, values[1] ?? MAX)
    const clampedLow = Math.max(MIN, Math.min(low, MAX - 1))
    const clampedHigh = Math.min(MAX, Math.max(high, clampedLow + 1))
    setLocal([clampedLow, clampedHigh])
  }, [])

  const handleValuesChangeFinish = useCallback((values: number[]) => {
    const low = Math.min(values[0] ?? MIN, values[1] ?? MAX)
    const high = Math.max(values[0] ?? MIN, values[1] ?? MAX)
    const clampedLow = Math.max(MIN, Math.min(low, MAX - 1))
    const clampedHigh = Math.min(MAX, Math.max(high, clampedLow + 1))
    const next: [number, number] = [clampedLow, clampedHigh]
    setLocal(next)
    onChange(next)
  }, [onChange])

  const displayMax = local[1] === MAX ? `${MAX}+` : `${local[1]}`

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Age</Text>
      <Text style={styles.sectionHint}>
        Same as the age filter on Discover — updates your feed
      </Text>

      <Text style={styles.ageRangeValue}>
        {local[0]} - {displayMax}
      </Text>

      <View style={styles.ageSliderWrap}>
        <MultiSlider
          values={[local[0], local[1]]}
          onValuesChange={handleValuesChange}
          onValuesChangeFinish={handleValuesChangeFinish}
          min={MIN}
          max={MAX}
          step={1}
          sliderLength={Dimensions.get("window").width - spacing[4] * 2}
          selectedStyle={styles.distanceSelectedTrack}
          unselectedStyle={styles.distanceUnselectedTrack}
          trackStyle={styles.distanceTrack}
          customMarker={GymCrushSliderMarker}
        />
        <View style={styles.distanceRangeLabels}>
          <Text style={styles.rangeLabel}>{MIN}</Text>
          <Text style={styles.rangeLabel}>{MAX}+</Text>
        </View>

        <Pressable
          onPress={() => onChange(null)}
          style={styles.noLimitLinkWrap}
        >
          <Text style={styles.noLimitLink}>Any age</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  preferencesRoot: {
    flex: 1,
  },
  preferencesButton: {
    padding: spacing[2],
  },
  preferencesButtonDisabled: {
    opacity: 0.5,
  },
  bottomSheetHeader: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.manropeBold,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8] + 72,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    marginBottom: spacing[2],
  },
  sectionHint: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing[3],
  },
  ageRangeValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  ageSliderWrap: {
    marginTop: spacing[2],
  },
  distanceSliderWrap: {
    marginTop: spacing[2],
  },
  distanceSliderValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  distanceTrack: {
    height: 2,
    borderRadius: 2,
  },
  distanceSelectedTrack: {
    backgroundColor: colors.primary,
  },
  distanceUnselectedTrack: {
    backgroundColor: colors.muted,
  },
  distanceRangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[2],
  },
  rangeLabel: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  noLimitLinkWrap: {
    marginTop: spacing[2],
    alignSelf: "center",
  },
  noLimitLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.manropeMedium,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  toggleContainer: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonInactive: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  toggleButtonText: {
    textAlign: "center",
    fontFamily: fontFamily.manropeMedium,
  },
  toggleButtonTextActive: {
    color: colors.primaryForeground,
  },
  toggleButtonTextInactive: {
    color: colors.foreground,
  },
  gymSearchInput: {
    marginBottom: spacing[2],
  },
  gymResultsContainer: {
    backgroundColor: colors.input,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 160, // 40 * 4 (spacing equivalent)
  },
  gymResultItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gymResultName: {
    color: colors.foreground,
    fontFamily: fontFamily.manropeMedium,
  },
  gymResultAddress: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  selectedGymContainer: {
    marginTop: spacing[2],
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedGymContent: {
    flex: 1,
  },
  selectedGymName: {
    color: colors.secondaryForeground,
    fontFamily: fontFamily.manropeMedium,
  },
  selectedGymAddress: {
    color: colors.secondaryForeground,
    fontSize: fontSize.xs,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})
