import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMembers } from '../contexts/MembersContext';
import type { WeeklyPodcast } from '../contexts/WeeklySelectionsContext';
import { usePollProgress } from '../hooks/queries/useDiscussion';
import { useCurrentPodcastStore } from '../stores/currentPodcastStore';

interface CurrentPodcastSectionProps {
  podcasts: WeeklyPodcast[];
  onPodcastPress?: (podcast: WeeklyPodcast) => void;
  getProgressForEpisode?: (episodeId: string) => number;
  onPollCompletePress?: () => void;
  onPollReviewPress?: () => void;
  onPoddleboxPress?: () => void;
}

interface ActionItem {
  number: number;
  title: string;
  subtitle: string;
  showProgress?: boolean;
  progress?: number;
}

export default function CurrentPodcastSection({
  podcasts,
  onPodcastPress,
  getProgressForEpisode,
  onPollCompletePress,
  onPollReviewPress,
  onPoddleboxPress,
}: CurrentPodcastSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { stats } = useMembers();

  // Get current podcast ID from store
  const currentPodcastId = useCurrentPodcastStore(state => state.currentPodcastId);

  // Determine which podcast to show (current if set, otherwise first in list)
  const podcast = currentPodcastId && podcasts.length > 0
    ? podcasts.find(p => p.id === currentPodcastId) || podcasts[0]
    : podcasts[0];

  // Fetch poll progress for this podcast - must be called before any conditional returns!
  const { data: pollProgressData } = usePollProgress(podcast?.id || '');

  // Early return AFTER all hooks are called
  if (!fontsLoaded || podcasts.length === 0) {
    return null;
  }

  const pollProgress = pollProgressData?.progress || 0;
  const isPollCompleted = pollProgressData?.isCompleted || false;
  const progressPercentage = getProgressForEpisode?.(podcast.id) || 0;
  const totalMembers = stats.totalMembers || podcast.clubMembers || 0;

  const actionItems: ActionItem[] = [
    {
      number: 1,
      title: 'Finish the podcast',
      subtitle: 'You got this!',
      showProgress: true,
      progress: progressPercentage,
    },
    {
      number: 2,
      title: isPollCompleted ? 'Review your poll answers' : 'Complete the poll',
      subtitle: isPollCompleted ? 'See what others think' : 'We wanna know your thoughts',
      showProgress: true,
      progress: pollProgress,
    },
    {
      number: 3,
      title: 'Watch the Poddlebox',
      subtitle: 'Our curators discuss the podcast',
    },
  ];

  const handlePress = () => {
    if (onPodcastPress) {
      onPodcastPress(podcast);
    }
  };

  const handleActionItemPress = (itemNumber: number) => {
    switch (itemNumber) {
      case 1:
        // Finish podcast - navigate to player
        if (onPodcastPress) {
          onPodcastPress(podcast);
        }
        break;
      case 2:
        // Complete the poll - show discussion flow
        if (isPollCompleted) {
          if (onPollReviewPress) {
            onPollReviewPress();
          }
        } else {
          if (onPollCompletePress) {
            onPollCompletePress();
          }
        }
        break;
      case 3:
        // Watch Poddlebox
        if (onPoddleboxPress) {
          onPoddleboxPress();
        }
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Podcast Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: podcast.image }}
            style={styles.podcastImage}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {podcast.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {podcast.source || podcast.episode}
            </Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>
                🔥 {totalMembers} people in the club
              </Text>
            </View>
          </View>
        </View>

        {/* Resume Button */}
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.resumeButtonText}>Continue Listening</Text>
        </TouchableOpacity>

        <View style={styles.separator} />
        {/* Action Items */}
        <View style={styles.actionItems}>
          {actionItems.map((item) => (
            <React.Fragment key={item.number}>
              <TouchableOpacity
                style={styles.actionItem}
                activeOpacity={0.7}
                onPress={() => handleActionItemPress(item.number)}
              >
                <View style={styles.actionItemContent}>
                  <View style={styles.actionItemNumber}>
                    <Text style={styles.actionItemNumberText}>{item.number}</Text>
                  </View>
                  <View style={styles.actionItemText}>
                    <Text style={styles.actionItemTitle}>{item.title}</Text>
                    <Text style={styles.actionItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.actionItemChevron}>›</Text>
                </View>
                {item.showProgress && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${item.progress || 0}%` }]} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>

            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  card: {
    backgroundColor: '#E8DFD4',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  podcastImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2826',
    marginBottom: 4,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C2826',
    marginBottom: 6,
  },
  memberBadge: {
    alignSelf: 'flex-start',
  },
  memberBadgeText: {
    fontSize: 12,
    color: '#2C2826',
    fontWeight: '600',
  },
  resumeButton: {
    backgroundColor: '#E05F4E',
    borderRadius: 36,
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionItems: {
    // Container for all action items
  },
  actionItem: {
    paddingVertical: 8,
  },
  actionItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(44, 40, 38, 0.1)',
    marginBottom: 8,
  },
  actionItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 24,
    backgroundColor: '#E05F4E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionItemNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionItemText: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2826',
    marginBottom: 2,
  },
  actionItemSubtitle: {
    fontSize: 13,
    color: '#6B5E57',
  },
  actionItemChevron: {
    fontSize: 48,
    color: '#2C2826',
    fontWeight: '400',
    lineHeight: 32,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E8DFD4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
    borderRadius: 3,
  },
});