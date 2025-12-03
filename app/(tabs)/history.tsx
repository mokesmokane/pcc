import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PaytoneOne_400Regular, useFonts } from '@expo-google-fonts/paytone-one';
import { useCurrentTrackOnly, useQueue } from '../stores/audioStore.hooks';
import { useMultipleEpisodeProgress } from '../hooks/queries/usePodcastMetadata';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queries/queryKeys';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { ManageTrackedPodcastsModal } from '../components/ManageTrackedPodcastsModal';
import { DropdownMenu } from '../components/DropdownMenu';
import { styles } from '../styles/upnext.styles';
import { useWeeklySelections } from '../contexts/WeeklySelectionsContext';
import { useMiniPlayer } from '../contexts/MiniPlayerContext';
import {
  downloadService,
  selectDownloadedEpisodes,
  selectDownloads,
  useDownloadStore,
} from '../services/download/download.service';
import { CircularProgress } from '../components/CircularProgress';
import type { Track } from 'react-native-track-player';

// Store hooks
import {
  useModalSnapshot,
  useSubscriptions,
  useTrackedPodcasts,
} from '../stores/subscriptionsStore.hooks';
import {
  useGroupedRecentEpisodes,
  useRecentEpisodesActions,
  useRecentEpisodesLoading,
} from '../stores/recentEpisodesStore.hooks';
import { fetchRecentEpisodes } from '../services/recentEpisodes.service';

type FilterTab = 'queue' | 'downloaded' | 'new';

