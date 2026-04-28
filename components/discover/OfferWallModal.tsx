import { borderRadius, colors, fontSize, fontFamily, spacing } from '@/theme'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as WebBrowser from 'expo-web-browser'
import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases'
import { PACKAGE_TYPE } from 'react-native-purchases'

const TERMS_URL = 'https://gymcrushdating.com/terms'
const PRIVACY_URL = 'https://gymcrushdating.com/privacy'

interface OfferWallModalProps {
  visible: boolean
  onClose: () => void
  /** Called when the user taps the CTA with the selected package. */
  onPurchase?: (pkg: PurchasesPackage) => void | Promise<void>
  /** Called when the user taps "Restore Purchases". */
  onRestore?: () => void | Promise<void>
  /** Live RC offering — packages rendered into the plan cards. */
  offering?: PurchasesOffering | null
}

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: '1 Month',
  THREE_MONTH: '3 Months',
  ANNUAL: '12 Months',
}

function findPkg(
  offering: PurchasesOffering | null | undefined,
  type: PACKAGE_TYPE,
): PurchasesPackage | null {
  return offering?.availablePackages.find((p) => p.packageType === type) ?? null
}

/** Format a USD price computed per-month from an annual/3-month package. */
function perMonth(pkg: PurchasesPackage, months: number): string {
  return `$${(pkg.product.price / months).toFixed(2)}`
}

/** "Save XX%" vs paying monthly for the same duration. */
function savingsPct(pkg: PurchasesPackage, monthly: PurchasesPackage, months: number): number {
  const baseline = monthly.product.price * months
  if (baseline <= 0) return 0
  return Math.round((1 - pkg.product.price / baseline) * 100)
}

