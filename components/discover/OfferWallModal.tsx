import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/theme'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

interface OfferWallModalProps {
  visible: boolean
  onClose: () => void
  onCtaPress?: () => void
}

export function OfferWallModal({ visible, onClose, onCtaPress }: OfferWallModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerSide} />
            <View style={styles.offerWallHandle} />
            <View style={[styles.headerSide, styles.headerSideEnd]}>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                hitSlop={12}
                style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.offerWallScroll}>
            <View style={styles.offerWallContent}>
              <Text style={styles.offerWallTitle}>GymCrush+</Text>
              <Text style={styles.offerWallSubtitle}>Unlock premium features to level up your connections</Text>

              <View style={styles.offerWallFeaturedCard}>
                <View style={styles.offerWallBadge}>
                  <Text style={styles.offerWallBadgeText}>MOST POPULAR</Text>
                </View>
                <Text style={styles.offerWallPlanName}>6 Months</Text>
                <Text style={styles.offerWallPlanPrice}>$14.99<Text style={styles.offerWallPlanPer}>/mo</Text></Text>
                <Text style={styles.offerWallPlanSave}>Save 50% - billed $89.94</Text>
              </View>

              <View style={styles.offerWallPlansRow}>
                <View style={styles.offerWallPlanCard}>
                  <Text style={styles.offerWallPlanName}>1 Month</Text>
                  <Text style={styles.offerWallPlanPrice}>$29.99<Text style={styles.offerWallPlanPer}>/mo</Text></Text>
                </View>
                <View style={styles.offerWallPlanCard}>
                  <Text style={styles.offerWallPlanName}>12 Months</Text>
                  <Text style={styles.offerWallPlanPrice}>$9.99<Text style={styles.offerWallPlanPer}>/mo</Text></Text>
                  <Text style={styles.offerWallPlanSave}>Best value</Text>
                </View>
              </View>

              <View style={styles.offerWallFeatures}>
                <Text style={styles.offerWallFeaturesTitle}>What you get</Text>
                {[
                  'Unlimited Crushes per day',
                  'See who liked you',
                  'Priority in Gym Gems rankings',
                  'Read receipts in chat',
                  'Profile boost (1x per week)',
                ].map((feature) => (
                  <View key={feature} style={styles.offerWallFeatureRow}>
                    <Text style={styles.offerWallCheck}>✓</Text>
                    <Text style={styles.offerWallFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [styles.offerWallCta, pressed && styles.offerWallCtaPressed]}
                onPress={onCtaPress ?? onClose}
              >
                <Text style={styles.offerWallCtaText}>Start Free Trial</Text>
              </Pressable>
              <Text style={styles.offerWallDisclaimer}>7-day free trial, cancel anytime</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Not now"
                style={({ pressed }) => [styles.offerWallNotNow, pressed && styles.offerWallNotNowPressed]}
              >
                <Text style={styles.offerWallNotNowText}>Not now</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '90%',
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    alignItems: 'center',
    zIndex: 2,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    marginBottom: spacing[2],
  },
  headerSide: {
    flex: 1,
  },
  headerSideEnd: {
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: spacing[1],
  },
  closeButtonPressed: {
    opacity: 0.7,
  },
  offerWallHandle: {
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.mutedForeground,
  },
  offerWallScroll: {
    flex: 1,
    width: '100%',
  },
  offerWallContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
  offerWallTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    textAlign: 'center',
  },
  offerWallSubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  offerWallFeaturedCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  offerWallBadge: {
    backgroundColor: colors.primaryForeground,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginBottom: spacing[3],
  },
  offerWallBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  offerWallPlansRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  offerWallPlanCard: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
  },
  offerWallPlanName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  offerWallPlanPrice: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
  },
  offerWallPlanPer: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.mutedForeground,
  },
  offerWallPlanSave: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  offerWallFeatures: {
    marginBottom: spacing[6],
  },
  offerWallFeaturesTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  offerWallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  offerWallCheck: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  offerWallFeatureText: {
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  offerWallCta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  offerWallCtaPressed: {
    opacity: 0.9,
  },
  offerWallCtaText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primaryForeground,
  },
  offerWallDisclaimer: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  offerWallNotNow: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
    alignItems: 'center',
    alignSelf: 'center',
  },
  offerWallNotNowPressed: {
    opacity: 0.7,
  },
  offerWallNotNowText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.mutedForeground,
  },
})
