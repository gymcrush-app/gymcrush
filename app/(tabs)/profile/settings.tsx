import { PermissionPrompt } from '@/components/notifications/PermissionPrompt';
import { useNotifications } from '@/hooks/useNotifications';
import { colors, fontSize, fontWeight, spacing } from '@/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { permissionStatus, requestPermissionAndRegister, isRegistering } = useNotifications();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {permissionStatus !== 'granted' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <Text style={styles.sectionHint}>Get alerts for new GymCrushes and messages</Text>
            <PermissionPrompt
              onRequestPermission={requestPermissionAndRegister}
              ctaLabel={isRegistering ? 'Enabling…' : 'Enable notifications'}
            />
          </View>
        ) : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery preferences</Text>
          <Text style={styles.sectionHint}>
            Gender, age range, distance, and Gym Crush Mode are in Discover — tap the settings icon on the Discover tab.
          </Text>
          <Pressable
            style={styles.linkRow}
            onPress={() => router.push('/(tabs)/discover')}
          >
            <Text style={styles.linkRowText}>Go to Discover</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.demoPlaygroundRow}
          onPress={() => router.push('/(tabs)/profile/playground')}
        >
          <View style={styles.demoPlaygroundRowContent}>
            <Text style={styles.demoPlaygroundRowTitle}>Demo playground</Text>
            <Text style={styles.demoPlaygroundRowHint}>
              Test haptics and swipe transitions
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing[2],
  },
  sectionHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[3],
  },
  linkRow: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
  },
  linkRowText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  demoPlaygroundRow: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  demoPlaygroundRowContent: {
    gap: spacing[1],
  },
  demoPlaygroundRowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
  },
  demoPlaygroundRowHint: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
});
