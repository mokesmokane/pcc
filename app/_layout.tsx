import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { CommentsProvider } from './contexts/CommentsContext';
import { WeeklySelectionsProvider } from './contexts/WeeklySelectionsContext';
import { AudioProvider } from './contexts/AudioContextExpo';
import { PodcastMetadataProvider } from './contexts/PodcastMetadataContext';
import { useEffect, useState } from 'react';
import { playbackService } from './services/playback/playback.service';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { TranscriptProvider } from './contexts/TranscriptContext';
import { ChaptersProvider } from './contexts/ChaptersContext';
import { MembersProvider } from './contexts/MembersContext';
import { MeetupsProvider } from './contexts/MeetupsContext';
import { InitialSyncProvider } from './contexts/InitialSyncContext';
import { SplashScreen as CustomSplashScreen } from './components/SplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          PaytoneOne_400Regular,
          Caveat_400Regular,
          Caveat_700Bold,
          GrandBold: require('../assets/fonts/GrandBold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue anyway
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    loadFonts();

    // Initialize playback service
    playbackService.initialize().catch(console.error);

    return () => {
      playbackService.destroy().catch(console.error);
    };
  }, []);

  if (!fontsLoaded || showCustomSplash) {
    if (!fontsLoaded) {
      return null;
    }
    return <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider>
        <AuthProvider>
          <InitialSyncProvider>
            <ProfileProvider>
              <CommentsProvider>
                <MembersProvider>
                  <MeetupsProvider>
                    <PodcastMetadataProvider>
                      <AudioProvider>
                        <ChaptersProvider>
                          <TranscriptProvider>
                            <WeeklySelectionsProvider>
                      <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(traditional)" options={{ headerShown: false }} />
                    <Stack.Screen name="admin" options={{ headerShown: false }} />
                    <Stack.Screen name="splash-preview" options={{ headerShown: false }} />
                    <Stack.Screen name="podcast-details" options={{ headerShown: false }} />
                    <Stack.Screen name="player" options={{ headerShown: false }} />
                    <Stack.Screen name="profile" options={{ headerShown: false }} />
                    <Stack.Screen name="verify-phone" options={{ headerShown: false }} />
                    <Stack.Screen name="success" options={{ headerShown: false }} />
                    <Stack.Screen name="episode-complete" options={{ headerShown: false }} />
                    <Stack.Screen name="pick-another" options={{ headerShown: false }} />
                    </Stack>
                            </WeeklySelectionsProvider>
                          </TranscriptProvider>
                        </ChaptersProvider>
                      </AudioProvider>
                    </PodcastMetadataProvider>
                  </MeetupsProvider>
                </MembersProvider>
              </CommentsProvider>
            </ProfileProvider>
          </InitialSyncProvider>
        </AuthProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}