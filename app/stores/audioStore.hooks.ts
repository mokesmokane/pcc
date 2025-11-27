import { useState, useEffect } from 'react';
import TrackPlayer, {
  useProgress,
  usePlaybackState,
  useActiveTrack,
  State,
  Event,
  Track,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useAudioStore,
  selectPlaybackRate,
  selectSleepTimer,
  selectHasShownCompletion,
} from './useAudioStore';
import { playTrackNow, addToQueue, episodeToTrack, type AppTrack } from '../utils/trackHelpers';

const QUEUE_STORAGE_KEY = '@playback_queue';
const CURRENT_TRACK_INDEX_KEY = '@current_track_index';
const TRACK_POSITIONS_KEY = '@track_positions';

// Save queue to AsyncStorage
async function saveQueueToStorage(queue: Track[], currentIndex: number | undefined) {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    if (currentIndex !== undefined) {
      await AsyncStorage.setItem(CURRENT_TRACK_INDEX_KEY, currentIndex.toString());
    }
    console.log('[Queue] Saved queue to storage:', queue.length, 'tracks');
  } catch (error) {
    console.error('[Queue] Failed to save queue:', error);
  }
}

// Save position for a specific track
export async function saveTrackPosition(trackId: string, position: number): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
    const positions: Record<string, number> = stored ? JSON.parse(stored) : {};
    positions[trackId] = position;
    await AsyncStorage.setItem(TRACK_POSITIONS_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('[Queue] Failed to save track position:', error);
  }
}

// Get saved position for a specific track
export async function getTrackPosition(trackId: string): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
    if (!stored) return 0;
    const positions: Record<string, number> = JSON.parse(stored);
    return positions[trackId] || 0;
  } catch (error) {
    console.error('[Queue] Failed to get track position:', error);
    return 0;
  }
}

// Clear position for a track (e.g., when completed)
export async function clearTrackPosition(trackId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
    if (!stored) return;
    const positions: Record<string, number> = JSON.parse(stored);
    delete positions[trackId];
    await AsyncStorage.setItem(TRACK_POSITIONS_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('[Queue] Failed to clear track position:', error);
  }
}

// Restore queue from AsyncStorage
export async function restoreQueueFromStorage(): Promise<{ queue: Track[]; currentIndex: number } | null> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const indexStr = await AsyncStorage.getItem(CURRENT_TRACK_INDEX_KEY);

    if (!queueJson) {
      console.log('[Queue] No saved queue found');
      return null;
    }

    const queue = JSON.parse(queueJson) as Track[];
    const currentIndex = indexStr ? parseInt(indexStr, 10) : 0;

    if (queue.length === 0) {
      console.log('[Queue] Saved queue is empty');
      return null;
    }

    console.log('[Queue] Restored queue from storage:', queue.length, 'tracks, index:', currentIndex);
    return { queue, currentIndex };
  } catch (error) {
    console.error('[Queue] Failed to restore queue:', error);
    return null;
  }
}

// Re-export RNTP hooks for direct use
export { useProgress, usePlaybackState, useActiveTrack };

/**
 * Hook for checking if audio is currently playing
 */
export function useIsPlaying() {
  const { state } = usePlaybackState();
  return state === State.Playing;
}

/**
 * Hook for checking if audio is buffering
 */
export function useIsBuffering() {
  const { state } = usePlaybackState();
  return state === State.Buffering || state === State.Loading;
}

// Helper to save position after seek
async function savePositionAfterSeek() {
  try {
    const track = await TrackPlayer.getActiveTrack();
    const progress = await TrackPlayer.getProgress();
    if (track?.id && progress.position > 0) {
      await AsyncStorage.setItem('lastPlayingPosition', progress.position.toString());
      await AsyncStorage.setItem('lastPlayingEpisode', track.id);
      // Save per-track position
      await saveTrackPosition(track.id, progress.position);
      console.log('[PlaybackControls] Saved position after seek:', Math.floor(progress.position));
    }
  } catch (error) {
    console.error('[PlaybackControls] Error saving position:', error);
  }
}

/**
 * Hook for playback controls
 */
export function usePlaybackControls() {
  const seekTo = async (position: number) => {
    await TrackPlayer.seekTo(position);
    // Save position after seek with small delay
    setTimeout(savePositionAfterSeek, 100);
  };

  const skipForward = async () => {
    await TrackPlayer.seekBy(30);
    setTimeout(savePositionAfterSeek, 100);
  };

  const skipBackward = async () => {
    await TrackPlayer.seekBy(-15);
    setTimeout(savePositionAfterSeek, 100);
  };

  return {
    play: TrackPlayer.play,
    pause: TrackPlayer.pause,
    seekTo,
    skipForward,
    skipBackward,
  };
}

/**
 * Hook for current track info with position/duration
 */
export function useCurrentTrack() {
  const { position, duration, buffered } = useProgress();
  const activeTrack = useActiveTrack();

  return {
    currentTrack: activeTrack
      ? {
          id: activeTrack.id,
          url: activeTrack.url,
          title: activeTrack.title,
          artist: activeTrack.artist,
          artwork: activeTrack.artwork,
          duration: activeTrack.duration,
          description: activeTrack.description,
        }
      : null,
    position,
    duration,
    buffered,
  };
}

/**
 * Hook for queue management with reactive queue state
 */
