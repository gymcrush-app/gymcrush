import { FloatingActionButton } from '@/components/onboarding/FloatingActionButton';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { useOnboardingStore } from '@/lib/stores/onboardingStore';
import { track } from '@/lib/utils/analytics';
import { APP, borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MIN_PHOTOS = 3;
const MAX_PHOTOS = APP.MAX_PHOTOS;

export default function OnboardingPhotos() {
  const navigation = useNavigation();
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const [isPicking, setIsPicking] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photos to upload your profile pictures.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async (index: number) => {
    // Only allow picking if it's the next available slot
    if (data.photos.length !== index) {
      return;
    }

    if (data.photos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Photos', `You can only upload up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images' as ImagePicker.MediaType],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...data.photos, result.assets[0].uri];
        updateData({ photos: newPhotos });
        track('profile_photo_added', { source: 'onboarding', count: newPhotos.length });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = data.photos.filter((_, i) => i !== index);
    updateData({ photos: newPhotos });
    track('profile_photo_removed', { source: 'onboarding', count: newPhotos.length });
  };

  const canContinue = data.photos.length >= MIN_PHOTOS;

  const handleNext = () => {
    if (canContinue) {
      track('onboarding_step_completed', { step: 'photos', index: 12 });
      (navigation as any).navigate('complete');
    }
  };

  return (
    <OnboardingContainer currentStep={14} totalSteps={14} showBack={true}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Add photos
          </Text>
          <Text style={styles.subtitle}>
            Show off your gym gains!
          </Text>
        </View>

        {/* Photo Upload */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.photoTitle}>
              Add photos{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.photoCount}>
              ({data.photos.length}/{MAX_PHOTOS})
            </Text>
          </View>

          <View style={styles.photoGrid}>
            {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
              const photo = data.photos[index];
              const canAdd = data.photos.length === index && !isPicking;

              return (
                <View
                  key={index}
                  style={[
                    styles.photoContainer,
                    photo ? styles.photoContainerFilled : styles.photoContainerEmpty,
                    { width: '30%', aspectRatio: 3 / 4 },
                  ]}
                >
                  {photo ? (
                    <View style={styles.photoWrapper}>
                      <Image
                        source={{ uri: photo }}
                        style={styles.photoImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                      <Pressable
                        onPress={() => removePhoto(index)}
                        style={styles.removeButton}
                      >
                        <X size={12} color={colors.destructiveForeground} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => canAdd && pickImage(index)}
                      disabled={!canAdd}
                      style={[
                        styles.addButton,
                        canAdd ? styles.addButtonActive : styles.addButtonDisabled,
                      ]}
                    >
                      <Plus size={24} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.photoHint}>
            Add up to {MAX_PHOTOS} photos
          </Text>
        </View>
      </ScrollView>

      <FloatingActionButton onPress={handleNext} disabled={!canContinue}>
        Complete Setup
      </FloatingActionButton>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing[8],
    paddingBottom: spacing[32],
  },
  header: {
    gap: spacing[2],
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  photoSection: {
    gap: spacing[4],
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoTitle: {
    fontFamily: fontFamily.manropeSemibold,
    fontSize: fontSize.lg,
    color: colors.foreground,
  },
  required: {
    color: colors.destructive,
  },
  photoCount: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginLeft: spacing[2],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  photoContainer: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 2,
  },
  photoContainerFilled: {
    borderColor: 'transparent',
  },
  photoContainerEmpty: {
    borderColor: colors.ring,
    borderStyle: 'dashed',
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonActive: {
    backgroundColor: `${colors.muted}80`, // 50% opacity
  },
  addButtonDisabled: {
    backgroundColor: `${colors.muted}33`, // 20% opacity
  },
  photoHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
