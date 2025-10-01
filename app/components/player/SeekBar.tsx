import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { useAudio } from '../../contexts/AudioContextExpo';

interface SeekBarProps {
  disabled?: boolean;
  overridePosition?: number;
  overrideDuration?: number;
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
  overrideDuration
}) => {
  const { position: audioPosition, duration: audioDuration, seekTo } = useAudio();

  // Use override values if provided, otherwise fall back to audio context
  const position = overridePosition !== undefined ? overridePosition : audioPosition;
  const duration = overrideDuration !== undefined ? overrideDuration : audioDuration;

  // State for tracking drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Separate animated values for position and scale
  const positionAnimatedValue = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  // Use drag position when dragging, otherwise use actual audio position
  const displayPosition = isDragging ? dragPosition : position;

  // Handle container layout
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  // Update animated value based on position - but NOT when dragging
  useEffect(() => {
    // IMPORTANT: Don't update if we're dragging
    if (isDragging) return;

    if (containerWidth > 0 && duration > 0) {
      const progressPixels = (position / duration) * containerWidth;

      // Use non-native driver for position since we're animating width/translateX
      Animated.timing(positionAnimatedValue, {
        toValue: progressPixels,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [position, containerWidth, duration, isDragging]);

  // Create panResponder that updates when containerWidth changes
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        if (containerWidth === 0) return;

        const locationX = evt.nativeEvent.locationX;
        const clampedX = Math.max(0, Math.min(locationX, containerWidth));
        const newPosition = (clampedX / containerWidth) * duration;

        setIsDragging(true);
        setDragPosition(newPosition);

        // Stop any ongoing animations before setting value
        positionAnimatedValue.stopAnimation();
        positionAnimatedValue.setValue(clampedX);

        // Scale up thumb with native driver
        Animated.spring(thumbScale, {
          toValue: 1.5,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start();
      },

      onPanResponderMove: (evt) => {
        if (containerWidth === 0) return;

        const locationX = evt.nativeEvent.locationX;
        const clampedX = Math.max(0, Math.min(locationX, containerWidth));
        const newPosition = (clampedX / containerWidth) * duration;

        setDragPosition(newPosition);

        // Directly set animated value while dragging (no animation)
        positionAnimatedValue.setValue(clampedX);
      },

      onPanResponderRelease: (evt) => {
        if (containerWidth === 0) {
          setIsDragging(false);
          return;
        }

        const locationX = evt.nativeEvent.locationX;
        const clampedX = Math.max(0, Math.min(locationX, containerWidth));
        const finalPosition = (clampedX / containerWidth) * duration;

        // Scale down thumb with native driver
        Animated.spring(thumbScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // Perform seek
        seekTo(finalPosition);

        // Clear dragging state
        setIsDragging(false);
        setDragPosition(0);
      },

      onPanResponderTerminate: () => {
        // Scale down thumb
        Animated.spring(thumbScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // Reset to current position
        if (containerWidth > 0 && duration > 0) {
          const progressPixels = (position / duration) * containerWidth;
          positionAnimatedValue.stopAnimation();
          positionAnimatedValue.setValue(progressPixels);
        }

        setIsDragging(false);
        setDragPosition(0);
      },
    });
  }, [containerWidth, duration, seekTo, position]);

  const isDisabled = disabled || duration === 0;

  return (
    <View style={styles.container}>
      {/* Seek bar */}
      <View
        style={styles.seekBarContainer}
        onLayout={onLayout}
        {...(containerWidth > 0 && !isDisabled ? panResponder.panHandlers : {})}
      >
        {/* Track background */}
        <View style={[styles.track, isDisabled && styles.disabledTrack]} />

        {/* Progress fill */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: positionAnimatedValue,
            },
            isDisabled && styles.disabledProgressFill,
          ]}
        />

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumbContainer,
            {
              transform: [
                { translateX: positionAnimatedValue },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [{ scale: thumbScale }],
              },
              isDisabled && styles.disabledThumb,
            ]}
          >
            {isDragging && (
              <View style={styles.dragIndicator}>
                <Text style={styles.dragTime}>
                  {formatTime(dragPosition)}
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </View>

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