import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function InPersonClubSection() {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const router = useRouter();

  const handleFindClub = () => {
    // Navigate to events tab
    router.push('/(tabs)/events');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.card} onPress={handleFindClub}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400' }}
            style={styles.image}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Podcast Club</Text>
          <Text style={styles.subtitle}>in-person</Text>
          <Text style={styles.description}>Find a club near you</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: 0,
    // marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    height: 110,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 90,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#403837',
  },
});