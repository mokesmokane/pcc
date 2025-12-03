import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActionButton {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'destructive';
}

interface InlineActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  buttons: ActionButton[];
  onClose: () => void;
}

export function InlineActionSheet({
  visible,
  title,
  subtitle,
  buttons,
  onClose,
}: InlineActionSheetProps) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, heightAnim, opacityAnim]);

  if (!visible) return null;

  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const getButtonStyle = (variant: ActionButton['variant']) => {
    switch (variant) {
      case 'primary':
        return styles.buttonPrimary;
      case 'secondary':
        return styles.buttonSecondary;
      case 'destructive':
        return styles.buttonDestructive;
    }
  };

  const getButtonTextStyle = (variant: ActionButton['variant']) => {
    switch (variant) {
      case 'primary':
        return styles.buttonPrimaryText;
      case 'secondary':
        return styles.buttonSecondaryText;
      case 'destructive':
        return styles.buttonDestructiveText;
    }
  };

  const getIconColor = (variant: ActionButton['variant']) => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return '#403837';
      case 'destructive':
        return '#E05F4E';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          maxHeight,
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#8B8680" />
          </TouchableOpacity>
        </View>

        <View style={styles.buttons}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.button, getButtonStyle(button.variant)]}
              onPress={button.onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={button.icon}
                size={18}
                color={getIconColor(button.variant)}
              />
              <Text style={getButtonTextStyle(button.variant)}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#403837',
  },
  subtitle: {
    fontSize: 13,
    color: '#8B8680',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
    marginTop: -4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  buttonPrimary: {
    backgroundColor: '#E05F4E',
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: '#F4F1ED',
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
  },
  buttonDestructive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E05F4E',
  },
  buttonDestructiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
});
