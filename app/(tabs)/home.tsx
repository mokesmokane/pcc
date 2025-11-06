import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import InPersonClubSection from '../components/InPersonClubSection';
import PoddleboxSection from '../components/PoddleboxSection';
import RestOfLineupSection from '../components/RestOfLineupSection';
import { DiscussionFlow } from '../components/DiscussionFlow';
import { PollReviewAllResults } from '../components/PollReviewAllResults';
import { useWeeklySelections, type WeeklyPodcast } from '@/contexts/WeeklySelectionsContext';
import { useMultipleEpisodeProgress } from '@/hooks/queries/usePodcastMetadata';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentPodcastStore } from '../stores/currentPodcastStore';
import { styles } from '../styles/home.styles';

const CURRENT_PODCAST_KEY = '@current_podcast_id';


export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { userChoices, userChoice, selections, selectEpisode } = useWeeklySelections();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { currentPodcastId, setCurrentPodcastId } = useCurrentPodcastStore();

  // Get all episode IDs for batch progress loading
  const userChoiceIds = userChoices.map(p => p.id);
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

  // Refresh current podcast when screen comes into focus
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
    }, [userChoices, setCurrentPodcastId])
  );

  // Reorder podcasts with current one first
  const orderedUserChoices = currentPodcastId
    ? [
        ...userChoices.filter(p => p.id === currentPodcastId),
        ...userChoices.filter(p => p.id !== currentPodcastId)
      ]
    : userChoices;

  // Get all podcasts except the current one
  const remainingPodcasts = Array.from(selections.values()).filter(
    podcast => podcast.id !== currentPodcastId
  );

  // Check if a podcast is already joined by the user
  const isJoined = (podcastId: string) => {
    return userChoices.some(choice => choice.id === podcastId);
  };

  // Get progress for an episode from the React Query cache
  const getProgressForEpisode = (episodeId: string): number => {
    if (!progressMapData) return 0;
    const progress = progressMapData.get(episodeId);
    return progress?.progressPercentage || 0;
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

    router.push({
      pathname: '/player',
      params: {
        trackId: podcast.id,
        trackTitle: podcast.title,
        trackArtist: podcast.source,
        trackArtwork: podcast.image || '',
        trackAudioUrl: podcast.audioUrl,
        trackDescription: podcast.description,
        trackDuration: progress?.totalDuration?.toString() || podcast.duration?.toString() || '0',
        trackPosition: progress?.currentPosition?.toString() || '0',
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

    router.push({
      pathname: '/player',
      params: {
        trackId: podcast.id,
        trackTitle: podcast.title,
        trackArtist: podcast.source,
        trackArtwork: podcast.image || '',
        trackAudioUrl: podcast.audioUrl,
        trackDescription: podcast.description,
        trackDuration: progress?.totalDuration?.toString() || podcast.duration?.toString() || '0',
        trackPosition: progress?.currentPosition?.toString() || '0',
      },
    });
  };

  const handleUnlockWildCard = () => {
    // Navigate to wild card screen or show modal
    console.log('Unlock wild card pressed');
    // TODO: Implement wild card unlock functionality
  };

  const handlePollPress = () => {
      setShowDiscussionFlow(true);
  };

  const handlePollReviewPress = () => {
    setShowPollReview(true);
  };

  const handlePoddleboxPress = () => {
    // Rick roll for the time being
    wasRickRolled.current = true;
    Linking.openURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
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
        <CurrentPodcastSection
          podcasts={orderedUserChoices}
          onPodcastPress={handlePodcastPress}
          getProgressForEpisode={getProgressForEpisode}
          onPollCompletePress={handlePollPress}
          onPollReviewPress={handlePollReviewPress}
          onPoddleboxPress={handlePoddleboxPress}
        />
        </View>
        <View style={styles.sectionWrapper}>
        <RestOfLineupSection
          podcasts={remainingPodcasts}
          onJoinPress={handleJoinPodcast}
          onUnlockWildCard={handleUnlockWildCard}
          isJoined={isJoined}
          getProgressForEpisode={getProgressForEpisode}
        />
        </View>
        <View style={styles.sectionWrapper}>
        <InPersonClubSection />
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
