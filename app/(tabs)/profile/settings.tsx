import type { DiscoveryPreferencesData } from '@/components/discover/DiscoveryPreferences';
import { Select } from '@/components/ui/Select';
import { useProfile, useUpdateDiscoveryPreferences } from '@/lib/api/profiles';
import { APP, colors, fontSize, fontWeight, spacing } from '@/theme';
import { GENDER_OPTIONS_WITH_EVERYONE } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORAGE_KEY = APP.STORAGE_KEYS.DISCOVERY_PREFERENCES;

const DEFAULT_PREFERENCES: DiscoveryPreferencesData = {
  gender: 'everyone',
  maxDistance: 30,
  disciplines: [],
  searchByGym: true,
  selectedGym: null,
};

const genderMap: Record<string, ('male' | 'female' | 'non-binary' | 'prefer-not-to-say')[]> = {
  men: ['male'],
  women: ['female'],
  everyone: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
};

export default function SettingsScreen() {
  const router = useRouter();
  const { data: currentProfile } = useProfile();
  const updateDiscoveryPreferencesMutation = useUpdateDiscoveryPreferences();
  const [gender, setGender] = useState<DiscoveryPreferencesData['gender']>('everyone');

  const loadPreferences = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DiscoveryPreferencesData;
        setGender(parsed.gender ?? 'everyone');
        return;
      }
    } catch (error) {
      console.error('Failed to load discovery preferences in Settings:', error);
    }
    if (currentProfile?.discovery_preferences) {
      const prefs = currentProfile.discovery_preferences as Record<string, unknown>;
      const genders = prefs?.genders as string[] | undefined;
      if (Array.isArray(genders) && genders.length > 0) {
        if (genders.length === 4 || genders.includes('male') && genders.includes('female')) {
          setGender('everyone');
        } else if (genders.includes('male') && !genders.includes('female')) {
          setGender('men');
        } else if (genders.includes('female')) {
          setGender('women');
        }
      }
    }
  }, [currentProfile?.discovery_preferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: DiscoveryPreferencesData = stored
        ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
        : DEFAULT_PREFERENCES;
      const updated = { ...existing, gender };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      updateDiscoveryPreferencesMutation.mutate({
        genders: genderMap[gender] ?? [],
      });
      router.back();
    } catch (error) {
      console.error('Failed to save gender preference:', error);
      toast({ preset: 'error', title: 'Save failed' });
    }
  }, [gender, router, updateDiscoveryPreferencesMutation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Show me</Text>
          <Text style={styles.sectionHint}>Who you see in Discover</Text>
          <Select
            value={gender}
            onValueChange={(value) => setGender(value as DiscoveryPreferencesData['gender'])}
            options={GENDER_OPTIONS_WITH_EVERYONE}
            placeholder="Select preference"
          />
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
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
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
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing[4],
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primaryForeground,
  },
});
