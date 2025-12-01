import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { styles } from './success.styles';

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

// Purple/pink confetti colors
const colors = [
  '#9B59B6', // Purple
  '#8E44AD', // Dark purple
  '#BB8FCE', // Light purple
  '#D7BDE2', // Pale purple
  '#AF7AC5', // Medium purple
  '#A569BD', // Another purple shade
  '#CE93D8', // Light purple pink
  '#BA68C8', // Purple pink
  '#AB47BC', // Deep purple pink
  '#9C27B0', // Purple
];

export default function SuccessScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!fontsLoaded) return;

    console.log('Success screen mounted, starting 5 second timer');
    let isMounted = true;

    // Navigate to onboarding after 5 seconds to enjoy the confetti animation
    const timer = setTimeout(() => {
      if (isMounted) {
        console.log('Success screen timer completed, navigating to onboarding');
        router.replace('/onboarding-struggles');
      }
    }, 5000);

    // Generate confetti pieces from multiple directions
    const pieces: ConfettiPiece[] = [];

    // Blast force configuration
    const topBlastForce = 3;
    const sideBlastForce = 6;

    // From top (falling down)
    for (let i = 0; i < 100; i++) {
      pieces.push({
        id: i,
        x: Math.random() * screenWidth,
        y: -20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)] as 'rectangle' | 'triangle' | 'circle',
        size: Math.random() * 8 + 4,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: Math.random() * topBlastForce + 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // From bottom (shooting up)
    const bottomBlastForce = 8; // Increased blast force
    for (let i = 100; i < 175; i++) {
      pieces.push({
        id: i,
        x: Math.random() * screenWidth,
        y: screenHeight + 20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)] as 'rectangle' | 'triangle' | 'circle',
        size: Math.random() * 8 + 4,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: -(Math.random() * bottomBlastForce + 5), // Much stronger upward force
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // From left side (shooting right)
    for (let i = 175; i < 225; i++) {
      pieces.push({
        id: i,
        x: -20,
        y: Math.random() * screenHeight,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)] as 'rectangle' | 'triangle' | 'circle',
        size: Math.random() * 8 + 4,
        velocityX: Math.random() * sideBlastForce + 3, // rightward motion
        velocityY: (Math.random() - 0.5) * 4,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // From right side (shooting left)
    for (let i = 225; i < 275; i++) {
      pieces.push({
        id: i,
        x: screenWidth + 20,
        y: Math.random() * screenHeight,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: ['rectangle', 'triangle', 'circle'][Math.floor(Math.random() * 3)] as 'rectangle' | 'triangle' | 'circle',
        size: Math.random() * 8 + 4,
        velocityX: -(Math.random() * sideBlastForce + 3), // leftward motion
        velocityY: (Math.random() - 0.5) * 4,
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
            // Apply gravity differently based on initial direction
            velocityY:
              piece.id < 100
                ? piece.velocityY + 0.1 // falling pieces get gravity
                : piece.id < 175
                  ? piece.velocityY + 0.15 // upward pieces get stronger gravity
                  : piece.velocityY + 0.05, // side pieces get light gravity
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

    // Clean up confetti after 6 seconds
    const cleanupTimeout = setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setConfetti([]);
    }, 6000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearTimeout(cleanupTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fontsLoaded]); // Removed router from dependencies to prevent re-triggers

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
        <Text style={styles.title}>You&apos;re in!</Text>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.title}>the club</Text>
      </View>

      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {confetti.map(renderShape)}
      </View>
    </SafeAreaView>
  );
}