export default function UpNextScreen() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PaytoneOne_400Regular,
  });
  const { miniPlayerHeight } = useMiniPlayer();
  const { queue, removeFromQueue } = useQueue();
  const currentTrack = useCurrentTrackOnly();
  const { selections } = useWeeklySelections();
  const { progressRepository } = useDatabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if an episode is a Podcast Club episode (match on audio URL since IDs differ)
  // Create a Set of club audio URLs for efficient lookup
  const clubAudioUrls = React.useMemo(() => {
    const urls = new Set<string>();
    selections.forEach((podcast) => {
      if (podcast.audioUrl) {
        urls.add(podcast.audioUrl);
      }
    });
    return urls;
  }, [selections]);

  const isClubEpisode = useCallback((trackUrl: string | undefined) => {
    if (!trackUrl) return false;
    return clubAudioUrls.has(trackUrl);
  }, [clubAudioUrls]);

  // UI state (local)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('queue');
  const [showManageModal, setShowManageModal] = useState(false);

  // Store state (reactive)
  const subscriptions = useSubscriptions();
  const trackedPodcasts = useTrackedPodcasts();
  const { savePreModalSnapshot, getPreModalSnapshot, clearPreModalSnapshot } = useModalSnapshot();

  const groupedRecentEpisodes = useGroupedRecentEpisodes();
  const loadingRecent = useRecentEpisodesLoading();
  const { loadEpisodes, removeEpisodesForPodcasts, mergeNewEpisodes, clearEpisodes } = useRecentEpisodesActions();

  const downloadedEpisodes = useDownloadStore(selectDownloadedEpisodes);
  const downloads = useDownloadStore(selectDownloads);

  // Handle modal open - save current tracked IDs
  const handleOpenManageModal = useCallback(() => {
    savePreModalSnapshot();
    setShowManageModal(true);
  }, [savePreModalSnapshot]);

  // Handle modal close - do incremental update
  const handleCloseManageModal = useCallback(async () => {
    setShowManageModal(false);

    const previouslyTracked = getPreModalSnapshot();
    const currentlyTracked = new Set(trackedPodcasts.map(p => p.id));

    // If no snapshot, do nothing
    if (!previouslyTracked) {
      clearPreModalSnapshot();
      return;
    }

    // Find newly added and removed podcasts
    const newlyAdded = trackedPodcasts.filter(p => !previouslyTracked.has(p.id));
    const removedIds = [...previouslyTracked].filter(id => !currentlyTracked.has(id));

    // If nothing changed, do nothing
    if (newlyAdded.length === 0 && removedIds.length === 0) {
      clearPreModalSnapshot();
      return;
    }

    // Remove episodes from untracked podcasts immediately (via store)
    if (removedIds.length > 0) {
      removeEpisodesForPodcasts(removedIds);
    }

    // If no tracked podcasts remain, clear episodes
    if (currentlyTracked.size === 0) {
      clearEpisodes();
      clearPreModalSnapshot();
      return;
    }

    // Fetch episodes only for newly added podcasts (in background, no spinner)
    if (newlyAdded.length > 0) {
      try {
        const newEpisodes = await fetchRecentEpisodes(newlyAdded, true);
        mergeNewEpisodes(newEpisodes);
      } catch (error) {
        console.error('Failed to fetch new episodes:', error);
      }
    }

    clearPreModalSnapshot();
  }, [trackedPodcasts, getPreModalSnapshot, clearPreModalSnapshot, removeEpisodesForPodcasts, clearEpisodes, mergeNewEpisodes]);

  // Load recent episodes when switching to New tab (only if empty)
  const handleTabChange = useCallback((tab: FilterTab) => {
    setActiveTab(tab);
    if (tab === 'new' && trackedPodcasts.length > 0 && groupedRecentEpisodes.length === 0) {
      loadEpisodes(trackedPodcasts);
    }
  }, [trackedPodcasts, loadEpisodes, groupedRecentEpisodes.length]);

  // Pull-to-refresh for New tab
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (trackedPodcasts.length === 0) return;
    setIsRefreshing(true);
    await loadEpisodes(trackedPodcasts, true); // forceRefresh = true
    setIsRefreshing(false);
  }, [trackedPodcasts, loadEpisodes]);

  // Get unique track IDs for progress loading (including downloads)
  const trackIds = [
    ...queue.map(track => track.id).filter((id): id is string => !!id),
    ...downloadedEpisodes.map(ep => ep.id),
  ];
  const { data: progressMapData } = useMultipleEpisodeProgress(trackIds);


  // Remove duplicates from queue display
  const uniqueQueue = queue.reduce<Track[]>((acc, track) => {
    if (!acc.find(t => t.id === track.id)) {
      acc.push(track);
    }
    return acc;
  }, []);

  // Downloaded tracks as Track-like objects
  const downloadedTracks = downloadedEpisodes.map((ep): Track => ({
    id: ep.id,
    title: ep.title,
    artist: ep.podcastTitle,
    artwork: ep.artwork,
    url: ep.localPath,
    description: ep.description,
  }));

  // Get filtered tracks based on active tab
  const filteredTracks = activeTab === 'queue' ? uniqueQueue : downloadedTracks;

  const handleTrackPress = (track: Track) => {
    // Get saved progress for this track
    const progress = progressMapData?.get(track.id || '');
    const percentage = progress?.progressPercentage || 0;
    const duration = progress?.totalDuration || 0;
    const isFinished = percentage >= 95;

    // If finished, show bottom sheet with options
    if (isFinished) {
      setSelectedTrackId(track.id || null);
      return;
    }

    const startPosition = progress?.currentPosition || 0;

    router.push({
      pathname: '/player',
      params: {
        trackId: track.id,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackArtwork: track.artwork,
        trackAudioUrl: track.url,
        trackDescription: track.description,
        trackDuration: duration.toString(),
        trackPosition: startPosition.toString(),
      },
    });
  };

  const handleLongPress = (track: Track) => {
    // Toggle - if same track, close; otherwise open for new track
    if (selectedTrackId === track.id) {
      setSelectedTrackId(null);
    } else {
      setSelectedTrackId(track.id || null);
    }
  };

  const handleCloseActionSheet = () => {
    setSelectedTrackId(null);
  };

  // Get selected track from current list
  const getSelectedTrack = (): Track | null => {
    if (!selectedTrackId) return null;
    const allTracks = activeTab === 'queue' ? uniqueQueue :
                      activeTab === 'downloaded' ? downloadedTracks :
                      groupedRecentEpisodes.flatMap(s => s.data);
    return allTracks.find(t => t.id === selectedTrackId) || null;
  };

  const handleRemoveFromQueue = async () => {
    const trackId = selectedTrackId;
    handleCloseActionSheet();

    if (trackId) {
      await removeFromQueue(trackId);
    }
  };

  const handleDeleteDownload = async () => {
    const trackId = selectedTrackId;
    console.log('[History] handleDeleteDownload called, trackId:', trackId);
    handleCloseActionSheet();

    if (trackId) {
      try {
        console.log('[History] Calling downloadService.deleteDownload...');
        await downloadService.deleteDownload(trackId);
        console.log('[History] Delete completed');
      } catch (error) {
        console.error('Failed to delete download:', error);
      }
    }
  };

  const handleDownloadEpisode = async () => {
    const track = getSelectedTrack();
    handleCloseActionSheet();

    if (track) {
      try {
        await downloadService.queueDownload({
          id: track.id || '',
          title: track.title || '',
          audioUrl: track.url || '',
          podcastTitle: track.artist || '',
          artwork: track.artwork as string,
          description: track.description || '',
        });
      } catch (error) {
        console.error('Failed to start download:', error);
      }
    }
  };

  const handlePlayNow = async () => {
    const track = getSelectedTrack();
    handleCloseActionSheet();

    if (track) {
      await handleTrackPress(track);
    }
  };

  const handlePlayAgain = async () => {
    const track = getSelectedTrack();
    handleCloseActionSheet();

    if (track?.id && user?.id) {
      await progressRepository.resetProgress(user.id, track.id);
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({
        queryKey: queryKeys.podcastMetadata.multipleProgress(trackIds, user.id),
      });

      // Navigate to player starting from 0
      router.push({
        pathname: '/player',
        params: {
          trackId: track.id,
          trackTitle: track.title,
          trackArtist: track.artist,
          trackArtwork: track.artwork,
          trackAudioUrl: track.url,
          trackDescription: track.description,
          trackDuration: '0',
          trackPosition: '0',
        },
      });
    }
  };

  const handleArchive = async () => {
    const trackId = selectedTrackId;
    handleCloseActionSheet();

    if (trackId) {
      // Remove from queue
      await removeFromQueue(trackId);
      // Delete download if exists
      try {
        await downloadService.deleteDownload(trackId);
      } catch {
        // Ignore if not downloaded
      }
    }
  };

  // Get menu items based on active tab and completion status
  const getMenuItems = () => {
    const selectedTrack = getSelectedTrack();
    const { percentage } = selectedTrack ? getProgressForTrack(selectedTrack.id || '') : { percentage: 0 };
    const isFinished = percentage >= 95;

    // For finished episodes, show Play Again and Archive
    if (isFinished) {
      return [
        { label: 'Play Again', icon: 'play' as const, onPress: handlePlayAgain },
        { label: 'Archive', icon: 'archive-outline' as const, onPress: handleArchive },
      ];
    }

    // For in-progress episodes, show standard options
    const items = [];
    items.push({ label: 'Play', icon: 'play' as const, onPress: handlePlayNow });

    // Tab-specific options
    if (activeTab === 'queue') {
      items.push({ label: 'Remove from Queue', icon: 'trash-outline' as const, onPress: handleRemoveFromQueue, destructive: true });
    } else if (activeTab === 'downloaded') {
      items.push({ label: 'Delete Download', icon: 'trash-outline' as const, onPress: handleDeleteDownload, destructive: true });
    } else {
      items.push({ label: 'Download', icon: 'download-outline' as const, onPress: handleDownloadEpisode });
    }

    return items;
  };

  const getProgressForTrack = (trackId: string) => {
    if (!progressMapData) return { percentage: 0, completed: false };
    const progress = progressMapData.get(trackId);
    return {
      percentage: progress?.progressPercentage || 0,
      completed: progress?.completed || false,
    };
  };

  // Get download status for a track
  const getDownloadStatus = (trackId: string) => {
    // Check if currently downloading
    const download = Array.from(downloads.values()).find(d => d.episodeId === trackId);
    if (download) {
      return {
        isDownloading: download.status === 'downloading' || download.status === 'queued',
        isDownloaded: download.status === 'completed',
        progress: download.progress,
      };
    }
    // Check if in downloaded episodes list
    const isDownloaded = downloadedEpisodes.some(ep => ep.id === trackId);
    return {
      isDownloading: false,
      isDownloaded,
      progress: 0,
    };
  };

  const renderQueueItem = ({ item }: { item: Track }) => {
    const isCurrent = currentTrack?.id === item.id;
    const { percentage } = getProgressForTrack(item.id || '');
    const isClub = isClubEpisode(item.url);
    const downloadStatus = getDownloadStatus(item.id || '');
    // For Up Next, use percentage-based completion (not the sticky completed flag)
    const isFinished = percentage >= 95;

    return (
      <TouchableOpacity
        style={[
          styles.queueItem,
          isCurrent && styles.queueItemCurrent,
          isFinished && localStyles.queueItemCompleted,
        ]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: item.artwork as string }}
            style={[styles.artwork, isFinished && localStyles.artworkCompleted]}
          />
          {isClub && (
            <Image
              source={require('../../assets/splash.png')}
              style={styles.clubBadge}
            />
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.trackTitle, isFinished && localStyles.textCompleted]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={localStyles.artistRow}>
            <Text
              style={[styles.trackArtist, localStyles.artistText, isFinished && localStyles.textCompleted]}
              numberOfLines={1}
            >
              {item.artist}
            </Text>
            {/* Download indicator */}
            {(downloadStatus.isDownloaded || downloadStatus.isDownloading) && (
              <View style={localStyles.downloadIndicator}>
                {downloadStatus.isDownloading ? (
                  <CircularProgress
                    progress={downloadStatus.progress}
                    size={18}
                    strokeWidth={2}
                  />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color="#E05F4E" />
                )}
              </View>
            )}
          </View>

          {isFinished ? (
            <View style={localStyles.finishedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#8B8680" />
              <Text style={localStyles.finishedText}>Finished</Text>
            </View>
          ) : percentage > 0 ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {`${Math.round(percentage)}%`}
              </Text>
            </View>
          ) : null}
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

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'queue':
        return {
          icon: 'list-outline' as const,
          text: 'Your queue is empty',
          subtext: 'Add episodes to your queue from the player or podcast pages',
        };
      case 'downloaded':
        return {
          icon: 'download-outline' as const,
          text: 'No downloaded episodes',
          subtext: 'Download episodes to listen offline',
        };
      case 'new':
        const hasTrackedPodcasts = subscriptions.some(p => p.tracked);
        if (subscriptions.length === 0) {
          return {
            icon: 'albums-outline' as const,
            text: 'No subscribed podcasts',
            subtext: 'Subscribe to podcasts in the Podcasts tab to see new episodes',
          };
        }
        if (!hasTrackedPodcasts) {
          return {
            icon: 'notifications-outline' as const,
            text: 'No tracked podcasts',
            subtext: 'Tap "Manage" to select podcasts to track for new episodes',
          };
        }
        return {
          icon: 'sparkles-outline' as const,
          text: 'No new episodes',
          subtext: 'No episodes from your tracked podcasts in the last 14 days',
        };
      default:
        return {
          icon: 'list-outline' as const,
          text: 'No episodes',
          subtext: '',
        };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, { fontFamily: 'PaytoneOne_400Regular' }]}>Up Next</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'queue' && styles.tabActive]}
          onPress={() => handleTabChange('queue')}
        >
          <Text style={[styles.tabText, activeTab === 'queue' && styles.tabTextActive]}>
            Play Queue
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'downloaded' && styles.tabActive]}
          onPress={() => handleTabChange('downloaded')}
        >
          <Text style={[styles.tabText, activeTab === 'downloaded' && styles.tabTextActive]}>
            Downloaded
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.tabActive]}
          onPress={() => handleTabChange('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
            New
          </Text>
        </TouchableOpacity>
        {activeTab === 'new' && (
          <TouchableOpacity
            style={localStyles.headerAddButton}
            onPress={handleOpenManageModal}
          >
            <Ionicons name="add-circle" size={28} color="#E05F4E" />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'new' && loadingRecent ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E05F4E" />
          <Text style={styles.emptySubtext}>Loading recent episodes...</Text>
        </View>
      ) : activeTab === 'new' && groupedRecentEpisodes.length === 0 ? (
        subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={64} color="#8B8680" />
            <Text style={styles.emptyText}>No subscribed podcasts</Text>
            <Text style={styles.emptySubtext}>Subscribe to podcasts in the Podcasts tab to see new episodes</Text>
          </View>
        ) : !subscriptions.some(p => p.tracked) ? (
          <View style={localStyles.emptyTrackingContainer}>
            <Ionicons name="notifications-outline" size={64} color="#8B8680" />
            <Text style={localStyles.emptyTrackingTitle}>Track Your Podcasts</Text>
            <Text style={localStyles.emptyTrackingText}>
              Track your favourite podcasts to see their latest episodes here as soon as they're released.
            </Text>
            <TouchableOpacity
              style={localStyles.emptyTrackingButton}
              onPress={handleOpenManageModal}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={localStyles.emptyTrackingButtonText}>Choose Podcasts to Track</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={64} color="#8B8680" />
            <Text style={styles.emptyText}>No new episodes</Text>
            <Text style={styles.emptySubtext}>No episodes from your tracked podcasts in the last 14 days</Text>
          </View>
        )
      ) : activeTab === 'new' ? (
        <>
          <SectionList
            sections={groupedRecentEpisodes}
            renderItem={renderQueueItem}
            renderSectionHeader={({ section: { title } }) => (
              <View style={localStyles.sectionHeader}>
                <Text style={localStyles.sectionHeaderText}>{title}</Text>
              </View>
            )}
            ListFooterComponent={
              <View style={localStyles.listFooter}>
                <Text style={localStyles.footerText}>
                  Track your favourite podcasts to see their latest episodes here as soon as they're released.
                </Text>
                <TouchableOpacity
                  style={localStyles.footerButton}
                  onPress={handleOpenManageModal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color="#E05F4E" />
                  <Text style={localStyles.footerButtonText}>Manage Tracked Podcasts</Text>
                </TouchableOpacity>
              </View>
            }
            keyExtractor={(item) => item.id || Math.random().toString()}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + miniPlayerHeight }]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#E05F4E"
                colors={['#E05F4E']}
              />
            }
          />
        </>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={getEmptyMessage().icon} size={64} color="#8B8680" />
          <Text style={styles.emptyText}>{getEmptyMessage().text}</Text>
          <Text style={styles.emptySubtext}>{getEmptyMessage().subtext}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredTracks}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id || Math.random().toString()}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + miniPlayerHeight }]}
            showsVerticalScrollIndicator={false}
          />
          {activeTab === 'queue' && (
            <Text style={styles.removeHint}>Long press to remove from queue</Text>
          )}
        </>
      )}

      <ManageTrackedPodcastsModal
        visible={showManageModal}
        onClose={handleCloseManageModal}
      />

      <DropdownMenu
        visible={!!selectedTrackId}
        artwork={getSelectedTrack()?.artwork as string}
        podcastTitle={getSelectedTrack()?.artist}
        episodeTitle={getSelectedTrack()?.title}
        items={getMenuItems()}
        onClose={handleCloseActionSheet}
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B8680',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listFooter: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8B8680',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E05F4E',
    gap: 8,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E05F4E',
  },
  headerAddButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  emptyTrackingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTrackingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#403837',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTrackingText: {
    fontSize: 15,
    color: '#8B8680',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyTrackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    backgroundColor: '#E05F4E',
    gap: 8,
  },
  emptyTrackingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistText: {
    flexShrink: 1,
  },
  downloadIndicator: {
    marginLeft: 8,
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  queueItemCompleted: {
    opacity: 0.6,
  },
  artworkCompleted: {
    opacity: 0.7,
  },
  textCompleted: {
    color: '#8B8680',
  },
  finishedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  finishedText: {
    fontSize: 12,
    color: '#8B8680',
    fontWeight: '500',
  },
});
