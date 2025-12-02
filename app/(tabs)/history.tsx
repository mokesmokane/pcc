import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useQueue, useCurrentTrackOnly } from '../stores/audioStore.hooks';
import { useMultipleEpisodeProgress } from '../hooks/queries/usePodcastMetadata';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { styles } from '../styles/upnext.styles';
import type { Track } from 'react-native-track-player';

export default function UpNextScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { queue, removeFromQueue, playNow } = useQueue();
  const currentTrack = useCurrentTrackOnly();
  const [removeDialogVisible, setRemoveDialogVisible] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState<Track | null>(null);

  // Get unique track IDs for progress loading
  const trackIds = queue.map(track => track.id).filter((id): id is string => !!id);
  const { data: progressMapData } = useMultipleEpisodeProgress(trackIds);

  // Remove duplicates from queue display
  const uniqueQueue = queue.reduce<Track[]>((acc, track) => {
    if (!acc.find(t => t.id === track.id)) {
      acc.push(track);
    }
    return acc;
  }, []);

  const handleTrackPress = async (track: Track) => {
    // Get saved progress for this track
    const progress = progressMapData?.get(track.id || '');
    const startPosition = progress?.currentPosition || 0;

    await playNow({
      id: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      audioUrl: track.url,
      description: track.description,
    }, startPosition);

    router.push({
      pathname: '/player',
      params: {
        trackId: track.id,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackArtwork: track.artwork,
        trackAudioUrl: track.url,
        trackDescription: track.description,
      },
    });
  };

  const handleLongPress = (track: Track) => {
    setTrackToRemove(track);
    setRemoveDialogVisible(true);
  };

  const handleConfirmRemove = async () => {
    if (trackToRemove?.id) {
      await removeFromQueue(trackToRemove.id);
    }
    setRemoveDialogVisible(false);
    setTrackToRemove(null);
  };

  const handleCancelRemove = () => {
    setRemoveDialogVisible(false);
    setTrackToRemove(null);
  };

  const getProgressForTrack = (trackId: string) => {
    if (!progressMapData) return { percentage: 0, completed: false };
    const progress = progressMapData.get(trackId);
    return {
      percentage: progress?.progressPercentage || 0,
      completed: progress?.completed || false,
    };
  };

  const renderQueueItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrent = currentTrack?.id === item.id;
    const { percentage, completed } = getProgressForTrack(item.id || '');

    return (
      <TouchableOpacity
        style={[styles.queueItem, isCurrent && styles.queueItemCurrent]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.trackNumber, isCurrent && styles.trackNumberCurrent]}>
          {index + 1}
        </Text>

        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: item.artwork as string }}
            style={styles.artwork}
          />
          {isCurrent && (
            <View style={styles.nowPlayingBadge}>
              <Ionicons name="play" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>

          {percentage > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage}%` },
                    completed && styles.progressFillCompleted,
                  ]}
                />
              </View>
              <Text style={[styles.progressText, completed && styles.progressTextCompleted]}>
                {completed ? '100%' : `${Math.round(percentage)}%`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, { fontFamily: 'PaytoneOne_400Regular' }]}>Up Next</Text>
        <Text style={styles.subtitle}>Your play queue</Text>
      </View>

      {uniqueQueue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color="#8B8680" />
          <Text style={styles.emptyText}>Your queue is empty</Text>
          <Text style={styles.emptySubtext}>
            Add episodes to your queue from the player or podcast pages
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={uniqueQueue}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id || Math.random().toString()}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          />
          <Text style={styles.removeHint}>Long press to remove from queue</Text>
        </>
      )}

      <ConfirmDialog
        visible={removeDialogVisible}
        title="Remove from queue"
        message={`Remove "${trackToRemove?.title}" from your play queue?`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />
    </SafeAreaView>
  );
}
