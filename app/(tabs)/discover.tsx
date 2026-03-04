import { DiscoveryFilterDropdowns, type DiscoveryFilterValues } from '@/components/discover/DiscoveryFilterDropdowns';
import { DiscoveryPreferences, DiscoveryPreferencesContent, type DiscoveryPreferencesData } from '@/components/discover/DiscoveryPreferences';
import { EmptyFeed } from '@/components/discover/EmptyFeed';
import { MatchModal } from '@/components/discover/MatchModal';
import { SwipeDeck } from '@/components/discover/SwipeDeck';
import { WorkoutTypeGrid } from '@/components/fitness/WorkoutTypeGrid';
import { FilterRangeSliderContent } from '@/components/ui/FilterRangeSlider';
import { FilterSliderContent } from '@/components/ui/FilterSlider';
import { Button } from '@/components/ui/Button';
import {
  DEFAULT_DISTANCE_MILES,
  MAX_DISTANCE_MILES,
  MIN_DISTANCE_MILES,
} from '@/constants';
import { useCheckMatch, useCrushSignal, useLike } from '@/lib/api/matches';
import { useDiscoverProfiles, useProfile, useUpdateDiscoveryPreferences } from '@/lib/api/profiles';
import { useGymById, useGymsByIds } from '@/lib/api/gyms';
import { usesMiles, milesToKm, kmToMiles } from '@/lib/utils/locale';
import { calculateDistanceMiles, parseLocation } from '@/lib/utils/distance';
import { useAppStore } from '@/lib/stores/appStore';
import { useQueryClient } from '@tanstack/react-query';
import { layout } from '@/lib/styles';
import { borderRadius, colors, fontSize, fontWeight, spacing, APP } from '@/theme';
import type { DiscoveryPreferences as DiscoveryPrefsType, Profile, SwipeAction } from '@/types';
import type { FitnessDiscipline } from '@/types/onboarding';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'burnt';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tooltip from 'react-native-walkthrough-tooltip';

const STORAGE_KEY_PREFERENCES = APP.STORAGE_KEYS.DISCOVERY_PREFERENCES;
const STORAGE_KEY_SWIPED = APP.STORAGE_KEYS.SWIPED_PROFILES;

const MIN_DISTANCE_KM = Math.round(milesToKm(MIN_DISTANCE_MILES));
const MAX_DISTANCE_KM = 160; // 100 miles
const DEFAULT_DISTANCE_KM = Math.round(milesToKm(DEFAULT_DISTANCE_MILES));

// Helper to get today's date as a string for localStorage key
const getTodayKey = () => new Date().toISOString().split('T')[0];

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

