import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles/history.styles';
import { HistoryItem } from '../components/HistoryItem';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';

export default function HistoryScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  // Sample history data - replace with actual data
  const historyData = [
    {
      id: '1',
      podcastTitle: 'Chris Voss says Trumps super power is empathy',
      episodeTitle: 'The Daily',
      source: 'The Daily',
      artwork: 'https://i.pravatar.cc/150?img=1',
      peopleInClub: 120,
      progress: 60,
      audioUrl: '#',
      description: 'Episode description',
    },
    {
      id: '2',
      podcastTitle: 'Deep Work',
      episodeTitle: 'Cal Newport',
      source: 'Deep Work',
      artwork: 'https://i.pravatar.cc/150?img=2',
      peopleInClub: 23,
      progress: 100,
      audioUrl: '#',
      description: 'Episode description',
    },
    {
      id: '3',
      podcastTitle: 'Happiness 101',
      episodeTitle: 'Tal Ben Shahar',
      source: 'Happier',
      artwork: 'https://i.pravatar.cc/150?img=3',
      peopleInClub: 34,
      progress: 70,
      audioUrl: '#',
      description: 'Episode description',
    },
    {
      id: '4',
      podcastTitle: 'The Role of Death in Life',
      episodeTitle: 'Philosophy Now',
      source: 'Philosophy Now',
      artwork: 'https://i.pravatar.cc/150?img=4',
      peopleInClub: 11,
      progress: 100,
      audioUrl: '#',
      description: 'Episode description',
    },
  ];

  const handleEpisodePress = (episode: any) => {
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
        {/* September Section */}
        <Text style={styles.dateHeader}>Sep</Text>

        {historyData.slice(0, 2).map(episode => (
          <HistoryItem
            key={episode.id}
            podcastTitle={episode.podcastTitle}
            episodeTitle={episode.episodeTitle}
            source={episode.source}
            artwork={episode.artwork}
            peopleInClub={episode.peopleInClub}
            progress={episode.progress}
            onPress={() => handleEpisodePress(episode)}
          />
        ))}

        {/* August Section */}
        <Text style={styles.dateHeader}>Aug</Text>

        {historyData.slice(2, 4).map(episode => (
          <HistoryItem
            key={episode.id}
            podcastTitle={episode.podcastTitle}
            episodeTitle={episode.episodeTitle}
            source={episode.source}
            artwork={episode.artwork}
            peopleInClub={episode.peopleInClub}
            progress={episode.progress}
            onPress={() => handleEpisodePress(episode)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}