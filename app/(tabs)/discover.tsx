import { DiscoveryFilterDropdowns, type DiscoveryFilterValues } from '@/components/discover/DiscoveryFilterDropdowns';
import { DiscoveryPreferences, DiscoveryPreferencesContent, type DiscoveryPreferencesData } from '@/components/discover/DiscoveryPreferences';
import { EmptyFeed } from '@/components/discover/EmptyFeed';
import { MatchModal } from '@/components/discover/MatchModal';
import { OfferWallModal } from '@/components/discover/OfferWallModal';
import { SwipeDeck } from '@/components/discover/SwipeDeck';
import { WorkoutTypeGrid } from '@/components/fitness/WorkoutTypeGrid';
import { FilterRangeSliderContent } from '@/components/ui/FilterRangeSlider';
import { FilterSliderContent } from '@/components/ui/FilterSlider';
import { Button } from '@/components/ui/Button';
import {
  DEFAULT_DISTANCE_MILES,
  MIN_DISTANCE_MILES,
  TOOLTIP_ADJUST_PREFERENCES,
} from '@/constants';
import { useCheckMatch, useCrushSignal, useLike, useLikedProfileIds, useMatches } from '@/lib/api/matches';
import { useDiscoverProfiles, useProfile, useUpdateDiscoveryPreferences } from '@/lib/api/profiles';
import { useGymById, useGymsByIds } from '@/lib/api/gyms';
import { usesMiles, milesToKm, kmToMiles } from '@/lib/utils/locale';
import { calculateDistanceMiles } from '@/lib/utils/distance';
import { useAppStore } from '@/lib/stores/appStore';
import { useQueryClient } from '@tanstack/react-query';
import { layout } from '@/lib/styles';
import { borderRadius, colors, fontSize, fontWeight, palette, spacing, APP } from '@/theme';
import type { DiscoveryPreferences as DiscoveryPrefsType, Profile, SwipeAction } from '@/types';
import type { FitnessDiscipline } from '@/types/onboarding';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from '@/lib/toast';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tooltip from 'react-native-walkthrough-tooltip';

const STORAGE_KEY_PREFERENCES = APP.STORAGE_KEYS.DISCOVERY_PREFERENCES;
const STORAGE_KEY_SWIPED = APP.STORAGE_KEYS.SWIPED_PROFILES;
const STORAGE_KEY_SKIPPED = APP.STORAGE_KEYS.SKIPPED_PROFILES;
const STORAGE_KEY_TOOLTIPS_SEEN = APP.STORAGE_KEYS.DISCOVER_TOOLTIPS_SEEN;

const MIN_DISTANCE_KM = Math.round(milesToKm(MIN_DISTANCE_MILES));
const MAX_DISTANCE_KM = 160; // 100 miles
const DEFAULT_DISTANCE_KM = Math.round(milesToKm(DEFAULT_DISTANCE_MILES));

// Load initial preferences from AsyncStorage
const getInitialPreferences = async (): Promise<DiscoveryPreferencesData> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
  return { gender: 'everyone', maxDistance: DEFAULT_DISTANCE_MILES, disciplines: [], searchByGym: true, selectedGym: null };
};

// Load swiped profiles from AsyncStorage
const loadSwipedProfiles = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_SWIPED);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load swiped profiles:', error);
  }
  return [];
};

// Save swiped profile ID
const saveSwipedProfile = async (profileId: string, swipedIds: string[]): Promise<void> => {
  try {
    const updated = [...swipedIds, profileId];
    await AsyncStorage.setItem(STORAGE_KEY_SWIPED, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save swiped profile:', error);
  }
};

// Load skipped profile IDs from AsyncStorage
const loadSkippedProfiles = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_SKIPPED);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load skipped profiles:', error);
  }
  return [];
};

// Save (append) skipped profile ID
const saveSkippedProfile = async (profileId: string, skippedIds: string[]): Promise<void> => {
  try {
    const updated = [...skippedIds, profileId];
    await AsyncStorage.setItem(STORAGE_KEY_SKIPPED, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save skipped profile:', error);
  }
};

// Remove skipped profile ID and persist
const removeSkippedProfile = async (profileId: string, skippedIds: string[]): Promise<void> => {
  try {
    const updated = skippedIds.filter((id) => id !== profileId);
    await AsyncStorage.setItem(STORAGE_KEY_SKIPPED, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to remove skipped profile:', error);
  }
};

const getTooltipsSeen = async (): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_TOOLTIPS_SEEN);
    return stored === 'true';
  } catch (error) {
    console.error('Failed to load tooltips seen:', error);
    return false;
  }
};

const setTooltipsSeen = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_TOOLTIPS_SEEN, 'true');
  } catch (error) {
    console.error('Failed to save tooltips seen:', error);
  }
};

// --- Match-check state machine ---
type MatchCheckState =
  | { status: 'idle' }
  | { status: 'checking'; userId: string; profile: Profile }
  | { status: 'result'; result: 'match' | 'no-match'; userId: string; profile: Profile; matchedProfile?: Profile }

