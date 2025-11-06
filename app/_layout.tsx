import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { CommentsProvider } from './contexts/CommentsContext';
import { WeeklySelectionsProvider } from './contexts/WeeklySelectionsContext';
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
import { NotificationsProvider } from './contexts/NotificationsContext';
import { InitialSyncProvider } from './contexts/InitialSyncContext';
import { SplashScreen as CustomSplashScreen } from './components/SplashScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { errorTrackingService } from './services/errorTracking/errorTrackingService';
import { useAudioStoreInitialize } from './stores/audioStore.hooks';
import { useUpdateEpisodeProgress, useFlushProgressSync } from './hooks/queries/usePodcastMetadata';
import { useDatabase } from './contexts/DatabaseContext';
import { useAuth } from './contexts/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Inner component that has access to progress hooks and router
function AudioStoreInitializer() {
  const initializeAudioStore = useAudioStoreInitialize();
  const router = useRouter();
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const updateProgressMutation = useUpdateEpisodeProgress();
  const flushProgressMutation = useFlushProgressSync();

  useEffect(() => {
    // Create wrapper functions for the audio store
    const updateEpisodeProgress = async (episodeId: string, position: number, duration: number) => {
      return updateProgressMutation.mutateAsync({ episodeId, position, duration });
    };

    const getEpisodeProgress = async (episodeId: string) => {
      if (!user?.id) return null;
      const progress = await progressRepository.getProgress(user.id, episodeId);
      if (!progress) return null;

      return {
        episodeId: progress.episodeId,
        currentPosition: progress.currentPosition,
        totalDuration: progress.totalDuration,
        completed: progress.completed,
        lastPlayedAt: progress.lastPlayedAt,
        progressPercentage: progress.totalDuration > 0
          ? Math.min(100, Math.round((progress.currentPosition / progress.totalDuration) * 100))
          : 0,
      };
    };

    const flushProgressSync = async () => {
      return flushProgressMutation.mutateAsync();
    };

    // Initialize the audio store with dependencies
    initializeAudioStore(
      updateEpisodeProgress,
      getEpisodeProgress,
      flushProgressSync,
      () => router.push('/episode-complete')
    );
  }, [initializeAudioStore, updateProgressMutation, flushProgressMutation, progressRepository, user?.id, router]);

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

    // Initialize playback service
    playbackService.initialize().catch(console.error);

    // Initialize error tracking service
    errorTrackingService.initialize().catch(console.error);

    return () => {
      playbackService.destroy().catch(console.error);
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