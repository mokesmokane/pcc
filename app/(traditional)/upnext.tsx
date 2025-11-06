import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueue, useCurrentTrackOnly } from '../stores/audioStore.hooks';
import { useMultipleEpisodeProgress } from '@/hooks/queries/usePodcastMetadata';

export default function UpNextScreen() {
  const router = useRouter();
  const { queue } = useQueue();
  const currentTrack = useCurrentTrackOnly();

  // Combine current track and queue, avoiding duplicates
  const allTracks = currentTrack ? [currentTrack, ...queue] : queue;
  const uniqueTracks = allTracks.filter((track, index, self) =>
    index === self.findIndex((t) => t.id === track.id)
  );

  // Get all episode IDs for batch progress loading
  const episodeIds = uniqueTracks.map(track => track.id);
  const { data: progressMap } = useMultipleEpisodeProgress(episodeIds);

  // Combine tracks with progress data
  const tracks = uniqueTracks.map((track) => {
    const progress = progressMap?.get(track.id);
    return {
      ...track,
      progressPercentage: progress?.progressPercentage || 0,
      savedPosition: progress?.currentPosition || 0,
      savedDuration: progress?.totalDuration || track.duration || 0,
    };
  });

  const handleTrackPress = (track: typeof tracks[number]) => {
    // If it's the current track, just navigate to player
    if (currentTrack?.id === track.id) {
      router.push('/(traditional)/podcasts/player');
    } else {
      // Otherwise load the new track with duration and saved position
      router.push({
        pathname: '/(traditional)/podcasts/player',
        params: {
          trackId: track.id,
          trackTitle: track.title,
          trackArtist: track.artist || track.source,
          trackArtwork: track.artwork || track.image,
          trackAudioUrl: track.url || track.audioUrl,
          trackDescription: track.description,
          trackDuration: track.savedDuration ? track.savedDuration.toString() : '0',
          trackPosition: track.savedPosition ? track.savedPosition.toString() : '0',
        },
      });
    }
  };

  const renderTrack = ({ item }: { item: typeof tracks[number]; index: number }) => {
    const isCurrentTrack = currentTrack?.id === item.id;
    const artwork = item.artwork || item.image;
    const episodeTitle = item.artist || item.source || item.episode;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrentTrack && styles.trackItemActive]}
        onPress={() => handleTrackPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackLeft}>
          <Text style={[styles.trackNumber, isCurrentTrack && styles.trackNumberActive]}>
            {index + 1}
          </Text>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: artwork }}
              style={styles.trackImage}
            />
            {isCurrentTrack && (
              <View style={styles.nowPlayingBadge}>
                <Ionicons name="play" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, isCurrentTrack && styles.trackTitleActive]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.trackEpisode} numberOfLines={1}>
              {episodeTitle}
            </Text>
          </View>
        </View>

        {item.progressPercentage > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.progressPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(item.progressPercentage)}%
            </Text>
          </View>
        )}

        <Ionicons
          name={isCurrentTrack ? "pause-circle" : "play-circle"}
          size={32}
          color="#E05F4E"
        />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes-outline" size={64} color="#C4C1BB" />
      <Text style={styles.emptyText}>No episodes in your queue</Text>
      <Text style={styles.emptySubtext}>
        Select episodes from the weekly selections to add them here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={tracks}
        renderItem={renderTrack}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          tracks.length === 0 && styles.emptyList
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F3',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  trackItemActive: {
    backgroundColor: '#FFF5F3',
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  trackLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B8680',
    width: 24,
  },
  trackNumberActive: {
    color: '#E05F4E',
  },
  imageContainer: {
    position: 'relative',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#E05F4E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E8E5E1',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 4,
  },
  trackTitleActive: {
    color: '#E05F4E',
  },
  trackEpisode: {
    fontSize: 12,
    color: '#8B8680',
    marginBottom: 2,
  },
  progressSection: {
    marginRight: 12,
    alignItems: 'flex-end',
  },
  progressBar: {
    width: 60,
    height: 3,
    backgroundColor: '#F0EDE9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E05F4E',
  },
  progressText: {
    fontSize: 10,
    color: '#8B8680',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#403837',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});