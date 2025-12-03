import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACK_POSITIONS_KEY = '@track_positions';

// Save position for a specific track (local helper to avoid circular deps)
async function saveTrackPositionLocal(trackId: string, position: number): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
    const positions: Record<string, number> = stored ? JSON.parse(stored) : {};
    positions[trackId] = position;
    await AsyncStorage.setItem(TRACK_POSITIONS_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('[AudioStore] Failed to save track position:', error);
  }
}

// Get saved position for a specific track
async function getTrackPositionLocal(trackId: string): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
    if (!stored) return 0;
    const positions: Record<string, number> = JSON.parse(stored);
    return positions[trackId] || 0;
  } catch (error) {
    console.error('[AudioStore] Failed to get track position:', error);
    return 0;
  }
}

// Clear saved position for a track (when completed)
async function clearTrackPositionLocal(trackId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
    if (!stored) return;
    const positions: Record<string, number> = JSON.parse(stored);
    delete positions[trackId];
    await AsyncStorage.setItem(TRACK_POSITIONS_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('[AudioStore] Failed to clear track position:', error);
  }
}

// Progress save interval in ms (save every 10 seconds during playback)
const PROGRESS_SAVE_INTERVAL = 10000;

/**
 * Simplified Audio Store for RNTP
 * Only manages app-specific state - playback state is handled by RNTP hooks
 */

interface AudioState {
  // App-specific state (RNTP handles playback state)
  sleepTimer: number | null;
  sleepTimerTimeoutId: NodeJS.Timeout | null;
  hasShownCompletion: boolean;
  playbackRate: number;
  progressIntervalId: NodeJS.Timeout | null;
  isInitialized: boolean;

  // Callbacks for integration
  onProgressUpdate: ((episodeId: string, position: number, duration: number) => void) | null;
  onEpisodeComplete: (() => void) | null;
  onTrackFinished: ((trackId: string, trackTitle: string, trackArtist?: string, trackArtwork?: string) => void) | null;
}

interface AudioActions {
  // Settings
  setSleepTimer: (minutes: number | null) => void;
  setPlaybackRate: (rate: number) => Promise<void>;
  setHasShownCompletion: (value: boolean) => void;

  // Initialization
  initialize: (callbacks: {
    onProgressUpdate: (episodeId: string, position: number, duration: number) => void;
    onEpisodeComplete: () => void;
    onTrackFinished: (trackId: string, trackTitle: string, trackArtist?: string, trackArtwork?: string) => void;
  }) => void;

  // Cleanup
  cleanup: () => void;
}

