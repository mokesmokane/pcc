import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CurrentPodcastSection from '../components/CurrentPodcastSection';
import InPersonClubSection from '../components/InPersonClubSection';
import PoddleboxSection from '../components/PoddleboxSection';
import { useWeeklySelections } from '@/contexts/WeeklySelectionsContext';
import { usePodcastMetadata } from '../contexts/PodcastMetadataContext';
import { styles } from '../styles/home.styles';


export default function HomeScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { userChoices, userChoice } = useWeeklySelections();
  const { getEpisodeProgress } = usePodcastMetadata();
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  // Load progress for all user choices
  useEffect(() => {
    const loadProgress = async () => {
      const newProgressMap: Record<string, number> = {};
      for (const podcast of userChoices) {
        const progress = await getEpisodeProgress(podcast.id);
        if (progress) {
          newProgressMap[podcast.id] = progress.progressPercentage;
        }
      }
      setProgressMap(newProgressMap);
    };

    loadProgress();

    // Refresh every 5 seconds to get updated progress if playing
    const interval = setInterval(loadProgress, 5000);

    return () => clearInterval(interval);
  }, [userChoices, getEpisodeProgress]);

  const getProgressForEpisode = (episodeId: string): number => {
    return progressMap[episodeId] || 0;
  };

  // Subscribe to progress updates
  // useEffect(() => {
  //   if (!user || !userChoice?.id) return;

  //   const subscription = supabase
  //     .channel('progress_updates')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'user_episode_progress',
  //         filter: `user_id=eq.${user.id},episode_id=eq.${userChoice.id}`,
  //       },
  //       (payload) => {
  //         if (payload.new && 'percentage_complete' in payload.new) {
  //           setProgressPercentage(payload.new.percentage_complete as number);
  //         }
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, [user, userChoice?.id]);

  // const fetchUserChoice = async () => {
  //   try {
  //     if (!user) return;

  //     const weekStart = new Date();
  //     weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  //     weekStart.setHours(0, 0, 0, 0);

  //     // Get user's choice for this week
  //     const { data: choice } = await supabase
  //       .from('user_weekly_choices')
  //       .select(`
  //         episode_id,
  //         podcast_episodes (
  //           id,
  //           episode_title,
  //           podcast_title,
  //           artwork_url,
  //           audio_url,
  //           episode_description
  //         )
  //       `)
  //       .eq('user_id', user.id)
  //       .eq('week_start', weekStart.toISOString().split('T')[0])
  //       .single();

  //     if (choice && choice.podcast_episodes) {

  //       // Get member count for this episode
  //       const { data: members } = await supabase
  //         .from('user_weekly_choices')
  //         .select('user_id')
  //         .eq('episode_id', choice.episode_id)
  //         .eq('week_start', weekStart.toISOString().split('T')[0]);

  //       if (members) {
  //         setMemberCount(members.length);
  //       }

  //       // Fetch user's progress for this episode
  //       const { data: progress } = await supabase
  //         .from('user_episode_progress')
  //         .select('percentage_complete')
  //         .eq('user_id', user.id)
  //         .eq('episode_id', choice.episode_id)
  //         .single();

  //       if (progress) {
  //         setProgressPercentage(progress.percentage_complete || 0);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error fetching user choice:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handlePodcastPress = async (podcast: any) => {
    // Fetch progress data for this episode
    const progress = await getEpisodeProgress(podcast.id);

    router.push({
      pathname: '/player',
      params: {
        trackId: podcast.id,
        trackTitle: podcast.title,
        trackArtist: podcast.source,
        trackArtwork: podcast.image,
        trackAudioUrl: podcast.audioUrl,
        trackDescription: podcast.description,
        trackDuration: progress?.totalDuration?.toString() || podcast.duration?.toString() || '0',
        trackPosition: progress?.currentPosition?.toString() || '0',
      },
    });
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
    const WeeklySelection = require('../weekly-selection').default;
    return <WeeklySelection />;
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionWrapper}>
        <PoddleboxSection />
        </View>
        <View style={styles.sectionWrapper}>
        <CurrentPodcastSection
          podcasts={userChoices}
          onPodcastPress={handlePodcastPress}
          getProgressForEpisode={getProgressForEpisode}
        />
        </View>
        <View style={styles.sectionWrapper}>
        <InPersonClubSection />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}