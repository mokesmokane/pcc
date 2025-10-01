import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Player } from './components/player/Player';
import { ChaptersSection } from './components/player/ChaptersSection';
import { ChaptersSheet } from './components/player/ChaptersSheet';
import { CommentsSection } from './components/player/CommentsSection';
import { DiscussionSheet } from './components/player/DiscussionSheet';
import { ReplySheet } from './components/player/ReplySheet';
import { MiniPlayer } from './components/player/MiniPlayer';
import { UpNextSheet } from './components/player/UpNextSheet';
import { MembersSection } from './components/player/MembersSection';
import { MembersSheet } from './components/player/MembersSheet';
import { MeetupsSection } from './components/player/MeetupsSection';
import { MeetupsSheet } from './components/player/MeetupsSheet';
import { PlaybackSpeedModal } from './components/player/PlaybackSpeedModal';
import { PlayerHeader } from './components/player/PlayerHeader';
import { SleepTimerModal } from './components/player/SleepTimerModal';
import { TranscriptSection } from './components/player/TranscriptSection';
import { TranscriptSheet } from './components/player/TranscriptSheet';
import { useAudio } from './contexts/AudioContextExpo';
import { useComments } from './contexts/CommentsContext';
import { usePodcastMetadata } from './contexts/PodcastMetadataContext';
import { downloadService } from './services/downloadService';
import InPersonClubSection from './components/InPersonClubSection';
import PoddleboxSection from './components/PoddleboxSection';

// Wrapper component for ReplySheet with animated MiniPlayer
function ReplySheetWithMiniPlayer({
  visible,
  onClose,
  parentComment,
  replies,
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlayPause,
  onSkipBackward,
  onSubmitReply,
  onReact,
  onAnimationComplete
}: any) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      Animated.spring(animatedValue, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else if (isAnimating) {
      // Animate out before unmounting
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    }
  }, [visible]);

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <>
      {/* MiniPlayer with animation */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 5,
          },
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
          <MiniPlayer
            title={currentTrack?.title}
            artist={currentTrack?.artist}
            artwork={currentTrack?.artwork}
            isPlaying={isPlaying}
            progress={progress}
            position={position}
            duration={duration}
            onPlayPause={onPlayPause}
            onPress={onClose}
            onSkipBackward={onSkipBackward}
          />
        </SafeAreaView>
      </Animated.View>

      {/* Reply Sheet */}
      <ReplySheet
        visible={visible}
        onClose={onClose}
        parentComment={parentComment}
        replies={replies}
        onSubmitReply={onSubmitReply}
        onReact={onReact}
      />
    </>
  );
}