type MatchCheckAction =
  | { type: 'start_check'; userId: string; profile: Profile }
  | { type: 'match_found'; matchedProfile: Profile }
  | { type: 'no_match' }
  | { type: 'reset' }

function matchCheckReducer(state: MatchCheckState, action: MatchCheckAction): MatchCheckState {
  switch (action.type) {
    case 'start_check':
      return { status: 'checking', userId: action.userId, profile: action.profile };
    case 'match_found':
      if (state.status !== 'checking') return state;
      return { status: 'result', result: 'match', userId: state.userId, profile: state.profile, matchedProfile: action.matchedProfile };
    case 'no_match':
      if (state.status !== 'checking') return state;
      return { status: 'result', result: 'no-match', userId: state.userId, profile: state.profile };
    case 'reset':
      return { status: 'idle' };
    default:
      return state;
  }
}

const MATCH_CHECK_INITIAL: MatchCheckState = { status: 'idle' };

interface FilterSortOptions {
  profiles: Profile[];
  include: (profile: Profile) => boolean;
  preferences: DiscoveryPreferencesData;
  filters: DiscoveryFilterValues;
  currentProfile: Profile | null | undefined;
  gymsMap: Map<string, any>;
  viewerHomeGym: any;
}

function filterScoreAndSort({
  profiles,
  include,
  preferences,
  filters,
  currentProfile,
  gymsMap,
  viewerHomeGym,
}: FilterSortOptions): { profile: Profile; distance: number | null }[] {
  const filtered = profiles.filter((profile) => {
    if (!include(profile)) return false;
    if (preferences.gender === 'men' && profile.gender !== 'male') return false;
    if (preferences.gender === 'women' && profile.gender !== 'female') return false;
    if (preferences.disciplines.length > 0) {
      const hasMatch = preferences.disciplines.some((d) =>
        profile.fitness_disciplines.includes(d)
      );
      if (!hasMatch) return false;
    }
    return true;
  });

  const viewerFromLastLocation = (currentProfile as any)?.last_location ?? null;
  const viewerFromGym = viewerHomeGym?.location ?? null;
  const viewerRef = viewerFromLastLocation ?? viewerFromGym ?? null;

  const withDistances = filtered.map((profile) => {
    const candidateLastLocation = (profile as any)?.last_location ?? null;
    const candidateGym = profile.home_gym_id ? gymsMap.get(profile.home_gym_id) : null;
    const candidateRef = candidateLastLocation ?? candidateGym?.location ?? null;
    if (!viewerRef || !candidateRef) {
      return { profile, distance: null as number | null };
    }
    return { profile, distance: calculateDistanceMiles(viewerRef, candidateRef) };
  });

  const distanceFiltered = withDistances.filter(({ distance }) => {
    if (filters.distance !== null && filters.distance > 0) {
      const maxMiles = kmToMiles(filters.distance);
      if (distance === null) return false;
      if (distance > maxMiles) return false;
    }
    return true;
  });

  // Hoist current user's disciplines Set outside the loop
  const currentDisciplines = currentProfile?.fitness_disciplines
    ? new Set(currentProfile.fitness_disciplines)
    : null;

  return distanceFiltered
    .map(({ profile, distance }) => {
      let relevanceScore = 0;

      // Shared fitness disciplines
      if (currentDisciplines && profile.fitness_disciplines) {
        let sharedCount = 0;
        currentDisciplines.forEach((d) => {
          if (profile.fitness_disciplines.includes(d)) sharedCount++;
        });
        relevanceScore += sharedCount * 10;
      }

      // Profile completeness
      if (profile.bio && profile.bio.trim().length > 0) relevanceScore += 2;
      if (profile.approach_prompt && profile.approach_prompt.trim().length > 0) relevanceScore += 2;
      const photoCount = profile.photo_urls?.length || 0;
      if (photoCount > 1) relevanceScore += Math.min(photoCount - 1, 3);

      // Recency boost
      if (profile.updated_at) {
        const daysSinceUpdate = (Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate <= 7) {
          relevanceScore += Math.max(0, 5 * (1 - daysSinceUpdate / 7));
        }
      }

      const hasMatchingWorkoutType =
        filters.workoutTypes.length > 0 &&
        filters.workoutTypes.some((t) => profile.fitness_disciplines.includes(t));

      return { profile, distance, relevanceScore, hasMatchingWorkoutType };
    })
    .sort((a, b) => {
      if (filters.workoutTypes.length > 0) {
        const aFirst = a.hasMatchingWorkoutType ? 0 : 1;
        const bFirst = b.hasMatchingWorkoutType ? 0 : 1;
        if (aFirst !== bFirst) return aFirst - bFirst;
      }
      if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    })
    .map(({ profile, distance }) => ({ profile, distance }));
}

