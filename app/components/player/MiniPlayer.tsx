import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MiniPlayerProps {
  title?: string;
  artist?: string;
  artwork?: string;
  isPlaying: boolean;
  progress: number;
  position?: number;
  duration?: number;
  onPlayPause: () => void;
  onPress: () => void;
  onSkipBackward?: () => void;
}

export function MiniPlayer({
  title = 'No track',
  artist = '',
  artwork,
  isPlaying,
  progress,
  position = 0,
  duration = 0,
  onPlayPause,
  onPress,
  onSkipBackward
}: MiniPlayerProps) {
  // Calculate time remaining (ensure non-negative values)
  const timeRemaining = Math.max(0, duration - position);
  const minutesLeft = Math.floor(timeRemaining / 60);
  const secondsLeft = Math.floor(timeRemaining % 60);
  const timeRemainingText = duration > 0 && timeRemaining >= 0 ? `${minutesLeft}m ${secondsLeft}s left` : '';
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <View style={styles.left}>
          {artwork ? (
            <Image source={{ uri: artwork }} style={styles.artwork} />
          ) : (
            <View style={styles.artwork} />
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timeRemaining} numberOfLines={1}>
              {timeRemainingText}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          {onSkipBackward && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSkipBackward();
              }}
              style={styles.skipButton}
            >
              <Ionicons
                name="refresh"
                size={42}
                color="#403837"
                style={{ transform: [{ scaleX: -1 }], marginTop: -4 }}
              />
              <Text style={styles.skipText}>15</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
            style={styles.playButton}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 64,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  timeRemaining: {
    fontSize: 12,
    color: '#6b7280',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 4,
  },
  skipText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
    color: '#403837',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#e5e7eb',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#E05F4E',
  },
});