import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

// Screens
import OnboardingScreen from './app/screens/OnboardingScreen';
import HomeScreen from './app/screens/HomeScreen';
import PodcastScreen from './app/screens/PodcastScreen';
import PlayerScreen from './app/screens/PlayerScreen';
import AuthScreen from './app/screens/AuthScreen';

// Services
import { playbackService } from './app/services/playback/playback.service';
import { useAuthStore } from './app/services/auth/auth.service';

// Types
export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Podcast: { podcastId: string };
  Player: undefined;
  Auth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

export default function App() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Check onboarding status
    checkOnboardingStatus();

    // Initialize playback service
    playbackService.initialize().catch(console.error);

    return () => {
      playbackService.destroy().catch(console.error);
    };
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await SecureStore.getItemAsync('hasCompletedOnboarding');
      setHasCompletedOnboarding(value === 'true');
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (isLoading || checkingOnboarding) {
    // TODO: Add proper splash screen
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            {!hasCompletedOnboarding ? (
              // Show onboarding for first-time users
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
            ) : !isAuthenticated ? (
              // Show auth screen if not authenticated
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                options={{ headerShown: false }}
              />
            ) : (
              // Main app screens for authenticated users
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ title: 'Podcast Club' }}
                />
                <Stack.Screen
                  name="Podcast"
                  component={PodcastScreen}
                  options={{ title: 'Podcast' }}
                />
                <Stack.Screen
                  name="Player"
                  component={PlayerScreen}
                  options={{
                    presentation: 'modal',
                    title: 'Now Playing',
                  }}
                />
              </>
            )}
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}