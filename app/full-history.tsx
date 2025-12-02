import React from 'react';
import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryItem } from './components/HistoryItem';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryData } from './hooks/useHistoryData';

export default function FullHistoryScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { historyData, loading } = useHistoryData();

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

  // Sort months in descending order (most recent first)
  const sortedMonths = Object.keys(historyData).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#403837" />
          </TouchableOpacity>
          <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>History</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#403837" />
        </TouchableOpacity>
        <Text style={[styles.title, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]}>History</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle}>Your podcasts & clubs</Text>

      {/* Date Sections */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedMonths.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#8B8680" />
            <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#E05F4E',
  },
  subtitle: {
    fontSize: 14,
    color: '#403837',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#403837',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F4F1ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8B8680',
    textAlign: 'center',
    marginTop: 16,
  },
});
