import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../services/audio/expoAudioService';
import { expoAudioService } from '../services/audio/expoAudioService';
import { mediaNotificationService } from '../services/audio/mediaNotificationService';

const PROGRESS_SAVE_INTERVAL = 5000; // Save progress every 5 seconds

interface AudioState {
  // Playback state
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  buffered: number;

  // Track state
  currentTrack: Track | null;
  queue: Track[];

  // Settings
  playbackRate: number;
  sleepTimer: number | null;

  // Internal refs (stored as state for reactivity)
  progressSaveIntervalId: NodeJS.Timeout | null;
  sleepTimerTimeoutId: NodeJS.Timeout | null;
  hasShownCompletion: boolean;
}

interface AudioActions {
  // Playback controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: () => Promise<void>;
  skipBackward: () => Promise<void>;

  // Queue management
  addToQueue: (episode: any) => Promise<Track>;
  playNext: (episode: any) => Promise<void>;
  playNow: (episode: any, startPosition?: number) => Promise<void>;
  removeFromQueue: (trackId: string) => Promise<void>;
  clearQueue: () => Promise<void>;

  // Settings
  setPlaybackRate: (rate: number) => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;

  // Internal state updates
  setIsPlaying: (isPlaying: boolean) => void;
  setIsBuffering: (isBuffering: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  setCurrentTrack: (track: Track | null) => void;
  setQueue: (queue: Track[]) => void;
  setHasShownCompletion: (value: boolean) => void;

  // Initialization
  initialize: (
    updateEpisodeProgress: (episodeId: string, position: number, duration: number) => Promise<void>,
    getEpisodeProgress: (episodeId: string) => Promise<{ currentPosition: number } | null>,
    flushProgressSync: () => Promise<void>,
    navigateToComplete: () => void
  ) => Promise<void>;

  // Progress tracking
  saveProgress: (episodeId: string, currentPosition: number, totalDuration: number) => Promise<void>;

  // Cleanup
  cleanup: () => void;
}

type AudioStore = AudioState & AudioActions;

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isPlaying: false,
    isBuffering: false,
    position: 0,
    duration: 0,
    buffered: 0,
    currentTrack: null,
    queue: [],
    playbackRate: 1,
    sleepTimer: null,
    progressSaveIntervalId: null,
    sleepTimerTimeoutId: null,
    hasShownCompletion: false,

    // Internal state setters
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setIsBuffering: (isBuffering) => set({ isBuffering }),
    setPosition: (position) => set({ position }),
    setDuration: (duration) => set({ duration }),
    setBuffered: (buffered) => set({ buffered }),
    setCurrentTrack: (track) => set({ currentTrack: track }),
    setQueue: (queue) => set({ queue }),
    setHasShownCompletion: (value) => set({ hasShownCompletion: value }),

    // Progress tracking
    saveProgress: async (episodeId, currentPosition, totalDuration) => {
      try {
        // Save to local storage for quick recovery
        await AsyncStorage.setItem('lastPlayingPosition', currentPosition.toString());
        await AsyncStorage.setItem('lastPlayingEpisode', episodeId);

        // Progress sync will be handled by the component that calls initialize
        // This is temporary until PodcastMetadataContext is migrated to React Query
      } catch (error) {
        console.error('[AudioStore] Error saving progress:', error);
      }
    },

    // Playback controls
    play: async () => {
      await expoAudioService.play();
    },

    pause: async () => {
      const { currentTrack, position, duration, saveProgress } = get();
      await expoAudioService.pause();

      // Save progress when pausing
      if (currentTrack) {
        await saveProgress(currentTrack.id, position, duration);
      }
    },

    seekTo: async (seconds) => {
      await expoAudioService.seekTo(seconds);
    },

    skipForward: async () => {
      await expoAudioService.skipForward(30);
    },

    skipBackward: async () => {
      set({ hasShownCompletion: false }); // Reset completion flag
      await expoAudioService.skipBackward(15);
    },

    // Queue management
    addToQueue: async (episode): Promise<Track> => {
      const track: Track = {
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: episode.podcast_title,
        artwork: episode.artwork_url || '',
        duration: episode.duration,
        description: episode.description,
      };

      console.log('[AudioStore] Adding track to queue:', track);
      await expoAudioService.addTrack(track);
      const updatedQueue = expoAudioService.getQueue();
      set({ queue: updatedQueue });

      // Set as current track if it's the first track
      if (updatedQueue.length === 1) {
        console.log('[AudioStore] Setting current track as it is the first track');
        set({ currentTrack: track });
      }

      return track;
    },

    playNext: async (episode) => {
      const track: Track = {
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: episode.podcast_title,
        artwork: episode.artwork_url || '',
        duration: episode.duration,
        description: episode.description,
      };

      await expoAudioService.addTrack(track);
      const updatedQueue = expoAudioService.getQueue();
      set({ queue: updatedQueue });
    },

    playNow: async (episode, startPosition) => {
      const track: Track = {
        id: episode.id,
        url: episode.audio_url,
        title: episode.title,
        artist: episode.podcast_title,
        artwork: episode.artwork_url || '',
        duration: episode.duration,
        description: episode.description,
      };

      console.log('[AudioStore] Playing track now:', track);

      await expoAudioService.playTrackNow(track, startPosition);
      const updatedQueue = expoAudioService.getQueue();
      set({ queue: updatedQueue, currentTrack: track });
    },

    removeFromQueue: async (trackId) => {
      await expoAudioService.removeTrack(trackId);
      const updatedQueue = expoAudioService.getQueue();
      set({ queue: updatedQueue });
    },

    clearQueue: async () => {
      await expoAudioService.clearQueue();
      set({ queue: [], currentTrack: null });
    },