export function OfferWallModal({
  visible,
  onClose,
  onPurchase,
  onRestore,
  offering,
}: OfferWallModalProps) {
  const { monthlyPkg, threeMonthPkg, annualPkg } = useMemo(
    () => ({
      monthlyPkg: findPkg(offering, PACKAGE_TYPE.MONTHLY),
      threeMonthPkg: findPkg(offering, PACKAGE_TYPE.THREE_MONTH),
      annualPkg: findPkg(offering, PACKAGE_TYPE.ANNUAL),
    }),
    [offering],
  )

  // Pre-select the featured (annual) package; fall back to monthly if missing.
  const defaultSelectedId = annualPkg?.identifier ?? monthlyPkg?.identifier ?? null
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId)

  // Reset selection when the offering changes (or initially arrives).
  useEffect(() => {
    setSelectedId(defaultSelectedId)
  }, [defaultSelectedId])

  useEffect(() => {
    if (!offering) return
    console.log('[OfferWall] offering packages', {
      offering: offering.identifier,
      monthly: monthlyPkg?.product.priceString,
      threeMonth: threeMonthPkg?.product.priceString,
      annual: annualPkg?.product.priceString,
    })
  }, [offering, monthlyPkg, threeMonthPkg, annualPkg])

  const selectedPkg =
    [annualPkg, monthlyPkg, threeMonthPkg].find((p) => p?.identifier === selectedId) ?? null

  const handleCta = () => {
    if (!selectedPkg) {
      onClose()
      return
    }
    if (onPurchase) void onPurchase(selectedPkg)
    else onClose()
  }

  const isAnnualSelected = selectedId === annualPkg?.identifier
  const isMonthlySelected = selectedId === monthlyPkg?.identifier
  const isThreeMonthSelected = selectedId === threeMonthPkg?.identifier

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

              <View style={styles.trialBanner}>
                <MaterialCommunityIcons name="gift-outline" size={18} color={colors.primary} />
                <Text style={styles.trialBannerText}>
                  Try free for 7 days — cancel anytime
                </Text>
              </View>

              {annualPkg && (
                <Pressable
                  onPress={() => setSelectedId(annualPkg.identifier)}
                  accessibilityRole="button"
                  accessibilityLabel="Select 12 months"
                  style={[
                    styles.offerWallFeaturedCard,
                    isAnnualSelected && styles.offerWallCardSelected,
                  ]}
                >
                  <View style={styles.offerWallBadge}>
                    <Text style={styles.offerWallBadgeText}>BEST VALUE</Text>
                  </View>
                  <Text style={styles.offerWallPlanNameFeatured}>12 Months</Text>
                  <Text style={styles.offerWallPlanPriceFeatured}>
                    {perMonth(annualPkg, 12)}
                    <Text style={styles.offerWallPlanPerFeatured}>/mo</Text>
                  </Text>
                  {monthlyPkg && (
                    <Text style={styles.offerWallPlanSaveFeatured}>
                      Save {savingsPct(annualPkg, monthlyPkg, 12)}% — billed {annualPkg.product.priceString}/year
                    </Text>
                  )}
                </Pressable>
              )}

              <View style={styles.offerWallPlansRow}>
                {monthlyPkg && (
                  <Pressable
                    onPress={() => setSelectedId(monthlyPkg.identifier)}
                    accessibilityRole="button"
                    accessibilityLabel="Select 1 month"
                    style={[
                      styles.offerWallPlanCard,
                      isMonthlySelected && styles.offerWallCardSelected,
                    ]}
                  >
                    <Text style={styles.offerWallPlanName}>1 Month</Text>
                    <Text style={styles.offerWallPlanPrice}>
                      {monthlyPkg.product.priceString}
                      <Text style={styles.offerWallPlanPer}>/mo</Text>
                    </Text>
                  </Pressable>
                )}
                {threeMonthPkg && (
                  <Pressable
                    onPress={() => setSelectedId(threeMonthPkg.identifier)}
                    accessibilityRole="button"
                    accessibilityLabel="Select 3 months"
                    style={[
                      styles.offerWallPlanCard,
                      isThreeMonthSelected && styles.offerWallCardSelected,
                    ]}
                  >
                    <Text style={styles.offerWallPlanName}>3 Months</Text>
                    <Text style={styles.offerWallPlanPrice}>
                      {perMonth(threeMonthPkg, 3)}
                      <Text style={styles.offerWallPlanPer}>/mo</Text>
                    </Text>
                    {monthlyPkg && (
                      <Text style={styles.offerWallPlanSave}>
                        Save {savingsPct(threeMonthPkg, monthlyPkg, 3)}%
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>

              <View style={styles.offerWallFeatures}>
                <Text style={styles.offerWallFeaturesTitle}>What you get</Text>
                <View style={styles.offerWallFeaturesGrid}>
                  {[
                    'Filter by home gym',
                    'Send unlimited gems to Gym Gems',
                  ].map((feature) => (
                    <View key={feature} style={styles.offerWallFeatureRow}>
                      <Text style={styles.offerWallCheck}>✓</Text>
                      <Text style={styles.offerWallFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.offerWallCta, pressed && styles.offerWallCtaPressed]}
                onPress={handleCta}
                disabled={!selectedPkg}
              >
                <Text style={styles.offerWallCtaText}>
                  Start Free Trial
                  {selectedPkg && ` — ${PLAN_LABELS[selectedPkg.packageType] ?? selectedPkg.packageType}`}
                </Text>
              </Pressable>
              <Text style={styles.offerWallDisclaimer}>
                After your 7-day trial, your plan auto-renews. Cancel anytime in Settings.
              </Text>

              <View style={styles.legalRow}>
                {onRestore && (
                  <>
                    <Pressable
                      onPress={() => void onRestore()}
                      accessibilityRole="link"
                      accessibilityLabel="Restore purchases"
                      hitSlop={8}
                    >
                      <Text style={styles.legalLink}>Restore</Text>
                    </Pressable>
                    <Text style={styles.legalDot}>·</Text>
                  </>
                )}
                <Pressable
                  onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service"
                  hitSlop={8}
                >
                  <Text style={styles.legalLink}>Terms</Text>
                </Pressable>
                <Text style={styles.legalDot}>·</Text>
                <Pressable
                  onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                  hitSlop={8}
                >
                  <Text style={styles.legalLink}>Privacy</Text>
                </Pressable>
              </View>
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
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
    textAlign: 'center',
  },
  offerWallSubtitle: {
    fontSize: fontSize.base,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: `${colors.primary}1A`, // ~10% tint
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignSelf: 'center',
    marginBottom: spacing[5],
  },
  trialBannerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.primary,
  },
  offerWallFeaturedCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
    marginBottom: spacing[3],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  offerWallCardSelected: {
    borderColor: colors.foreground,
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
    fontFamily: fontFamily.manropeBold,
    color: colors.primary,
    letterSpacing: 1,
  },
  offerWallPlanNameFeatured: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.primaryForeground,
    marginBottom: spacing[1],
  },
  offerWallPlanPriceFeatured: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.manropeBold,
    color: colors.primaryForeground,
  },
  offerWallPlanPerFeatured: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manrope,
    color: colors.primaryForeground,
    opacity: 0.75,
  },
  offerWallPlanSaveFeatured: {
    fontSize: fontSize.xs,
    color: colors.primaryForeground,
    opacity: 0.85,
    marginTop: spacing[1],
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  offerWallPlanName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    marginBottom: spacing[1],
  },
  offerWallPlanPrice: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.manropeBold,
    color: colors.foreground,
  },
  offerWallPlanPer: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manrope,
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
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
    marginBottom: spacing[3],
  },
  offerWallFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  offerWallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
    paddingRight: spacing[2],
    width: '50%',
  },
  offerWallCheck: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontFamily: fontFamily.manropeBold,
  },
  offerWallFeatureText: {
    flex: 1,
    fontSize: fontSize.sm,
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
    fontFamily: fontFamily.manropeBold,
    color: colors.primaryForeground,
  },
  offerWallDisclaimer: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  legalLink: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.manropeMedium,
    color: colors.mutedForeground,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
})
