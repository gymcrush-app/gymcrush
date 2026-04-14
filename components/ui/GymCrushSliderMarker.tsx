import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { MarkerProps } from '@ptomasroos/react-native-multi-slider';

const logo = require('@/assets/images/GymCrushHeart.png');

const SIZE = 42;
const PRESSED_SIZE = 51;

export function GymCrushSliderMarker({ pressed }: MarkerProps) {
  const s = pressed ? PRESSED_SIZE : SIZE;
  return (
    <View style={[styles.container, { width: s, height: s }]}>
      <Image source={logo} style={{ width: s, height: s }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
