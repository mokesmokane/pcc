import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../../constants/theme';

interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ style, error, ...props }: InputProps) {
  return (
    <TextInput
      style={[
        styles.input,
        error && styles.error,
        style,
      ]}
      placeholderTextColor={theme.colors.mutedForeground}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 36,
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    fontSize: 14,
    color: theme.colors.foreground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    // Web-specific styles to override blue focus
    // @ts-ignore
    outlineStyle: 'none',
    '&:focus': {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
  },
  error: {
    borderColor: theme.colors.destructive,
  },
});