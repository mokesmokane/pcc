import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { WeeklyPodcast } from '../contexts/WeeklySelectionsContext';
import { AvatarStack } from './AvatarStack';

interface EpisodeProgressInfo {
  progressPercentage: number;
  completed: boolean;
}

interface RestOfLineupSectionProps {
  podcasts: WeeklyPodcast[];
  onJoinPress?: (podcast: WeeklyPodcast) => void;
  onUnlockWildCard?: () => void;
  isJoined: (podcastId: string) => boolean;
  getProgressForEpisode?: (episodeId: string) => EpisodeProgressInfo;
  getMembersForEpisode?: (episodeId: string) => { id: string; avatar?: string }[];
}

export default function RestOfLineupSection({
  podcasts,
  onJoinPress,
  isJoined,
  getProgressForEpisode,
  getMembersForEpisode,
}: RestOfLineupSectionProps) {
  if (podcasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>This week's other clubs</Text>

      {podcasts.map((podcast) => {
        const joined = isJoined(podcast.id);
        const progressInfo = joined ? getProgressForEpisode?.(podcast.id) : null;
        const isCompleted = progressInfo?.completed || false;
        // Show 100% if completed, even when re-listening
        const progress = isCompleted ? 100 : (progressInfo?.progressPercentage || 0);
        const members = getMembersForEpisode?.(podcast.id) || [];
        const memberCount = podcast.clubMembers || members.length;

        return (
          <TouchableOpacity
            key={podcast.id}
            style={styles.itemContainer}
            onPress={() => onJoinPress?.(podcast)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: podcast.image }} style={styles.artwork} />

            <View style={styles.content}>
              <Text style={styles.podcastTitle} numberOfLines={2}>
                {podcast.source}
              </Text>
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {podcast.title}
              </Text>

              <View style={styles.avatarStackContainer}>
                <AvatarStack
                  members={members}
                  totalCount={memberCount}
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
      })}
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
});
