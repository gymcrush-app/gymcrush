import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { GymSearch } from '@/components/onboarding/GymSearch';
import { LocationPermissionModal } from '@/components/onboarding/LocationPermissionModal';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useGymSearch } from '@/hooks/useGymSearch';
import { useLocation } from '@/hooks/useLocation';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { supabase } from '@/lib/supabase';
import { parseLocation } from '@/lib/utils/distance';
import { fetchPlaceDetails } from '@/lib/utils/google-places';
import { track } from '@/lib/utils/analytics';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import type { GooglePlaceGym } from '@/types/onboarding';
import { useFocusEffect } from '@react-navigation/native';
import { PermissionStatus } from 'expo-location';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

interface SelectedGym {
  id: string;
  name: string;
  address: string;
  location?: { lat: number; lng: number };
}

export default function OnboardingSelectHomeGym() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGyms, setSelectedGyms] = useState<SelectedGym[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const { results, isLoading, error, search } = useGymSearch();
  const {
    permissionStatus,
    requestPermission,
    refreshLocation,
  } = useLocation();

  useEffect(() => {
    const parsed = data.selectedGyms
      .map((gymJson) => {
        try {
          return JSON.parse(gymJson) as SelectedGym;
        } catch {
          return null;
        }
      })
      .filter((g): g is SelectedGym => g !== null);
    setSelectedGyms(parsed);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLocation();
    }, [refreshLocation])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshLocation();
      }
    });
    return () => subscription.remove();
  }, [refreshLocation]);

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2 && !hasRequestedPermission) {
      setHasRequestedPermission(true);
      if (permissionStatus === PermissionStatus.UNDETERMINED) {
        const granted = await requestPermission();
        if (!granted) setShowPermissionModal(true);
      } else if (permissionStatus === PermissionStatus.DENIED) {
        setShowPermissionModal(true);
      }
    }
    search(value);
  };

  const toggleGym = async (gym: GooglePlaceGym) => {
    const isSelected = selectedGyms.some((g) => g.id === gym.place_id);
    let updated: SelectedGym[];
    if (isSelected) {
      updated = selectedGyms.filter((g) => g.id !== gym.place_id);
    } else {
      let location: { lat: number; lng: number } | undefined;
      try {
        const { data: existingGym, error: lookupError } = await supabase
          .from('gyms')
          .select('location')
          .eq('google_place_id', gym.place_id)
          .single();
        if (existingGym && existingGym.location) {
          const parsed = parseLocation(existingGym.location);
          if (parsed) location = parsed;
        } else if (lookupError && lookupError.code === 'PGRST116') {
          location = (await fetchPlaceDetails(gym.place_id)) ?? undefined;
        } else if (lookupError) {
          location = (await fetchPlaceDetails(gym.place_id)) ?? undefined;
        }
      } catch {
        location = (await fetchPlaceDetails(gym.place_id)) ?? undefined;
      }
      const gymData: SelectedGym = {
        id: gym.place_id,
        name: gym.name,
        address: gym.formatted_address,
        location,
      };
      updated = [...selectedGyms, gymData];
      setSearchQuery('');
    }
    setSelectedGyms(updated);
    updateData({ selectedGyms: updated.map((g) => JSON.stringify(g)) });
  };

  const removeSelectedGym = (gymId: string) => {
    const updated = selectedGyms.filter((g) => g.id !== gymId);
    setSelectedGyms(updated);
    updateData({ selectedGyms: updated.map((g) => JSON.stringify(g)) });
  };

  const handleNext = () => {
    track('onboarding_step_completed', { step: 'select-home-gym', index: 5 });
    (navigation as any).navigate('fitness');
  };

  return (
    <OnboardingContainer currentStep={6} totalSteps={13} showBack={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Where do you train?</Text>
          <Text style={styles.subtitle}>
            Select your home gym — optional, you can skip and add later
          </Text>
        </View>
        <View style={styles.content}>
          <GymSearch
            selectedGyms={selectedGyms}
            searchQuery={searchQuery}
            results={results}
            isLoading={isLoading}
            error={error}
            onSearchChange={handleSearchChange}
            onToggleGym={toggleGym}
            onRemoveGym={removeSelectedGym}
          />
        </View>
        <FloatingActionButton onPress={handleNext}>
          Continue
        </FloatingActionButton>
      </View>
      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onOpenSettings={() => setShowPermissionModal(false)}
      />
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing[8],
    gap: spacing[2],
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingBottom: spacing[32],
  },
});
