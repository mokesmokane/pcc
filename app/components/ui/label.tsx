import React from 'react';
import type { TextProps } from 'react-native';
import { StyleSheet, Text } from 'react-native';

interface LabelProps extends TextProps {
  children: React.ReactNode;
}

export function Label({ style, children, ...props }: LabelProps) {
  return (
    <Text style={[styles.label, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
});