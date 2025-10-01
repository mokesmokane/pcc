import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BottomControlBarProps {
  playbackRate: number;
  onSpeedPress: () => void;
  onSleepPress: () => void;
  onDiscussionPress: () => void;
  onSharePress: () => void;
  onMorePress: () => void;
  discussionCount?: number;
}

export function BottomControlBar({
  playbackRate,
  onSpeedPress,
  onSleepPress,
  onDiscussionPress,
  onSharePress,
  onMorePress,
  discussionCount = 24
}: BottomControlBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onSpeedPress} style={styles.button}>
        <Text style={styles.speedText}>{playbackRate}x</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onSleepPress} style={styles.button}>
        <Ionicons name="moon-outline" size={24} color="#8B8680" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onDiscussionPress} style={styles.button}>
        <Ionicons name="chatbubble-outline" size={24} color="#8B8680" />
        {discussionCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{discussionCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onSharePress} style={styles.button}>
        <Ionicons name="share-outline" size={24} color="#8B8680" />
      </TouchableOpacity>

      <TouchableOpacity onPress={onMorePress} style={styles.button}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#8B8680" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#403837',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  button: {
    padding: 8,
    position: 'relative',
  },
  speedText: {
    fontSize: 16,
    color: '#8B8680',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E05F4E',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});