export default function DiscoverScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentProfile } = useProfile();
  const hasCrushAvailable = useAppStore((s) => s.hasCrushAvailable);
  const checkCrushAvailability = useAppStore((s) => s.checkCrushAvailability);
  const updateDiscoveryPreferencesMutation = useUpdateDiscoveryPreferences();
  
  // Bottom sheet for preferences
  const preferencesBottomSheetRef = useRef<BottomSheet>(null);
  const preferencesSnapPoints = useMemo(() => ['90%'], []);

  // Bottom sheet for workout types
  const workoutTypesBottomSheetRef = useRef<BottomSheet>(null);
  const workoutTypesSnapPoints = useMemo(() => ['70%'], []);

  // Distance slider state
  const [isDistanceSliderOpen, setIsDistanceSliderOpen] = useState(false);
  const [distanceSliderValue, setDistanceSliderValue] = useState<number>(0);

  // Age range slider state
  const [isAgeRangeSliderOpen, setIsAgeRangeSliderOpen] = useState(false);
  const [ageRangeSliderValue, setAgeRangeSliderValue] = useState<[number, number]>([18, 65]);
  // Debounced age range for query - only updates after user stops dragging
  const [debouncedAgeRange, setDebouncedAgeRange] = useState<[number, number] | null>(null);
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
    preferencesBottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleClosePreferences = useCallback(() => {
    preferencesBottomSheetRef.current?.close();
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
    setIsDistanceSliderOpen(false);
    
    // Update backend to clear distance
    updateDiscoveryPreferencesMutation.mutate({
      max_distance: null,
    });
  }, [updateDiscoveryPreferencesMutation]);

  // Close slider when clicking outside
  const handleCloseSliderOnBackdrop = useCallback(() => {
    setIsDistanceSliderOpen(false);
  }, []);

  const handleOpenAgeRangeSlider = useCallback(() => {
    // Initialize debouncedAgeRange if it's null but filters.ageRange has a value
    const initialValue = filters.ageRange ?? [18, 65];
    if (debouncedAgeRange === null && filters.ageRange !== null) {
      setDebouncedAgeRange(filters.ageRange);
    }
    setAgeRangeSliderValue(initialValue);
    setIsAgeRangeSliderOpen(true);
  }, [filters.ageRange, debouncedAgeRange]);

  const handleCloseAgeRangeSlider = useCallback(() => {
    // When closing, immediately apply any pending changes
    if (ageRangeDebounceTimerRef.current) {
      clearTimeout(ageRangeDebounceTimerRef.current);
      ageRangeDebounceTimerRef.current = null;
    }
    // Apply the current slider value immediately when closing
    setDebouncedAgeRange(ageRangeSliderValue);
    setFilters((prev) => ({ ...prev, ageRange: ageRangeSliderValue }));
    setIsAgeRangeSliderOpen(false);
  }, [ageRangeSliderValue]);

  const handleAgeRangeSliderChange = useCallback((value: [number, number]) => {
    if (!Array.isArray(value) || value.length !== 2) {
      return;
    }
    const [min, max] = value;
    if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
      return;
    }
    if (min > max) {
      return;
    }
    setAgeRangeSliderValue(value);
    if (ageRangeDebounceTimerRef.current) {
      clearTimeout(ageRangeDebounceTimerRef.current);
    }
    ageRangeDebounceTimerRef.current = setTimeout(() => {
      setDebouncedAgeRange(value);
      setFilters((prev) => ({ ...prev, ageRange: value }));
    }, 500);
  }, []);

  const handleAgeRangeSliderClear = useCallback(() => {
    // Clear debounce timer
    if (ageRangeDebounceTimerRef.current) {
      clearTimeout(ageRangeDebounceTimerRef.current);
      ageRangeDebounceTimerRef.current = null;
    }
    setAgeRangeSliderValue([18, 65]);
    setDebouncedAgeRange(null);
    setFilters((prev) => ({ ...prev, ageRange: null }));
    setIsAgeRangeSliderOpen(false);
  }, []);

  const handleCloseAgeRangeSliderOnBackdrop = useCallback(() => {
    // When closing, immediately apply any pending changes
    if (ageRangeDebounceTimerRef.current) {
      clearTimeout(ageRangeDebounceTimerRef.current);
      ageRangeDebounceTimerRef.current = null;
    }
    // Apply the current slider value immediately when closing
    setDebouncedAgeRange(ageRangeSliderValue);
    setFilters((prev) => ({ ...prev, ageRange: ageRangeSliderValue }));
    setIsAgeRangeSliderOpen(false);
  }, [ageRangeSliderValue]);

  const handleOpenWorkoutTypesSheet = useCallback(() => {
    workoutTypesBottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleCloseWorkoutTypesSheet = useCallback(() => {
    workoutTypesBottomSheetRef.current?.close();
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
  const [swipedProfiles, setSwipedProfiles] = useState<string[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null);
  const [pendingMatchCheck, setPendingMatchCheck] = useState(false);
  const [shouldCheckMatch, setShouldCheckMatch] = useState(false);
  const [matchCheckUserId, setMatchCheckUserId] = useState<string | null>(null);
  const [matchCheckProfile, setMatchCheckProfile] = useState<Profile | null>(null);
  const [showFilterTooltip, setShowFilterTooltip] = useState(false);
  const [showPhotoSwipeTooltip, setShowPhotoSwipeTooltip] = useState(false);
  const [showImageCommentTooltip, setShowImageCommentTooltip] = useState(false);
  const [showSwipeDownTooltip, setShowSwipeDownTooltip] = useState(false);
  const [showSwipeUpTooltip, setShowSwipeUpTooltip] = useState(false);

  // Load preferences and swiped profiles on mount
  useEffect(() => {
    const loadData = async () => {
      const [loadedPrefs, loadedSwiped] = await Promise.all([
        getInitialPreferences(),
        loadSwipedProfiles(),
      ]);
      setPreferences(loadedPrefs);
      setSwipedProfiles(loadedSwiped);
    };
    loadData();
  }, []);

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

  // Show filter tooltip on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFilterTooltip(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle sequential tooltip flow (5 steps: filter → photo swipe → image comment → swipe down → swipe up)
  const handleFilterTooltipClose = useCallback(() => {
    setShowFilterTooltip(false);
    setTimeout(() => {
      setShowPhotoSwipeTooltip(true);
    }, 300);
  }, []);

  const handlePhotoSwipeTooltipClose = useCallback(() => {
    setShowPhotoSwipeTooltip(false);
    setTimeout(() => {
      setShowImageCommentTooltip(true);
    }, 300);
  }, []);

  const handleImageCommentTooltipClose = useCallback(() => {
    setShowImageCommentTooltip(false);
    setTimeout(() => {
      setShowSwipeDownTooltip(true);
    }, 300);
  }, []);

  const handleSwipeDownTooltipClose = useCallback(() => {
    setShowSwipeDownTooltip(false);
    // SwipeDeck will auto-scroll to bottom when showSwipeUpTooltip becomes true
    setTimeout(() => {
      setShowSwipeUpTooltip(true);
    }, 300);
  }, []);

  const handleSwipeUpTooltipClose = useCallback(() => {
    setShowSwipeUpTooltip(false);
  }, []);

  // Convert DiscoveryPreferencesData to DiscoveryPreferences type for API
  // Use debouncedAgeRange for query to avoid refetching on every slider movement
  const apiPreferences = useMemo<DiscoveryPrefsType>(() => {
    // Use debouncedAgeRange if available, otherwise fall back to filters.ageRange
    const ageRangeForQuery = debouncedAgeRange !== null ? debouncedAgeRange : filters.ageRange;

    const genderMap: Record<string, Array<'male' | 'female' | 'non-binary' | 'prefer-not-to-say'>> = {
      men: ['male'],
      women: ['female'],
      everyone: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
    };

    const genders = genderMap[preferences.gender] || [];

    const hasGenderFilter = preferences.gender !== 'everyone';
    const hasAgeFilter = ageRangeForQuery !== null;

    // Ensure age range values are valid numbers when ageRange is set
    const minAge = ageRangeForQuery && typeof ageRangeForQuery[0] === 'number' ? ageRangeForQuery[0] : undefined;
    const maxAge = ageRangeForQuery && typeof ageRangeForQuery[1] === 'number' ? ageRangeForQuery[1] : undefined;

    // Always return an object with at least genders for a stable query key
    const result: DiscoveryPrefsType = {
      genders: genders,
    };

    if (minAge !== undefined) {
      result.minAge = minAge;
    }
    if (maxAge !== undefined) {
      result.maxAge = maxAge;
    }

    return result;
  }, [preferences.gender, filters.ageRange, debouncedAgeRange]);

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

  // User-facing error state is shown in the UI; log in dev only
  useEffect(() => {
    if (__DEV__ && nearbyProfilesError) {
      console.error('[Discover] Error fetching nearby profiles:', nearbyProfilesError);
    }
  }, [nearbyProfilesError]);

  // Filter profiles: exclude swiped, apply discipline filter, apply distance filter, and sort
  const filteredUsers = useMemo(() => {
    // First, apply basic filters (swiped, gender, disciplines)
    let filtered = nearbyProfiles.filter((profile: Profile) => {
      // Exclude swiped profiles
      if (swipedProfiles.includes(profile.id)) {
        return false;
      }

      // Gender filter (already applied in API, but double-check)
      if (preferences.gender === 'men' && profile.gender !== 'male') {
        return false;
      }
      if (preferences.gender === 'women' && profile.gender !== 'female') {
        return false;
      }

      // Discipline filter (client-side since it's an array field)
      if (preferences.disciplines.length > 0) {
        const hasMatchingDiscipline = preferences.disciplines.some((d) =>
          profile.fitness_disciplines.includes(d)
        );
        if (!hasMatchingDiscipline) {
          return false;
        }
      }

      // Workout types filter
      if (filters.workoutTypes.length > 0) {
        const hasMatchingType = filters.workoutTypes.some((t) =>
          profile.fitness_disciplines.includes(t)
        );
        if (!hasMatchingType) {
          return false;
        }
      }

      return true;
    });

    // Viewer reference location (for distance calculation)
    const viewerFromLastLocation = (currentProfile as any)?.last_location ?? null;
    const viewerFromGym = viewerHomeGym?.location ?? null;
    const viewerRef = viewerFromLastLocation ?? viewerFromGym ?? null;

    // Calculate distances and create profile-distance pairs
    const withDistances = filtered
      .map((profile) => {
        const candidateLastLocation = (profile as any)?.last_location ?? null;
        const candidateGym = profile.home_gym_id ? gymsMap.get(profile.home_gym_id) : null;
        const candidateRef = candidateLastLocation ?? candidateGym?.location ?? null;

        if (!viewerRef || !candidateRef) {
          return { profile, distance: null as number | null };
        }

        const distanceMiles = calculateDistanceMiles(viewerRef, candidateRef);
        return { profile, distance: distanceMiles };
      });
    const profilesWithDistance = withDistances.filter(({ distance }) => {
        // Apply distance filter if maxDistance is set
        // filters.distance is in km, convert to miles for comparison
        if (filters.distance !== null && filters.distance > 0) {
          const maxDistanceMilesFilter = kmToMiles(filters.distance); // Convert km to miles
          if (distance === null) {
            // If distance can't be calculated, exclude if distance filter is active
            return false;
          }
          if (distance > maxDistanceMilesFilter) {
            return false;
          }
        }
        return true;
      });

    return profilesWithDistance
      .map(({ profile, distance }) => {
        // Calculate relevance score based on multiple factors
        let relevanceScore = 0;
        
        // 1. Shared fitness disciplines (primary factor)
        if (currentProfile?.fitness_disciplines && profile.fitness_disciplines) {
          const currentDisciplines = new Set(currentProfile.fitness_disciplines);
          const profileDisciplines = new Set(profile.fitness_disciplines);
          // Count shared disciplines
          let sharedCount = 0;
          currentDisciplines.forEach((d) => {
            if (profileDisciplines.has(d)) {
              sharedCount++;
            }
          });
          // Relevance score: 10 points per shared discipline (weighted heavily)
          relevanceScore += sharedCount * 10;
        }
        
        // 2. Profile completeness (encourage complete profiles)
        let completenessScore = 0;
        // Bio: 2 points if present
        if (profile.bio && profile.bio.trim().length > 0) {
          completenessScore += 2;
        }
        // Approach prompt: 2 points if present
        if (profile.approach_prompt && profile.approach_prompt.trim().length > 0) {
          completenessScore += 2;
        }
        // Photos: 1 point per photo beyond the first (up to 3 points for 4+ photos)
        const photoCount = profile.photo_urls?.length || 0;
        if (photoCount > 1) {
          completenessScore += Math.min(photoCount - 1, 3);
        }
        relevanceScore += completenessScore;
        
        // 3. Recency boost (prioritize recently active users)
        // Boost profiles updated in the last 7 days
        if (profile.updated_at) {
          const updatedAt = new Date(profile.updated_at);
          const now = new Date();
          const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate <= 7) {
            // Boost: 5 points for profiles updated in last 7 days, decreasing to 0 over 7 days
            const recencyBoost = Math.max(0, 5 * (1 - daysSinceUpdate / 7));
            relevanceScore += recencyBoost;
          }
        }
        
        return { profile, distance, relevanceScore };
      })
      .sort((a, b) => {
        // Primary sort: by relevance score (descending - higher relevance first)
        if (a.relevanceScore !== b.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        // Secondary sort: by distance (ascending - closer first)
        // null distances go last within same relevance score
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      })
      .map(({ profile }) => profile);

  }, [nearbyProfiles, swipedProfiles, preferences, filters, gymsMap, currentProfile, viewerHomeGym]);

  const currentUser = filteredUsers[currentIndex];
  const hasMoreUsers = currentIndex < filteredUsers.length;

  // Mutations
  const likeMutation = useLike();
  const crushMutation = useCrushSignal();
  // Only check for match if we explicitly set it to check and have valid user IDs
  const canCheckMatch = shouldCheckMatch && 
    currentProfile && 
    matchCheckUserId && 
    currentProfile.id !== matchCheckUserId;
  
  const { data: matchData } = useCheckMatch(
    currentProfile?.id || '',
    canCheckMatch ? matchCheckUserId : ''
  );

  const handleSwipe = useCallback(
    async (action: SwipeAction) => {
      if (!currentUser) return;

      const profileId = currentUser.id;

      try {
        if (action === 'like') {
          await likeMutation.mutateAsync({ toUserId: profileId });
          toast({ preset: 'done', title: `You liked ${currentUser.display_name}!` });
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
          toast({
            preset: 'done',
            title: `You sent a crush signal to ${currentUser.display_name}!`,
          });
        }

        // Check for match after like/crush (before moving to next profile)
        if (action === 'like' || action === 'crush') {
          // Store the profile before it gets filtered out
          // Set flag to check for match - the useEffect will handle showing the modal
          // DON'T add to swipedProfiles yet - wait until after match check completes
          // This keeps the profile visible while the modal shows
          setMatchCheckUserId(profileId);
          setMatchCheckProfile(currentUser); // Store the profile data before it's filtered out
          setShouldCheckMatch(true);
          setPendingMatchCheck(true);
          
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
          // For pass actions, immediately save and move to next profile
          const updatedSwiped = [...swipedProfiles, profileId];
          setSwipedProfiles(updatedSwiped);
          await saveSwipedProfile(profileId, updatedSwiped);
          setCurrentIndex((prev) => prev + 1);
        }
      } catch (error: any) {
        toast({
          preset: 'error',
          title: 'Action failed',
          message: error.message || 'Something went wrong',
        });
      }
    },
    [currentUser, swipedProfiles, likeMutation, crushMutation, checkCrushAvailability, currentProfile?.id, queryClient]
  );

  // Show match modal when a match is detected (only after a like/crush action)
  useEffect(() => {
    // Only show modal if:
    // 1. We have match data
    // 2. We have a matched user ID that we're checking
    // 3. The matched user ID is not the current profile
    // 4. Modal is not already showing
    // 5. We're expecting a match check (after like/crush)
    if (
      matchData && 
      matchCheckUserId && 
      currentProfile &&
      matchCheckUserId !== currentProfile.id &&
      !showMatchModal &&
      pendingMatchCheck
    ) {
      // Use the stored profile if available, otherwise try to find it in filteredUsers or nearbyProfiles
      let matchedProfile = matchCheckProfile;
      if (!matchedProfile) {
        matchedProfile = filteredUsers.find(u => u.id === matchCheckUserId) || null;
      }
      if (!matchedProfile) {
        matchedProfile = nearbyProfiles.find(u => u.id === matchCheckUserId) || null;
      }
      
      if (matchedProfile) {
        setMatchedUser(matchedProfile);
        setShowMatchModal(true);
        setPendingMatchCheck(false);
      }
    } else if (pendingMatchCheck && !matchData && shouldCheckMatch && matchCheckUserId) {
      // No match found, but we were checking - save to swiped and advance to next profile after a short delay
      // This handles the case where there's no match
      const timer = setTimeout(async () => {
        // Save the swiped profile now that we know there's no match
        const updatedSwiped = [...swipedProfiles, matchCheckUserId];
        setSwipedProfiles(updatedSwiped);
        await saveSwipedProfile(matchCheckUserId, updatedSwiped);
        setPendingMatchCheck(false);
        setShouldCheckMatch(false);
        setMatchCheckUserId(null);
        setMatchCheckProfile(null);
        setCurrentIndex((prev) => prev + 1);
      }, 500); // Small delay to allow for any async updates
      
      return () => clearTimeout(timer);
    }
  }, [matchData, matchCheckUserId, currentProfile, showMatchModal, pendingMatchCheck, shouldCheckMatch, filteredUsers, nearbyProfiles, matchCheckProfile, canCheckMatch]);

  const handleStartChatting = useCallback(async () => {
    // Save the swiped profile before navigating (if we have a matchCheckUserId)
    if (matchCheckUserId) {
      const updatedSwiped = [...swipedProfiles, matchCheckUserId];
      setSwipedProfiles(updatedSwiped);
      await saveSwipedProfile(matchCheckUserId, updatedSwiped);
    }
    
    setShowMatchModal(false);
    setMatchedUser(null);
    setPendingMatchCheck(false);
    setShouldCheckMatch(false);
    setMatchCheckUserId(null);
    setMatchCheckProfile(null);
    // Invalidate match query to clear cached data
    if (currentProfile?.id && matchCheckUserId) {
      queryClient.invalidateQueries({ 
        queryKey: ['match', currentProfile.id, matchCheckUserId] 
      });
    }
    if (matchData) {
      // Navigate to chat tab first to reset the stack, then push the specific match
      // This ensures when user goes back from chat, they see the chat list, not discover
      // First navigate to chat tab (resets chat stack to index)
      router.push('/(tabs)/chat');
      // Small delay to ensure tab navigation completes and stack resets, then push match
      // Using push (not replace) so back button goes to chat list, not discover
      setTimeout(() => {
        router.push(`/(tabs)/chat/${matchData.id}`);
      }, 150);
    } else {
      // For dev test or if no match data, just close modal and advance
      setCurrentIndex((prev) => prev + 1);
    }
  }, [matchData, router, currentProfile?.id, matchCheckUserId, queryClient, swipedProfiles]);

  const handleKeepSwiping = useCallback(async () => {
    // Save the swiped profile before advancing
    if (matchCheckUserId) {
      const updatedSwiped = [...swipedProfiles, matchCheckUserId];
      setSwipedProfiles(updatedSwiped);
      await saveSwipedProfile(matchCheckUserId, updatedSwiped);
    }
    
    setShowMatchModal(false);
    setMatchedUser(null);
    setPendingMatchCheck(false);
    setShouldCheckMatch(false);
    // Invalidate match query to clear cached data
    if (currentProfile?.id && matchCheckUserId) {
      queryClient.invalidateQueries({ 
        queryKey: ['match', currentProfile.id, matchCheckUserId] 
      });
    }
    setMatchCheckUserId(null);
    setMatchCheckProfile(null);
    // Advance to next profile after dismissing modal
    setCurrentIndex((prev) => prev + 1);
  }, [currentProfile?.id, matchCheckUserId, queryClient, swipedProfiles]);


  const handlePreferencesChange = useCallback((prefs: DiscoveryPreferencesData) => {
    setPreferences(prefs);
    setCurrentIndex(0); // Reset to first user when preferences change

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
    setCurrentIndex(0); // Reset to first user when filters change
  }, []);

  const handleStartOver = useCallback(async () => {
    setSwipedProfiles([]);
    setCurrentIndex(0);
    await AsyncStorage.removeItem(APP.STORAGE_KEYS.SWIPED_PROFILES);
    toast({ preset: 'done', title: 'Started over' });
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
            Couldn't load discovery
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
      {/* Sticky Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <Tooltip
            isVisible={showFilterTooltip}
            content={
              <View style={{ backgroundColor: colors.card, padding: spacing[3], borderRadius: borderRadius.md }}>
                <Text style={{ color: colors.foreground, fontSize: fontSize.base }}>
                  Adjust discovery preferences
                </Text>
              </View>
            }
            placement="bottom"
            onClose={handleFilterTooltipClose}
            backgroundColor="rgba(0,0,0,0.5)"
          >
            <DiscoveryPreferences onPreferencesChange={handlePreferencesChange} onOpen={handleOpenPreferences} />
          </Tooltip>
          <View style={styles.headerContent}>
            <DiscoveryFilterDropdowns 
              distance={filters.distance}
              ageRange={filters.ageRange}
              workoutTypes={filters.workoutTypes}
              onFiltersChange={handleFiltersChange}
              onOpenDistanceSlider={handleOpenDistanceSlider}
              onOpenAgeRangeSlider={handleOpenAgeRangeSlider}
              onOpenWorkoutTypesSheet={handleOpenWorkoutTypesSheet}
              distanceMinKm={MIN_DISTANCE_KM}
              distanceMaxKm={MAX_DISTANCE_KM}
            />
          </View>
        </View>
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
            />
          </View>
        </>
      )}

      {/* Profile View */}
      <View style={layout.flex1}>
        {hasMoreUsers && currentUser ? (
          <View style={layout.flex1}>
            <SwipeDeck
              profiles={filteredUsers.slice(currentIndex, currentIndex + 3)}
              onSwipe={(profileId, action) => {
                if (profileId === currentUser.id) {
                  handleSwipe(action);
                }
              }}
              currentUserGymId={currentProfile?.home_gym_id}
              showPhotoSwipeTooltip={showPhotoSwipeTooltip}
              showImageCommentTooltip={showImageCommentTooltip}
              showSwipeDownTooltip={showSwipeDownTooltip}
              showSwipeUpTooltip={showSwipeUpTooltip}
              onPhotoSwipeTooltipClose={handlePhotoSwipeTooltipClose}
              onImageCommentTooltipClose={handleImageCommentTooltipClose}
              onSwipeDownTooltipClose={handleSwipeDownTooltipClose}
              onSwipeUpTooltipClose={handleSwipeUpTooltipClose}
            />
          </View>
        ) : (
          <EmptyFeed
            message="You've seen everyone!"
            onStartOver={handleStartOver}
          />
        )}
      </View>

      {/* Preferences Bottom Sheet */}
      <BottomSheet
        ref={preferencesBottomSheetRef}
        index={-1}
        snapPoints={preferencesSnapPoints}
        // enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetScrollView showsVerticalScrollIndicator={false}>
          <DiscoveryPreferencesContent
            onClose={handleClosePreferences}
            onPreferencesChange={handlePreferencesChange}
          />
        </BottomSheetScrollView>
      </BottomSheet>

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
  bottomSheetBackground: {
    backgroundColor: colors.card,
  },
  bottomSheetIndicator: {
    backgroundColor: colors.mutedForeground,
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
});
