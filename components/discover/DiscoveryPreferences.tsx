import { Button } from "@/components/ui/Button"
import { Chip } from "@/components/ui/Chip"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { useSearchGyms, useGymById } from "@/lib/api/gyms"
import { useProfile } from "@/lib/api/profiles"
import { kmToMiles, usesMiles } from "@/lib/utils/locale"
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  palette,
  spacing,
  APP,
} from "@/theme"
import {
  DEFAULT_DISTANCE_MILES,
  FITNESS_DISCIPLINES,
  GENDER_OPTIONS,
  MAX_DISTANCE_MILES,
  MIN_DISTANCE_MILES,
} from "@/constants"
import type { Gym } from "@/types"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Settings2, X } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

export interface DiscoveryPreferencesData {
  gender: "men" | "women" | "everyone"
  maxDistance: number | null
  disciplines: string[]
  searchByGym: boolean
  selectedGym: string | null
}

const DEFAULT_PREFERENCES: DiscoveryPreferencesData = {
  gender: "everyone",
  maxDistance: DEFAULT_DISTANCE_MILES,
  disciplines: [],
  searchByGym: true,
  selectedGym: null,
}

const STORAGE_KEY = APP.STORAGE_KEYS.DISCOVERY_PREFERENCES;

interface DiscoveryPreferencesProps {
  onPreferencesChange: (prefs: DiscoveryPreferencesData) => void
  onOpen: () => void
}

interface DiscoveryPreferencesContentProps {
  onClose: () => void
  onPreferencesChange: (prefs: DiscoveryPreferencesData) => void
}

export function DiscoveryPreferences({
  onPreferencesChange,
  onOpen,
}: DiscoveryPreferencesProps) {
  return (
    <Pressable onPress={onOpen} style={styles.preferencesButton}>
      <Settings2 size={20} color={palette.white} />
    </Pressable>
  )
}

export function DiscoveryPreferencesContent({
  onClose,
  onPreferencesChange,
}: DiscoveryPreferencesContentProps) {
  const [preferences, setPreferences] =
    useState<DiscoveryPreferencesData>(DEFAULT_PREFERENCES)
  const [gymSearchQuery, setGymSearchQuery] = useState("")
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null)
  const { data: currentProfile } = useProfile()

  // When preferences load with a saved gym ID, fetch the gym so selectedGym (name/address) shows in the UI
  const gymIdToResolve = preferences.selectedGym
  const { data: fetchedGym } = useGymById(gymIdToResolve ?? "")

  const { data: gymResults, isLoading: isSearchingGyms } =
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
      // Save to AsyncStorage for local persistence
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      // Notify parent which will handle backend update
      onPreferencesChange(preferences)
      onClose()
    } catch (error) {
      console.error("Failed to save discovery preferences:", error)
    }
  }

  const handleGenderChange = (gender: "men" | "women" | "everyone") => {
    setPreferences((prev) => ({ ...prev, gender }))
  }

  const handleDistanceChange = (distance: string) => {
    const trimmed = distance.trim()
    if (trimmed === "") {
      setPreferences((prev) => ({ ...prev, maxDistance: null }))
      return
    }
    const numDistance = parseInt(trimmed, 10)
    if (!isNaN(numDistance)) {
      const clamped = Math.min(MAX_DISTANCE_MILES, Math.max(MIN_DISTANCE_MILES, numDistance))
      setPreferences((prev) => ({ ...prev, maxDistance: clamped }))
    }
  }

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

  const handleGymSelect = (gym: Gym) => {
    setSelectedGym(gym)
    setPreferences((prev) => ({ ...prev, selectedGym: gym.id }))
    setGymSearchQuery("")
  }

  const handleSearchByGymToggle = (searchByGym: boolean) => {
    setPreferences((prev) => ({ ...prev, searchByGym }))
  }

  return (
    <>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.modalTitle}>Discovery Preferences</Text>
        <Pressable onPress={onClose}>
          <X size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.scrollView}>
        {/* Gender Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Show me</Text>
          <Select
            value={preferences.gender}
            onValueChange={(value) =>
              handleGenderChange(value as "men" | "women")
            }
            options={GENDER_OPTIONS}
            placeholder="Select gender preference"
          />
        </View>

        {/* Max Distance - blank = no limit; default 30; min 2, max 100 miles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Maximum Distance ({usesMiles() ? "miles" : "km"})
          </Text>
          <Text style={styles.sectionHint}>2–100 miles</Text>
          <Input
            value={
              preferences.maxDistance !== null && preferences.maxDistance !== undefined
                ? String(preferences.maxDistance)
                : ""
            }
            onChangeText={handleDistanceChange}
            keyboardType="numeric"
            placeholder={String(DEFAULT_DISTANCE_MILES)}
          />
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
        <View style={styles.saveButtonContainer}>
          <Button onPress={handleSave} variant="primary" size="lg">
            Save Preferences
          </Button>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  preferencesButton: {
    padding: spacing[2],
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
    fontWeight: fontWeight.bold,
  },
  scrollView: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing[3],
  },
  sectionHint: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    marginBottom: spacing[2],
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
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.medium,
  },
  selectedGymAddress: {
    color: colors.secondaryForeground,
    fontSize: fontSize.xs,
  },
  saveButtonContainer: {
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
})
