import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentTrackOnly, useQueue } from './stores/audioStore.hooks';
import { downloadService } from './services/download/download.service';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  extractArtwork as extractArtworkShared,
  extractAuthor as extractAuthorShared,
  parseRSSEpisodes as parseRSSEpisodesShared,
} from './utils/rss';

// Store hooks
import {
  useAddSubscription,
  useIsSubscribed,
  useIsTracked,
  useRemoveSubscription,
  useToggleTracking,
} from './stores/subscriptionsStore.hooks';

interface Episode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  duration: string;
  durationSeconds: number;
  audioUrl: string;
  artwork?: string;
  isDownloaded?: boolean;
  isDownloading?: boolean;
}

export default function SubscribedPodcastDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { playNext } = useQueue();
  const currentTrack = useCurrentTrackOnly();

  const feedUrl = params.feedUrl as string;

  // Store state (reactive)
  const isSubscribed = useIsSubscribed(feedUrl);
  const isTracked = useIsTracked(feedUrl);
  const addSubscription = useAddSubscription();
  const removeSubscription = useRemoveSubscription();
  const toggleTracking = useToggleTracking();

  // Local UI state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<Episode | null>(null);
  const [podcastInfo, setPodcastInfo] = useState({
    title: params.title as string || 'Podcast',
    artwork: params.artwork as string || '',
    author: params.author as string || '',
  });

  const handleSubscribe = () => {
    addSubscription({
      id: feedUrl,
      title: podcastInfo.title,
      artwork: podcastInfo.artwork,
      feedUrl,
      author: podcastInfo.author,
    });
  };

  const handleUnsubscribe = () => {
    setShowUnsubscribeDialog(true);
  };

  const handleToggleTracking = () => {
    toggleTracking(feedUrl);
  };

  const confirmUnsubscribe = () => {
    setShowUnsubscribeDialog(false);
    removeSubscription(feedUrl);
    // Go back to the podcasts list
    router.back();
  };

  useEffect(() => {
    if (feedUrl) {
      setEpisodes([]);
      setPodcastInfo({
        title: params.title as string || 'Podcast',
        artwork: params.artwork as string || '',
        author: params.author as string || '',
      });
      fetchEpisodes();
    }
  }, [feedUrl, params.title, params.artwork, params.author]);

  const checkDownloadStatus = async () => {
    if (episodes.length === 0) return;

    const updatedEpisodes = await Promise.all(
      episodes.map(async (episode) => ({
        ...episode,
        isDownloaded: await downloadService.isDownloaded(episode.id),
      }))
    );

    const hasChanges = updatedEpisodes.some((ep, idx) =>
      ep.isDownloaded !== episodes[idx].isDownloaded
    );

    if (hasChanges) {
      setEpisodes(updatedEpisodes);
    }
  };

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(feedUrl);
      const xmlText = await response.text();

      // Use shared RSS parsing utilities
      const parsedEpisodes = parseRSSEpisodesShared(xmlText);
      // Map to local Episode interface
      const mappedEpisodes: Episode[] = parsedEpisodes.map(ep => ({
        id: ep.id,
        title: ep.title,
        description: ep.description,
        pubDate: ep.pubDate,
        duration: ep.duration,
        durationSeconds: ep.durationSeconds,
        audioUrl: ep.audioUrl,
      }));
      setEpisodes(mappedEpisodes);

      setTimeout(() => checkDownloadStatus(), 100);

      if (!podcastInfo.artwork) {
        const artwork = extractArtworkShared(xmlText);
        const author = extractAuthorShared(xmlText);
        setPodcastInfo(prev => ({
          ...prev,
          artwork,
          author,
        }));
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodePress = async (episode: Episode) => {
    if (!episode.audioUrl) {
      return;
    }

    router.push({
      pathname: '/player',
      params: {
        trackId: episode.id,
        trackTitle: episode.title,
        trackArtist: podcastInfo.author || podcastInfo.title,
        trackArtwork: podcastInfo.artwork,
        trackAudioUrl: episode.audioUrl,
        trackDescription: episode.description,
        trackDuration: episode.durationSeconds.toString(),
      },
    });
  };

  const handlePlayNext = async (episode: Episode) => {
    await playNext({
      id: episode.id,
      title: episode.title,
      podcast_title: podcastInfo.author || podcastInfo.title,
      artwork_url: podcastInfo.artwork,
      audio_url: episode.audioUrl,
      description: episode.description,
    });
  };

  const handleDownload = async (episode: Episode) => {
    try {
      await downloadService.queueDownload({
        id: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        podcastTitle: podcastInfo.author || podcastInfo.title,
        artwork: podcastInfo.artwork,
      });

      setEpisodes(prevEpisodes =>
        prevEpisodes.map(e =>
          e.id === episode.id ? { ...e, isDownloading: true } : e
        )
      );

      setTimeout(checkDownloadStatus, 2000);
    } catch (_error) {
      console.error('Download failed:', _error);
    }
  };

  const handleDeleteDownload = (episode: Episode) => {
    setEpisodeToDelete(episode);
    setShowDeleteDialog(true);
  };

  const confirmDeleteDownload = async () => {
    setShowDeleteDialog(false);
    if (!episodeToDelete) return;

    try {
      await downloadService.deleteDownload(episodeToDelete.id);
      await checkDownloadStatus();
    } catch (error) {
      console.error('Error deleting download:', error);
    }
    setEpisodeToDelete(null);
  };

  const renderEpisode = ({ item }: { item: Episode }) => {
    const isPlaying = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.episodeItem, isPlaying && styles.episodeItemActive]}
        onPress={() => handleEpisodePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.episodeLeft}>
          {isPlaying && (
            <View style={styles.playingIndicator}>
              <Ionicons name="volume-high" size={16} color="#E05F4E" />
            </View>
          )}
          <View style={styles.episodeInfo}>
            <Text style={[styles.episodeTitle, isPlaying && styles.episodeTitleActive]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.episodeMeta}>
              <Text style={styles.episodeDate}>{item.pubDate}</Text>
              {item.duration && (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.episodeDuration}>{item.duration}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.episodeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePlayNext(item)}
          >
            <Ionicons name="play-skip-forward" size={20} color="#8B8680" />
          </TouchableOpacity>

          {item.isDownloaded ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteDownload(item)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#E05F4E" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownload(item)}
            >
              <Ionicons name="download-outline" size={20} color="#8B8680" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.podcastHeader}>
      {podcastInfo.artwork ? (
        <Image
          source={{ uri: podcastInfo.artwork }}
          style={styles.podcastArtwork}
          contentFit="cover"
        />
      ) : (
        <View style={styles.podcastArtworkPlaceholder}>
          <Ionicons name="mic-outline" size={48} color="#8B8680" />
        </View>
      )}
      <Text style={styles.podcastTitle}>{podcastInfo.title}</Text>
      {podcastInfo.author && (
        <Text style={styles.podcastAuthor}>{podcastInfo.author}</Text>
      )}
      <Text style={styles.episodeCount}>
        {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#403837" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          {isSubscribed && (
            <TouchableOpacity
              style={[styles.trackButton, isTracked && styles.trackButtonActive]}
              onPress={handleToggleTracking}
            >
              <Ionicons
                name={isTracked ? 'notifications' : 'notifications-outline'}
                size={18}
                color={isTracked ? '#FFFFFF' : '#8B8680'}
              />
            </TouchableOpacity>
          )}
          {isSubscribed ? (
            <TouchableOpacity style={styles.subscribeButton} onPress={handleUnsubscribe}>
              <Ionicons name="checkmark-circle" size={20} color="#E05F4E" />
              <Text style={styles.subscribedText}>Subscribed</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.subscribeButtonActive} onPress={handleSubscribe}>
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.subscribeTextActive}>Subscribe</Text>
            </TouchableOpacity>
          )}
        </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          renderItem={renderEpisode}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

        <ConfirmDialog
          visible={showUnsubscribeDialog}
          title="Unsubscribe"
          message={`Are you sure you want to unsubscribe from "${podcastInfo.title}"?`}
          confirmText="Unsubscribe"
          cancelText="Cancel"
          confirmStyle="destructive"
          onConfirm={confirmUnsubscribe}
          onCancel={() => setShowUnsubscribeDialog(false)}
        />

        <ConfirmDialog
          visible={showDeleteDialog}
          title="Delete Download"
          message={`Delete the downloaded episode "${episodeToDelete?.title}"?`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmStyle="destructive"
          onConfirm={confirmDeleteDownload}
          onCancel={() => {
            setShowDeleteDialog(false);
            setEpisodeToDelete(null);
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerSpacer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B8680',
  },
  list: {
    padding: 16,
  },
  podcastHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  podcastArtwork: {
    width: 160,
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  podcastArtworkPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  podcastTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#403837',
    textAlign: 'center',
    marginBottom: 8,
  },
  podcastAuthor: {
    fontSize: 16,
    color: '#8B8680',
    textAlign: 'center',
    marginBottom: 8,
  },
  episodeCount: {
    fontSize: 14,
    color: '#C4C1BB',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  episodeItemActive: {
    backgroundColor: '#FFF5F3',
    borderWidth: 1,
    borderColor: '#E05F4E',
  },
  episodeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playingIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
    marginBottom: 6,
  },
  episodeTitleActive: {
    color: '#E05F4E',
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  episodeDate: {
    fontSize: 13,
    color: '#8B8680',
  },
  metaDot: {
    fontSize: 13,
    color: '#C4C1BB',
  },
  episodeDuration: {
    fontSize: 13,
    color: '#8B8680',
  },
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E05F4E',
    gap: 6,
  },
  subscribedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E05F4E',
  },
  subscribeButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E05F4E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  subscribeTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  trackButtonActive: {
    backgroundColor: '#E05F4E',
    borderColor: '#E05F4E',
  },
});
