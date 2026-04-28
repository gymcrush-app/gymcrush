import { Text } from '@/components/ui/Text';
import { HeartbeatHeart } from '@/components/ui/HeartbeatHeart';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import type { Profile } from '@/types';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ConfettiAnimation } from './ConfettiAnimation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchModalProps {
  visible: boolean;
  currentUser: Profile;
  matchedUser: Profile;
  onStartChatting: () => void;
  onKeepSwiping: () => void;
}

export function MatchModal({
  visible,
  currentUser,
  matchedUser,
  onStartChatting,
  onKeepSwiping,
}: MatchModalProps) {
  if (!visible) {
    return null;
  }

  const currentUserPhoto = currentUser.photo_urls?.[0] || null;
  const matchedUserPhoto = matchedUser.photo_urls?.[0] || null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onKeepSwiping}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onKeepSwiping} />

        {/* Modal Content */}
        <Animated.View
          entering={SlideInDown.springify().damping(25)}
          exiting={SlideOutDown.springify().damping(25)}
          style={styles.content}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
            <Text variant="h1" style={styles.title}>
              Crush Unlocked
            </Text>
            <Text variant="body" style={styles.subtitle}>
              You and {matchedUser.display_name} liked each other
            </Text>
          </Animated.View>

          {/* Profile Photos */}
          <Animated.View
            entering={FadeIn.delay(400)}
            style={styles.photosContainer}
          >
            {/* Current User Photo */}
            <View style={styles.photoWrapper}>
              <View style={styles.photoContainer}>
                {currentUserPhoto ? (
                  <Image
                    source={{ uri: currentUserPhoto }}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text variant="h2" style={styles.photoPlaceholderText}>
                      {currentUser.display_name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="bodySmall" style={styles.photoLabel}>
                You
              </Text>
            </View>

            {/* Gym Heart */}
            <View style={styles.heartContainer}>
              <HeartbeatHeart size={48} active={visible} />
            </View>

            {/* Matched User Photo */}
            <View style={styles.photoWrapper}>
              <View style={styles.photoContainer}>
                {matchedUserPhoto ? (
                  <Image
                    source={{ uri: matchedUserPhoto }}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text variant="h2" style={styles.photoPlaceholderText}>
                      {matchedUser.display_name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="bodySmall" style={styles.photoLabel}>
                {matchedUser.display_name}
              </Text>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeIn.delay(600)} style={styles.buttonsContainer}>
            <Pressable
              style={styles.primaryButton}
              onPress={onStartChatting}
            >
              <Text variant="body" weight="semibold" style={styles.primaryButtonText}>
                Start Chatting
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={onKeepSwiping}
            >
              <Text variant="body" weight="medium" style={styles.secondaryButtonText}>
                Keep Crushing
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Confetti Animation (foreground layer) */}
        <View style={styles.confettiOverlay} pointerEvents="none">
          <ConfettiAnimation active={visible} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: borderRadius['3xl'],
    padding: spacing[6],
    alignItems: 'center',
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
    zIndex: 2,
  },
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    elevation: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  title: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
    gap: spacing[4],
  },
  photoWrapper: {
    alignItems: 'center',
    gap: spacing[2],
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: colors.mutedForeground,
    fontSize: fontSize['4xl'],
  },
  photoLabel: {
    color: colors.foreground,
    fontFamily: fontFamily.manropeMedium,
  },
  heartContainer: {
    marginHorizontal: spacing[1],
    marginBottom: spacing[2],
  },
  buttonsContainer: {
    width: '100%',
    gap: spacing[3],
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.lg,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.foreground,
    fontSize: fontSize.base,
  },
});
