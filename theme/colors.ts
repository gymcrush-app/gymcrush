/**
 * GymCrush Design Tokens
 * ----------------------
 * Extracted from Lovable project (index.css + tailwind.config.ts)
 * Dark-first theme: Baby Blue & Coral / Peach
 *
 * HSL source values are commented for reference.
 * All values resolved to hex for React Native compatibility.
 */

// ─── Core Palette ────────────────────────────────────────────────
// These are the raw HSL values from the Lovable CSS variables,
// resolved to hex so they work everywhere in RN.

export const palette = {
  // Peach / Coral
  peach100: '#F5C4A9', // hsl(17, 76%, 80%)  --primary
  peach200: '#F0A478', // hsl(17, 85%, 70%)  gradient end
  peach300: '#F7D3BF', // hsl(17, 76%, 85%)  hero gradient start
  peachDark: '#5C3020', // hsl(17, 50%, 25%)  --accent

  // Baby Blue
  blue100: '#7EC8E3', // hsl(197, 71%, 73%)  --secondary
  blue200: '#4DB8D9', // hsl(197, 80%, 60%)  gradient end

  // Neutrals (dark-first)
  dark900: '#0F1318', // hsl(220, 25%, 8%)   --background
  dark800: '#171C24', // hsl(220, 25%, 10%)  sidebar bg
  dark700: '#1C222D', // hsl(220, 20%, 12%)  --card
  dark600: '#262D3A', // hsl(220, 20%, 18%)  --muted, --border, --input
  dark500: '#8891A0', // hsl(210, 15%, 60%)  --muted-foreground

  light100: '#F5F7FA', // hsl(210, 20%, 98%)  --foreground

  // Status
  success: '#2DB86A',  // hsl(142, 71%, 45%)
  warning: '#F5A623',  // hsl(38, 92%, 50%)
  destructive: '#B93333', // hsl(0, 62%, 45%)

  // Bracelet status
  braceletWearing: '#2DB86A',     // hsl(142, 71%, 45%)  green
  braceletNotWearing: '#F5A623',  // hsl(38, 92%, 50%)   amber
  braceletNone: '#8E99A8',        // hsl(220, 10%, 65%)  gray

  white: '#FFFFFF',
  black: '#000000',
} as const;


// ─── Semantic Tokens ─────────────────────────────────────────────
// Map semantic names → palette values. Use THESE in components.

export const colors = {
  background: palette.dark900,
  foreground: palette.light100,

  card: palette.dark700,
  cardForeground: palette.light100,

  popover: palette.dark700,
  popoverForeground: palette.light100,

  primary: palette.peach100,
  primaryForeground: palette.dark800,

  secondary: palette.blue100,
  secondaryForeground: palette.dark800,

  muted: palette.dark600,
  mutedForeground: palette.dark500,

  accent: palette.peachDark,
  accentForeground: palette.light100,

  destructive: palette.destructive,
  destructiveForeground: palette.white,

  border: palette.dark600,
  input: palette.dark600,
  ring: palette.peach100,

  success: palette.success,
  successForeground: palette.white,

  warning: palette.warning,
  warningForeground: palette.white,

  bracelet: {
    wearing: palette.braceletWearing,
    notWearing: palette.braceletNotWearing,
    none: palette.braceletNone,
  },

  sidebar: {
    background: palette.dark800,
    foreground: palette.light100,
    primary: palette.peach100,
    primaryForeground: palette.dark800,
    accent: '#1A2030', // hsl(220, 20%, 15%)
    accentForeground: palette.light100,
    border: palette.dark600,
    ring: palette.peach100,
  },
} as const;


// ─── Gradients ───────────────────────────────────────────────────
// For use with expo-linear-gradient or react-native-linear-gradient

export const gradients = {
  primary: {
    colors: [palette.peach100, palette.peach200],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: [palette.blue100, palette.blue200],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  hero: {
    colors: [palette.peach300, palette.peach100],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  cardOverlay: {
    colors: ['rgba(11, 14, 19, 0.95)', 'rgba(11, 14, 19, 0.5)', 'transparent'],
    locations: [0, 0.4, 0.7],
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
  },
} as const;


// ─── Shadows ─────────────────────────────────────────────────────
// React Native shadow properties (iOS + Android elevation)

export const shadows = {
  card: {
    shadowColor: palette.dark900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHover: {
    shadowColor: palette.dark900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  button: {
    shadowColor: '#B35C28', // hsl(17, 76%, 50%) peach glow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;