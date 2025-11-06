import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SplashPreviewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={32} color="#F8F6F3" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.textCream}>POD</Text>
        <Text style={styles.textCream}>CAST</Text>
        <Text style={styles.textWhite}>CLUB</Text>
        <Text style={styles.tagline}>LISTEN. DISCUSS.{'\n'}GROW. TOGETHER.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E05F4E',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
