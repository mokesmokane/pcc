import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMembers } from '../contexts/MembersContext';
import type { WeeklyPodcast } from '../contexts/WeeklySelectionsContext';
import { useCurrentPodcastStore } from '../stores/currentPodcastStore';
import { AvatarStack } from './AvatarStack';

interface EpisodeProgressInfo {
  progressPercentage: number;
  completed: boolean;
}

interface JoinedMeetup {
  id: string;
  meetup_date: string;
  meetup_time: string;
  venue: string;
}

interface CurrentPodcastSectionProps {
  podcasts: WeeklyPodcast[];
  onPodcastPress?: (podcast: WeeklyPodcast) => void;
  getProgressForEpisode?: (episodeId: string) => EpisodeProgressInfo;
  onPollCompletePress?: () => void;
  onPoddleboxPress?: () => void;
  onMeetInPersonPress?: () => void;
  joinedMeetup?: JoinedMeetup | null;
}

interface ActionItem {
  number: number;
  title: string;
  subtitle: string;
  secondSubtitle?: string;
  highlight?: string;
  showProgress?: boolean;
  progress?: number;
  completed?: boolean;
  highlighted?: boolean;
}

export default function CurrentPodcastSection({
  podcasts,
  onPodcastPress,
  getProgressForEpisode,
  onPollCompletePress,
  onPoddleboxPress,
  onMeetInPersonPress,
  joinedMeetup,
}: CurrentPodcastSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { stats, members, loadMembers } = useMembers();

  // Get current podcast ID from store
  const currentPodcastId = useCurrentPodcastStore(state => state.currentPodcastId);

  // Determine which podcast to show (current if set, otherwise first in list)
  const podcast = currentPodcastId && podcasts.length > 0
    ? podcasts.find(p => p.id === currentPodcastId) || podcasts[0]
    : podcasts[0];

  // Load members when podcast changes
  useEffect(() => {
    if (podcast?.id) {
      loadMembers(podcast.id);
    }
  }, [podcast?.id, loadMembers]);

  // Early return AFTER all hooks are called
  if (!fontsLoaded || podcasts.length === 0) {
    return null;
  }

  const progressInfo = getProgressForEpisode?.(podcast.id) || { progressPercentage: 0, completed: false };
  const { progressPercentage, completed: isPodcastCompleted } = progressInfo;
  const totalMembers = stats.totalMembers || podcast.clubMembers || 0;

  // Format meetup date/time helper
  const formatMeetupDateTime = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      const [hours, minutes] = timeStr.split(':');
      date.setHours(parseInt(hours), parseInt(minutes));

      const timeFormat = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
      const dateFormat = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      return `${timeFormat}, ${dateFormat}`;
    } catch {
      return `${timeStr}, ${dateStr}`;
    }
  };

  // Calculate days to go
  const getDaysToGo = (dateStr: string) => {
    const meetupDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    meetupDate.setHours(0, 0, 0, 0);
    const diffTime = meetupDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today!';
    if (diffDays === 1) return '1 day to go';
    return `${diffDays} days to go`;
  };

  // Build meetup action item
  const meetInPersonItem: ActionItem = joinedMeetup
    ? {
        number: 4,
        title: 'Meet in person',
        subtitle: formatMeetupDateTime(joinedMeetup.meetup_date, joinedMeetup.meetup_time),
        secondSubtitle: joinedMeetup.venue,
        highlight: getDaysToGo(joinedMeetup.meetup_date),
        highlighted: true,
      }
    : {
        number: 4,
        title: 'Meet in person',
        subtitle: 'Discuss this podcast face-to-face over a coffee, pint or walk',
      };

  const actionItems: ActionItem[] = [
    {
      number: 1,
      title: isPodcastCompleted ? 'Podcast finished' : 'Finish the podcast',
      subtitle: isPodcastCompleted ? "You're an absolute legend" : 'You got this!',
      showProgress: true,
      progress: isPodcastCompleted ? 100 : progressPercentage,
      completed: isPodcastCompleted,
    },
    {
      number: 2,
      title: 'Have your say',
      subtitle: 'Grab the mic (or, you know, the comment box)',
    },
    {
      number: 3,
      title: 'Watch the Poddlebox',
      subtitle: 'Our curators discuss the podcast',
    },
    meetInPersonItem,
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
        // Navigate to Have Your Say hub page
        if (onPollCompletePress) {
          onPollCompletePress();
        }
        break;
      case 3:
        // Watch Poddlebox
        if (onPoddleboxPress) {
          onPoddleboxPress();
        }
        break;
      case 4:
        // Meet in person
        if (onMeetInPersonPress) {
          onMeetInPersonPress();
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
              {podcast.source || podcast.episode}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {podcast.title}
            </Text>
            <View style={styles.avatarStackContainer}>
              <AvatarStack
                members={members.map(m => ({ id: m.id, avatar: m.avatar, name: m.name }))}
                totalCount={totalMembers}
                maxDisplay={5}
                size="medium"
              />
            </View>
          </View>
        </View>

        {/* Resume Button */}
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.resumeButtonText}>
            {isPodcastCompleted ? 'Listen again' : 'Continue Listening'}
          </Text>
        </TouchableOpacity>

        {/* Action Items */}
        <View style={styles.actionItems}>
          {actionItems.map((item) => (
            <React.Fragment key={item.number}>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.actionItem}
                activeOpacity={0.7}
                onPress={() => handleActionItemPress(item.number)}
              >
                <View style={styles.actionItemContent}>
                  <View style={[styles.actionItemNumber, item.completed && styles.actionItemNumberCompleted, item.highlighted && styles.actionItemNumberHighlighted]}>
                    <Text style={styles.actionItemNumberText}>{item.number}</Text>
                  </View>
                  <View style={styles.actionItemText}>
                    <Text style={styles.actionItemTitle}>{item.title}</Text>
                    <Text style={styles.actionItemSubtitle}>{item.subtitle}</Text>
                    {item.secondSubtitle && (
                      <Text style={styles.actionItemSubtitle}>{item.secondSubtitle}</Text>
                    )}
                    {item.highlight && (
                      <Text style={styles.actionItemHighlight}>{item.highlight}</Text>
                    )}
                  </View>
                  <Text style={styles.actionItemChevron}>›</Text>
                </View>
                {item.showProgress && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarRow}>
                      <View style={styles.progressBar}>
                        <View style={[
                          styles.progressFill,
                          { width: `${item.progress || 0}%` },
                          item.completed && styles.progressFillCompleted
                        ]} />
                      </View>
                      <Text style={[styles.progressText, item.completed && styles.progressTextCompleted]}>
                        {Math.round(item.progress || 0)}% complete
                      </Text>
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
    backgroundColor: '#FFFFFF',
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
  avatarStackContainer: {
    marginTop: 4,
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
    marginTop: 12,
    marginBottom: 12,
  },
  actionItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 24,
    backgroundColor: '#403837',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionItemNumberCompleted: {
    backgroundColor: '#4CAF50',
  },
  actionItemNumberHighlighted: {
    backgroundColor: '#E05F4E',
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
  actionItemHighlight: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E05F4E',
    marginTop: 4,
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
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
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
  progressFillCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    color: '#6B5E57',
    fontWeight: '500',
  },
  progressTextCompleted: {
    color: '#4CAF50',
  },
});