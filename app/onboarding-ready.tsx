import React, { useEffect } from 'react';
import {
  Image,
  SafeAreaView,
  View,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useDatabase } from './contexts/DatabaseContext';
import { useAuth } from './contexts/AuthContext';
import { styles } from './styles/onboarding-ready.styles';

export default function OnboardingReadyScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ PaytoneOne_400Regular });
  const { profileRepository } = useDatabase();
  const { user } = useAuth();

  useEffect(() => {
    if (!fontsLoaded) return;

    let isMounted = true;

    // Mark onboarding as complete
    const completeOnboarding = async () => {
      if (user?.id) {
        try {
          await profileRepository.markOnboardingComplete(user.id);
          console.log('Onboarding marked as complete');
        } catch (error) {
          console.error('Failed to mark onboarding complete:', error);
        }
      }
    };

    completeOnboarding();

    // Auto-advance after 4 seconds
    const timer = setTimeout(() => {
      if (isMounted) {
        console.log('Onboarding complete, navigating to home');
        router.replace('/home');
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fontsLoaded, user?.id, profileRepository, router]);

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
        <View style={styles.gifContainer}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../assets/images/ron-swanson-headphones.gif')}
            style={styles.gif}
            resizeMode="cover"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Grab your{'\n'}headphones.</Text>
          <Text style={styles.subtitle}>Here come the pods...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
