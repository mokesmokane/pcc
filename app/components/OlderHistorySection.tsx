import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AvatarStack } from './AvatarStack';
import type { HistoryEpisode } from '../hooks/useHistoryData';

interface OlderHistorySectionProps {
  historyItems: HistoryEpisode[];
  onItemPress: (episode: HistoryEpisode) => void;
  onShowMore: () => void;
  loading?: boolean;
}

export function OlderHistorySection({
  historyItems,
  onItemPress,
  onShowMore,
  loading,
}: OlderHistorySectionProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Older</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#E05F4E" />
        </View>
      </View>
    );
  }

  if (historyItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Older</Text>

      {historyItems.map((episode) => {
        const isCompleted = episode.progress >= 100;

        return (
          <TouchableOpacity
            key={episode.id}
            style={styles.itemContainer}
            onPress={() => onItemPress(episode)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: episode.artwork }} style={styles.artwork} />

            <View style={styles.content}>
              <Text style={styles.podcastTitle} numberOfLines={2}>
                {episode.podcastTitle}
              </Text>
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {episode.episodeTitle}
              </Text>

              <View style={styles.avatarStackContainer}>
                <AvatarStack
                  members={episode.members}
                  totalCount={episode.peopleInClub}
                  maxDisplay={5}
                  size="small"
                />
              </View>

              {episode.progress > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${episode.progress}%` },
                        isCompleted && styles.progressFillCompleted,
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, isCompleted && styles.progressTextCompleted]}>
                    {isCompleted ? '100% complete' : `${Math.round(episode.progress)}% complete`}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={styles.showMoreButton} onPress={onShowMore}>
        <Text style={styles.showMoreText}>Show more</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  artwork: {
    width: 84,
    height: 84,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  podcastTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 2,
  },
  episodeTitle: {
    fontSize: 13,
    color: '#403837',
    marginBottom: 6,
  },
  avatarStackContainer: {
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBackground: {
    width: 80,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
    borderRadius: 3,
  },
  progressFillCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 11,
    color: '#403837',
  },
  progressTextCompleted: {
    color: '#4CAF50',
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
});
