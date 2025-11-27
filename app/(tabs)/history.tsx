import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles/history.styles';
import { HistoryItem } from '../components/HistoryItem';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { WeeklySelectionRepository } from '../data/repositories/weekly-selection.repository';
import { ProgressRepository } from '../data/repositories/progress.repository';
import { MembersRepository } from '../data/repositories/members.repository';

interface MemberAvatar {
  id: string;
  avatar?: string;
}

interface HistoryEpisode {
  id: string;
  podcastTitle: string;
  episodeTitle: string;
  source: string;
  artwork: string;
  peopleInClub: number;
  members: MemberAvatar[];
  progress: number;
  audioUrl: string;
  description: string;
  chosenAt: Date;
  monthYear: string;
}

interface GroupedHistory {
  [monthYear: string]: HistoryEpisode[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { database } = useDatabase();
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<GroupedHistory>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!database || !user) {
        setLoading(false);
        return;
      }

      try {
        const weeklySelectionRepo = new WeeklySelectionRepository(database);
        const progressRepo = new ProgressRepository(database);
        const membersRepo = new MembersRepository(database);

        // Fetch all user weekly choices
        const choices = await weeklySelectionRepo.getAllUserWeeklyChoices(user.id);

        // Process each choice to get progress and member count
        const episodesWithProgress = await Promise.all(
          choices.map(async (choice) => {
            // Get progress for this episode
            const progress = await progressRepo.getProgress(user.id, choice.episodeId);
            const progressPercentage = progress && progress.totalDuration > 0
              ? (progress.currentPosition / progress.totalDuration) * 100
              : 0;

            // Get member count for this episode
            const memberCount = await weeklySelectionRepo.getEpisodeMemberCount(choice.episodeId);

            // Get members for avatar stack
            const episodeMembers = await membersRepo.getEpisodeMembers(choice.episodeId);
            const memberAvatars: MemberAvatar[] = episodeMembers.map(m => ({
              id: m.userId,
              avatar: m.avatarUrl,
            }));

            // Format month/year for grouping
            const date = new Date(choice.chosenAt);
            const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            return {
              id: choice.episodeId,
              podcastTitle: choice.episodeTitle || 'Unknown Episode',
              episodeTitle: choice.podcastTitle || 'Unknown Podcast',
              source: choice.podcastTitle || 'Unknown Podcast',
              artwork: choice.artworkUrl || 'https://via.placeholder.com/150',
              peopleInClub: memberCount,
              members: memberAvatars,
              progress: Math.round(progressPercentage),
              audioUrl: choice.audioUrl || '',
              description: choice.description || '',
              chosenAt: new Date(choice.chosenAt),
              monthYear,
            };
          })
        );

        // Filter out episodes with unknown/missing data
        const validEpisodes = episodesWithProgress.filter(
          episode => episode.podcastTitle !== 'Unknown Episode' &&
                     episode.episodeTitle !== 'Unknown Podcast'
        );

        // Group by month/year
        const grouped = validEpisodes.reduce<GroupedHistory>((acc, episode) => {
          if (!acc[episode.monthYear]) {
            acc[episode.monthYear] = [];
          }
          acc[episode.monthYear].push(episode);
          return acc;
        }, {});

        setHistoryData(grouped);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [database, user]);

  const handleEpisodePress = (episode: { id: string; episodeTitle: string; source: string; artwork: string; audioUrl: string; description: string }) => {
    router.push({
      pathname: '/player',
      params: {
        trackId: episode.id,
        trackTitle: episode.episodeTitle,
        trackArtist: episode.source,
        trackArtwork: episode.artwork,
        trackAudioUrl: episode.audioUrl,
        trackDescription: episode.description,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.titleSection}>
          <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>History</Text>
          <Text style={styles.subtitle}>Your podcasts & clubs</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </SafeAreaView>
    );
  }

  // Sort months in descending order (most recent first)
  const sortedMonths = Object.keys(historyData).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>History</Text>
        <Text style={styles.subtitle}>Your podcasts & clubs</Text>
      </View>

      {/* Date Sections */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedMonths.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#8B8680', textAlign: 'center' }}>
              No history yet. Choose your first podcast to get started!
            </Text>
          </View>
        ) : (
          sortedMonths.map(monthYear => (
            <React.Fragment key={monthYear}>
              <Text style={styles.dateHeader}>{monthYear}</Text>
              {historyData[monthYear]
                .sort((a, b) => b.chosenAt.getTime() - a.chosenAt.getTime())
                .map(episode => (
                  <HistoryItem
                    key={episode.id}
                    podcastTitle={episode.podcastTitle}
                    episodeTitle={episode.episodeTitle}
                    source={episode.source}
                    artwork={episode.artwork}
                    peopleInClub={episode.peopleInClub}
                    members={episode.members}
                    progress={episode.progress}
                    onPress={() => handleEpisodePress(episode)}
                  />
                ))}
            </React.Fragment>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}