export function useQueue() {
  const [queue, setQueue] = useState<Track[]>([]);

  // Helper to update queue state and persist
  const updateAndPersistQueue = async () => {
    const currentQueue = await TrackPlayer.getQueue();
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    setQueue(currentQueue);
    await saveQueueToStorage(currentQueue, currentIndex);
  };

  // Load initial queue and subscribe to changes
  useEffect(() => {
    // Load initial queue
    TrackPlayer.getQueue().then(setQueue).catch(console.error);

    // Subscribe to queue changes
    const trackAddedSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async () => {
      await updateAndPersistQueue();
    });

    const queueEndedSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      const currentQueue = await TrackPlayer.getQueue();
      setQueue(currentQueue);
      // Clear persisted queue when playback ends
      if (currentQueue.length === 0) {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
        await AsyncStorage.removeItem(CURRENT_TRACK_INDEX_KEY);
        console.log('[Queue] Cleared persisted queue');
      }
    });

    return () => {
      trackAddedSub.remove();
      queueEndedSub.remove();
    };
  }, []);

  const addToQueueFn = async (episode: any) => {
    const track = episodeToTrack(episode);
    await addToQueue(track);
    await updateAndPersistQueue();
    return track;
  };

  const playNextFn = async (episode: any) => {
    const track = episodeToTrack(episode);
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    if (currentIndex !== undefined) {
      await TrackPlayer.add(track, currentIndex + 1);
    } else {
      await TrackPlayer.add(track);
    }
    await updateAndPersistQueue();
  };

  const playNowFn = async (episode: any, startPosition?: number) => {
    const track = episodeToTrack(episode);
    await playTrackNow(track, startPosition);
    await updateAndPersistQueue();
  };

  const removeFromQueueFn = async (trackId: string) => {
    const currentQueue = await TrackPlayer.getQueue();
    const index = currentQueue.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      await TrackPlayer.remove(index);
      await updateAndPersistQueue();
    }
  };

  const clearQueueFn = async () => {
    await TrackPlayer.reset();
    setQueue([]);
    // Clear persisted queue
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    await AsyncStorage.removeItem(CURRENT_TRACK_INDEX_KEY);
    console.log('[Queue] Cleared queue and persisted data');
  };

  return {
    queue,
    addToQueue: addToQueueFn,
    playNext: playNextFn,
    playNow: playNowFn,
    removeFromQueue: removeFromQueueFn,
    clearQueue: clearQueueFn,
    getQueue: TrackPlayer.getQueue,
  };
}

/**
 * Hook for playback settings (rate, sleep timer)
 */
export function usePlaybackSettings() {
  const playbackRate = useAudioStore(selectPlaybackRate);
  const sleepTimer = useAudioStore(selectSleepTimer);
  const setPlaybackRate = useAudioStore((s) => s.setPlaybackRate);
  const setSleepTimer = useAudioStore((s) => s.setSleepTimer);

  return {
    playbackRate,
    setPlaybackRate,
    sleepTimer,
    setSleepTimer,
  };
}

/**
 * Optimized hook - only re-renders when position changes
 */
export function usePosition() {
  const { position } = useProgress();
  return position;
}

/**
 * Optimized hook - only re-renders when duration changes
 */
export function useDuration() {
  const { duration } = useProgress();
  return duration;
}

/**
 * Optimized hook - only re-renders when current track changes
 */
export function useCurrentTrackOnly() {
  const activeTrack = useActiveTrack();
  return activeTrack
    ? {
        id: activeTrack.id,
        url: activeTrack.url,
        title: activeTrack.title,
        artist: activeTrack.artist,
        artwork: activeTrack.artwork,
        duration: activeTrack.duration,
        description: activeTrack.description,
      }
    : null;
}

/**
 * Optimized hook - only re-renders when playback rate changes
 */
export function usePlaybackRate() {
  return useAudioStore(selectPlaybackRate);
}

/**
 * Optimized hook - only re-renders when sleep timer changes
 */
export function useSleepTimer() {
  return useAudioStore(selectSleepTimer);
}

/**
 * Hook for completion state
 */
export function useHasShownCompletion() {
  return useAudioStore(selectHasShownCompletion);
}

export function useSetHasShownCompletion() {
  return useAudioStore((s) => s.setHasShownCompletion);
}

/**
 * Combined hook for the full audio player screen
 */
export function useAudioPlayer() {
  const { position, duration, buffered } = useProgress();
  const { state } = usePlaybackState();
  const activeTrack = useActiveTrack();
  const controls = usePlaybackControls();
  const queue = useQueue();
  const settings = usePlaybackSettings();

  return {
    // State from RNTP
    position,
    duration,
    buffered,
    isPlaying: state === State.Playing,
    isBuffering: state === State.Buffering || state === State.Loading,
    currentTrack: activeTrack
      ? {
          id: activeTrack.id,
          url: activeTrack.url,
          title: activeTrack.title,
          artist: activeTrack.artist,
          artwork: activeTrack.artwork,
          duration: activeTrack.duration,
          description: activeTrack.description,
        }
      : null,

    // App-specific state
    playbackRate: settings.playbackRate,
    sleepTimer: settings.sleepTimer,

    // Actions
    ...controls,
    ...queue,
    setPlaybackRate: settings.setPlaybackRate,
    setSleepTimer: settings.setSleepTimer,
  };
}

/**
 * Hook for initializing the audio store
 * Should only be called once in the app root
 */
export function useAudioStoreInitialize() {
  return useAudioStore((state) => state.initialize);
}

/**
 * Hook for cleanup
 * Should be called when unmounting the app root
 */
export function useAudioStoreCleanup() {
  return useAudioStore((state) => state.cleanup);
}
