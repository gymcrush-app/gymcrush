import { BraceletBadge } from '@/components/profile/BraceletBadge';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme';
import type { BraceletStatus, Gym, Profile, Visibility } from '@/types';
import { Image as ExpoImage } from 'expo-image';
import { ChevronRight, LogOut, Settings } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BRACELET_OPTIONS, VISIBILITY_OPTIONS } from '@/constants';

interface ProfileViewProps {
  profile: Profile;
  gym?: Gym | null;
  onLogout: () => void;
  onUpdateProfile: (updates: Partial<Profile>) => void;
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  photoContainer: {
    position: 'relative',
  },
  photoIndicatorsContainer: {
    position: 'absolute',
    bottom: spacing[4],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonContainer: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
  },
  profileInfoContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  nameText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  gymTextContainer: {
    marginTop: spacing[1],
  },
  visibilitySection: {
    gap: spacing[3],
  },
  visibilityOptionsContainer: {
    gap: spacing[2],
  },
  visibilityOption: {
    width: '100%',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  visibilityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '1A', // 10% opacity
  },
  visibilityOptionLabel: {
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
  },
  visibilityOptionDescription: {
    marginTop: spacing[1],
  },
  braceletSection: {
    gap: spacing[3],
  },
  braceletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
  },
  braceletOptionsContainer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  braceletOption: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  braceletOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '1A', // 10% opacity
  },
  braceletOptionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  approachSection: {
    gap: spacing[3],
  },
  approachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approachTextContainer: {
    flex: 1,
    marginRight: spacing[4],
  },
  approachDescription: {
    marginTop: spacing[1],
  },
  settingsSection: {
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
  settingsItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    justifyContent: 'flex-start',
  },
  logoutText: {
    color: colors.destructive,
    fontWeight: fontWeight.semibold,
  },
});

export function ProfileView({ profile, gym, onLogout, onUpdateProfile }: ProfileViewProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [braceletStatus, setBraceletStatus] = useState<BraceletStatus>('wearing'); // Local state until added to DB

  // Map Profile to display format
  const photos = profile.photo_urls || [];
  const photoUri =
    photos.length > 0
      ? (photos[currentPhotoIndex] ?? photos[0])
      : null;
  const hasValidPhoto = Boolean(photoUri && String(photoUri).trim());
  const name = profile.display_name;
  const age = profile.age;
  const visibility: Visibility = profile.is_visible ? 'visible' : 'paused';
  const openToApproach = !!profile.approach_prompt;

  const handleVisibilityChange = (newVisibility: Visibility) => {
    // Map visibility back to is_visible boolean
    const isVisible = newVisibility === 'visible';
    onUpdateProfile({ is_visible: isVisible });
  };

  const handleBraceletStatusChange = (newStatus: BraceletStatus) => {
    // For now, bracelet status is stored in local state
    // TODO: Add bracelet_status field to database and persist
    setBraceletStatus(newStatus);
  };

  const handleOpenToApproachChange = (checked: boolean) => {
    // If unchecked, clear approach_prompt; if checked, we'd need a prompt value
    // For now, just log it - this might need a separate prompt input
    if (!checked) {
      onUpdateProfile({ approach_prompt: null });
    }
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={{ paddingBottom: spacing[24] }}
    >
      {/* Photo carousel */}
      <View style={[styles.photoContainer, { aspectRatio: 4 / 3, backgroundColor: colors.muted }]}>
        {hasValidPhoto ? (
          <ExpoImage
            source={{ uri: photoUri! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={colors.muted}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.muted }]} />
        )}
        
        {/* Photo indicators */}
        {photos.length > 1 && (
          <View 
            style={[styles.photoIndicatorsContainer, { gap: spacing[1.5] }]}
          >
            {photos.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentPhotoIndex(index)}
                style={{
                  width: index === currentPhotoIndex ? 8 : 6,
                  height: index === currentPhotoIndex ? 8 : 6,
                  borderRadius: 4,
                  backgroundColor: index === currentPhotoIndex ? colors.card : `${colors.card}80`,
                }}
              />
            ))}
          </View>
        )}

        {/* Edit button */}
        <View style={styles.editButtonContainer}>
          <Button
            variant="outline"
            size="sm"
            style={{
              backgroundColor: `${colors.card}E6`, // ~90% opacity
            }}
          >
            Edit Profile
          </Button>
        </View>
      </View>

      {/* Profile info */}
      <View style={[styles.profileInfoContainer, { gap: spacing[6] }]}>
        <View>
          <Text variant="h1" style={styles.nameText}>
            {name}, {age}
          </Text>
          {gym && (
            <Text variant="muted" style={styles.gymTextContainer}>
              📍 {gym.name}
            </Text>
          )}
        </View>

        {/* Visibility */}
        <View style={styles.visibilitySection}>
          <Label>Profile Visibility</Label>
          <View style={styles.visibilityOptionsContainer}>
            {VISIBILITY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleVisibilityChange(option.value)}
                style={[
                  styles.visibilityOption,
                  visibility === option.value && styles.visibilityOptionSelected,
                ]}
              >
                <Text style={styles.visibilityOptionLabel}>{option.label}</Text>
                <Text variant="mutedSmall" style={styles.visibilityOptionDescription}>
                  {option.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Bracelet Status */}
        <View style={styles.braceletSection}>
          <View style={styles.braceletHeader}>
            <Label>Gym Status</Label>
            <BraceletBadge status={braceletStatus} />
          </View>
          <View style={styles.braceletOptionsContainer}>
            {BRACELET_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleBraceletStatusChange(option.value)}
                style={[
                  styles.braceletOption,
                  braceletStatus === option.value && styles.braceletOptionSelected,
                ]}
              >
                <Text style={styles.braceletOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Open to Approach */}
        <View style={styles.approachSection}>
          <View style={styles.approachHeader}>
            <View style={styles.approachTextContainer}>
              <Label>Open to being approached</Label>
              <Text variant="mutedSmall" style={styles.approachDescription}>
                Let others know you're comfortable being approached in person at the gym
              </Text>
            </View>
            <Switch
              value={openToApproach}
              onValueChange={handleOpenToApproachChange}
            />
          </View>
        </View>

        {/* Settings section */}
        <View style={styles.settingsSection}>
          <Pressable style={styles.settingsItem}>
            <View style={[styles.settingsItemContent, { gap: spacing[3] }]}>
              <Settings size={20} color={colors.mutedForeground} />
              <Text weight="medium">Settings</Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={onLogout}
            style={styles.logoutItem}
          >
            <LogOut size={20} color={colors.destructive} style={{ marginRight: spacing[3] }} />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
