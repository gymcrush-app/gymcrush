import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PillBadge } from '@/components/ui/PillBadge';
import { useAuthStore } from '@/lib/stores/authStore';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { supabase } from '@/lib/supabase';
import { mapOnboardingDataToProfile } from '@/lib/utils/onboarding-mapper';
import { resolveHomeGym } from '@/lib/utils/resolveHomeGym';
import { uploadProfilePhotos } from '@/lib/storage/uploadProfilePhoto';
import { gradients, shadows, colors, fontDisplay, spacing, borderRadius, fontSize, fontWeight } from '@/theme';
import { duration } from '@/theme/tokens';

export default function OnboardingComplete() {

  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const data = useOnboardingStore((s) => s.data);
  const clearData = useOnboardingStore((s) => s.clearData);
  const [isCreating, setIsCreating] = useState(false);

  // Animation values
  const checkOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(16);

  useEffect(() => {
    // Animate checkmark
    checkOpacity.value = withDelay(200, withTiming(1, { duration: duration.normal }));
    checkScale.value = withDelay(200, withTiming(1, { duration: duration.normal }));

    // Animate content
    contentOpacity.value = withDelay(800, withTiming(1, { duration: duration.slow }));
    contentTranslateY.value = withDelay(800, withTiming(0, { duration: duration.slow }));

    // Animate button
    buttonOpacity.value = withDelay(1300, withTiming(1, { duration: duration.slow }));
    buttonTranslateY.value = withDelay(1300, withTiming(0, { duration: duration.slow }));
  }, []);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    setIsCreating(true);

    try {
      // Upload photos to storage and get public URLs before creating profile
      const uploadedUrls = await uploadProfilePhotos(user.id, data.photos);

      let homeGymId: string | null = null;
      if (data.selectedGyms.length > 0) {
        homeGymId = await resolveHomeGym(data.selectedGyms[0]);
      }

      // Map onboarding data to profile format (with uploaded photo URLs), but override home_gym_id
      const profileData = mapOnboardingDataToProfile(
        { ...data, photos: uploadedUrls },
        user.id
      );
      profileData.home_gym_id = homeGymId;

      // Insert profile into Supabase
      const { data: createdProfile, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update auth store — routing effect will navigate to discover
      setProfile(createdProfile);
      setOnboarded(true);

      // Clear onboarding data
      clearData();
    } catch (error: any) {
      console.error('Error creating profile:', error);
      const message =
        error?.message?.toLowerCase().includes('upload') ||
        error?.message?.toLowerCase().includes('read image')
          ? 'Failed to upload photos. Check your connection and try again.'
          : error.message || 'Failed to create profile. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Checkmark */}
        <Animated.View style={[checkAnimatedStyle, styles.checkContainer]}>
          <LinearGradient
            colors={gradients.primary.colors}
            start={gradients.primary.start}
            end={gradients.primary.end}
            style={[styles.checkGradient, shadows.button]}
          >
            <Check size={64} color={colors.primaryForeground} strokeWidth={3} />
          </LinearGradient>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[contentAnimatedStyle, styles.textContainer]}>
          <Text
            style={[styles.title, { letterSpacing: fontDisplay.letterSpacing }]}
          >
            You{"'"}re all set!
          </Text>
          <Text style={styles.subtitle}>
            Time to find your gym crush. Let{"'"}s see who{"'"}s training near you.
          </Text>

          {/* Pill Badges */}
          <View style={styles.badgesContainer}>
            <PillBadge
              icon={<MaterialCommunityIcons name="arm-flex" size={16} color={colors.primary} />}
              label="Ready to lift"
            />
            <PillBadge
              icon={<MaterialCommunityIcons name="weight-lifter" size={16} color={colors.primary} />}
              label="Profile complete"
            />
          </View>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View style={[buttonAnimatedStyle, styles.buttonContainer]}>
          <LinearGradient
            colors={gradients.hero.colors}
            start={gradients.hero.start}
            end={gradients.hero.end}
            style={[styles.buttonGradient, shadows.button]}
          >
            <Pressable
              onPress={handleComplete}
              disabled={isCreating}
              style={[
                styles.button,
                isCreating && styles.buttonDisabled,
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={styles.buttonText}>
                  Start Exploring
                </Text>
              )}
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  checkContainer: {
    marginBottom: spacing[8],
  },
  checkGradient: {
    width: 128, // w-32 = 8rem = 128px
    height: 128,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize['4xl'],
    color: colors.foreground,
    marginBottom: spacing[4],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 384, // max-w-sm = 24rem = 384px
    marginBottom: spacing[6],
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[12],
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 384, // max-w-sm = 24rem = 384px
  },
  buttonGradient: {
    borderRadius: borderRadius.lg,
  },
  button: {
    width: '100%',
    height: 56, // h-14 = 3.5rem = 56px
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
});
