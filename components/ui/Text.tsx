import React from 'react';
import { Text as RNText, TextStyle, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, lineHeight } from '@/theme';
import { textStyles } from '@/lib/styles';

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

interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
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

const weightMap: Record<string, TextStyle> = {
  normal: { fontWeight: fontWeight.normal },
  medium: { fontWeight: fontWeight.medium },
  semibold: { fontWeight: fontWeight.semibold },
  bold: { fontWeight: fontWeight.bold },
  extrabold: { fontWeight: fontWeight.extrabold },
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
  const weightStyle = weight ? weightMap[weight] : {};
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
