import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreateClubScreen() {
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/images/puppet.gif')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Create your own podcast club.</Text>
        <Text style={styles.subtitle}>
          Choose your own podcasts or play your own. Coming soon!
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleClose}>
          <Text style={styles.buttonText}>Come back later</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E05F4E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  image: {
    width: Dimensions.get('window').width - 48,
    height: Dimensions.get('window').width - 48,
    borderRadius: 12,
  },
  comingSoonBadge: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#403837',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  button: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
