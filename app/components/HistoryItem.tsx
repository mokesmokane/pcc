import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AvatarStack } from './AvatarStack';

interface HistoryItemProps {
  podcastTitle: string;
  episodeTitle: string;
  source: string;
  artwork: string;
  peopleInClub: number;
  members?: { id: string; avatar?: string }[];
  progress: number;
  onPress: () => void;
}

export function HistoryItem({
  podcastTitle,
  episodeTitle,
  artwork,
  peopleInClub,
  members,
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

        <View style={styles.avatarStackContainer}>
          <AvatarStack
            members={members || []}
            totalCount={peopleInClub}
            maxDisplay={5}
            size="small"
          />
        </View>

        {/* Progress Bar - only show if progress > 0 */}
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%` },
                  isCompleted && styles.progressFillCompleted
                ]}
              />
            </View>
            <Text style={[styles.progressText, isCompleted && styles.progressTextCompleted]}>
              {isCompleted ? '100% complete' : `${Math.round(progress)}% complete`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
});