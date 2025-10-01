import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Player } from '../../components/player/Player';
import { PlayerHeader } from '../../components/player/PlayerHeader';
import { PlaybackSpeedModal } from '../../components/player/PlaybackSpeedModal';
import { SleepTimerModal } from '../../components/player/SleepTimerModal';
import { useAudio } from '../../contexts/AudioContextExpo';
import { downloadService } from '../../services/downloadService';

export default function TraditionalPlayerScreen() {
  const params = useLocalSearchParams();
  const {
    isPlaying,
    playbackRate,
    currentTrack,
    play,
    pause,
    skipForward,
    skipBackward,
    setPlaybackRate: setAudioPlaybackRate,
    sleepTimer,
    setSleepTimer,
    playNow,
  } = useAudio();

  const [showPlaybackRate, setShowPlaybackRate] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if we're in preview mode (viewing an episode that's not currently loaded)
  const isPreviewMode = params.trackId && currentTrack?.id !== params.trackId;
  const previewDuration = params.trackDuration ? parseFloat(params.trackDuration as string) : undefined;
  const previewPosition = params.trackPosition ? parseFloat(params.trackPosition as string) : 0;

  // Check download status
  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (params.trackId || currentTrack?.id) {
        const episodeId = (params.trackId || currentTrack?.id) as string;
        const downloaded = await downloadService.isEpisodeDownloaded(episodeId);
        setIsDownloaded(downloaded);
      }
    };

    checkDownloadStatus();
  }, [params.trackId, currentTrack]);

  const handleDownload = async () => {
    const episodeId = (params.trackId || currentTrack?.id) as string;
    const episode = currentTrack;

    if (!episode || !episodeId) {
      Alert.alert('Error', 'No episode to download');
      return;
    }

    if (isDownloaded) {
      await downloadService.deleteDownload(episodeId);
      setIsDownloaded(false);
      return;
    }

    setIsDownloading(true);

    try {
      const audioUrl = currentTrack?.url;
      if (!audioUrl) {
        throw new Error('No audio URL available');
      }

      await downloadService.downloadEpisode(
        episodeId,
        audioUrl,
        {
          title: currentTrack?.title || '',
          podcast_title: currentTrack?.artist || '',
          artwork_url: currentTrack?.artwork,
        },
        (progress: number) => {
          console.log('Download progress:', progress);
        }
      );

      setIsDownloaded(true);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download episode');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePlayPause = async () => {
    // Check if we're in preview mode (viewing an episode that's not loaded)
    const needsToLoad = params.trackId && params.trackAudioUrl && currentTrack?.id !== params.trackId;

    if (needsToLoad) {
      // Load and play the new episode, passing the saved position if available
      await playNow({
        id: params.trackId as string,
        title: params.trackTitle as string || 'Unknown',
        podcast_title: params.trackArtist as string || 'Unknown',
        artwork_url: params.trackArtwork as string,
        audio_url: params.trackAudioUrl as string,
        description: params.trackDescription as string,
      }, previewPosition);
    } else {
      // Normal play/pause toggle for current track
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    }
  };

  const handleSelectRate = (rate: number) => {
    setAudioPlaybackRate(rate);
    setShowPlaybackRate(false);
  };

  const handleSelectTimer = (minutes: number | null) => {
    setSleepTimer(minutes);
    setShowSleepTimer(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#F4F1ED" barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PlayerHeader />

        <Player
          artwork={params.trackArtwork as string || currentTrack?.artwork}
          title={params.trackTitle as string || currentTrack?.title}
          artist={params.trackArtist as string || currentTrack?.artist}
          episodeId={params.trackId as string || currentTrack?.id}
          isDownloaded={isDownloaded}
          isDownloading={isDownloading}
          onDownload={handleDownload}
          isPlaying={isPlaying && !isPreviewMode}
          playbackRate={playbackRate}
          onPlayPause={handlePlayPause}
          onSkipForward={skipForward}
          onSkipBackward={skipBackward}
          onSpeedPress={() => setShowPlaybackRate(true)}
          onSleepTimerPress={() => setShowSleepTimer(true)}
          onSharePress={() => console.log('Share episode')}
          onDownloadPress={handleDownload}
          previewPosition={isPreviewMode ? previewPosition : undefined}
          previewDuration={isPreviewMode ? previewDuration : undefined}
        />
      </ScrollView>

      {/* Playback Speed Modal */}
      <PlaybackSpeedModal
        visible={showPlaybackRate}
        currentRate={playbackRate}
        onClose={() => setShowPlaybackRate(false)}
        onSelectRate={handleSelectRate}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        visible={showSleepTimer}
        currentTimer={sleepTimer}
        onClose={() => setShowSleepTimer(false)}
        onSelectTimer={handleSelectTimer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});