    // Settings
    setPlaybackRate: async (rate) => {
      await expoAudioService.setRate(rate);
      set({ playbackRate: rate });
    },

    setSleepTimer: (minutes) => {
      const { sleepTimerTimeoutId, isPlaying, pause } = get();

      // Clear existing timer
      if (sleepTimerTimeoutId) {
        clearTimeout(sleepTimerTimeoutId);
        set({ sleepTimerTimeoutId: null });
      }

      set({ sleepTimer: minutes });

      // Set new timer if minutes is not null and audio is playing
      if (minutes && isPlaying) {
        const timeoutId = setTimeout(async () => {
          await pause();
          set({ sleepTimer: null, sleepTimerTimeoutId: null });
        }, minutes * 60 * 1000);

        set({ sleepTimerTimeoutId: timeoutId });
      }
    },

    // Initialization
    initialize: async (
      updateEpisodeProgress,
      getEpisodeProgress,
      flushProgressSync,
      navigateToComplete
    ) => {
      console.log('[AudioStore] Initializing...');

      // Initialize audio service
      await expoAudioService.initialize();
      await mediaNotificationService.initialize();

      // Set up playback status update callback
      expoAudioService.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          const { hasShownCompletion } = get();

          set({
            isPlaying: status.isPlaying,
            isBuffering: status.isBuffering,
            position: status.positionMillis / 1000,
            duration: (status.durationMillis || 0) / 1000,
            buffered: (status.playableDurationMillis || 0) / 1000,
          });

          // Check if episode is completed
          const currentPos = status.positionMillis / 1000;
          const totalDuration = (status.durationMillis || 0) / 1000;

          if (status.didJustFinish && !hasShownCompletion) {
            console.log('[AudioStore] Episode completed! Showing celebration screen');
            set({ hasShownCompletion: true });
            navigateToComplete();
          }

          // Reset completion flag when seeking back
          if (currentPos < totalDuration - 20) {
            set({ hasShownCompletion: false });
          }
        }
      });

      // Set up track change callback
      expoAudioService.setOnTrackChange((track: Track | null) => {
        console.log('[AudioStore] Track changed:', track);
        set({
          currentTrack: track,
          queue: expoAudioService.getQueue(),
        });

        if (track) {
          AsyncStorage.setItem('lastPlayingEpisodeId', track.id);
        }
      });

      // Set up callback to provide saved position
      expoAudioService.setOnGetSavedPosition(async (trackId: string) => {
        try {
          const progress = await getEpisodeProgress(trackId);
          return progress?.currentPosition;
        } catch (error) {
          console.error('[AudioStore] Error getting saved position:', error);
          return undefined;
        }
      });

      // Try to restore last playing episode
      const lastEpisodeId = await AsyncStorage.getItem('lastPlayingEpisodeId');
      if (lastEpisodeId) {
        console.log('[AudioStore] Last playing episode:', lastEpisodeId);
      }

      // Check if there's already a current track in the service
      const existingTrack = expoAudioService.getCurrentTrack();
      const existingQueue = expoAudioService.getQueue();

      if (existingTrack) {
        console.log('[AudioStore] Found existing track in service:', existingTrack);
        set({ currentTrack: existingTrack });

        // Restore saved position for this track
        try {
          const savedProgress = await getEpisodeProgress(existingTrack.id);
          if (savedProgress && savedProgress.currentPosition > 0) {
            console.log('[AudioStore] Restoring saved position on app restart:', savedProgress.currentPosition);
            const currentIndex = expoAudioService.getCurrentIndex();
            if (currentIndex >= 0) {
              await expoAudioService.loadTrack(currentIndex);
              await expoAudioService.seekTo(savedProgress.currentPosition);
            }
          }
        } catch (error) {
          console.error('[AudioStore] Error restoring saved position:', error);
        }
      }

      if (existingQueue.length > 0) {
        console.log('[AudioStore] Found existing queue with', existingQueue.length, 'tracks');
        set({ queue: existingQueue });
      }

      // Set up progress saving interval
      // Note: This will be managed by subscription in a React component
      console.log('[AudioStore] Progress saving will be managed by component subscription');

      // Set up media notification action listeners
      const subscription = mediaNotificationService.setupActionListeners({
        onPlay: async () => {
          const status = await expoAudioService.getStatus();
          if (status?.isLoaded && status.isPlaying) {
            await get().pause();
          } else {
            await get().play();
          }
        },
        onPause: async () => {
          await get().pause();
        },
        onSkipForward: async () => {
          await get().skipForward();
        },
        onSkipBackward: async () => {
          await get().skipBackward();
        },
      });

      console.log('[AudioStore] Initialization complete');
    },

    // Cleanup
    cleanup: () => {
      const { progressSaveIntervalId, sleepTimerTimeoutId } = get();

      if (progressSaveIntervalId) {
        clearInterval(progressSaveIntervalId);
      }

      if (sleepTimerTimeoutId) {
        clearTimeout(sleepTimerTimeoutId);
      }

      set({
        progressSaveIntervalId: null,
        sleepTimerTimeoutId: null,
      });
    },
  }))
);

// Selectors for optimized re-renders
export const selectIsPlaying = (state: AudioStore) => state.isPlaying;
export const selectIsBuffering = (state: AudioStore) => state.isBuffering;
export const selectCurrentTrack = (state: AudioStore) => state.currentTrack;
export const selectQueue = (state: AudioStore) => state.queue;
export const selectPosition = (state: AudioStore) => state.position;
export const selectDuration = (state: AudioStore) => state.duration;
export const selectPlaybackRate = (state: AudioStore) => state.playbackRate;
export const selectSleepTimer = (state: AudioStore) => state.sleepTimer;
