import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { GymSearch } from '@/components/onboarding/GymSearch';
import { LocationPermissionModal } from '@/components/onboarding/LocationPermissionModal';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { Input } from '@/components/ui/Input';
import { InfoCard } from '@/components/ui/InfoCard';
import { Select } from '@/components/ui/Select';
import { useGymSearch } from '@/hooks/useGymSearch';
import { useLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { supabase } from '@/lib/supabase';
import { parseLocation } from '@/lib/utils/distance';
import { fetchPlaceDetails } from '@/lib/utils/google-places';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { GooglePlaceGym } from '@/types/onboarding';
import { useFocusEffect } from '@react-navigation/native';
import { toast } from 'burnt';
import { PermissionStatus } from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { MONTH_OPTIONS } from '@/constants';


interface SelectedGym {
  id: string; // This is the Google Places place_id
  name: string;
  address: string;
  location?: { lat: number; lng: number };
}

export default function OnboardingBasicInfo() {
  const router = useRouter();
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const user = useAuthStore((s) => s.user);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Gym search state
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

  // Pre-fill email from auth store if available
  useEffect(() => {
    if (user?.email && !data.email) {
      updateData({ email: user.email });
    }
  }, [user?.email]);

  // Initialize selected gyms from data
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

  // Re-check permission when screen comes into focus (user may have changed settings)
  useFocusEffect(
    useCallback(() => {
      refreshLocation();
    }, [refreshLocation])
  );

  // Listen for app state changes to re-check permission when user returns from settings
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshLocation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshLocation]);

  // Date parts state
  const [month, setMonth] = useState<string>(
    data.dateOfBirth ? String(data.dateOfBirth.getMonth()) : ''
  );
  const [day, setDay] = useState<string>(
    data.dateOfBirth ? String(data.dateOfBirth.getDate()) : ''
  );
  const [year, setYear] = useState<string>(
    data.dateOfBirth ? String(data.dateOfBirth.getFullYear()) : ''
  );

  // Height parts state
  const parseHeight = (heightStr: string | null): { feet: string; inches: string } => {
    if (!heightStr) return { feet: '', inches: '' };
    const match = heightStr.match(/(\d+)'(\d+)"/);
    if (match) {
      return { feet: match[1], inches: match[2] };
    }
    return { feet: '', inches: '' };
  };

  const initialHeight = parseHeight(data.height);
  const [feet, setFeet] = useState<string>(initialHeight.feet);
  const [inches, setInches] = useState<string>(initialHeight.inches);

  // Generate years (18+ years old requirement)
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear - 18; y >= 1940; y--) {
      arr.push({ value: String(y), label: String(y) });
    }
    return arr;
  }, [currentYear]);

  // Generate days based on selected month/year
  const days = useMemo(() => {
    const m = parseInt(month);
    const y = parseInt(year) || currentYear;
    if (isNaN(m)) {
      return Array.from({ length: 31 }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      }));
    }
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    }));
  }, [month, year, currentYear]);

  // Generate height options
  const heightFeet = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => ({
      value: String(i + 4),
      label: `${i + 4}'`,
    }));
  }, []);

  const heightInches = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: `${i}"`,
    }));
  }, []);

  // Update date when parts change
  const updateDate = (newMonth: string, newDay: string, newYear: string) => {
    setMonth(newMonth);
    setDay(newDay);
    setYear(newYear);

    if (newMonth !== '' && newDay !== '' && newYear !== '') {
      const date = new Date(
        parseInt(newYear),
        parseInt(newMonth),
        parseInt(newDay)
      );
      
      // Check age immediately
      const age = Math.floor(
        (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      
      if (age < 18) {
        toast({ preset: 'error', title: 'Age must be 18+', message: '' });
        setErrors((prev) => ({ ...prev, dateOfBirth: 'You must be at least 18 years old to use this app.' }));
        updateData({ dateOfBirth: null });
      } else {
        // Clear error if age is valid
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.dateOfBirth;
          return newErrors;
        });
        updateData({ dateOfBirth: date });
      }
    } else {
      updateData({ dateOfBirth: null });
    }
  };

  // Update height when parts change
  const updateHeight = (newFeet: string, newInches: string) => {
    setFeet(newFeet);
    setInches(newInches);

    if (newFeet !== '' && newInches !== '') {
      const heightStr = `${newFeet}'${newInches}"`;
      updateData({ height: heightStr });
    } else {
      updateData({ height: null });
    }
  };

  // Gym search handlers
  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);

    // If user starts searching and we haven't requested permission yet
    if (value.length >= 2 && !hasRequestedPermission) {
      setHasRequestedPermission(true);

      // If permission is undetermined, request it
      if (permissionStatus === PermissionStatus.UNDETERMINED) {
        const granted = await requestPermission();
        if (!granted) {
          // Permission denied, show modal
          setShowPermissionModal(true);
        }
      } else if (permissionStatus === PermissionStatus.DENIED) {
        // Permission was previously denied, show modal
        setShowPermissionModal(true);
      }
    }

    // Perform search (will use location if available, otherwise default)
    search(value);
  };

  const handleOpenSettings = () => {
    setShowPermissionModal(false);
    // refreshLocation will be called when app comes back to foreground
  };

  const handleCloseModal = () => {
    setShowPermissionModal(false);
  };

  const toggleGym = async (gym: GooglePlaceGym) => {
    const isSelected = selectedGyms.some((g) => g.id === gym.place_id);

    let updated: SelectedGym[];
    if (isSelected) {
      updated = selectedGyms.filter((g) => g.id !== gym.place_id);
    } else {
      // Check database first to see if gym exists and has coordinates
      let location: { lat: number; lng: number } | undefined = undefined;

      try {
        const { data: existingGym, error: lookupError } = await supabase
          .from('gyms')
          .select('location')
          .eq('google_place_id', gym.place_id)
          .single();

        if (existingGym && existingGym.location) {
          // Parse coordinates from PostGIS format
          const parsed = parseLocation(existingGym.location);
          if (parsed) {
            location = parsed;
          }
        } else if (lookupError && lookupError.code === 'PGRST116') {
          // Gym doesn't exist, fetch coordinates from Places API
          const coordinates = await fetchPlaceDetails(gym.place_id);
          if (coordinates) {
            location = coordinates;
          }
        } else if (lookupError) {
          // Other error, try Places API as fallback
          console.warn('Error looking up gym in database:', lookupError);
          const coordinates = await fetchPlaceDetails(gym.place_id);
          if (coordinates) {
            location = coordinates;
          }
        }
      } catch (error) {
        // Error checking database, try Places API as fallback
        console.warn('Error checking gym in database:', error);
        const coordinates = await fetchPlaceDetails(gym.place_id);
        if (coordinates) {
          location = coordinates;
        }
      }

      const gymData: SelectedGym = {
        id: gym.place_id, // Google Places place_id
        name: gym.name,
        address: gym.formatted_address,
        location, // Include location if available
      };

      updated = [...selectedGyms, gymData];
      // Clear search query to hide results after selecting a gym
      setSearchQuery('');
    }

    setSelectedGyms(updated);
    // Store as JSON strings to preserve gym info
    updateData({ selectedGyms: updated.map((g) => JSON.stringify(g)) });
  };

  const removeSelectedGym = (gymId: string) => {
    const updated = selectedGyms.filter((g) => g.id !== gymId);
    setSelectedGyms(updated);
    updateData({ selectedGyms: updated.map((g) => JSON.stringify(g)) });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate fullName
    if (!data.fullName.trim()) {
      newErrors.fullName = 'Name is required';
    }

    // Validate dateOfBirth
    if (!data.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = Math.floor(
        (Date.now() - data.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old to use this app.';
      }
    }

    // Validate gender
    if (!data.gender) {
      newErrors.gender = 'Gender is required';
    }

    // Validate email
    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      (navigation as any).navigate('intent');
    }
  };

  // Check if all required fields are filled
  const isFormValid = useMemo(() => {
    return !!(
      data.fullName.trim() &&
      data.dateOfBirth &&
      data.gender
    );
  }, [data.fullName, data.dateOfBirth, data.gender]);

  return (
    <OnboardingContainer 
      currentStep={1} 
      totalSteps={6} 
      showBack={false}
      showClose={true}
      onClose={async () => {
        // Sign out the user if they have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
        }
        router.replace('/(auth)/login');
      }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Create your account
          </Text>
          <Text style={styles.subtitle}>
            Let's get you set up to find your gym crush
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.field}>
              <Input
                label="First name"
                placeholder="Your name"
                value={data.fullName}
                onChangeText={(text) => updateData({ fullName: text })}
                error={errors.fullName}
              />
            </View>

            {/* Gym Search */}
            <View style={styles.field}>
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

            {/* Date of Birth */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Date of birth
              </Text>
              <View style={styles.dateRow}>
                {/* Month */}
                <View style={styles.dateField}>
                  <Select
                    value={month}
                    onValueChange={(val) => updateDate(val, day, year)}
                    placeholder="Month"
                    options={MONTH_OPTIONS}
                    error={!!errors.dateOfBirth && !month}
                  />
                </View>

                {/* Day */}
                <View style={styles.dateField}>
                  <Select
                    value={day}
                    onValueChange={(val) => updateDate(month, val, year)}
                    placeholder="Day"
                    options={days}
                    error={!!errors.dateOfBirth && !day}
                  />
                </View>

                {/* Year */}
                <View style={styles.dateField}>
                  <Select
                    value={year}
                    onValueChange={(val) => updateDate(month, day, val)}
                    placeholder="Year"
                    options={years}
                    error={!!errors.dateOfBirth && !year}
                  />
                </View>
              </View>
              {errors.dateOfBirth ? (
                <InfoCard
                  variant="error"
                  title="Age requirement"
                  message={errors.dateOfBirth}
                  style={styles.infoCard}
                />
              ) : null}
            </View>

            {/* Height */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Height
              </Text>
              <View style={styles.dateRow}>
                {/* Feet */}
                <View style={styles.dateField}>
                  <Select
                    value={feet}
                    onValueChange={(val) => updateHeight(val, inches)}
                    placeholder="Feet"
                    options={heightFeet}
                  />
                </View>

                {/* Inches */}
                <View style={styles.dateField}>
                  <Select
                    value={inches}
                    onValueChange={(val) => updateHeight(feet, val)}
                    placeholder="Inches"
                    options={heightInches}
                  />
                </View>
              </View>
            </View>

            {/* Gender */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Gender
              </Text>
              <View style={styles.genderRow}>
                <Pressable
                  onPress={() => updateData({ gender: 'male' })}
                  style={[
                    styles.genderButton,
                    data.gender === 'male' && styles.genderButtonSelected,
                    !!errors.gender && !data.gender && styles.genderButtonError,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      data.gender === 'male' && styles.genderButtonTextSelected,
                    ]}
                  >
                    Male
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => updateData({ gender: 'female' })}
                  style={[
                    styles.genderButton,
                    data.gender === 'female' && styles.genderButtonSelected,
                    !!errors.gender && !data.gender && styles.genderButtonError,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      data.gender === 'female' && styles.genderButtonTextSelected,
                    ]}
                  >
                    Female
                  </Text>
                </Pressable>
              </View>
              {errors.gender && (
                <Text style={styles.errorText}>
                  {errors.gender}
                </Text>
              )}
            </View>

            {/* Email */}
            {/* <View style={styles.field}>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={data.email}
                onChangeText={(text) => updateData({ email: text })}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View> */}
          </View>
        </View>

        <FloatingActionButton onPress={handleSubmit} disabled={!isFormValid}>
          Continue
        </FloatingActionButton>
      </View>

      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={handleCloseModal}
        onOpenSettings={handleOpenSettings}
      />
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    // marginBottom: spacing[8],
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
    justifyContent: 'center',
    paddingBottom: spacing[32],
  },
  form: {
    gap: spacing[6],
  },
  field: {
    // marginBottom: spacing[6],
  },
  label: {
    color: colors.foreground,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing[1],
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dateField: {
    flex: 1,
  },
  infoCard: {
    marginTop: spacing[2],
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.xs,
    marginTop: spacing[1],
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
  },
  genderButtonError: {
    borderColor: colors.destructive,
  },
  genderButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.foreground,
  },
  genderButtonTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
