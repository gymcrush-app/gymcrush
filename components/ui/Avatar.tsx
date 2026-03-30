import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, borderRadius, fontWeight } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  size?: AvatarSize;
  name?: string;
  style?: ViewStyle | ViewStyle[];
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    color: colors.mutedForeground,
    fontWeight: fontWeight.semibold,
  },
});

export function Avatar({ uri, size = 'md', name, style }: AvatarProps) {
  const sizeValue = sizeMap[size];
  
  // Safely generate initials from name, handling undefined/null/empty values
  const initials = (() => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return '?';
    }
    
    const parts = name.trim().split(' ').filter(part => part.length > 0);
    if (parts.length === 0) {
      return '?';
    }
    
    const firstLetters = parts
      .map((part) => part[0])
      .filter((letter) => letter !== undefined && letter !== null)
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return firstLetters || '?';
  })();

  return (
    <View
      style={[
        styles.container,
        { width: sizeValue, height: sizeValue },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: sizeValue, height: sizeValue }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: sizeValue * 0.4 },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
