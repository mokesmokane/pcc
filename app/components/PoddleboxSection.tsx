import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';

export default function PoddleboxSection() {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  const handleWatchEpisode = () => {
    // Replace with actual video URL
    Linking.openURL('https://youtube.com');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.videoCard} onPress={handleWatchEpisode}>
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400' }}
            style={styles.thumbnail}
          />
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Poddlebox</Text>
          <Text style={styles.description}>
            Watch our curators discuss the podcast
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // marginBottom: 24,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    height: 110,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 120,
    height: 90,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 95, 78, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#403837',
    lineHeight: 18,
  },
});