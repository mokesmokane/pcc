import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface DropdownMenuProps {
  visible: boolean;
  artwork?: string;
  podcastTitle?: string;
  episodeTitle?: string;
  items: MenuItem[];
  onClose: () => void;
}

export function DropdownMenu({
  visible,
  artwork,
  podcastTitle,
  episodeTitle,
  items,
  onClose,
}: DropdownMenuProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.menu,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.header}>
            {artwork && (
              <Image source={{ uri: artwork }} style={styles.artwork} />
            )}
            <View style={styles.headerText}>
              {podcastTitle && (
                <Text style={styles.podcastTitle} numberOfLines={1}>
                  {podcastTitle}
                </Text>
              )}
              {episodeTitle && (
                <Text style={styles.episodeTitle} numberOfLines={2}>
                  {episodeTitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.items}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.item,
                  index < items.length - 1 && styles.itemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.destructive ? '#E05F4E' : '#403837'}
                />
                <Text
                  style={[
                    styles.itemLabel,
                    item.destructive && styles.itemLabelDestructive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
    gap: 12,
  },
  artwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  headerText: {
    flex: 1,
  },
  podcastTitle: {
    fontSize: 13,
    color: '#8B8680',
    marginBottom: 2,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    lineHeight: 20,
  },
  items: {
    paddingTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E5E1',
  },
  itemLabel: {
    fontSize: 17,
    color: '#403837',
  },
  itemLabelDestructive: {
    color: '#E05F4E',
  },
});
