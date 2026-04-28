import { textStyles } from '@/lib/styles';
import { colors, fontFamily } from '@/theme';
import React from 'react';
import { Text as RNText, TextStyle } from 'react-native';

type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodyLarge'
  | 'bodySmall'
  | 'muted'
  | 'mutedSmall'
  | 'mutedXSmall'
  | 'label'
  | 'labelSmall';

type TextColor = 'default' | 'primary' | 'secondary' | 'muted' | 'success' | 'warning' | 'destructive';

type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';

interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
}

const colorMap: Record<TextColor, TextStyle> = {
  default: { color: colors.foreground },
  primary: { color: colors.primary },
  secondary: { color: colors.secondary },
  muted: { color: colors.mutedForeground },
  success: { color: colors.success },
  warning: { color: colors.warning },
  destructive: { color: colors.destructive },
};

const weightFamilyMap: Record<TextWeight, string> = {
  light: fontFamily.manropeLight,
  normal: fontFamily.manrope,
  medium: fontFamily.manropeMedium,
  semibold: fontFamily.manropeSemibold,
  bold: fontFamily.manropeBold,
  extrabold: fontFamily.manropeExtrabold,
};

export function Text({
  variant = 'body',
  color = 'default',
  weight,
  align = 'left',
  children,
  style,
  numberOfLines,
  ellipsizeMode,
}: TextProps) {
  const baseStyle = textStyles[variant];
  const colorStyle = colorMap[color];
  const weightStyle: TextStyle = weight
    ? { fontFamily: weightFamilyMap[weight] }
    : {};
  const alignStyle: TextStyle = { textAlign: align };

  return (
    <RNText
      style={[baseStyle, colorStyle, weightStyle, alignStyle, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {children}
    </RNText>
  );
}