type AudioStore = AudioState & AudioActions;

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sleepTimer: null,
    sleepTimerTimeoutId: null,
    hasShownCompletion: false,
    playbackRate: 1,
    progressIntervalId: null,
    isInitialized: false,
    onProgressUpdate: null,
    onEpisodeComplete: null,
    onTrackFinished: null,

    setHasShownCompletion: (value) => set({ hasShownCompletion: value }),

    setPlaybackRate: async (rate) => {
      await TrackPlayer.setRate(rate);
      set({ playbackRate: rate });
    },

    setSleepTimer: (minutes) => {
      const { sleepTimerTimeoutId } = get();

      // Clear existing timer
      if (sleepTimerTimeoutId) {
        clearTimeout(sleepTimerTimeoutId);
        set({ sleepTimerTimeoutId: null });
      }

      if (minutes === null) {
        set({ sleepTimer: null, sleepTimerTimeoutId: null });
        return;
      }

      const timeoutId = setTimeout(async () => {
        console.log('[AudioStore] Sleep timer triggered, pausing playback');
        await TrackPlayer.pause();
        set({ sleepTimer: null, sleepTimerTimeoutId: null });
      }, minutes * 60 * 1000);

      set({ sleepTimer: minutes, sleepTimerTimeoutId: timeoutId });
    },

    initialize: (callbacks) => {
      const { isInitialized } = get();

      // Prevent multiple initializations - this causes duplicate event listeners!
      if (isInitialized) {
        console.log('[AudioStore] Already initialized, skipping...');
        // Just update callbacks
        set({
          onProgressUpdate: callbacks.onProgressUpdate,
          onEpisodeComplete: callbacks.onEpisodeComplete,
          onTrackFinished: callbacks.onTrackFinished,
        });
        return;
      }

      console.log('[AudioStore] Initializing with RNTP...');

      set({
        isInitialized: true,
        onProgressUpdate: callbacks.onProgressUpdate,
        onEpisodeComplete: callbacks.onEpisodeComplete,
        onTrackFinished: callbacks.onTrackFinished,
      });

      // Progress persistence on track change
      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        console.log('[AudioStore] 🔄 PlaybackActiveTrackChanged fired', {
          lastTrackId: event.lastTrack?.id,
          lastTrackDuration: event.lastTrack?.duration,
          lastPosition: event.lastPosition,
          newTrackId: event.track?.id,
        });

        // Save position for the track we're leaving
        if (event.lastTrack && event.lastPosition !== undefined) {
          const { onProgressUpdate, onTrackFinished } = get();

          // Use duration from the track metadata
          let duration = event.lastTrack.duration || 0;

          // FALLBACK: If no duration in metadata but position is substantial (>10 min),
          // assume track finished naturally. RNTP only auto-advances when track ends,
          // so lastPosition IS approximately the duration.
          // Using 10 min threshold because nobody listens 10+ min then manually skips.
          const MIN_POSITION_FOR_INFERRED_FINISH = 600; // 10 minutes
          const inferredFinish = duration <= 0 && event.lastPosition >= MIN_POSITION_FOR_INFERRED_FINISH;

          if (inferredFinish) {
            console.log('[AudioStore] 🔄 No duration in metadata, inferring finish from position:', Math.floor(event.lastPosition));
            duration = event.lastPosition; // Treat position as duration (makes secondsRemaining ≈ 0)
          }

          // Only save if we have a valid duration
          // Also validate that position isn't greater than duration (sanity check)
          if (duration > 0 && event.lastPosition <= duration) {
            console.log('[AudioStore] Track changed, saving progress for:', event.lastTrack.id, 'position:', Math.floor(event.lastPosition));
            onProgressUpdate?.(event.lastTrack.id!, event.lastPosition, duration);

            // Check if track finished naturally (within 15 seconds of the end)
            const secondsRemaining = duration - event.lastPosition;
            const trackFinished = secondsRemaining <= 15;

            console.log('[AudioStore] 🔄 Completion check:', {
              duration,
              lastPosition: event.lastPosition,
              secondsRemaining,
              trackFinished,
            });

            if (trackFinished) {
              console.log('[AudioStore] ✅ Track finished naturally:', event.lastTrack.id);

              // Clear saved position for the finished track
              await clearTrackPositionLocal(event.lastTrack.id!);

              // Trigger callback for navigation and rating modal
              console.log('[AudioStore] 📢 Calling onTrackFinished (ActiveTrackChanged), callback exists:', !!onTrackFinished);
              onTrackFinished?.(event.lastTrack.id!, event.lastTrack.title || 'Episode', event.lastTrack.artist, event.lastTrack.artwork);

              // Remove finished track from queue AFTER a delay to let RNTP settle
              const finishedTrackId = event.lastTrack.id!;
              setTimeout(async () => {
                try {
                  const queue = await TrackPlayer.getQueue();
                  const finishedIndex = queue.findIndex(t => t.id === finishedTrackId);
                  if (finishedIndex !== -1) {
                    console.log('[AudioStore] Removing finished track from queue:', finishedTrackId);
                    await TrackPlayer.remove(finishedIndex);
                  }
                } catch (error) {
                  console.error('[AudioStore] Error removing finished track:', error);
                }
              }, 500);
            } else {
              // Save per-track position for queue restoration (only if not finished)
              await saveTrackPositionLocal(event.lastTrack.id!, event.lastPosition);
            }
          } else if (duration <= 0) {
            console.warn('[AudioStore] Skipping save - no valid duration in track metadata for:', event.lastTrack.id);
          } else {
            console.warn('[AudioStore] Skipping save - position > duration for:', event.lastTrack.id, 'pos:', event.lastPosition, 'dur:', duration);
          }

          // Save to AsyncStorage for quick recovery
          await AsyncStorage.setItem('lastPlayingPosition', event.lastPosition.toString());
          await AsyncStorage.setItem('lastPlayingEpisode', event.lastTrack.id!);
        }

        // Restore position for the new track and reset completion flag
        if (event.track) {
          await AsyncStorage.setItem('lastPlayingEpisodeId', event.track.id!);
          // Reset completion flag so confetti can show for this new episode
          set({ hasShownCompletion: false });

          // Seek to saved position for this track (if any)
          const savedPosition = await getTrackPositionLocal(event.track.id!);
          if (savedPosition > 0) {
            console.log('[AudioStore] Restoring position for new track:', event.track.id, 'position:', Math.floor(savedPosition));
            // Small delay to ensure track is ready
            setTimeout(async () => {
              try {
                await TrackPlayer.seekTo(savedPosition);
              } catch (error) {
                console.error('[AudioStore] Failed to seek to saved position:', error);
              }
            }, 100);
          }
        }
      });

      // Episode completion (last track in queue finished)
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
        const { onTrackFinished } = get();

        console.log('[AudioStore] 🏁 PlaybackQueueEnded fired', {
          trackId: event.track?.id,
          trackTitle: event.track?.title,
          position: event.position,
        });

        // If we have a track that just ended, it finished playing
        if (event.track) {
          console.log('[AudioStore] ✅ Last track in queue finished:', event.track.id);

          // Clear saved position for the finished track
          await clearTrackPositionLocal(event.track.id!);

          // Trigger callback for navigation and rating modal
          console.log('[AudioStore] 📢 Calling onTrackFinished (QueueEnded), callback exists:', !!onTrackFinished);
          onTrackFinished?.(event.track.id!, event.track.title || 'Episode', event.track.artist, event.track.artwork);
        } else {
          console.log('[AudioStore] ⚠️ QueueEnded but event.track is undefined!');
        }

        // Always clear the queue when it ends so mini player doesn't show stale track
        console.log('[AudioStore] Clearing player');
        await TrackPlayer.reset();
      });

      // Track playback errors
      TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[AudioStore] Playback error:', event);
      });

      // Helper function to save current progress
      const saveCurrentProgress = async () => {
        try {
          const track = await TrackPlayer.getActiveTrack();
          const progress = await TrackPlayer.getProgress();

          // IMPORTANT: Don't save near-zero position if we have a saved position for this track
          // This prevents overwriting real progress when save fires before seek completes
          if (track?.id && progress.position < 5) {
            const savedPosition = await getTrackPositionLocal(track.id);
            if (savedPosition > 10) {
              return;
            }
          }

          // Minimum duration threshold (60 seconds) - don't save if duration seems wrong
          // This prevents saving bad data while the track is still loading/buffering
          const MIN_VALID_DURATION = 60;

          if (track?.id && progress.duration >= MIN_VALID_DURATION) {
            const { onProgressUpdate } = get();
            onProgressUpdate?.(track.id, progress.position, progress.duration);

            // Also persist to AsyncStorage for app restart recovery
            await AsyncStorage.setItem('lastPlayingPosition', progress.position.toString());
            await AsyncStorage.setItem('lastPlayingEpisode', track.id);
            // Save per-track position
            await saveTrackPositionLocal(track.id, progress.position);
          }
        } catch (error) {
          console.error('[AudioStore] Error saving progress:', error);
        }
      };

      // Start/stop progress interval based on playback state
      TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
        const { progressIntervalId } = get();

        if (event.state === State.Playing) {
          // Start progress interval if not already running
          if (!progressIntervalId) {
            console.log('[AudioStore] Starting progress save interval');
            const intervalId = setInterval(saveCurrentProgress, PROGRESS_SAVE_INTERVAL);
            set({ progressIntervalId: intervalId });
          }
          // Save on play start too
          await saveCurrentProgress();
        } else if (event.state === State.Paused || event.state === State.Stopped) {
          // Stop progress interval and save immediately
          if (progressIntervalId) {
            console.log('[AudioStore] Stopping progress save interval');
            clearInterval(progressIntervalId);
            set({ progressIntervalId: null });
          }
          // Save progress immediately on pause
          await saveCurrentProgress();
        } else if (event.state === State.Ended) {
          // Track ended - this fires when a single track finishes (no more in queue)
          console.log('[AudioStore] ⏹️ State.Ended fired');
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
            set({ progressIntervalId: null });
          }

          // Get track info before resetting
          const { onTrackFinished } = get();
          console.log('[AudioStore] ⏹️ Getting active track...');
          try {
            const track = await TrackPlayer.getActiveTrack();
            console.log('[AudioStore] ⏹️ Active track:', track?.id || 'NULL', track?.title || '');
            if (track) {
              console.log('[AudioStore] ✅ Track finished (State.Ended):', track.id);
              // Clear saved position for the finished track
              await clearTrackPositionLocal(track.id!);
              // Trigger callback for navigation and rating modal
              console.log('[AudioStore] 📢 Calling onTrackFinished (State.Ended), callback exists:', !!onTrackFinished);
              onTrackFinished?.(track.id!, track.title || 'Episode', track.artist, track.artwork);
            } else {
              console.log('[AudioStore] ⚠️ State.Ended but getActiveTrack() returned null!');
            }
          } catch (error) {
            console.error('[AudioStore] Error getting track info on end:', error);
          }

          // Clear the queue to hide mini player
          await TrackPlayer.reset();
        }
      });

      // Save progress on remote seek (lock screen, notification)
      TrackPlayer.addEventListener(Event.RemoteSeek, async () => {
        // Small delay to let the seek complete
        setTimeout(saveCurrentProgress, 100);
      });

      console.log('[AudioStore] Initialization complete');
    },

    cleanup: () => {
      const { sleepTimerTimeoutId, progressIntervalId } = get();

      if (sleepTimerTimeoutId) {
        clearTimeout(sleepTimerTimeoutId);
      }

      if (progressIntervalId) {
        clearInterval(progressIntervalId);
      }

      set({
        sleepTimerTimeoutId: null,
        sleepTimer: null,
        progressIntervalId: null,
      });
    },
  }))
);

// Selectors for optimized re-renders
export const selectPlaybackRate = (state: AudioStore) => state.playbackRate;
export const selectSleepTimer = (state: AudioStore) => state.sleepTimer;
export const selectHasShownCompletion = (state: AudioStore) => state.hasShownCompletion;
