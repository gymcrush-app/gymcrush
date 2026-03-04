/**
 * GymCrush — Spacing, Typography & Border Radius Tokens
 */

// ─── Spacing ─────────────────────────────────────────────────────
// Tailwind default spacing scale (in pixels for RN)
// NativeWind handles these automatically via className,
// but use these when you need programmatic values (animations, gestures, etc.)

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;


// ─── Border Radius ───────────────────────────────────────────────
// Matches Lovable --radius: 0.75rem (12px) base

export const borderRadius = {
  none: 0,
  sm: 8,     // calc(var(--radius) - 4px) = 8px
  md: 10,    // calc(var(--radius) - 2px) = 10px
  lg: 12,    // var(--radius) = 12px
  xl: 16,
  '2xl': 20,
  '3xl': 24,  // from tailwind.config extend
  '4xl': 32,  // from tailwind.config extend
  full: 9999,
} as const;


// ─── Typography ──────────────────────────────────────────────────
// Lovable uses system font stack. In RN, system fonts render automatically.
// Define sizes matching Tailwind's type scale (in pixels).

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const lineHeight = {
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

// Display font style (matches .font-display from Lovable CSS)
export const fontDisplay = {
  fontWeight: fontWeight.bold,
  letterSpacing: -0.32, // -0.02em at 16px base
} as const;


// ─── Animation Durations ─────────────────────────────────────────
// Matching Lovable's animation timings (in ms for Reanimated)

export const duration = {
  fast: 200,
  normal: 300,
  slow: 400,
  slower: 600,
  swipe: 400,
} as const;


// ─── Swipe Thresholds ────────────────────────────────────────────

export const swipe = {
  threshold: 120,          // px to trigger like/pass
  rotationFactor: 0.1,    // degrees per px of drag
  maxRotation: 20,         // matches swipe-right/left keyframe
  velocityThreshold: 800,  // snap on fast fling
} as const;


// ─── App Constants ───────────────────────────────────────────────

export const APP = {
  MAX_PHOTOS: 6,
  CRUSH_COOLDOWN_MS: 86_400_000, // 24 hours
  MAX_BIO_LENGTH: 300,
  MAX_APPROACH_PROMPT_LENGTH: 100,
  GYM_SEARCH_DEBOUNCE_MS: 300,
  MIN_AGE: 18,
  MAX_AGE: 100,
  STORAGE_KEYS: {
    DISCOVERY_PREFERENCES: 'gymcrush_discovery_preferences',
    SWIPED_PROFILES: 'gymcrush_swiped_profiles',
    LAST_LOCATION_SYNC: 'gymcrush_last_location_sync_v1',
    AUTH: 'auth-storage',
    APP: 'app-storage',
    ONBOARDING: 'onboarding-storage',
  },
} as const;