import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const WHEEL_SIZE = 306;
const RADIUS = WHEEL_SIZE / 2;
const CENTER = RADIUS;

// Vibrant color palette - spectrum order
const COLORS = [
  '#FF3B30', // Vibrant Red
  '#FF2D55', // Hot Pink
  '#D35400', // Pumpkin
  '#FF9500', // Deep Orange
  '#F39C12', // Squash Orange
  '#FFCC00', // Golden Yellow
  '#4CD964', // Bright Green
  '#1ABC9C', // Teal
  '#22A7F0', // Vivid Blue
  '#34495E', // Dark Blue-Grey
  '#8E44AD', // Deep Purple
  '#9B59B6', // Amethyst
];

// Grayscale palette for initial state
const GRAYSCALE_COLORS = [
  '#8C8C8C',
  '#9A9A9A',
  '#7A7A7A',
  '#888888',
  '#969696',
  '#A4A4A4',
  '#8E8E8E',
  '#828282',
  '#909090',
  '#6E6E6E',
  '#7C7C7C',
  '#868686',
];

// Podcast genres/categories for the wheel (matching onboarding interests, repeated twice)
const BASE_GENRES = [
  { label: 'Art & Design', icon: '🎨' },
  { label: 'Health', icon: '❤️' },
  { label: 'Politics', icon: '🏛️' },
  { label: 'Comedy', icon: '😄' },
  { label: 'Music', icon: '🎵' },
  { label: 'History', icon: '📜' },
  { label: 'Relationships', icon: '❤️' },
  { label: 'Culture', icon: '🌍' },
  { label: 'Entrepreneurship', icon: '💡' },
  { label: 'Philosophy', icon: '🤔' },
  { label: 'Science', icon: '🔬' },
  { label: 'Technology', icon: '📱' },
  { label: 'Personal Development', icon: '🌱' },
];

const PODCAST_GENRES = [...BASE_GENRES, ...BASE_GENRES];

interface SpinnerWheelProps {
  onSpinComplete?: (genre: { label: string; icon: string }) => void;
  onLetsGo?: (genre: { label: string; icon: string }) => void;
}

export default function SpinnerWheel({ onSpinComplete, onLetsGo }: SpinnerWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [winner, setWinner] = useState<{ label: string; icon: string } | null>(null);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Pulsing animation for the spin button when not activated
  useEffect(() => {
    if (!isActivated && !isSpinning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isActivated, isSpinning]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setIsActivated(true); // Turn on colors

    const numberOfSegments = PODCAST_GENRES.length;
    const segmentAngle = 360 / numberOfSegments;

    // Random target segment
    const randomSegmentIndex = Math.floor(Math.random() * numberOfSegments);

    // At least 5 full spins + land in middle of segment
    const angleOffset = 360 * 5;
    const targetAngle = angleOffset + randomSegmentIndex * segmentAngle + segmentAngle / 2;

    const newRotation = rotation.value - targetAngle;

    rotation.value = withTiming(
      newRotation,
      {
        duration: 4000,
        easing: Easing.out(Easing.cubic),
      },
      () => {
        // Calculate winning segment from final rotation
        // Normalize to 0-360 range
        const normalizedRotation = (((-newRotation) % 360) + 360) % 360;
        const winningIndex = Math.floor(normalizedRotation / segmentAngle) % numberOfSegments;
        runOnJS(handleWin)(winningIndex);
      }
    );
  };

  const handleWin = (index: number) => {
    setIsSpinning(false);
    const selectedItem = PODCAST_GENRES[index];
    setWinner(selectedItem);
    setShowResultModal(true);

    if (onSpinComplete) {
      onSpinComplete(selectedItem);
    }
  };

  const handleCloseModal = () => {
    if (winner && onLetsGo) {
      onLetsGo(winner);
    }
    setShowResultModal(false);
    // Don't clear winner - keep it for the card flip state
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.wheelContainer}>

      {/* The Rotating Wheel */}
      <Animated.View style={[styles.wheel, animatedStyle]}>
        <Svg
          height={WHEEL_SIZE}
          width={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
        >
          {PODCAST_GENRES.map((genre, index) => {
            const numberOfSegments = PODCAST_GENRES.length;
            const segmentAngle = 360 / numberOfSegments;
            const startAngle = index * segmentAngle - 90; // -90 to start from top
            const endAngle = (index + 1) * segmentAngle - 90;
            const midAngle = (startAngle + endAngle) / 2;

            // Convert to radians for path calculation
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const midRad = (midAngle * Math.PI) / 180;

            const x1 = CENTER + RADIUS * Math.cos(startRad);
            const y1 = CENTER + RADIUS * Math.sin(startRad);
            const x2 = CENTER + RADIUS * Math.cos(endRad);
            const y2 = CENTER + RADIUS * Math.sin(endRad);

            const largeArcFlag = segmentAngle > 180 ? 1 : 0;

            const pathData = `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            // Text position - place it inside the segment
            const textRadius = RADIUS * 0.72;
            const textX = CENTER + textRadius * Math.cos(midRad);
            const textY = CENTER + textRadius * Math.sin(midRad);

            // Rotate text to be readable (flip if on left side of wheel)
            const textRotation = midAngle > 90 && midAngle < 270 ? midAngle + 180 : midAngle;

            const segmentColor = isActivated
              ? COLORS[index % COLORS.length]
              : GRAYSCALE_COLORS[index % GRAYSCALE_COLORS.length];

            return (
              <G key={index}>
                <Path
                  d={pathData}
                  fill={segmentColor}
                  stroke="white"
                  strokeWidth="2"
                />
                <SvgText
                  x={textX}
                  y={textY}
                  fill="white"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontSize="10"
                  fontWeight="bold"
                  rotation={textRotation}
                  origin={`${textX}, ${textY}`}
                >
                  {genre.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Center Spin Button - Teardrop shape with pulse animation */}
      <Animated.View style={[styles.spinButton, pulseAnimatedStyle]}>
        <TouchableOpacity
          onPress={handleSpin}
          activeOpacity={0.8}
          disabled={isSpinning}
        >
          <Svg width={66} height={76} viewBox="-3 -3 66 76">
            {/* Teardrop/droplet shape */}
            <Path
              d="M30 0 C30 0 0 35 0 45 C0 58.8 13.4 70 30 70 C46.6 70 60 58.8 60 45 C60 35 30 0 30 0 Z"
              fill="#F5D547"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            <SvgText
              x="30"
              y="48"
              fill="#403837"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
            >
              Spin
            </SvgText>
          </Svg>
        </TouchableOpacity>
      </Animated.View>

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>{winner?.icon}</Text>
            <Text style={styles.modalTitle}>We picked for you!</Text>
            <Text style={styles.modalCategory}>{winner?.label}</Text>
            <Text style={styles.modalSubtext}>
              Get ready to discover amazing {winner?.label?.toLowerCase()} podcasts
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseModal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Let's Go!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  spinButton: {
    position: 'absolute',
    top: WHEEL_SIZE / 2 - 35, // Center vertically
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E05F4E',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalCategory: {
    fontSize: 24,
    fontWeight: '700',
    color: '#403837',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSubtext: {
    fontSize: 16,
    color: '#6B5E57',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#E05F4E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
