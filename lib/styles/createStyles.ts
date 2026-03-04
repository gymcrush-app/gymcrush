/**
 * Style Utilities
 * --------------
 * Common style patterns and helpers using theme tokens.
 * Use StyleSheet.create for component-level styles.
 */

import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, lineHeight } from '@/theme';

/**
 * Type-safe StyleSheet.create wrapper
 */
export const createStyles = <T extends Record<string, ViewStyle | TextStyle>>(
  styles: T
): T => StyleSheet.create(styles);

/**
 * Common layout patterns
 */
export const layout = {
  flex1: {
    flex: 1,
  } as ViewStyle,
  
  flexRow: {
    flexDirection: 'row',
  } as ViewStyle,
  
  flexCol: {
    flexDirection: 'column',
  } as ViewStyle,
  
  itemsCenter: {
    alignItems: 'center',
  } as ViewStyle,
  
  itemsStart: {
    alignItems: 'flex-start',
  } as ViewStyle,
  
  itemsEnd: {
    alignItems: 'flex-end',
  } as ViewStyle,
  
  justifyCenter: {
    justifyContent: 'center',
  } as ViewStyle,
  
  justifyBetween: {
    justifyContent: 'space-between',
  } as ViewStyle,
  
  justifyAround: {
    justifyContent: 'space-around',
  } as ViewStyle,
  
  justifyStart: {
    justifyContent: 'flex-start',
  } as ViewStyle,
  
  justifyEnd: {
    justifyContent: 'flex-end',
  } as ViewStyle,
  
  flexWrap: {
    flexWrap: 'wrap',
  } as ViewStyle,
  
  absolute: {
    position: 'absolute',
  } as ViewStyle,
  
  relative: {
    position: 'relative',
  } as ViewStyle,
  
  fullWidth: {
    width: '100%',
  } as ViewStyle,
  
  fullHeight: {
    height: '100%',
  } as ViewStyle,
};

/**
 * Common container styles
 */
export const containers = {
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  } as ViewStyle,
  
  cardForeground: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  } as ViewStyle,
  
  muted: {
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  } as ViewStyle,
};

/**
 * Common text styles
 */
export const textStyles = {
  // Headings
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
  } as TextStyle,
  
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  } as TextStyle,
  
  h3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.foreground,
    lineHeight: fontSize['2xl'] * lineHeight.tight,
  } as TextStyle,
  
  h4: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.foreground,
    lineHeight: fontSize.xl * lineHeight.snug,
  } as TextStyle,
  
  // Body text
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    color: colors.foreground,
    lineHeight: fontSize.base * lineHeight.normal,
  } as TextStyle,
  
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    color: colors.foreground,
    lineHeight: fontSize.lg * lineHeight.normal,
  } as TextStyle,
  
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.foreground,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,
  
  // Muted text
  muted: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    color: colors.mutedForeground,
    lineHeight: fontSize.base * lineHeight.normal,
  } as TextStyle,
  
  mutedSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    color: colors.mutedForeground,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,
  
  mutedXSmall: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    color: colors.mutedForeground,
    lineHeight: fontSize.xs * lineHeight.normal,
  } as TextStyle,
  
  // Labels
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    lineHeight: fontSize.sm * lineHeight.normal,
  } as TextStyle,
  
  labelSmall: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.mutedForeground,
    lineHeight: fontSize.xs * lineHeight.normal,
  } as TextStyle,
  
  // Semantic text colors
  primary: {
    color: colors.primary,
  } as TextStyle,
  
  secondary: {
    color: colors.secondary,
  } as TextStyle,
  
  success: {
    color: colors.success,
  } as TextStyle,
  
  warning: {
    color: colors.warning,
  } as TextStyle,
  
  destructive: {
    color: colors.destructive,
  } as TextStyle,
};

/**
 * Common spacing helpers
 */
export const spacingHelpers = {
  gap: {
    0: { gap: spacing[0] },
    1: { gap: spacing[1] },
    2: { gap: spacing[2] },
    3: { gap: spacing[3] },
    4: { gap: spacing[4] },
    5: { gap: spacing[5] },
    6: { gap: spacing[6] },
    8: { gap: spacing[8] },
  },
  
  padding: {
    xs: { padding: spacing[1] },
    sm: { padding: spacing[2] },
    md: { padding: spacing[4] },
    lg: { padding: spacing[6] },
    xl: { padding: spacing[8] },
  },
  
  paddingX: {
    xs: { paddingHorizontal: spacing[1] },
    sm: { paddingHorizontal: spacing[2] },
    md: { paddingHorizontal: spacing[4] },
    lg: { paddingHorizontal: spacing[6] },
    xl: { paddingHorizontal: spacing[8] },
  },
  
  paddingY: {
    xs: { paddingVertical: spacing[1] },
    sm: { paddingVertical: spacing[2] },
    md: { paddingVertical: spacing[4] },
    lg: { paddingVertical: spacing[6] },
    xl: { paddingVertical: spacing[8] },
  },
  
  margin: {
    xs: { margin: spacing[1] },
    sm: { margin: spacing[2] },
    md: { margin: spacing[4] },
    lg: { margin: spacing[6] },
    xl: { margin: spacing[8] },
  },
  
  marginX: {
    xs: { marginHorizontal: spacing[1] },
    sm: { marginHorizontal: spacing[2] },
    md: { marginHorizontal: spacing[4] },
    lg: { marginHorizontal: spacing[6] },
    xl: { marginHorizontal: spacing[8] },
  },
  
  marginY: {
    xs: { marginVertical: spacing[1] },
    sm: { marginVertical: spacing[2] },
    md: { marginVertical: spacing[4] },
    lg: { marginVertical: spacing[6] },
    xl: { marginVertical: spacing[8] },
  },
};

/**
 * Common border radius helpers
 */
export const radiusHelpers = {
  sm: { borderRadius: borderRadius.sm },
  md: { borderRadius: borderRadius.md },
  lg: { borderRadius: borderRadius.lg },
  xl: { borderRadius: borderRadius.xl },
  '2xl': { borderRadius: borderRadius['2xl'] },
  '3xl': { borderRadius: borderRadius['3xl'] },
  '4xl': { borderRadius: borderRadius['4xl'] },
  full: { borderRadius: borderRadius.full },
};
