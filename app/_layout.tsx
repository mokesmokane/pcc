import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { CommentsProvider } from './contexts/CommentsContext';
import { WeeklySelectionsProvider } from './contexts/WeeklySelectionsContext';
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { Caveat_400Regular, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { TranscriptProvider } from './contexts/TranscriptContext';
import { ChaptersProvider } from './contexts/ChaptersContext';
import { MembersProvider } from './contexts/MembersContext';
import { MeetupsProvider } from './contexts/MeetupsContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { InitialSyncProvider } from './contexts/InitialSyncContext';
import { SplashScreen as CustomSplashScreen } from './components/SplashScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { errorTrackingService } from './services/errorTracking/errorTrackingService';
import { useAudioStoreInitialize, useAudioStoreCleanup } from './stores/audioStore.hooks';
import { useUpdateEpisodeProgress } from './hooks/queries/usePodcastMetadata';
import { setupPlayer } from './services/audio/trackPlayerService';
import TrackPlayer from 'react-native-track-player';
import { useDownloadStore } from './services/download/download.service';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Inner component that has access to progress hooks and router
function AudioStoreInitializer() {
  const initializeAudioStore = useAudioStoreInitialize();
  const cleanupAudioStore = useAudioStoreCleanup();
  const router = useRouter();
  const updateProgressMutation = useUpdateEpisodeProgress();

  useEffect(() => {
    // Initialize the audio store with callbacks
    initializeAudioStore({
      onProgressUpdate: (episodeId: string, position: number, duration: number) => {
        updateProgressMutation.mutate({ episodeId, position, duration });
      },
      onEpisodeComplete: () => {
        router.push('/episode-complete');
      },
    });

    return () => {
      cleanupAudioStore();
    };
  }, [initializeAudioStore, cleanupAudioStore, updateProgressMutation, router]);

  return null;
}

// Initialize Zustand stores on app start
// Note: Subscriptions store uses persist middleware and auto-hydrates from AsyncStorage
// Downloads store needs explicit loading from AsyncStorage
function StoreInitializer() {
  useEffect(() => {
    // Load downloaded episodes from AsyncStorage into the store
    useDownloadStore.getState().loadDownloadedEpisodes();
  }, []);

  return null;
}

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

    // Initialize Track Player
    setupPlayer().catch(console.error);

    // Initialize error tracking service
    errorTrackingService.initialize().catch(console.error);

    return () => {
      TrackPlayer.reset().catch(console.error);
      errorTrackingService.stopBackgroundSync();
    };
  }, []);

  if (!fontsLoaded || showCustomSplash) {
    if (!fontsLoaded) {
      return null;
    }
    return <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DatabaseProvider>
            <AuthProvider>
              <InitialSyncProvider>
                <NotificationsProvider>
                  <CommentsProvider>
                    <MembersProvider>
                      <MeetupsProvider>
                        {/* Initialize audio store with React Query hooks */}
                        <AudioStoreInitializer />
                        {/* Initialize Zustand stores (subscriptions, downloads) */}
                        <StoreInitializer />
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
                                  <Stack.Screen name="have-your-say" options={{ headerShown: false }} />
                                  <Stack.Screen name="onboarding-struggles" options={{ headerShown: false }} />
                                  <Stack.Screen name="onboarding-interests" options={{ headerShown: false }} />
                                  <Stack.Screen name="onboarding-ready" options={{ headerShown: false }} />
                                  <Stack.Screen name="full-history" options={{ headerShown: false }} />
                                </Stack>
                            </WeeklySelectionsProvider>
                          </TranscriptProvider>
                        </ChaptersProvider>
                      </MeetupsProvider>
                    </MembersProvider>
                  </CommentsProvider>
                </NotificationsProvider>
              </InitialSyncProvider>
            </AuthProvider>
          </DatabaseProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}