import {
  useAudioStore,
  selectIsPlaying,
  selectIsBuffering,
  selectCurrentTrack,
  selectQueue,
  selectPosition,
  selectDuration,
  selectPlaybackRate,
  selectSleepTimer,
} from './useAudioStore';

/**
 * Hook for components that only need playback state
 * Optimized to prevent unnecessary re-renders
 */
export function usePlaybackState() {
  return useAudioStore((state) => ({
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
  }));
}

/**
 * Hook for components that only need playback controls
 * Actions don't cause re-renders unless the reference changes
 */
export function usePlaybackControls() {
  return useAudioStore((state) => ({
    play: state.play,
    pause: state.pause,
    seekTo: state.seekTo,
    skipForward: state.skipForward,
    skipBackward: state.skipBackward,
  }));
}

/**
 * Hook for components that need current track info
 */
export function useCurrentTrack() {
  return useAudioStore((state) => ({
    currentTrack: state.currentTrack,
    position: state.position,
    duration: state.duration,
    buffered: state.buffered,
  }));
}

/**
 * Hook for components that need queue management
 */
export function useQueue() {
  return useAudioStore((state) => ({
    queue: state.queue,
    addToQueue: state.addToQueue,
    playNext: state.playNext,
    playNow: state.playNow,
    removeFromQueue: state.removeFromQueue,
    clearQueue: state.clearQueue,
  }));
}

/**
 * Hook for components that need playback settings
 */
export function usePlaybackSettings() {
  return useAudioStore((state) => ({
    playbackRate: state.playbackRate,
    setPlaybackRate: state.setPlaybackRate,
    sleepTimer: state.sleepTimer,
    setSleepTimer: state.setSleepTimer,
  }));
}

/**
 * Optimized hook - only re-renders when playing state changes
 */
export function useIsPlaying() {
  return useAudioStore(selectIsPlaying);
}

/**
 * Optimized hook - only re-renders when buffering state changes
 */
export function useIsBuffering() {
  return useAudioStore(selectIsBuffering);
}

/**
 * Optimized hook - only re-renders when current track changes
 */
export function useCurrentTrackOnly() {
  return useAudioStore(selectCurrentTrack);
}

/**
 * Optimized hook - only re-renders when queue changes
 */
export function useQueueOnly() {
  return useAudioStore(selectQueue);
}

/**
 * Optimized hook - only re-renders when position changes
 */
export function usePosition() {
  return useAudioStore(selectPosition);
}

/**
 * Optimized hook - only re-renders when duration changes
 */
export function useDuration() {
  return useAudioStore(selectDuration);
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
 * Combined hook for the audio player screen
 * Only use this for the main player component
 */
export function useAudioPlayer() {
  return useAudioStore((state) => ({
    // State
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
    currentTrack: state.currentTrack,
    queue: state.queue,
    position: state.position,
    duration: state.duration,
    buffered: state.buffered,
    playbackRate: state.playbackRate,
    sleepTimer: state.sleepTimer,

    // Actions
    play: state.play,
    pause: state.pause,
    seekTo: state.seekTo,
    skipForward: state.skipForward,
    skipBackward: state.skipBackward,
    addToQueue: state.addToQueue,
    playNext: state.playNext,
    playNow: state.playNow,
    removeFromQueue: state.removeFromQueue,
    clearQueue: state.clearQueue,
    setPlaybackRate: state.setPlaybackRate,
    setSleepTimer: state.setSleepTimer,
  }));
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
