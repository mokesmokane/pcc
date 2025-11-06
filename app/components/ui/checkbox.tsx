import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../constants/theme';

interface CheckboxProps {
  checked?: boolean;
  onValueChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ checked = false, onValueChange, disabled }: CheckboxProps) {
  return (
    <Pressable
      style={[
        styles.checkbox,
        checked && styles.checked,
        disabled && styles.disabled,
      ]}
      onPress={() => onValueChange?.(!checked)}
      disabled={disabled}
    >
      {checked && (
        <View style={styles.checkmark}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17L4 12"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  checkmark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});