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

  // Callbacks for integration
  onProgressUpdate: ((episodeId: string, position: number, duration: number) => void) | null;
  onEpisodeComplete: (() => void) | null;
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
    onProgressUpdate: null,
    onEpisodeComplete: null,

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
      console.log('[AudioStore] Initializing with RNTP...');

      set({
        onProgressUpdate: callbacks.onProgressUpdate,
        onEpisodeComplete: callbacks.onEpisodeComplete,
      });

      // Progress persistence on track change
      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        // Save position for the track we're leaving
        if (event.lastTrack && event.lastPosition !== undefined) {
          const { onProgressUpdate } = get();

          // Use duration from the track metadata only - DO NOT call getProgress() here
          // because after track change, getProgress() returns data for the NEW track, not the old one!
          const duration = event.lastTrack.duration || 0;

          // Only save if we have a valid duration from track metadata
          // Also validate that position isn't greater than duration (sanity check)
          if (duration > 0 && event.lastPosition <= duration) {
            console.log('[AudioStore] Track changed, saving progress for:', event.lastTrack.id, 'position:', Math.floor(event.lastPosition));
            onProgressUpdate?.(event.lastTrack.id!, event.lastPosition, duration);
            // Save per-track position for queue restoration
            await saveTrackPositionLocal(event.lastTrack.id!, event.lastPosition);
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

      // Episode completion
      TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
        const { onEpisodeComplete, hasShownCompletion } = get();

        // Show celebration screen if not already shown
        if (!hasShownCompletion && event.track) {
          console.log('[AudioStore] Episode completed! Showing celebration screen');
          set({ hasShownCompletion: true });
          onEpisodeComplete?.();
        }

        // Always clear the queue when it ends so mini player doesn't show stale track
        console.log('[AudioStore] Queue ended, clearing player');
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

          // Minimum duration threshold (60 seconds) - don't save if duration seems wrong
          // This prevents saving bad data while the track is still loading/buffering
          const MIN_VALID_DURATION = 60;

          if (track?.id && progress.duration >= MIN_VALID_DURATION) {
            const { onProgressUpdate, onEpisodeComplete, hasShownCompletion } = get();
            console.log('[AudioStore] Periodic save - position:', Math.floor(progress.position), 'duration:', Math.floor(progress.duration));
            onProgressUpdate?.(track.id, progress.position, progress.duration);

            // Also persist to AsyncStorage for app restart recovery
            await AsyncStorage.setItem('lastPlayingPosition', progress.position.toString());
            await AsyncStorage.setItem('lastPlayingEpisode', track.id);
            // Save per-track position
            await saveTrackPositionLocal(track.id, progress.position);

            // Check for completion (>= 98% progress) as backup detection
            const progressPercent = progress.position / progress.duration;
            if (progressPercent >= 0.98 && !hasShownCompletion) {
              console.log('[AudioStore] Episode nearly complete (98%+), showing celebration screen');
              set({ hasShownCompletion: true });
              onEpisodeComplete?.();
            }
          } else if (track?.id && progress.duration < MIN_VALID_DURATION) {
            console.log('[AudioStore] Skipping save - duration too short (still loading?):', progress.duration);
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
          // Track ended - clear the queue to hide mini player
          console.log('[AudioStore] Playback ended, clearing player');
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
            set({ progressIntervalId: null });
          }
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
