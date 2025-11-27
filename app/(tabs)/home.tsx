import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CurrentPodcastSection from '../components/CurrentPodcastSection';
import RestOfLineupSection from '../components/RestOfLineupSection';
import { DiscussionFlow } from '../components/DiscussionFlow';
import { PollReviewAllResults } from '../components/PollReviewAllResults';
import { useWeeklySelections, type WeeklyPodcast } from '@/contexts/WeeklySelectionsContext';
import { useMultipleEpisodeProgress } from '@/hooks/queries/usePodcastMetadata';
import { useCurrentProfile } from '../hooks/queries/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import { useMeetups } from '../contexts/MeetupsContext';
import { useCurrentPodcastStore } from '../stores/currentPodcastStore';
import { styles } from '../styles/home.styles';

const CURRENT_PODCAST_KEY = '@current_podcast_id';


export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { userChoices, userChoice, selections, selectEpisode } = useWeeklySelections();
  const { data: profile } = useCurrentProfile();
  const { user } = useAuth();
  const { currentPodcastId, setCurrentPodcastId } = useCurrentPodcastStore();
  const queryClient = useQueryClient();
  const { meetups, userStatuses, loadMeetups } = useMeetups();

  // Get all episode IDs for batch progress loading (memoized to prevent infinite loops)
  const userChoiceIds = useMemo(() => userChoices.map(p => p.id), [userChoices]);
  const { data: progressMapData } = useMultipleEpisodeProgress(userChoiceIds);
  const [showDiscussionFlow, setShowDiscussionFlow] = useState(false);
  const [showPollReview, setShowPollReview] = useState(false);
  const [showApologyModal, setShowApologyModal] = useState(false);
  const wasRickRolled = useRef(false);

  // Listen for app state changes to detect when user returns from rick roll
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && wasRickRolled.current) {
        // User came back to the app after being rick rolled
        setShowApologyModal(true);
        wasRickRolled.current = false;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Load the current podcast ID from storage
  useEffect(() => {
    const loadCurrentPodcast = async () => {
      try {
        const storedId = await AsyncStorage.getItem(CURRENT_PODCAST_KEY);
        if (storedId && userChoices.some(p => p.id === storedId)) {
          setCurrentPodcastId(storedId);
        } else if (userChoices.length > 0) {
          // Default to first podcast if nothing stored or stored podcast is not in choices
          setCurrentPodcastId(userChoices[0].id);
        }
      } catch (error) {
        console.error('Error loading current podcast:', error);
        if (userChoices.length > 0) {
          setCurrentPodcastId(userChoices[0].id);
        }
      }
    };
    loadCurrentPodcast();
  }, [userChoices, setCurrentPodcastId]);

  // Load meetups for the current podcast
  useEffect(() => {
    if (currentPodcastId) {
      loadMeetups(currentPodcastId);
    }
  }, [currentPodcastId, loadMeetups]);

  // Refresh current podcast and progress when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshCurrentPodcast = async () => {
        try {
          const storedId = await AsyncStorage.getItem(CURRENT_PODCAST_KEY);
          if (storedId && userChoices.some(p => p.id === storedId)) {
            setCurrentPodcastId(storedId);
          }
        } catch (error) {
          console.error('Error refreshing current podcast:', error);
        }
      };
      refreshCurrentPodcast();

      // Invalidate progress cache to get fresh data after returning from player
      if (user?.id) {
        console.log('🔄 Home screen focused, invalidating progress cache...');
        // Use a more general invalidation that won't cause loops
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === 'podcastMetadata' &&
            query.queryKey[1] === 'multipleProgress',
        });
      }
    }, [userChoices, setCurrentPodcastId, user?.id, queryClient])
  );

  // Reorder podcasts with current one first
  const orderedUserChoices = currentPodcastId
    ? [
        ...userChoices.filter(p => p.id === currentPodcastId),
        ...userChoices.filter(p => p.id !== currentPodcastId)
      ]
    : userChoices;

  // Find a meetup the user has joined for the current podcast
  const joinedMeetup = useMemo(() => {
    return meetups.find(meetup => userStatuses.get(meetup.id) === 'confirmed') || null;
  }, [meetups, userStatuses]);

  // Get all podcasts except the current one
  const remainingPodcasts = Array.from(selections.values()).filter(
    podcast => podcast.id !== currentPodcastId
  );

  // Check if a podcast is already joined by the user
  const isJoined = (podcastId: string) => {
    return userChoices.some(choice => choice.id === podcastId);
  };

  // Get progress for an episode from the React Query cache
  const getProgressForEpisode = (episodeId: string) => {
    if (!progressMapData) return { progressPercentage: 0, completed: false };
    const progress = progressMapData.get(episodeId);
    return {
      progressPercentage: progress?.progressPercentage || 0,
      completed: progress?.completed || false,
    };
  };

  const handlePodcastPress = async (podcast: WeeklyPodcast) => {
    // Save as current podcast
    try {
      await AsyncStorage.setItem(CURRENT_PODCAST_KEY, podcast.id);
      setCurrentPodcastId(podcast.id);
    } catch (error) {
      console.error('Error saving current podcast:', error);
    }

    // Get progress data from React Query cache
    const progress = progressMapData?.get(podcast.id);

    // Reset to beginning if:
    // 1. Episode is marked completed (listen again)
    // 2. Position > duration (corrupted data)
    // 3. Progress percentage >= 95%
    const isCorrupted = progress?.currentPosition && progress?.totalDuration &&
      progress.currentPosition > progress.totalDuration;
    const isCompleted = progress?.completed || (progress?.progressPercentage ?? 0) >= 95 || isCorrupted;
    const startPosition = isCompleted ? 0 : (progress?.currentPosition || 0);

    // Use podcast duration if saved duration seems wrong (< 60 seconds is suspicious for a podcast)
    const duration = (progress?.totalDuration && progress.totalDuration >= 60)
      ? progress.totalDuration
      : podcast.durationSeconds;

    router.push({
      pathname: '/player',
      params: {
        trackId: podcast.id,
        trackTitle: podcast.title,
        trackArtist: podcast.source,
        trackArtwork: podcast.image || '',
        trackAudioUrl: podcast.audioUrl,
        trackDescription: podcast.description,
        trackDuration: duration?.toString() || '0',
        trackPosition: startPosition.toString(),
      },
    });
  };

  const handleJoinPodcast = async (podcast: WeeklyPodcast) => {
    // Check if already joined
    const alreadyJoined = isJoined(podcast.id);

    // If not joined, add to selections first
    if (!alreadyJoined) {
      const success = await selectEpisode(podcast.id);
      if (!success) {
        return; // Don't navigate if join failed
      }
    }

    // Save as current podcast
    try {
      await AsyncStorage.setItem(CURRENT_PODCAST_KEY, podcast.id);
      setCurrentPodcastId(podcast.id);
    } catch (error) {
      console.error('Error saving current podcast:', error);
    }

    // Get progress data from React Query cache
    const progress = progressMapData?.get(podcast.id);

    // Reset to beginning if completed or corrupted
    const isCorrupted = progress?.currentPosition && progress?.totalDuration &&
      progress.currentPosition > progress.totalDuration;
    const isCompleted = progress?.completed || (progress?.progressPercentage ?? 0) >= 95 || isCorrupted;
    const startPosition = isCompleted ? 0 : (progress?.currentPosition || 0);

    // Use podcast duration if saved duration seems wrong
    const duration = (progress?.totalDuration && progress.totalDuration >= 60)
      ? progress.totalDuration
      : podcast.durationSeconds;

    router.push({
      pathname: '/player',
      params: {
        trackId: podcast.id,
        trackTitle: podcast.title,
        trackArtist: podcast.source,
        trackArtwork: podcast.image || '',
        trackAudioUrl: podcast.audioUrl,
        trackDescription: podcast.description,
        trackDuration: duration?.toString() || '0',
        trackPosition: startPosition.toString(),
      },
    });
  };

  // Play a podcast without changing the current selection
  const handlePlayOtherPodcast = async (podcast: WeeklyPodcast) => {
    // Check if already joined
    const alreadyJoined = isJoined(podcast.id);

    // If not joined, add to selections first
    if (!alreadyJoined) {
      const success = await selectEpisode(podcast.id);
      if (!success) {
        return; // Don't navigate if join failed
      }
    }

    // Get progress data from React Query cache
    const progress = progressMapData?.get(podcast.id);

    // Reset to beginning if completed or corrupted
    const isCorrupted = progress?.currentPosition && progress?.totalDuration &&
      progress.currentPosition > progress.totalDuration;
    const isCompleted = progress?.completed || (progress?.progressPercentage ?? 0) >= 95 || isCorrupted;
    const startPosition = isCompleted ? 0 : (progress?.currentPosition || 0);

    // Use podcast duration if saved duration seems wrong
    const duration = (progress?.totalDuration && progress.totalDuration >= 60)
      ? progress.totalDuration
      : podcast.durationSeconds;

    router.push({
      pathname: '/player',
      params: {
        trackId: podcast.id,
        trackTitle: podcast.title,
        trackArtist: podcast.source,
        trackArtwork: podcast.image || '',
        trackAudioUrl: podcast.audioUrl,
        trackDescription: podcast.description,
        trackDuration: duration?.toString() || '0',
        trackPosition: startPosition.toString(),
      },
    });
  };

  const handleUnlockWildCard = () => {
    // Navigate to wild card screen or show modal
    console.log('Unlock wild card pressed');
    // TODO: Implement wild card unlock functionality
  };

  const handlePollPress = () => {
    // Navigate to Have Your Say page instead of showing poll directly
    router.push('/have-your-say');
  };

  const handlePoddleboxPress = () => {
    // Rick roll for the time being
    wasRickRolled.current = true;
    Linking.openURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  };

  const handleMeetInPersonPress = () => {
    // Navigate to events tab
    router.push('/events');
  };

  const handleCloseDiscussion = () => {
    setShowDiscussionFlow(false);
  };

  const handleClosePollReview = () => {
    setShowPollReview(false);
  };

  const handleOpenComments = (topicId: string) => {
    // Navigate to player with comments tab and specific topic
    console.log('Opening comments for topic:', topicId);
    // Close discussion flow
    setShowDiscussionFlow(false);
    // Navigate to player
    if (currentPodcastId) {
      const currentPodcast = orderedUserChoices.find(p => p.id === currentPodcastId);
      if (currentPodcast) {
        handlePodcastPress(currentPodcast);
      }
    }
  };


  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E05F4E" />
      </View>
    );
  }

  // Show weekly selection if user hasn't chosen a podcast
  if (!userChoice) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WeeklySelection = require('../weekly-selection').default;
    return <WeeklySelection />;
  }

  const firstName = profile?.firstName || 'there';

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeTitle}>Hi {firstName}</Text>
          <Text style={styles.welcomeSubtitle}>Here's what's happening this week</Text>
        </View>

        {/* <View style={styles.sectionWrapper}>
        <PoddleboxSection />
        </View> */}
        <View style={styles.sectionWrapper}>
        <Text style={styles.sectionHeading}>Your club</Text>
        <CurrentPodcastSection
          podcasts={orderedUserChoices}
          onPodcastPress={handlePodcastPress}
          getProgressForEpisode={getProgressForEpisode}
          onPollCompletePress={handlePollPress}
          onPoddleboxPress={handlePoddleboxPress}
          onMeetInPersonPress={handleMeetInPersonPress}
          joinedMeetup={joinedMeetup}
        />
        </View>
        <View style={styles.sectionWrapper}>
        <RestOfLineupSection
          podcasts={remainingPodcasts}
          onJoinPress={handlePlayOtherPodcast}
          onUnlockWildCard={handleUnlockWildCard}
          isJoined={isJoined}
          getProgressForEpisode={getProgressForEpisode}
          getMembersForEpisode={() => []}
        />
        </View>
      </ScrollView>

      <DiscussionFlow
        visible={showDiscussionFlow}
        onClose={handleCloseDiscussion}
        episodeId={currentPodcastId || ''}
        onOpenComments={handleOpenComments}
      />

      <PollReviewAllResults
        visible={showPollReview}
        onClose={handleClosePollReview}
        episodeId={currentPodcastId || ''}
        onJoinDiscussion={handleOpenComments}
        onOpenDiscussionFlow={() => setShowDiscussionFlow(true)}
      />

      {/* Rick Roll Apology Modal */}
      <Modal
        visible={showApologyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApologyModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            <Text style={{
              fontSize: 28,
              fontFamily: fontsLoaded ? 'PaytoneOne_400Regular' : undefined,
              color: '#E05F4E',
              textAlign: 'center',
              marginBottom: 16,
            }}>
              We're Sorry! 😅
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#403837',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 8,
            }}>
              The Poddlebox feature is coming soon! In the meantime, we couldnt resist a little rickroll 😬
              {'\n\n'}
              Never gonna give you up! 🎵
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://en.wikipedia.org/wiki/Rickrolling')}
              style={{ marginBottom: 24 }}
            >
              <Text style={{
                fontSize: 13,
                color: '#E05F4E',
                textAlign: 'center',
                textDecorationLine: 'underline',
              }}>
                What is Rickrolling?
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#E05F4E',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              onPress={() => setShowApologyModal(false)}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: '#FFFFFF',
              }}>
                I Forgive You
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