export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    playbackRate,
    sleepTimer,
    play,
    pause,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setSleepTimer,
    seekTo,
    addToQueue,
    playNow,
  } = useAudio();
  const { submitComment, getReplies, addReaction } = useComments();
  const { getEpisodeProgress } = usePodcastMetadata();

  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showPlaybackRate, setShowPlaybackRate] = useState(false);
  const [showFullDiscussion, setShowFullDiscussion] = useState(false);
  const [discussionExpanded, setDiscussionExpanded] = useState(false);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [chaptersExpanded, setChaptersExpanded] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [showMeetups, setShowMeetups] = useState(false);
  const [meetupsExpanded, setMeetupsExpanded] = useState(false);
  const [episodeData, setEpisodeData] = useState<any>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showReplySheet, setShowReplySheet] = useState(false);
  const [replySheetMounted, setReplySheetMounted] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [showUpNext, setShowUpNext] = useState(false);

  // Check if we're in preview mode (viewing an episode that's not currently loaded)
  const isPreviewMode = params.trackId && currentTrack?.id !== params.trackId;
  const previewDuration = params.trackDuration ? parseFloat(params.trackDuration as string) : undefined;
  const previewPosition = params.trackPosition ? parseFloat(params.trackPosition as string) : 0;

  // Load replies when a comment is selected
  useEffect(() => {
    if (selectedComment && (params.trackId || currentTrack?.id)) {
      const episodeId = params.trackId as string || currentTrack?.id;
      getReplies(episodeId, selectedComment.id)
        .then(setReplies)
        .catch(err => console.error('Failed to load replies:', err));
    }
  }, [selectedComment, params.trackId, currentTrack?.id]);

  // Load episode data if we have a trackId but no currentTrack
  useEffect(() => {
    const loadEpisode = async () => {
      // Just set episode data for preview - don't add to queue
      // The queue will be updated when user presses play via playNow()
      if (params.trackId && !episodeData) {
        if (params.trackTitle) {
          const data = {
            id: params.trackId,
            episode_title: params.trackTitle,
            podcast_title: params.trackArtist,
            artwork_url: params.trackArtwork,
            audio_url: params.trackAudioUrl,
            episode_description: params.trackDescription,
            duration: 0,
          };

          setEpisodeData(data);
        }
      }
    };

    loadEpisode();
  }, [params.trackId]); // Remove currentTrack and addToQueue to prevent infinite loop

  // The AudioContext already handles resuming from saved position,
  // so we don't need this effect anymore

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
    const episode = episodeData || currentTrack;

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
      const audioUrl = episodeData?.audio_url || currentTrack?.url;
      if (!audioUrl) {
        throw new Error('No audio URL available');
      }

      await downloadService.downloadEpisode(
        episodeId,
        audioUrl,
        {
          title: episodeData?.episode_title || currentTrack?.title || '',
          podcast_title: episodeData?.podcast_title || currentTrack?.artist || '',
          artwork_url: episodeData?.artwork_url || currentTrack?.artwork,
        },
        (progress: number) => {
          // Progress callback - we could set state here if needed
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#F4F1ED" barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PlayerHeader onQueuePress={() => setShowUpNext(true)} />

        <Player
          artwork={params.trackArtwork || currentTrack?.artwork || episodeData?.artwork_url}
          title={params.trackTitle || currentTrack?.title || episodeData?.episode_title}
          artist={params.trackArtist || currentTrack?.artist || episodeData?.podcast_title}
          episodeId={typeof params.episodeId === 'string' ? params.episodeId : params.episodeId?.[0]}
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

        {/* Limited Comments Section */}
        <View style={styles.sectionWrapper}>
          <CommentsSection
            episodeId={params.trackId as string || currentTrack?.id}
            maxComments={2}
            onViewAll={() => {
              setShowFullDiscussion(true);
              setDiscussionExpanded(true);
            }}
            onInputPress={() => {
              setShouldFocusInput(true);
              setShowFullDiscussion(true);
              setDiscussionExpanded(true);
            }}
            onReply={(comment) => {
              setSelectedComment(comment);
              setShowReplySheet(true);
              setReplySheetMounted(true);
            }}
            onViewReplies={(comment) => {
              setSelectedComment(comment);
              setShowReplySheet(true);
              setReplySheetMounted(true);
            }}
            onFetchReplies={async (commentId) => {
              const episodeId = params.trackId as string || currentTrack?.id;
              if (episodeId) {
                return await getReplies(episodeId, commentId);
              }
              return [];
            }}
          />
        </View>
            <View style={styles.sectionWrapper}>
          <PoddleboxSection />
        </View>
        {/* Chapters Section */}
        <View style={styles.sectionWrapper}>
          <ChaptersSection
            episodeId={params.trackId as string || currentTrack?.id}
            onViewAll={() => {
              setShowChapters(true);
              setChaptersExpanded(true);
            }}
            onChapterPress={(startSeconds) => seekTo(startSeconds)}
          />
        </View>

        {/* Members Section */}
        <View style={styles.sectionWrapper}>
          <MembersSection
            episodeId={params.trackId as string || currentTrack?.id}
            limitMembers={6}
            onViewAll={() => {
              setShowMembers(true);
              setMembersExpanded(true);
            }}
            progressPercentage={duration > 0 ? (position / duration) * 100 : 0}
          />
        </View>

        {/* Transcript Section */}
        <View style={styles.sectionWrapper}>
          <TranscriptSection
            episodeId={params.trackId as string || currentTrack?.id}
            currentPosition={position}
            onViewAll={() => {
              setShowTranscript(true);
              setTranscriptExpanded(true);
            }}
          />
        </View>

        {/* Meetups Section */}
        <View style={styles.sectionWrapper}>
          <MeetupsSection
            episodeId={Array.isArray(params.trackId) ? params.trackId[0] : (params.trackId || currentTrack?.id)}
            onViewAll={() => {
              setShowMeetups(true);
              setMeetupsExpanded(true);
            }}
          />
        </View>
        
      </ScrollView>

      <PlaybackSpeedModal
        visible={showPlaybackRate}
        currentRate={playbackRate}
        onClose={() => setShowPlaybackRate(false)}
        onSelectRate={setPlaybackRate}
      />

      <SleepTimerModal
        visible={showSleepTimer}
        currentTimer={sleepTimer}
        onClose={() => setShowSleepTimer(false)}
        onSelectTimer={setSleepTimer}
      />

      {/* Full Discussion Sheet - Shows when View all is clicked */}
      {showFullDiscussion && (
        <DiscussionSheet
          visible={showFullDiscussion}
          expanded={discussionExpanded}
          onToggleExpand={() => {
            if (discussionExpanded) {
              // When collapsing, also hide the sheet entirely
              setDiscussionExpanded(false);
              setShouldFocusInput(false);
              setTimeout(() => setShowFullDiscussion(false), 300);
            } else {
              setDiscussionExpanded(true);
            }
          }}
          episodeId={Array.isArray(params.trackId) ? params.trackId[0] : (params.trackId || currentTrack?.id)}
          currentTrack={{
            title: (currentTrack?.title || episodeData?.episode_title || params.trackTitle) as string,
            artist: (currentTrack?.artist || episodeData?.podcast_title || params.trackArtist) as string,
            artwork: (currentTrack?.artwork || episodeData?.artwork_url || params.trackArtwork) as string,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBackward={skipBackward}
          autoFocusInput={shouldFocusInput}
        />
      )}

      {/* Transcript Sheet - Shows when View all is clicked */}
      {showTranscript && (
        <TranscriptSheet
          visible={showTranscript}
          expanded={transcriptExpanded}
          onToggleExpand={() => {
            if (transcriptExpanded) {
              // When collapsing, also hide the sheet entirely
              setTranscriptExpanded(false);
              setTimeout(() => setShowTranscript(false), 300);
            } else {
              setTranscriptExpanded(true);
            }
          }}
          episodeId={params.trackId as string || currentTrack?.id}
          currentTrack={{
            title: (currentTrack?.title || episodeData?.episode_title || params.trackTitle) as string,
            artist: (currentTrack?.artist || episodeData?.podcast_title || params.trackArtist) as string,
            artwork: (currentTrack?.artwork || episodeData?.artwork_url || params.trackArtwork) as string,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBackward={skipBackward}
        />
      )}

      {/* Chapters Sheet - Shows when View all is clicked */}
      {showChapters && (
        <ChaptersSheet
          visible={showChapters}
          expanded={chaptersExpanded}
          onToggleExpand={() => {
            if (chaptersExpanded) {
              // When collapsing, also hide the sheet entirely
              setChaptersExpanded(false);
              setTimeout(() => setShowChapters(false), 300);
            } else {
              setChaptersExpanded(true);
            }
          }}
          currentTrack={{
            title: (currentTrack?.title || episodeData?.episode_title || params.trackTitle) as string,
            artist: (currentTrack?.artist || episodeData?.podcast_title || params.trackArtist) as string,
            artwork: (currentTrack?.artwork || episodeData?.artwork_url || params.trackArtwork) as string,
            episodeId: params.trackId as string || currentTrack?.id,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBackward={skipBackward}
          onChapterPress={(startSeconds) => seekTo(startSeconds)}
        />
      )}

      {/* Members Sheet - Shows when View all is clicked */}
      {showMembers && (
        <MembersSheet
          visible={showMembers}
          expanded={membersExpanded}
          episodeId={params.trackId as string || currentTrack?.id}
          onToggleExpand={() => {
            if (membersExpanded) {
              // When collapsing, also hide the sheet entirely
              setMembersExpanded(false);
              setTimeout(() => setShowMembers(false), 300);
            } else {
              setMembersExpanded(true);
            }
          }}
          currentTrack={{
            title: (currentTrack?.title || episodeData?.episode_title || params.trackTitle) as string,
            artist: (currentTrack?.artist || episodeData?.podcast_title || params.trackArtist) as string,
            artwork: (currentTrack?.artwork || episodeData?.artwork_url || params.trackArtwork) as string,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBackward={skipBackward}
        />
      )}

      {/* Meetups Sheet - Shows when View all is clicked */}
      {showMeetups && (
        <MeetupsSheet
          visible={showMeetups}
          expanded={meetupsExpanded}
          episodeId={Array.isArray(params.trackId) ? params.trackId[0] : (params.trackId || currentTrack?.id)}
          onToggleExpand={() => {
            if (meetupsExpanded) {
              // When collapsing, also hide the sheet entirely
              setMeetupsExpanded(false);
              setTimeout(() => setShowMeetups(false), 300);
            } else {
              setMeetupsExpanded(true);
            }
          }}
          currentTrack={{
            title: (currentTrack?.title || episodeData?.episode_title || params.trackTitle) as string,
            artist: (currentTrack?.artist || episodeData?.podcast_title || params.trackArtist) as string,
            artwork: (currentTrack?.artwork || episodeData?.artwork_url || params.trackArtwork) as string,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBackward={skipBackward}
        />
      )}

      {/* Reply Sheet with animated MiniPlayer */}
      {replySheetMounted && (
        <ReplySheetWithMiniPlayer
          visible={showReplySheet}
          onClose={() => {
            setShowReplySheet(false);
            // Don't clear data yet, let animation finish
          }}
          onAnimationComplete={() => {
            // Clear data after animation completes
            setReplySheetMounted(false);
            setSelectedComment(null);
            setReplies([]);
          }}
          parentComment={selectedComment}
          replies={replies}
          currentTrack={{
            title: currentTrack?.title || episodeData?.episode_title || params.trackTitle as string,
            artist: currentTrack?.artist || episodeData?.podcast_title || params.trackArtist as string,
            artwork: currentTrack?.artwork || episodeData?.artwork_url || params.trackArtwork as string,
          }}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSkipBackward={skipBackward}
          onSubmitReply={async (text: string) => {
            const trackId = Array.isArray(params.trackId) ? params.trackId[0] : params.trackId;
            const episodeId = trackId || currentTrack?.id;
            if (episodeId && selectedComment) {
              await submitComment(episodeId, text, selectedComment.id);
              // Reload replies after submission
              const newReplies = await getReplies(episodeId, selectedComment.id);
              setReplies(newReplies);
            }
          }}
          onReact={async (commentId: string, emoji: string) => {
            await addReaction(commentId, emoji);
          }}
        />
      )}

      {/* Up Next Sheet */}
      <UpNextSheet
        visible={showUpNext}
        onClose={() => setShowUpNext(false)}
        onTrackPress={async (track) => {
          // Navigate to the selected track from queue
          const progress = await getEpisodeProgress(track.id);
          router.push({
            pathname: '/player',
            params: {
              trackId: track.id,
              trackTitle: track.title,
              trackArtist: track.artist,
              trackArtwork: track.artwork,
              trackAudioUrl: track.url,
              trackDescription: track.description,
              trackDuration: progress?.totalDuration?.toString() || track.duration?.toString() || '0',
              trackPosition: progress?.currentPosition?.toString() || '0',
            },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  miniPlayerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginTop: 20,
    marginHorizontal: 16,
  },
});