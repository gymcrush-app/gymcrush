import React from 'react';
import { TextStyle } from 'react-native';
import { Text } from './Text';

interface LabelProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  htmlFor?: string; // For web compatibility, ignored in RN
}

export function Label({ children, style, htmlFor }: LabelProps) {
  return (
    <Text variant="label" style={style}>
      {children}
    </Text>
  );
}
