import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HistoryItemProps {
  podcastTitle: string;
  episodeTitle: string;
  source: string;
  artwork: string;
  peopleInClub: number;
  progress: number;
  onPress: () => void;
}

export function HistoryItem({
  podcastTitle,
  episodeTitle,
  _source,
  artwork,
  peopleInClub,
  progress,
  onPress
}: HistoryItemProps) {
  const isCompleted = progress >= 100;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: artwork }} style={styles.artwork} />

      <View style={styles.content}>
        <Text style={styles.podcastTitle} numberOfLines={2}>
          {podcastTitle}
        </Text>
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {episodeTitle}
        </Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>
              🔥 {peopleInClub} {peopleInClub === 1 ? 'person' : 'people'} in the club
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{isCompleted ? '100% complete' : `${Math.round(progress)}% complete`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#E6DED3',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
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
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#403837',
    marginLeft: 4,
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
  progressText: {
    fontSize: 11,
    color: '#403837',
  },
});