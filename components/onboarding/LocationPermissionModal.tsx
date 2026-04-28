import { Button } from '@/components/ui/Button';
import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme';
import { MapPin } from 'lucide-react-native';
import React from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';

interface LocationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function LocationPermissionModal({
  visible,
  onClose,
  onOpenSettings,
}: LocationPermissionModalProps) {
  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
      onOpenSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <MapPin size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>Location Permission Required</Text>

          <Text style={styles.message}>
            We need access to your location to show you gyms near you. This helps
            us provide more relevant search results based on your current location.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              variant="primary"
              size="md"
              onPress={handleOpenSettings}
              style={styles.primaryButton}
            >
              Open Settings
            </Button>

            <Button
              variant="ghost"
              size="md"
              onPress={onClose}
              style={styles.secondaryButton}
            >
              Maybe Later
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.primary}1A`, // 10% opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  message: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  buttonContainer: {
    width: '100%',
    gap: spacing[3],
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
  },
});
