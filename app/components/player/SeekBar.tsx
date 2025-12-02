import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { usePlaybackControls, useCurrentTrack } from '../../stores/audioStore.hooks';

interface SeekBarProps {
  disabled?: boolean;
  overridePosition?: number;
  overrideDuration?: number;
  onSeek?: (position: number) => void;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const SeekBar: React.FC<SeekBarProps> = ({
  disabled = false,
  overridePosition,
  overrideDuration,
  onSeek,
}) => {
  const { position: audioPosition, duration: audioDuration } = useCurrentTrack();
  const { seekTo } = usePlaybackControls();

  // Use override values if provided and valid, otherwise fall back to audio context
  const position = (overridePosition !== undefined && overridePosition >= 0) ? overridePosition : audioPosition;
  const duration = (overrideDuration && overrideDuration > 0) ? overrideDuration : audioDuration;

  // Shared values for UI thread animations
  const containerWidth = useSharedValue(0);
  const progressPosition = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const thumbScale = useSharedValue(1);

  // State for display position (only updates on drag release)
  const [displayPosition, setDisplayPosition] = useState(position);
  const [showDragIndicator, setShowDragIndicator] = useState(false);

  // Refs for accessing latest values without recreating callbacks
  const positionRef = useRef(position);
  const durationRef = useRef(duration);

  useEffect(() => {
    positionRef.current = position;
    durationRef.current = duration;
  }, [position, duration]);

  // Handle container layout
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    containerWidth.value = width;

    // Initialize progress position when container width becomes available
    if (durationRef.current > 0 && !isDragging.value) {
      const initialProgress = (positionRef.current / durationRef.current) * width;
      progressPosition.value = initialProgress; // Set immediately, no animation
    }
  }, []);

  // Update progress position when audio position changes (but not while dragging)
  useEffect(() => {
    if (containerWidth.value > 0 && duration > 0 && !isDragging.value) {
      const newProgress = (position / duration) * containerWidth.value;
      progressPosition.value = withTiming(newProgress, { duration: 100 });
      setDisplayPosition(position);
    }
  }, [position, duration]);

  // Callbacks for runOnJS
  const handleSeek = useCallback((pos: number) => {
    seekTo(pos);
    onSeek?.(pos);
  }, [seekTo, onSeek]);

  const setDragIndicator = useCallback((show: boolean) => {
    setShowDragIndicator(show);
  }, []);

  const updateDisplayPos = useCallback((pos: number) => {
    setDisplayPosition(pos);
  }, []);

  // Pan gesture - runs entirely on UI thread
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      'worklet';
      if (containerWidth.value === 0 || duration === 0) return;

      isDragging.value = true;
      thumbScale.value = withSpring(1.5, { damping: 10, stiffness: 150 });
      runOnJS(setDragIndicator)(true);

      // Use event.x - relative to the GestureDetector view
      // This works correctly even when finger moves vertically!
      const clampedX = Math.max(0, Math.min(event.x, containerWidth.value));
      progressPosition.value = clampedX;

      const newPosition = (clampedX / containerWidth.value) * duration;
      runOnJS(updateDisplayPos)(newPosition);
    })
    .onUpdate((event) => {
      'worklet';
      if (containerWidth.value === 0 || duration === 0) return;

      // Use event.x - this fixes the vertical movement issue!
      // event.x is relative to the view and updates correctly regardless of Y position
      const clampedX = Math.max(0, Math.min(event.x, containerWidth.value));
      progressPosition.value = clampedX;

      const newPosition = (clampedX / containerWidth.value) * duration;
      runOnJS(updateDisplayPos)(newPosition);
    })
    .onEnd((event) => {
      'worklet';
      if (containerWidth.value === 0 || duration === 0) {
        isDragging.value = false;
        thumbScale.value = withSpring(1, { damping: 10, stiffness: 150 });
        runOnJS(setDragIndicator)(false);
        return;
      }

      const clampedX = Math.max(0, Math.min(event.x, containerWidth.value));
      const finalPosition = (clampedX / containerWidth.value) * duration;

      thumbScale.value = withSpring(1, { damping: 10, stiffness: 150 });
      isDragging.value = false;

      runOnJS(handleSeek)(finalPosition);
      runOnJS(setDragIndicator)(false);
      runOnJS(updateDisplayPos)(finalPosition);
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      thumbScale.value = withSpring(1, { damping: 10, stiffness: 150 });
      runOnJS(setDragIndicator)(false);
    });

  const isDisabled = disabled || duration === 0;

  // Animated styles
  const progressFillStyle = useAnimatedStyle(() => {
    // Clamp width to container width to prevent overflow
    const clampedWidth = containerWidth.value > 0
      ? Math.min(Math.max(0, progressPosition.value), containerWidth.value)
      : 0;
    return {
      width: clampedWidth,
    };
  });

  const thumbContainerStyle = useAnimatedStyle(() => {
    // Clamp thumb position to container width to prevent overflow
    const clampedX = containerWidth.value > 0
      ? Math.min(Math.max(0, progressPosition.value), containerWidth.value)
      : 0;
    return {
      transform: [{ translateX: clampedX }],
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: thumbScale.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Seek bar */}
      <GestureDetector gesture={isDisabled ? Gesture.Pan() : panGesture}>
        <View
          style={styles.seekBarContainer}
          onLayout={onLayout}
        >
          {/* Track background */}
          <View style={[styles.track, isDisabled && styles.disabledTrack]} />

          {/* Progress fill */}
          <Animated.View
            style={[
              styles.progressFill,
              progressFillStyle,
              isDisabled && styles.disabledProgressFill,
            ]}
          />

          {/* Thumb */}
          <Animated.View
            style={[
              styles.thumbContainer,
              thumbContainerStyle,
            ]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.thumb,
                thumbStyle,
                isDisabled && styles.disabledThumb,
              ]}
            >
              {showDragIndicator && (
                <View style={styles.dragIndicator}>
                  <Text style={styles.dragTime}>
                    {formatTime(displayPosition)}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Time labels below */}
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, isDisabled && styles.disabledText]}>
          {formatTime(displayPosition)}
        </Text>
        <Text style={[styles.timeText, isDisabled && styles.disabledText]}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#403837',
    fontVariant: ['tabular-nums'],
  },
  disabledText: {
    color: '#ccc',
  },
  seekBarContainer: {
    height: 30,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(64, 56, 55, 0.2)',
    borderRadius: 1.5,
  },
  disabledTrack: {
    backgroundColor: '#F0F0F0',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    backgroundColor: '#403837',
    borderRadius: 1.5,
  },
  disabledProgressFill: {
    backgroundColor: '#D0D0D0',
  },
  thumbContainer: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#403837',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  disabledThumb: {
    opacity: 0.5,
  },
  dragIndicator: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(64, 56, 55, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 45,
    alignItems: 'center',
  },
  dragTime: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});