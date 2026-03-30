import { colors, spacing } from '@/theme';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import React, { createContext, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingProgress } from './OnboardingProgress';

// Import background image
// Note: Metro bundler has issues with spaces in filenames when using require()
// If you get an ENOENT error, try:
// 1. Restart Metro bundler: npx expo start --clear
// 2. Or rename the file to remove the space (e.g., "GymCrushBackground.jpg")
// 3. Or use a different background file without spaces
const backgroundImage = require('@/assets/images/GymCrushBackground.jpg');

type ScrollViewRef = React.ElementRef<typeof ScrollView>;
export const OnboardingScrollContext = createContext<React.RefObject<ScrollViewRef | null> | null>(null);

interface OnboardingContainerProps {
  currentStep: number;
  totalSteps?: number;
  showBack?: boolean;
  onBack?: () => void;
  showClose?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export function OnboardingContainer({
  currentStep,
  totalSteps = 6,
  showBack = false,
  onBack,
  showClose = false,
  onClose,
  children,
}: OnboardingContainerProps) {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollViewRef>(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.replace('/(auth)/login');
    }
  };

  // Use single background image for all onboarding screens

  return (
    <OnboardingScrollContext.Provider value={scrollViewRef}>
    <View style={styles.wrapper}>
      {/* Background image - full screen, no safe area constraints */}
      <Image
        source={backgroundImage}
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      
      {/* Overlay for text readability */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <View style={styles.container}>
            {/* Header with back button and progress */}
            <View style={styles.header}>
            <View style={styles.headerContent}>
              {showBack && (
                <Pressable
                  onPress={handleBack}
                  style={styles.backButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ArrowLeft size={24} color={colors.foreground} />
                </Pressable>
              )}
              {showClose && (
                <Pressable
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={24} color={colors.foreground} />
                </Pressable>
              )}
              <OnboardingProgress currentStep={currentStep} totalSteps={totalSteps} />
            </View>
          </View>

          {/* Content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
    </OnboardingScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
    position: 'absolute',
    left: 0,
  },
  closeButton: {
    padding: spacing[2],
    marginRight: -spacing[2],
    position: 'absolute',
    right: 0,
  },
  scrollView: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[32],
  },
});
