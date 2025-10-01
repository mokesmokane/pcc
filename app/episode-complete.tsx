import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFonts, PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  shape: 'rectangle' | 'triangle' | 'circle';
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

const colors = ['#E05F4E', '#F39C12', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C'];

export default function EpisodeCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!fontsLoaded) return;

    // Generate confetti
    const pieces: ConfettiPiece[] = [];

    // From top
    for (let i = 0; i < 80; i++) {
      pieces.push({
        id: i,
        x: Math.random() * screenWidth,
        y: -20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)] as any,
        size: Math.random() * 8 + 4,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * 3 + 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // From bottom
    for (let i = 80; i < 140; i++) {
      pieces.push({
        id: i,
        x: Math.random() * screenWidth,
        y: screenHeight + 20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)] as any,
        size: Math.random() * 8 + 4,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: -(Math.random() * 8 + 5),
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    setConfetti(pieces);

    // Animate confetti
    const animate = () => {
      setConfetti((prevConfetti) =>
        prevConfetti
          .map((piece) => ({
            ...piece,
            x: piece.x + piece.velocityX,
            y: piece.y + piece.velocityY,
            rotation: piece.rotation + piece.rotationSpeed,
            velocityY: piece.id < 80 ? piece.velocityY + 0.1 : piece.velocityY + 0.15,
          }))
          .filter(
            (piece) =>
              piece.y < screenHeight + 100 &&
              piece.y > -100 &&
              piece.x < screenWidth + 100 &&
              piece.x > -100,
          ),
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Show options after 2 seconds
    const optionsTimer = setTimeout(() => {
      setShowOptions(true);
    }, 2000);

    // Clean up confetti after 5 seconds
    const cleanupTimeout = setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setConfetti([]);
    }, 5000);

    return () => {
      clearTimeout(optionsTimer);
      clearTimeout(cleanupTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fontsLoaded]);

  const renderShape = (piece: ConfettiPiece) => {
    const style = {
      position: 'absolute' as const,
      left: piece.x,
      top: piece.y,
      width: piece.size,
      height: piece.size,
      backgroundColor: piece.color,
      transform: [{ rotate: `${piece.rotation}deg` }],
    };

    switch (piece.shape) {
      case 'circle':
        return <View key={piece.id} style={[style, { borderRadius: piece.size / 2 }]} />;
      case 'triangle':
        return (
          <View
            key={piece.id}
            style={{
              position: 'absolute',
              left: piece.x,
              top: piece.y,
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderStyle: 'solid',
              borderLeftWidth: piece.size / 2,
              borderRightWidth: piece.size / 2,
              borderBottomWidth: piece.size,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: piece.color,
              transform: [{ rotate: `${piece.rotation}deg` }],
            }}
          />
        );
      default:
        return <View key={piece.id} style={style} />;
    }
  };

  const handleListenToAnother = () => {
    // Navigate to the pick another screen
    router.push('/pick-another');
  };

  const handleSeeDiscussion = () => {
    // Navigate back to player with comments tab
    router.back();
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.title, { fontFamily: 'PaytoneOne_400Regular' }]}>
          You did it!
        </Text>
        <Text style={[styles.subtitle, { fontFamily: 'PaytoneOne_400Regular' }]}>
          Episode complete
        </Text>

        {showOptions && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={handleListenToAnother}>
              <Ionicons name="headset" size={24} color="#FFFFFF" />
              <Text style={styles.optionButtonText}>Listen to another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.optionButtonSecondary]}
              onPress={handleSeeDiscussion}
            >
              <Ionicons name="chatbubbles" size={24} color="#E05F4E" />
              <Text style={[styles.optionButtonText, styles.optionButtonTextSecondary]}>
                See discussion
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {confetti.map(renderShape)}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    color: '#E05F4E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#403837',
    textAlign: 'center',
    marginBottom: 60,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#E05F4E',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  optionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E05F4E',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionButtonTextSecondary: {
    color: '#E05F4E',
  },
});