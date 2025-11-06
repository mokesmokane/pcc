import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { WeeklyPodcast } from '../contexts/WeeklySelectionsContext';

interface RestOfLineupSectionProps {
  podcasts: WeeklyPodcast[];
  onJoinPress?: (podcast: WeeklyPodcast) => void;
  onUnlockWildCard?: () => void;
  isJoined: (podcastId: string) => boolean;
  getProgressForEpisode?: (episodeId: string) => number;
}

export default function RestOfLineupSection({
  podcasts,
  onJoinPress,
  onUnlockWildCard,
  isJoined,
  getProgressForEpisode,
}: RestOfLineupSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });

  if (!fontsLoaded || podcasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>The rest of the lineup</Text>

        {podcasts.map((podcast, index) => {
          const joined = isJoined(podcast.id);
          const progress = joined ? (getProgressForEpisode?.(podcast.id) || 0) : 0;
          return (
            <React.Fragment key={podcast.id}>
              <View style={styles.podcastItemContainer}>
                <View style={styles.podcastItem}>
                  <Image
                    source={{ uri: podcast.image }}
                    style={styles.podcastImage}
                  />
                  <View style={styles.podcastInfo}>
                    <Text style={styles.podcastTitle} numberOfLines={1}>
                      {podcast.title}
                    </Text>
                    <Text style={styles.podcastSubtitle} numberOfLines={1}>
                      {podcast.source}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      joined && styles.continueButton
                    ]}
                    onPress={() => onJoinPress?.(podcast)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.joinButtonText,
                      joined && styles.continueButtonText
                    ]}>
                      {joined ? 'Play' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {joined && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                  </View>
                )}
              </View>
              {index < podcasts.length - 1 && (
                <View style={styles.separator} />
              )}
            </React.Fragment>
          );
        })}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
    marginBottom: 8,
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  podcastItemContainer: {
    paddingVertical: 12,
  },
  podcastItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  podcastImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  podcastInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  podcastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2826',
    marginBottom: 4,
  },
  podcastSubtitle: {
    fontSize: 13,
    color: '#6B5E57',
  },
  joinButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2C2826',
    backgroundColor: '#FFFFFF',
  },
  joinButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2826',
  },
  continueButton: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
  continueButtonText: {
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(44, 40, 38, 0.1)',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0EDE9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
    borderRadius: 2,
  },
  unlockButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2C2826',
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2826',
  },
});
