/**
 * Font assets for use with expo-font useFonts().
 *
 * Manrope ships one .ttf per weight; each weight is registered as its own
 * fontFamily (e.g. "Manrope_700Bold") so callers pick a weight by name and
 * never rely on synthetic bolding. See theme/tokens.ts for the friendly
 * `fontFamily.manrope*` aliases.
 */
import {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";

export const myriadProFonts = {
  "Myriad Pro": require("@/assets/fonts/myriad-pro/MYRIADPRO-REGULAR.OTF"),
  "Myriad Pro Bold": require("@/assets/fonts/myriad-pro/MYRIADPRO-BOLD.OTF"),
} as const;

export const manropeFonts = {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} as const;
