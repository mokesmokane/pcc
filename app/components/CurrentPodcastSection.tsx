import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import React, { useEffect, useState, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MembersDisplay } from './MembersDisplay';
import { useMembers } from '../contexts/MembersContext';
import { WeeklyPodcast } from '../contexts/WeeklySelectionsContext';

interface CurrentPodcastSectionProps {
  podcasts: WeeklyPodcast[];
  onPodcastPress?: (podcast: WeeklyPodcast) => void;
  getProgressForEpisode?: (episodeId: string) => number;
}

interface PodcastItemProps {
  podcast: WeeklyPodcast;
  isExpanded: boolean;
  onToggle: () => void;
  onPress: (podcast: WeeklyPodcast) => void;
  progressPercentage: number;
  members: any[];
  stats: any;
  loading: boolean;
  isLast: boolean;
}

function PodcastItem({ podcast, isExpanded, onToggle, onPress, progressPercentage, members, stats, loading, isLast }: PodcastItemProps) {
  const animationHeight = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animationHeight, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const totalMembers = stats.totalMembers || podcast.clubMembers;

  return (
    <View style={[styles.podcastItem, !isLast && styles.podcastItemBorder]}>
      <TouchableOpacity
        style={styles.podcastInfo}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: podcast.image }}
          style={styles.podcastImage}
        />
        <View style={styles.podcastDetails}>
          <Text style={styles.podcastTitle} numberOfLines={1}>{podcast.title}</Text>
          <Text style={styles.podcastSubtitle} numberOfLines={1}>{podcast.episode}</Text>
        </View>
      </TouchableOpacity>

      <Animated.View
        style={{
          maxHeight: animationHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 500],
          }),
          opacity: animationHeight,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          style={styles.progressContainer}
          onPress={() => onPress(podcast)}
          activeOpacity={0.9}
        >
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
        </TouchableOpacity>

        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>
              Members <Text style={styles.memberCount}>({totalMembers})</Text>
            </Text>
            <TouchableOpacity onPress={() => onPress(podcast)}>
              <Text style={styles.viewAllText}>Join the chat {'>'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#E05F4E" />
            </View>
          ) : (
            <MembersDisplay
              progressPercentage={progressPercentage}
              members={members.slice(0, 6)}
              stats={stats}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export default function CurrentPodcastSection({
  podcasts,
  onPodcastPress,
  getProgressForEpisode,
}: CurrentPodcastSectionProps) {
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const { members, stats, loading, loadMembers } = useMembers();

  // Load members when expanded podcast changes
  useEffect(() => {
    if (podcasts[expandedIndex]?.id) {
      loadMembers(podcasts[expandedIndex].id);
    }
  }, [expandedIndex, podcasts]);

  if (!fontsLoaded || podcasts.length === 0) {
    return null;
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(index);
  };

  const handlePodcastPress = (podcast: WeeklyPodcast) => {
    if (onPodcastPress) {
      onPodcastPress(podcast);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.podcastCard}>
        {podcasts.map((podcast, index) => (
          <PodcastItem
            key={podcast.id}
            podcast={podcast}
            isExpanded={expandedIndex === index}
            onToggle={() => toggleExpand(index)}
            onPress={handlePodcastPress}
            progressPercentage={getProgressForEpisode?.(podcast.id) || 0}
            members={members}
            stats={stats}
            loading={loading}
            isLast={index === podcasts.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // marginBottom: 24,
  },
  podcastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  podcastItem: {
    // Individual podcast item within the card
  },
  podcastItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  podcastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  podcastImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  podcastDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  podcastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#403837',
    marginBottom: 4,
  },
  podcastSubtitle: {
    fontSize: 13,
    color: '#8B8680',
  },
  progressContainer: {
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
    borderRadius: 2,
  },
  membersSection: {
    paddingTop: 0,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 20,
    fontFamily: 'PaytoneOne_400Regular',
    color: '#E05F4E',
  },
  memberCount: {
    fontSize: 16,
    fontWeight: '400',
    color: '#E05F4E',
  },
  viewAllText: {
    fontSize: 14,
    color: '#E05F4E',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});