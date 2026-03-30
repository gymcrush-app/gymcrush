import { Button } from "@/components/ui/Button"
import { CensoredPreview } from "@/components/ui/CensoredPreview"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { WORKOUT_TYPE_OPTIONS } from "@/constants/fitness"
import { useFilteredInput } from "@/hooks/useFilteredInput"
import { useGymSearch } from "@/hooks/useGymSearch"
import { useGymById } from "@/lib/api/gyms"
import { useProfile, useUpdateProfile } from "@/lib/api/profiles"
import { resolvePhotoUrls } from "@/lib/storage/uploadProfilePhoto"
import { fetchPlaceDetailsFull } from "@/lib/utils/google-places"
import { resolveHomeGym } from "@/lib/utils/resolveHomeGym"
import {
  APP,
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from "@/theme"
import type { Profile } from "@/types"
import type { GooglePlaceGym } from "@/types/onboarding"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/toast"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { DraggablePhotoGrid } from "@/components/profile/DraggablePhotoGrid"
import { ChevronLeft, X } from "lucide-react-native"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const MIN_PHOTOS = 3
const MAX_PHOTOS = APP.MAX_PHOTOS
const AUTO_SAVE_DEBOUNCE_MS = 700

export default function EditProfileScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile()
  const updateProfile = useUpdateProfile()
  const {
    data: currentGym,
    isLoading: gymLoading,
    isError: gymError,
    error: gymErrorDetail,
  } = useGymById(profile?.home_gym_id ?? "")
  const {
    results: placeResults,
    isLoading: placeSearching,
    search: searchPlaces,
    clearResults: clearPlaceResults,
  } = useGymSearch()

  const [displayName, setDisplayName] = useState("")
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceGym | null>(
    null,
  )
  const [userClearedGym, setUserClearedGym] = useState(false)
  const [gymSearchQuery, setGymSearchQuery] = useState("")
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isPickingPhoto, setIsPickingPhoto] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [homeGymInputFocused, setHomeGymInputFocused] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [gymEnriching, setGymEnriching] = useState(false)
  const gymInitializedRef = useRef(false)
  const skipFirstSaveRef = useRef(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const profileRef = useRef<Profile | null>(null)
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null)
  const homeGymSectionYRef = useRef(0)

  profileRef.current = profile ?? null

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0)
    })

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  // Scroll to home gym section when focus + keyboard (must be before early returns for rules-of-hooks)
  const showHomeGymResultsForEffect =
    homeGymInputFocused && placeResults.length > 0 && gymSearchQuery.length >= 2
  useEffect(() => {
    if (!homeGymInputFocused) return
    const id = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, homeGymSectionYRef.current - spacing[6]),
        animated: true,
      })
    }, 50)
    return () => clearTimeout(id)
  }, [homeGymInputFocused, showHomeGymResultsForEffect, keyboardHeight])

  const parseHeight = useCallback(
    (heightStr: string | null): { feet: string; inches: string } => {
      if (!heightStr) return { feet: "", inches: "" }
      const match = heightStr.match(/(\d+)'(\d+)"/)
      return match
        ? { feet: match[1], inches: match[2] }
        : { feet: "", inches: "" }
    },
    [],
  )
  const heightFeetOptions = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        value: String(i + 4),
        label: `${i + 4}'`,
      })),
    [],
  )
  const heightInchesOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i),
        label: `${i}"`,
      })),
    [],
  )
  const [heightFeet, setHeightFeet] = useState("")
  const [heightInches, setHeightInches] = useState("")

  const displayNameInput = useFilteredInput({
    value: displayName,
    onChangeText: setDisplayName,
  })

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? "")
    setDisciplines(
      Array.isArray(profile.fitness_disciplines)
        ? [...profile.fitness_disciplines]
        : [],
    )
    const urls = Array.isArray(profile.photo_urls)
      ? profile.photo_urls.filter(
          (u): u is string => typeof u === "string" && u.length > 0,
        )
      : []
    setPhotoUrls(urls)
    const { feet, inches } = parseHeight(profile.height ?? null)
    setHeightFeet(feet)
    setHeightInches(inches)
    skipFirstSaveRef.current = true
  }, [profile, parseHeight])

  useEffect(() => {
    if (gymSearchQuery.length >= 2) {
      searchPlaces(gymSearchQuery)
    }
  }, [gymSearchQuery, searchPlaces])

  useEffect(() => {
    if (
      profile?.home_gym_id &&
      currentGym &&
      !gymInitializedRef.current &&
      !userClearedGym
    ) {
      gymInitializedRef.current = true
    }
  }, [profile?.home_gym_id, currentGym, userClearedGym])

  const displayGym = selectedPlace
    ? { name: selectedPlace.name, address: selectedPlace.formatted_address }
    : !userClearedGym && currentGym
      ? { name: currentGym.name, address: currentGym.address }
      : null

  useEffect(() => {
    if (!__DEV__) return
    const homeGymId = profile?.home_gym_id ?? null
    const gymSummary = currentGym
      ? { id: currentGym.id, name: currentGym.name }
      : null
    const displaySummary = displayGym ? { name: displayGym.name } : null
    console.log("[EditProfile] Home gym state:", {
      profileHomeGymId: homeGymId,
      gymLoading,
      gymError,
      gymErrorMessage: gymErrorDetail?.message ?? null,
      currentGym: gymSummary,
      displayGym: displaySummary,
      userClearedGym,
      selectedPlace: selectedPlace
        ? { place_id: selectedPlace.place_id, name: selectedPlace.name }
        : null,
    })
  }, [
    profile?.home_gym_id,
    gymLoading,
    gymError,
    gymErrorDetail?.message,
    currentGym,
    displayGym,
    userClearedGym,
    selectedPlace,
  ])

  const toggleDiscipline = useCallback((value: string) => {
    setDisciplines((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    )
  }, [])

  const requestPhotoPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to update your profile pictures.",
      )
      return false
    }
    return true
  }, [])

  const pickImage = useCallback(
    async (index: number) => {
      if (photoUrls.length !== index) return
      if (photoUrls.length >= MAX_PHOTOS) {
        Alert.alert("Maximum Photos", `You can add up to ${MAX_PHOTOS} photos.`)
        return
      }
      const hasPermission = await requestPhotoPermission()
      if (!hasPermission) return
      setIsPickingPhoto(true)
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images" as ImagePicker.MediaType],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
          base64: true,
        })
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0]
          const uri =
            typeof asset.base64 === "string" && asset.base64.length > 0
              ? `data:image/jpeg;base64,${asset.base64}`
              : asset.uri
          setPhotoUrls((prev) => [...prev, uri])
        }
      } catch {
        Alert.alert("Error", "Failed to pick image. Please try again.")
      } finally {
        setIsPickingPhoto(false)
      }
    },
    [photoUrls.length, requestPhotoPermission],
  )

  const removePhotoByUrl = useCallback((url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url))
  }, [])

  const handlePhotoReorder = useCallback(
    (urls: string[]) => setPhotoUrls(urls),
    [],
  )

  const handleAddPhoto = useCallback(() => {
    pickImage(photoUrls.length)
  }, [pickImage, photoUrls.length])

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!displayName.trim()) next.displayName = "Name is required"
    if (photoUrls.length < MIN_PHOTOS) {
      next.photos = `Add at least ${MIN_PHOTOS} photos`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }, [displayName, photoUrls.length])

  // Auto-save: debounce and persist only when *form state* changes (not when profile refetches after save)
  useEffect(() => {
    const profile = profileRef.current
    if (!profile) return
    if (isSavingRef.current) return

    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null
      const currentProfile = profileRef.current
      if (!currentProfile) return
      if (skipFirstSaveRef.current) {
        skipFirstSaveRef.current = false
        return
      }
      if (!validate()) return

      isSavingRef.current = true
      const previousProfile: Profile = { ...currentProfile }
      const optimisticHomeGymId = userClearedGym
        ? null
        : (currentProfile.home_gym_id ?? null)
      const optimisticProfile: Profile = {
        ...currentProfile,
        display_name: displayNameInput.getFilteredValue().trim(),
        fitness_disciplines: disciplines,
        height:
          heightFeet && heightInches ? `${heightFeet}'${heightInches}"` : null,
        photo_urls: photoUrls,
        home_gym_id: optimisticHomeGymId,
      }
      queryClient.setQueryData<Profile>(
        ["profile", currentProfile.id],
        optimisticProfile,
      )
      ;(async () => {
        const profileForSave = profileRef.current
        if (!profileForSave) {
          isSavingRef.current = false
          return
        }
        try {
          const resolvedPhotoUrls = await resolvePhotoUrls(
            profileForSave.id,
            photoUrls,
          )

          let homeGymId: string | null | undefined =
            userClearedGym ? null : (profileForSave.home_gym_id ?? null)
          let skipHomeGymUpdate = false
          if (selectedPlace) {
            if (__DEV__) {
              console.log("[EditProfile] selectedPlace (before save):", {
                place_id: selectedPlace.place_id,
                name: selectedPlace.name,
                formatted_address: selectedPlace.formatted_address ?? "(empty)",
                hasLocation: !!selectedPlace.location,
              })
            }
            let address = selectedPlace.formatted_address ?? ""
            let location = selectedPlace.location
            if (!address.trim()) {
              if (__DEV__) {
                console.log(
                  "[EditProfile] Address empty; fetching Place Details at save time for:",
                  selectedPlace.place_id,
                )
              }
              const details = await fetchPlaceDetailsFull(
                selectedPlace.place_id,
              )
              if (__DEV__) {
                console.log("[EditProfile] Place Details at save time:", {
                  formattedAddress: details.formattedAddress ?? "(empty)",
                  hasLocation: !!details.location,
                })
              }
              if (details.formattedAddress) address = details.formattedAddress
              if (details.location) location = details.location
            }
            const payload = {
              id: selectedPlace.place_id,
              name: selectedPlace.name,
              address,
              location,
            }
            if (__DEV__) {
              console.log("[EditProfile] Payload to resolveHomeGym:", {
                id: payload.id,
                name: payload.name,
                address: payload.address || "(empty)",
                addressLength: payload.address?.length ?? 0,
                hasLocation: !!payload.location,
              })
            }
            const resolved = await resolveHomeGym(JSON.stringify(payload))
            if (__DEV__) {
              console.log(
                "[EditProfile] Auto-save: selectedPlace resolved to home_gym_id:",
                resolved ?? "null",
              )
            }
            if (resolved !== null) {
              homeGymId = resolved
            } else {
              skipHomeGymUpdate = true
            }
          } else if (userClearedGym) {
            homeGymId = null
          }

          const updates: Partial<Profile> = {
            display_name: displayNameInput.getFilteredValue().trim(),
            fitness_disciplines: disciplines,
            ...(skipHomeGymUpdate ? {} : { home_gym_id: homeGymId ?? null }),
            photo_urls: resolvedPhotoUrls,
            height:
              heightFeet && heightInches
                ? `${heightFeet}'${heightInches}"`
                : null,
          }
          await updateProfile.mutateAsync(updates)
        } catch (err: unknown) {
          const p = profileRef.current
          if (p) {
            queryClient.setQueryData<Profile>(
              ["profile", p.id],
              previousProfile,
            )
          }
          // Log full error for debugging (toast message is truncated)
          console.error("[EditProfile] Update failed:", err)
          if (err instanceof Error) {
            console.error("[EditProfile] Error message:", err.message)
            if (err.stack) console.error("[EditProfile] Stack:", err.stack)
            if ("cause" in err && err.cause)
              console.error("[EditProfile] Cause:", err.cause)
          } else {
            console.error("[EditProfile] Error (stringified):", String(err))
          }
          const message =
            err instanceof Error &&
            (err.message.toLowerCase().includes("upload") ||
              err.message.toLowerCase().includes("read image"))
              ? "Failed to upload photos. Check your connection and try again."
              : err instanceof Error
                ? err.message
                : "Failed to update your profile. Please try again."
          toast({
            preset: "error",
            title: "Update failed",
            message,
          })
        } finally {
          isSavingRef.current = false
        }
      })()
    }, AUTO_SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [
    displayName,
    heightFeet,
    heightInches,
    disciplines,
    photoUrls,
    selectedPlace,
    userClearedGym,
    validate,
    displayNameInput,
    queryClient,
    updateProfile,
  ])

  if (profileLoading || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (profileError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Failed to load profile</Text>
          <Text style={styles.errorSubtitle}>
            An error occurred. Please try again.
          </Text>
          <Button
            variant="outline"
            onPress={() => router.back()}
            style={{ marginTop: spacing[4] }}
          >
            Back
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  const showHomeGymResults =
    homeGymInputFocused && placeResults.length > 0 && gymSearchQuery.length >= 2
  const extraHomeGymResultsSpace = showHomeGymResults
    ? Math.max(380, Math.min(520, Math.round(keyboardHeight * 0.9)))
    : 0
  const baseScrollBottomPadding = spacing[8]
  const scrollBottomPadding =
    baseScrollBottomPadding +
    (homeGymInputFocused ? keyboardHeight : 0) +
    extraHomeGymResultsSpace

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Custom header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basics</Text>
            <View style={styles.field}>
              <Input
                label="Display name"
                placeholder="Your name"
                value={displayNameInput.value}
                onChangeText={displayNameInput.onChangeText}
                error={errors.displayName}
                autoCapitalize="words"
              />
              <CensoredPreview
                filtered={displayNameInput.filteredPreview}
                show={displayNameInput.hasBadWords}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.heightRow}>
                <Select
                  value={heightFeet}
                  onValueChange={setHeightFeet}
                  placeholder="Feet"
                  options={heightFeetOptions}
                />
                <Select
                  value={heightInches}
                  onValueChange={setHeightInches}
                  placeholder="Inches"
                  options={heightInchesOptions}
                />
              </View>
            </View>
          </View>

          {/* Fitness */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fitness disciplines</Text>
            <View style={styles.disciplineWrap}>
              {WORKOUT_TYPE_OPTIONS.map((opt) => {
                const selected = disciplines.includes(opt.value)
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => toggleDiscipline(opt.value)}
                    style={[
                      styles.disciplineChip,
                      selected && styles.disciplineChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.disciplineChipText,
                        selected && styles.disciplineChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Home gym - Google Places search */}
          <View
            style={styles.section}
            onLayout={(e) => {
              homeGymSectionYRef.current = e.nativeEvent.layout.y
            }}
          >
            <Text style={styles.sectionTitle}>Home gym</Text>
            {displayGym ? (
              <View style={styles.selectedGymChip}>
                <View style={styles.selectedGymContent}>
                  <Text style={styles.selectedGymName} numberOfLines={1}>
                    {displayGym.name}
                  </Text>
                  {displayGym.address ? (
                    <Text style={styles.selectedGymAddress} numberOfLines={1}>
                      {displayGym.address}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => {
                    setSelectedPlace(null)
                    setUserClearedGym(true)
                    setGymSearchQuery("")
                    clearPlaceResults()
                  }}
                  style={styles.clearGymButton}
                >
                  <X size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <>
                <Input
                  placeholder="Search for your gym..."
                  value={gymSearchQuery}
                  onChangeText={setGymSearchQuery}
                  onFocus={() => setHomeGymInputFocused(true)}
                  onBlur={() => setHomeGymInputFocused(false)}
                />
                {gymEnriching ? (
                  <View style={styles.gymLoadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.gymLoadingText}>
                      Loading gym details...
                    </Text>
                  </View>
                ) : placeSearching && gymSearchQuery.length >= 2 ? (
                  <View style={styles.gymLoadingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.gymLoadingText}>Searching...</Text>
                  </View>
                ) : placeResults.length > 0 && gymSearchQuery.length >= 2 ? (
                  <View style={styles.gymResults}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                    >
                      {placeResults.map((place) => (
                        <Pressable
                          key={place.place_id}
                          onPress={async () => {
                            setHomeGymInputFocused(false)
                            setGymSearchQuery("")
                            clearPlaceResults()
                            setGymEnriching(true)
                            try {
                              const details = await fetchPlaceDetailsFull(
                                place.place_id,
                              )
                              const enriched = {
                                ...place,
                                formatted_address:
                                  details.formattedAddress ??
                                  place.formatted_address ??
                                  "",
                                location:
                                  details.location ?? place.location,
                              }
                              if (__DEV__) {
                                console.log(
                                  "[EditProfile] After enrichment (on tap):",
                                  {
                                    name: enriched.name,
                                    place_id: enriched.place_id,
                                    formatted_address:
                                      enriched.formatted_address || "(empty)",
                                    hasLocation: !!enriched.location,
                                  },
                                )
                              }
                              setSelectedPlace(enriched)
                            } finally {
                              setGymEnriching(false)
                            }
                          }}
                          disabled={gymEnriching}
                          style={({ pressed }) => [
                            styles.gymResultItem,
                            pressed && styles.gymResultItemPressed,
                          ]}
                        >
                          <Text style={styles.gymResultName} numberOfLines={1}>
                            {place.name}
                          </Text>
                          {place.formatted_address ? (
                            <Text
                              style={styles.gymResultAddress}
                              numberOfLines={1}
                            >
                              {place.formatted_address}
                            </Text>
                          ) : null}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : gymSearchQuery.length >= 2 && !placeSearching ? (
                  <Text style={styles.gymNoResults}>No gyms found</Text>
                ) : null}
              </>
            )}
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <View style={styles.photoHeader}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.photoCount}>
                ({photoUrls.length}/{MAX_PHOTOS})
              </Text>
            </View>
            {errors.photos && (
              <Text style={styles.fieldError}>{errors.photos}</Text>
            )}
            <DraggablePhotoGrid
              photoUrls={photoUrls}
              maxPhotos={MAX_PHOTOS}
              isPickingPhoto={isPickingPhoto}
              onReorder={handlePhotoReorder}
              onRemove={removePhotoByUrl}
              onAdd={handleAddPhoto}
            />
            <Text style={styles.photoHint}>Add at least 3 photos.</Text>
          </View>

          <View style={{ height: spacing[12] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.destructive,
    textAlign: "center",
  },
  errorSubtitle: {
    marginTop: spacing[2],
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  field: {
    marginBottom: spacing[3],
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  heightRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  fieldError: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    marginBottom: spacing[2],
  },
  disciplineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  disciplineChip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  disciplineChipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  disciplineChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  disciplineChipTextSelected: {
    color: colors.primary,
  },
  selectedGymChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}1A`,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  selectedGymContent: {
    flex: 1,
    minWidth: 0,
  },
  selectedGymName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  selectedGymAddress: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  clearGymButton: {
    padding: spacing[2],
  },
  gymLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[2],
    paddingVertical: spacing[2],
  },
  gymLoadingText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  gymResults: {
    marginTop: spacing[2],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    // Keep dropdown to ~3 items tall; allow scrolling for more results.
    maxHeight: 192,
  },
  gymResultItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gymResultItemPressed: {
    backgroundColor: colors.muted,
  },
  gymResultName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  gymResultAddress: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  gymNoResults: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[2],
  },
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  photoCount: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  photoHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing[2],
  },
})
