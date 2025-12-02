import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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
import { ManageTrackedPodcastsModal } from '../components/ManageTrackedPodcastsModal';
import { styles } from '../styles/upnext.styles';
import { useWeeklySelections } from '../contexts/WeeklySelectionsContext';
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
  const { queue, removeFromQueue } = useQueue();
  const currentTrack = useCurrentTrackOnly();
  const { selections } = useWeeklySelections();

  // Check if an episode is a Podcast Club episode
  const isClubEpisode = useCallback((episodeId: string | undefined) => {
    if (!episodeId) return false;
    return selections.has(episodeId);
  }, [selections]);

  // UI state (local)
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
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

  // Load recent episodes when switching to New tab
  const handleTabChange = useCallback((tab: FilterTab) => {
    setActiveTab(tab);
    if (tab === 'new' && trackedPodcasts.length > 0) {
      loadEpisodes(trackedPodcasts);
    }
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
    const startPosition = progress?.currentPosition || 0;
    const duration = progress?.totalDuration || 0;

    // Don't call playNow() - let player handle playback on user action
    // This matches how Clubs page works

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
    setSelectedTrack(track);
    setActionSheetVisible(true);
  };

  const handleCloseActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedTrack(null);
  };

  const handleRemoveFromQueue = async () => {
    const trackId = selectedTrack?.id;
    handleCloseActionSheet();

    if (trackId) {
      await removeFromQueue(trackId);
    }
  };

  const handleDeleteDownload = async () => {
    const trackId = selectedTrack?.id;
    console.log('[History] handleDeleteDownload called, trackId:', trackId);
    handleCloseActionSheet();

    if (trackId) {
      try {
        // Delete from filesystem and remove from store (handled by service)
        console.log('[History] Calling downloadService.deleteDownload...');
        await downloadService.deleteDownload(trackId);
        console.log('[History] Delete completed');
      } catch (error) {
        console.error('Failed to delete download:', error);
      }
    }
  };

  const handleDownloadEpisode = async () => {
    const track = selectedTrack;
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
    const track = selectedTrack;
    handleCloseActionSheet();

    if (track) {
      await handleTrackPress(track);
    }
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

  const renderQueueItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrent = currentTrack?.id === item.id;
    const { percentage, completed } = getProgressForTrack(item.id || '');
    const isClub = isClubEpisode(item.id);
    const downloadStatus = getDownloadStatus(item.id || '');

    return (
      <TouchableOpacity
        style={[styles.queueItem, isCurrent && styles.queueItemCurrent]}
        onPress={() => handleTrackPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: item.artwork as string }}
            style={styles.artwork}
          />
          {isClub && (
            <Image
              source={require('../../assets/splash.png')}
              style={styles.clubBadge}
            />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.trackTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={localStyles.artistRow}>
            <Text
              style={[styles.trackArtist, localStyles.artistText]}
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          />
          {activeTab === 'queue' && (
            <Text style={styles.removeHint}>Long press to remove from queue</Text>
          )}
        </>
      )}

      {/* Action Sheet Modal */}
      <Modal
        visible={actionSheetVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseActionSheet}
      >
        <TouchableOpacity
          style={localStyles.actionSheetOverlay}
          activeOpacity={1}
          onPress={handleCloseActionSheet}
        >
          <TouchableOpacity
            style={localStyles.actionSheetDialog}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[localStyles.actionSheetTitle, fontsLoaded && { fontFamily: 'PaytoneOne_400Regular' }]} numberOfLines={2}>
              {selectedTrack?.title}
            </Text>
            <Text style={localStyles.actionSheetSubtitle} numberOfLines={1}>
              {selectedTrack?.artist}
            </Text>

            <View style={localStyles.actionSheetButtons}>
              {activeTab === 'queue' && (
                <>
                  <TouchableOpacity
                    style={localStyles.actionSheetButtonPrimary}
                    onPress={handlePlayNow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                    <Text style={localStyles.actionSheetButtonPrimaryText}>Play Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.actionSheetButtonDestructive}
                    onPress={handleRemoveFromQueue}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E05F4E" />
                    <Text style={localStyles.actionSheetButtonDestructiveText}>Remove</Text>
                  </TouchableOpacity>
                </>
              )}

              {activeTab === 'downloaded' && (
                <>
                  <TouchableOpacity
                    style={localStyles.actionSheetButtonPrimary}
                    onPress={handlePlayNow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                    <Text style={localStyles.actionSheetButtonPrimaryText}>Play Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.actionSheetButtonDestructive}
                    onPress={handleDeleteDownload}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E05F4E" />
                    <Text style={localStyles.actionSheetButtonDestructiveText}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}

              {activeTab === 'new' && (
                <>
                  <TouchableOpacity
                    style={localStyles.actionSheetButtonPrimary}
                    onPress={handlePlayNow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play" size={18} color="#FFFFFF" />
                    <Text style={localStyles.actionSheetButtonPrimaryText}>Play Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.actionSheetButtonSecondary}
                    onPress={handleDownloadEpisode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="download-outline" size={18} color="#403837" />
                    <Text style={localStyles.actionSheetButtonSecondaryText}>Download</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={localStyles.actionSheetCancelButton}
              onPress={handleCloseActionSheet}
              activeOpacity={0.7}
            >
              <Text style={localStyles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ManageTrackedPodcastsModal
        visible={showManageModal}
        onClose={handleCloseManageModal}
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
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionSheetDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#403837',
    marginBottom: 8,
  },
  actionSheetSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#8B8680',
    marginBottom: 24,
  },
  actionSheetButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionSheetButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E05F4E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionSheetButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionSheetButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F4F1ED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionSheetButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#403837',
  },
  actionSheetButtonDestructive: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E05F4E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionSheetButtonDestructiveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E05F4E',
  },
  actionSheetCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B8680',
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
});
