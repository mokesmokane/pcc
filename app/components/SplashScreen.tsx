import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Font from 'expo-font';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    loadFonts();
  }, []);

  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        GrandBold: require('../../assets/fonts/GrandBold.ttf'),
      });
      setFontsLoaded(true);

      // Show splash for a minimum time
      setTimeout(() => {
        onFinish();
      }, 1500);
    } catch (error) {
      console.error('Error loading fonts:', error);
      onFinish();
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.textCream}>POD</Text>
        <Text style={styles.textCream}>CAST</Text>
        <Text style={styles.textWhite}>CLUB</Text>
        <Text style={styles.tagline}>LISTEN. DISCUSS.{'\n'}GROW. TOGETHER.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E05F4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  textCream: {
    fontFamily: 'GrandBold',
    fontSize: 80,
    color: '#E5DFD3',
    lineHeight: 84,
    textAlign: 'center',
  },
  textWhite: {
    fontFamily: 'GrandBold',
    fontSize: 80,
    color: '#FFFFFF',
    lineHeight: 84,
    textAlign: 'center',
    opacity: 0.5,
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'Caveat_400Regular',
    lineHeight: 28,
    color: '#F8F6F3',
    textAlign: 'center',
    marginTop: 24,
  },
});