export default function DiscoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentProfile } = useProfile();
  const checkCrushAvailability = useAppStore((s) => s.checkCrushAvailability);
  const updateDiscoveryPreferencesMutation = useUpdateDiscoveryPreferences();
  
  // Bottom sheet for preferences – now a modal so it doesn't compete with slider state
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);

  // Bottom sheet for workout types
  const workoutTypesBottomSheetRef = useRef<BottomSheet>(null);
  const workoutTypesSnapPoints = useMemo(() => ['70%'], []);

  // Offer wall modal
  const [offerWallOpen, setOfferWallOpen] = useState(false);

  // Distance slider state
  const [isDistanceSliderOpen, setIsDistanceSliderOpen] = useState(false);
  const [distanceSliderValue, setDistanceSliderValue] = useState<number>(0);

  // Age range slider state — sliderValue updates immediately for UI,
  // filters.ageRange updates after debounce to avoid refetching on every drag
  const [isAgeRangeSliderOpen, setIsAgeRangeSliderOpen] = useState(false);
  const [ageRangeSliderValue, setAgeRangeSliderValue] = useState<[number, number]>([18, 65]);
  const ageRangeDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [preferences, setPreferences] = useState<DiscoveryPreferencesData>({
    gender: 'everyone',
    maxDistance: DEFAULT_DISTANCE_MILES,
    disciplines: [],
    searchByGym: true,
    selectedGym: null,
  });
  const [filters, setFilters] = useState<DiscoveryFilterValues>({
    ageRange: null,
    distance: null,
    workoutTypes: [],
  });

  const handleOpenPreferences = useCallback(() => {
    setIsPreferencesModalVisible(true);
  }, []);

  const handleClosePreferences = useCallback(() => {
    setIsPreferencesModalVisible(false);
  }, []);

  const handleOpenDistanceSlider = useCallback(() => {
    setDistanceSliderValue(filters.distance ?? DEFAULT_DISTANCE_KM);
    setIsDistanceSliderOpen(true);
  }, [filters.distance]);

  const handleCloseDistanceSlider = useCallback(() => {
    setIsDistanceSliderOpen(false);
  }, []);

  const handleDistanceSliderChange = useCallback((value: number) => {
    // Clamp to min 2 miles; store in km
    const clampedKm = Math.max(MIN_DISTANCE_KM, value);
    setDistanceSliderValue(clampedKm);
    setFilters((prev) => ({ ...prev, distance: clampedKm }));
    updateDiscoveryPreferencesMutation.mutate({
      max_distance: clampedKm,
    });
  }, [updateDiscoveryPreferencesMutation]);

  const handleDistanceSliderClear = useCallback(() => {
    setDistanceSliderValue(0);
    setFilters((prev) => ({ ...prev, distance: null }));
    updateDiscoveryPreferencesMutation.mutate({
      max_distance: null,
    });
    // Modal closes via onRequestClose from content
  }, [updateDiscoveryPreferencesMutation]);

  // Close slider when clicking outside
  const handleCloseSliderOnBackdrop = useCallback(() => {
    setIsDistanceSliderOpen(false);
  }, []);

  const handleOpenAgeRangeSlider = useCallback(() => {
    setAgeRangeSliderValue(filters.ageRange ?? [18, 65]);
    setIsAgeRangeSliderOpen(true);
  }, [filters.ageRange]);

  const handleCloseAgeRangeSlider = useCallback(() => {
    setIsAgeRangeSliderOpen(false);
  }, []);

  const handleCloseAgeRangeSliderOnBackdrop = useCallback(() => {
    // Close without applying – discard in-modal changes
    setIsAgeRangeSliderOpen(false);
  }, []);

  const AGE_RANGE_DEBOUNCE_MS = 400;
  const handleAgeRangeSliderChange = useCallback((value: [number, number]) => {
    if (!Array.isArray(value) || value.length !== 2) return;
    const [min, max] = value;
    if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) return;
    if (min > max) return;
    // Update slider UI immediately
    setAgeRangeSliderValue(value);
    // Debounce the filter update that triggers API refetch
    if (ageRangeDebounceTimerRef.current) clearTimeout(ageRangeDebounceTimerRef.current);
    ageRangeDebounceTimerRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, ageRange: value }));
    }, AGE_RANGE_DEBOUNCE_MS);
  }, []);

  const handleAgeRangeSliderClear = useCallback(() => {
    if (ageRangeDebounceTimerRef.current) {
      clearTimeout(ageRangeDebounceTimerRef.current);
      ageRangeDebounceTimerRef.current = null;
    }
    setAgeRangeSliderValue([18, 65]);
    setFilters((prev) => ({ ...prev, ageRange: null }));
  }, []);


  const handleWorkoutTypeToggle = useCallback((discipline: FitnessDiscipline) => {
    setFilters((prev) => {
      const currentTypes = prev.workoutTypes;
      const updated = currentTypes.includes(discipline)
        ? currentTypes.filter((t) => t !== discipline)
        : [...currentTypes, discipline];
      return { ...prev, workoutTypes: updated };
    });
  }, []);

  const handleClearWorkoutTypes = useCallback(() => {
    setFilters((prev) => ({ ...prev, workoutTypes: [] }));
  }, []);

  const handleOfferWallChange = useCallback((open: boolean) => {
    setOfferWallOpen(open);
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skippedIndex, setSkippedIndex] = useState(0);
  const [swipedProfiles, setSwipedProfiles] = useState<string[]>([]);
  const [skippedProfiles, setSkippedProfiles] = useState<string[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [matchCheck, dispatchMatchCheck] = useReducer(matchCheckReducer, MATCH_CHECK_INITIAL);
  // Tooltip walkthrough: null = inactive, 0-4 = sequential steps
  // 0=filter, 1=photoSwipe, 2=imageComment, 3=swipeDown, 4=swipeUp
  const [tooltipStep, setTooltipStep] = useState<number | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deckScrollY, setDeckScrollY] = useState(0);


  // Load preferences, swiped, and skipped profiles on mount
  useEffect(() => {
    const loadData = async () => {
      const [loadedPrefs, loadedSwiped, loadedSkipped] = await Promise.all([
        getInitialPreferences(),
        loadSwipedProfiles(),
        loadSkippedProfiles(),
      ]);
      setPreferences(loadedPrefs);
      setSwipedProfiles(loadedSwiped);
      setSkippedProfiles(loadedSkipped);
    };
    loadData();
  }, []);

  // Re-load preferences from AsyncStorage when screen gains focus (e.g. after changing gender in Settings)
  useFocusEffect(
    useCallback(() => {
      const loadPrefs = async () => {
        const loadedPrefs = await getInitialPreferences();
        setPreferences(loadedPrefs);
      };
      loadPrefs();
    }, [])
  );

  // Load distance from backend when profile is available
  useEffect(() => {
    if (currentProfile?.discovery_preferences) {
      const discoveryPrefs = currentProfile.discovery_preferences as any;
      const maxDistanceKm = discoveryPrefs?.max_distance;
      
      if (maxDistanceKm !== undefined && maxDistanceKm !== null && maxDistanceKm > 0) {
        const clampedKm = Math.min(MAX_DISTANCE_KM, Math.max(MIN_DISTANCE_KM, maxDistanceKm));
        setFilters((prev) => ({ ...prev, distance: clampedKm }));
        
        // Convert km to miles for preferences modal display only (round up)
        const maxDistanceMiles = Math.ceil(kmToMiles(clampedKm));
        setPreferences((prev) => ({ ...prev, maxDistance: maxDistanceMiles }));
      } else {
        // If backend has null/0/undefined, ensure filter is also null
        setFilters((prev) => ({ ...prev, distance: null }));
      }
    }
  }, [currentProfile?.discovery_preferences]);

  // Show tooltip walkthrough on mount if user hasn't seen it
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = async () => {
      const seen = await getTooltipsSeen();
      if (cancelled || seen) return;
      timer = setTimeout(() => {
        if (!cancelled) setTooltipStep(0);
      }, 500);
    };
    run();
    return () => {
      cancelled = true;
      if (timer != null) clearTimeout(timer);
    };
  }, []);

  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const advanceTooltip = useCallback(() => {
    setTooltipStep((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next >= 5) {
        setTooltipsSeen();
        return null;
      }
      // Hide current tooltip, then show next after delay
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipStep(next), 300);
      return null;
    });
  }, []);

  // Convert DiscoveryPreferencesData to DiscoveryPreferences type for API
  // filters.ageRange is debounced so this only updates after user stops dragging
  const apiPreferences = useMemo<DiscoveryPrefsType>(() => {
    const genderMap: Record<string, ('male' | 'female' | 'non-binary' | 'prefer-not-to-say')[]> = {
      men: ['male'],
      women: ['female'],
      everyone: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
    };

    const genders = genderMap[preferences.gender] || [];
    const minAge = filters.ageRange?.[0];
    const maxAge = filters.ageRange?.[1];

    const result: DiscoveryPrefsType = { genders };
    if (minAge !== undefined) result.minAge = minAge;
    if (maxAge !== undefined) result.maxAge = maxAge;

    return result;
  }, [preferences.gender, filters.ageRange]);

  // Viewer home gym (used as fallback when last_location is missing)
  const viewerHomeGymId = currentProfile?.home_gym_id || null;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (ageRangeDebounceTimerRef.current) {
        clearTimeout(ageRangeDebounceTimerRef.current);
      }
    };
  }, []);

  // Fetch discover profiles (RLS scopes this to nearby users by last_location/home gym fallback)
  const { data: nearbyProfiles = [], isLoading, error: nearbyProfilesError, refetch: refetchProfiles } = useDiscoverProfiles(
    apiPreferences
  );

  // Fetch viewer home gym for fallback distance calculation
  const { data: viewerHomeGym } = useGymById(viewerHomeGymId || '');

  // Get unique gym IDs from profiles (for batch fetching)
  const profileGymIds = useMemo(() => {
    const gymIds = new Set<string>();
    nearbyProfiles.forEach((profile) => {
      if (profile.home_gym_id) {
        gymIds.add(profile.home_gym_id);
      }
    });
    return Array.from(gymIds);
  }, [nearbyProfiles]);

  // Batch fetch gyms for all profiles
  const { data: gymsMap = new Map<string, any>() } = useGymsByIds(profileGymIds);

  // Server-side "already liked" and "matched" so discover excludes them even if local swiped list is out of sync
  const { data: likedProfileIds = [] } = useLikedProfileIds();
  const { data: matches = [] } = useMatches();
  const matchedProfileIds = useMemo(
    () => matches.map((m) => m.otherUser.id),
    [matches]
  );
  const excludedProfileIds = useMemo(
    () => new Set([...swipedProfiles, ...likedProfileIds, ...matchedProfileIds]),
    [swipedProfiles, likedProfileIds, matchedProfileIds]
  );

  // User-facing error state is shown in the UI; log in dev only
  useEffect(() => {
    if (__DEV__ && nearbyProfilesError) {
      console.error('[Discover] Error fetching nearby profiles:', nearbyProfilesError);
    }
  }, [nearbyProfilesError]);

  // Filter profiles: exclude anyone we've already liked or matched, then score and sort
  const filteredUsers = useMemo(() => filterScoreAndSort({
    profiles: nearbyProfiles,
    include: (p) => !excludedProfileIds.has(p.id),
    preferences,
    filters,
    currentProfile,
    gymsMap,
    viewerHomeGym,
  }), [nearbyProfiles, excludedProfileIds, preferences, filters, gymsMap, currentProfile, viewerHomeGym]);

  // Skipped pool: profiles user previously passed (used when main feed is exhausted)
  const skippedPool = useMemo(() => filterScoreAndSort({
    profiles: nearbyProfiles,
    include: (p) => skippedProfiles.includes(p.id),
    preferences,
    filters,
    currentProfile,
    gymsMap,
    viewerHomeGym,
  }), [nearbyProfiles, skippedProfiles, preferences, filters, gymsMap, currentProfile, viewerHomeGym]);

  const hasMainFeed = filteredUsers.length > 0 && currentIndex < filteredUsers.length;
  const hasSkippedToShow = filteredUsers.length === 0 && skippedPool.length > 0 && skippedIndex < skippedPool.length;
  const currentEntry = hasMainFeed
    ? filteredUsers[currentIndex]
    : hasSkippedToShow
      ? skippedPool[skippedIndex]
      : null;
  const currentUser = currentEntry?.profile ?? null;
  const deckEntries = hasMainFeed
    ? filteredUsers.slice(currentIndex, currentIndex + 3)
    : hasSkippedToShow
      ? skippedPool.slice(skippedIndex, skippedIndex + 3)
      : [];
  const deckProfiles = deckEntries.map((e) => e.profile);
  const deckDistances = useMemo(() => {
    const map = new Map<string, number | null>();
    deckEntries.forEach((e) => map.set(e.profile.id, e.distance));
    return map;
  }, [deckEntries]);
  const isSkippedMode = filteredUsers.length === 0 && skippedPool.length > 0;

  // Reset header scroll state when deck is empty
  useEffect(() => {
    if (!hasMainFeed && !hasSkippedToShow) {
      setDeckScrollY(0);
    }
  }, [hasMainFeed, hasSkippedToShow]);

  // Mutations
  const likeMutation = useLike();
  const crushMutation = useCrushSignal();
  // Only check for match when actively checking and have valid user IDs
  const matchCheckUserId = matchCheck.status !== 'idle' ? matchCheck.userId : null;
  const canCheckMatch = matchCheck.status === 'checking' &&
    currentProfile &&
    currentProfile.id !== matchCheck.userId;
  
  const { data: matchData } = useCheckMatch(
    currentProfile?.id || '',
    canCheckMatch && matchCheckUserId ? matchCheckUserId : ''
  );

  const handleSwipe = useCallback(
    async (action: SwipeAction) => {
      if (!currentUser) return;

      const profileId = currentUser.id;

      try {
        if (action === 'like') {
          await likeMutation.mutateAsync({ toUserId: profileId });
        } else if (action === 'crush') {
          if (!checkCrushAvailability()) {
            toast({
              preset: 'error',
              title: 'Crush signal unavailable',
              message: 'You can only send one crush signal per day. Try again tomorrow!',
            });
            return;
          }
          await crushMutation.mutateAsync({ toUserId: profileId });
        }

        // Check for match after like/crush (before moving to next profile)
        if (action === 'like' || action === 'crush') {
          // Start match check — don't add to swipedProfiles yet
          dispatchMatchCheck({ type: 'start_check', userId: profileId, profile: currentUser });
          
          // Invalidate and refetch the match check query after a short delay
          // to allow the database trigger to complete creating the match
          if (currentProfile?.id) {
            setTimeout(() => {
              // Invalidate both possible query key orders
              queryClient.invalidateQueries({ 
                queryKey: ['match', currentProfile.id, profileId] 
              });
              queryClient.invalidateQueries({ 
                queryKey: ['match', profileId, currentProfile.id] 
              });
              // Refetch the match check query
              queryClient.refetchQueries({ 
                queryKey: ['match', currentProfile.id, profileId] 
              });
              queryClient.refetchQueries({ 
                queryKey: ['match', profileId, currentProfile.id] 
              });
            }, 200); // 200ms delay to allow database trigger to complete
          }
          
          // Don't advance index yet - wait to see if there's a match
          // If no match, we'll advance in handleKeepSwiping
        } else {
          // For pass actions, save to swiped and to skipped list, then move to next profile
          const updatedSwiped = [...swipedProfiles, profileId];
          setSwipedProfiles(updatedSwiped);
          await saveSwipedProfile(profileId, updatedSwiped);
          if (isSkippedMode) {
            const updatedSkipped = skippedProfiles.filter((id) => id !== profileId);
            setSkippedProfiles(updatedSkipped);
            await removeSkippedProfile(profileId, skippedProfiles);
            setSkippedIndex((prev) => prev + 1);
          } else {
            const updatedSkipped = [...skippedProfiles, profileId];
            setSkippedProfiles(updatedSkipped);
            await saveSkippedProfile(profileId, skippedProfiles);
            setCurrentIndex((prev) => prev + 1);
          }
        }
      } catch (error: any) {
        toast({
          preset: 'error',
          title: 'Action failed',
          message: error.message || 'Something went wrong',
        });
      }
    },
    [currentUser, swipedProfiles, skippedProfiles, isSkippedMode, likeMutation, crushMutation, checkCrushAvailability, currentProfile?.id, queryClient]
  );

  // Signal match/no-match result to SwipeDeck for overlay animations
  useEffect(() => {
    if (matchCheck.status !== 'checking' || !currentProfile) return;

    if (matchData && matchCheck.userId !== currentProfile.id && !showMatchModal) {
      // MATCH — use the stored profile from the reducer
      const matchedProfile = matchCheck.profile
        || filteredUsers.find(e => e.profile.id === matchCheck.userId)?.profile
        || nearbyProfiles.find(u => u.id === matchCheck.userId);

      if (matchedProfile) {
        setMatchedUser(matchedProfile);
        dispatchMatchCheck({ type: 'match_found', matchedProfile });
      }
    } else if (!matchData) {
      dispatchMatchCheck({ type: 'no_match' });
    }
  }, [matchData, matchCheck, currentProfile, showMatchModal, filteredUsers, nearbyProfiles]);

  // --- Shared helpers for match flow completion ---
  const markProfileAsSwiped = useCallback(async (profileId: string) => {
    const updatedSwiped = [...swipedProfiles, profileId];
    setSwipedProfiles(updatedSwiped);
    await saveSwipedProfile(profileId, updatedSwiped);
    if (skippedProfiles.includes(profileId)) {
      const updatedSkipped = skippedProfiles.filter((id) => id !== profileId);
      setSkippedProfiles(updatedSkipped);
      await removeSkippedProfile(profileId, skippedProfiles);
    }
  }, [swipedProfiles, skippedProfiles]);

  const invalidateMatchQueries = useCallback((userId: string) => {
    if (!currentProfile?.id) return;
    queryClient.invalidateQueries({ queryKey: ['match', currentProfile.id, userId] });
    queryClient.invalidateQueries({ queryKey: ['match', userId, currentProfile.id] });
  }, [currentProfile?.id, queryClient]);

  const resetMatchFlow = useCallback(() => {
    setShowMatchModal(false);
    setMatchedUser(null);
    dispatchMatchCheck({ type: 'reset' });
  }, []);

  const advanceToNextProfile = useCallback(() => {
    if (filteredUsers.length > 0) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSkippedIndex((prev) => prev + 1);
    }
  }, [filteredUsers.length]);

  // Derive swipeResult for SwipeDeck from reducer state
  const swipeResultForDeck = matchCheck.status === 'result' ? matchCheck.result : null;

  /** Called by SwipeDeck after all exit animations are done */
  const handleSwipeComplete = useCallback(async () => {
    if (matchCheck.status === 'result' && matchCheck.result === 'match') {
      setShowMatchModal(true);
      return; // Don't advance — match modal handlers will advance
    }

    // No-match — advance to next profile immediately, persist in background
    const userId = matchCheckUserId;
    dispatchMatchCheck({ type: 'reset' });
    advanceToNextProfile();
    if (userId) {
      markProfileAsSwiped(userId);
    }
  }, [matchCheck, matchCheckUserId, markProfileAsSwiped, advanceToNextProfile]);

  const handleStartChatting = useCallback(async () => {
    const userId = matchCheckUserId;
    resetMatchFlow();
    if (matchData) {
      router.push('/(tabs)/chat');
      setTimeout(() => {
        router.push(`/(tabs)/chat/${matchData.id}`);
      }, 150);
    } else {
      advanceToNextProfile();
    }
    // Persist in background after UI has updated
    if (userId) {
      markProfileAsSwiped(userId);
      invalidateMatchQueries(userId);
    }
  }, [matchData, router, matchCheckUserId, markProfileAsSwiped, invalidateMatchQueries, resetMatchFlow, advanceToNextProfile]);

  const handleKeepSwiping = useCallback(async () => {
    const userId = matchCheckUserId;
    resetMatchFlow();
    advanceToNextProfile();
    // Persist in background after UI has updated
    if (userId) {
      markProfileAsSwiped(userId);
      invalidateMatchQueries(userId);
    }
  }, [matchCheckUserId, markProfileAsSwiped, invalidateMatchQueries, resetMatchFlow, advanceToNextProfile]);


  const handlePreferencesChange = useCallback((prefs: DiscoveryPreferencesData) => {
    setPreferences(prefs);
    setCurrentIndex(0);
    setSkippedIndex(0);

    // Sync distance filter: allow blank (null); default 30 miles; min 2 miles
    if (prefs.maxDistance !== undefined && prefs.maxDistance !== null && prefs.maxDistance > 0) {
      const useMiles = usesMiles();
      const milesClamped = Math.max(MIN_DISTANCE_MILES, prefs.maxDistance);
      const maxDistanceKm = useMiles
        ? Math.round(milesToKm(milesClamped))
        : milesClamped;
      setFilters((prev) => ({ ...prev, distance: maxDistanceKm }));
      updateDiscoveryPreferencesMutation.mutate({
        max_distance: maxDistanceKm,
      });
    } else {
      setFilters((prev) => ({ ...prev, distance: null }));
      updateDiscoveryPreferencesMutation.mutate({
        max_distance: null,
      });
    }
  }, [updateDiscoveryPreferencesMutation]);

  const handleFiltersChange = useCallback((newFilters: DiscoveryFilterValues) => {
    setFilters(newFilters);
    setCurrentIndex(0);
    setSkippedIndex(0);
  }, []);

  const handleDeckSwipe = useCallback((profileId: string, action: SwipeAction) => {
    if (currentUser && profileId === currentUser.id) {
      handleSwipe(action);
    }
  }, [currentUser, handleSwipe]);

  const handleDeckScrollStateChange = useCallback(({ scrollY }: { scrollY: number; isAtTop: boolean }) => {
    setDeckScrollY(scrollY);
  }, []);

  const handleOfferWallCtaPress = useCallback(() => {
    toast({ preset: 'none', title: 'Coming soon!' });
    setOfferWallOpen(false);
  }, []);

  const handleStartOver = useCallback(async () => {
    setSwipedProfiles([]);
    setSkippedProfiles([]);
    setCurrentIndex(0);
    setSkippedIndex(0);
    await AsyncStorage.removeItem(APP.STORAGE_KEYS.SWIPED_PROFILES);
    await AsyncStorage.removeItem(APP.STORAGE_KEYS.SKIPPED_PROFILES);
    await AsyncStorage.removeItem(APP.STORAGE_KEYS.DISCOVER_TOOLTIPS_SEEN);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[layout.flex1, { backgroundColor: colors.background }]}>
        <View style={[layout.flex1, layout.itemsCenter, layout.justifyCenter]}>
          {/* Loading state - you can add a loading spinner here */}
        </View>
      </SafeAreaView>
    );
  }

  if (nearbyProfilesError) {
    return (
      <SafeAreaView style={[layout.flex1, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[layout.flex1, layout.itemsCenter, layout.justifyCenter, { paddingHorizontal: spacing[6] }]}>
          <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.foreground, textAlign: 'center', marginBottom: spacing[2] }}>
            Couldn{"'"}t load discovery
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing[6] }}>
            {nearbyProfilesError instanceof Error ? nearbyProfilesError.message : 'Something went wrong. Try again.'}
          </Text>
          <Button variant="primary" onPress={() => refetchProfiles()}>
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[layout.flex1, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Sticky Header: full pills at top, or first name only when scrolled */}
      <View style={styles.headerContainer}>
        {deckScrollY <= 50 ? (
          <View style={styles.headerRow}>
            <Tooltip
              isVisible={tooltipStep === 0}
              allowChildInteraction={false}
              contentStyle={{ backgroundColor: colors.primary, padding: 0, borderRadius: borderRadius.md }}
              content={
                <View style={{ backgroundColor: colors.primary, padding: spacing[3], borderRadius: borderRadius.md }}>
                  <Text style={{ color: palette.black, fontSize: fontSize.base }}>
                    {TOOLTIP_ADJUST_PREFERENCES}
                  </Text>
                </View>
              }
              placement="bottom"
              onClose={advanceTooltip}
              backgroundColor="rgba(0,0,0,0.5)"
            >
              <DiscoveryPreferences onPreferencesChange={handlePreferencesChange} onOpen={handleOpenPreferences} disabled={tooltipStep === 0} />
            </Tooltip>
            <View style={styles.headerContent}>
              <DiscoveryFilterDropdowns 
                distance={filters.distance}
                ageRange={filters.ageRange}
                workoutTypes={filters.workoutTypes}
                onFiltersChange={handleFiltersChange}
                onOpenDistanceSlider={handleOpenDistanceSlider}
                onOpenAgeRangeSlider={handleOpenAgeRangeSlider}
                offerWallOpen={offerWallOpen}
                onOfferWallChange={handleOfferWallChange}
                distanceMinKm={MIN_DISTANCE_KM}
                distanceMaxKm={MAX_DISTANCE_KM}
              />
            </View>
          </View>
        ) : (
          <View style={styles.headerRowCentered}>
            <Text style={styles.headerFirstName}>
              {(hasMainFeed || hasSkippedToShow) && currentUser
                ? (currentUser.display_name?.split(/\s+/)[0] ?? 'Profile')
                : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Age Range Slider */}
      {isAgeRangeSliderOpen && (
        <>
          <Pressable 
            style={styles.sliderBackdrop}
            onPress={handleCloseAgeRangeSliderOnBackdrop}
          />
          <View style={styles.distanceSliderContainer}>
            <FilterRangeSliderContent
              label="Age Range"
              value={ageRangeSliderValue}
              min={18}
              max={65}
              onValueChange={handleAgeRangeSliderChange}
              onClear={handleAgeRangeSliderClear}
              onRequestClose={handleCloseAgeRangeSlider}
            />
          </View>
        </>
      )}

      {/* Distance Slider */}
      {isDistanceSliderOpen && (
        <>
          <Pressable 
            style={styles.sliderBackdrop}
            onPress={handleCloseSliderOnBackdrop}
          />
          <View style={styles.distanceSliderContainer}>
            <FilterSliderContent
              label="Distance"
              value={distanceSliderValue}
              min={MIN_DISTANCE_KM}
              max={MAX_DISTANCE_KM}
              unit="km"
              onValueChange={handleDistanceSliderChange}
              onClear={handleDistanceSliderClear}
              onRequestClose={handleCloseDistanceSlider}
            />
          </View>
        </>
      )}

      {/* Profile View */}
      <View style={layout.flex1}>
        {(hasMainFeed || hasSkippedToShow) && currentUser ? (
          <View style={layout.flex1}>
            {isSkippedMode && (
              <View style={styles.skippedBanner}>
                <Text style={styles.skippedBannerText}>Showing people you skipped</Text>
              </View>
            )}
            <SwipeDeck
              profiles={deckProfiles}
              onSwipe={handleDeckSwipe}
              swipeResult={swipeResultForDeck}
              onSwipeComplete={handleSwipeComplete}
              showPhotoSwipeTooltip={tooltipStep === 1}
              showImageCommentTooltip={tooltipStep === 2}
              showSwipeDownTooltip={tooltipStep === 3}
              showSwipeUpTooltip={tooltipStep === 4}
              onPhotoSwipeTooltipClose={advanceTooltip}
              onImageCommentTooltipClose={advanceTooltip}
              onSwipeDownTooltipClose={advanceTooltip}
              onSwipeUpTooltipClose={advanceTooltip}
              onScrollStateChange={handleDeckScrollStateChange}
              distances={deckDistances}
            />
          </View>
        ) : (
          <EmptyFeed
            message="You've seen everyone!"
            onStartOver={handleStartOver}
          />
        )}
      </View>

      {/* Discovery Preferences Modal – stays open until close or Save */}
      <Modal
        visible={isPreferencesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleClosePreferences}
      >
        <View style={styles.preferencesModalBackdrop}>
          <View style={styles.preferencesModalContent}>
            <ScrollView
              style={styles.preferencesModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <DiscoveryPreferencesContent
                onClose={handleClosePreferences}
                onPreferencesChange={handlePreferencesChange}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout Types Bottom Sheet */}
      <BottomSheet
        ref={workoutTypesBottomSheetRef}
        index={-1}
        snapPoints={workoutTypesSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.workoutTypesSheetContent}>
            <View style={styles.workoutTypesHeader}>
              <Text style={styles.workoutTypesTitle}>Workout Types</Text>
              <Pressable onPress={handleClearWorkoutTypes}>
                <Text style={styles.workoutTypesClearButton}>Clear</Text>
              </Pressable>
            </View>
            <WorkoutTypeGrid
              variant="bottomSheet"
              selected={filters.workoutTypes}
              onToggle={handleWorkoutTypeToggle}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Offer Wall Modal */}
      <OfferWallModal
        visible={offerWallOpen}
        onClose={() => setOfferWallOpen(false)}
        onCtaPress={handleOfferWallCtaPress}
      />

      {/* Match Modal */}
      {currentProfile && matchedUser && (
        <MatchModal
          visible={showMatchModal}
          currentUser={currentProfile}
          matchedUser={matchedUser}
          onStartChatting={handleStartChatting}
          onKeepSwiping={handleKeepSwiping}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: `${colors.background}F2`, // 95% opacity
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}80`, // 50% opacity
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerContent: {
    flex: 1,
    overflow: 'hidden',
  },
  headerRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  headerFirstName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  bottomSheetBackground: {
    backgroundColor: colors.card,
  },
  bottomSheetIndicator: {
    backgroundColor: colors.mutedForeground,
  },
  preferencesModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  preferencesModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  preferencesModalScroll: {
    maxHeight: '100%',
  },
  sliderBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  distanceSliderContainer: {
    position: 'absolute',
    top: 120, // Below the header
    left: spacing[4],
    right: spacing[4],
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    zIndex: 1000,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  workoutTypesSheetContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  workoutTypesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  workoutTypesTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  workoutTypesClearButton: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  skippedBanner: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.muted,
    alignItems: 'center',
  },
  skippedBannerText: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    fontWeight: fontWeight.medium,
  },
});
