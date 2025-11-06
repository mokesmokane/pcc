import React from 'react';
import type { PressableProps, TextStyle } from 'react-native';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  textStyle?: TextStyle;
}

export function Button({ 
  variant = 'default', 
  size = 'default', 
  children, 
  style,
  textStyle,
  disabled,
  ...props 
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    sizeStyles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    textVariantStyles[variant],
    sizeTextStyles[size],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyles,
        pressed && styles.pressed,
      ]}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={textStyles}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 8,
  },
  default: {
    backgroundColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  destructive: {
    backgroundColor: theme.colors.destructive,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  outline: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.7,
  },
});

const textVariantStyles = StyleSheet.create({
  default: {
    color: theme.colors.primaryForeground,
  },
  destructive: {
    color: theme.colors.destructiveForeground,
  },
  outline: {
    color: theme.colors.foreground,
  },
  secondary: {
    color: theme.colors.secondaryForeground,
  },
  ghost: {
    color: theme.colors.foreground,
  },
  link: {
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
});

const sizeStyles = StyleSheet.create({
  default: {
    height: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sm: {
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  lg: {
    height: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  icon: {
    width: 36,
    height: 36,
    padding: 0,
  },
});

const sizeTextStyles = StyleSheet.create({
  default: {
    fontSize: 14,
  },
  sm: {
    fontSize: 13,
  },
  lg: {
    fontSize: 15,
  },
  icon: {
    fontSize: 14,
  },
});