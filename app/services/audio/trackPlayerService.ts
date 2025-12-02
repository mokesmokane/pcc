import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  RepeatMode,
} from 'react-native-track-player';
import { restoreQueueFromStorage } from '../../stores/audioStore.hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

let isSetup = false;

/**
 * Setup the Track Player with capabilities and options
 */
export async function setupPlayer(): Promise<boolean> {
  if (isSetup) {
    console.log('[TrackPlayer] Already setup, skipping');
    return true;
  }

  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      forwardJumpInterval: 30,
      backwardJumpInterval: 15,
      progressUpdateEventInterval: 1,
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    // Restore persisted queue
    await restorePersistedQueue();

    isSetup = true;
    console.log('[TrackPlayer] Setup complete');
    return true;
  } catch (error) {
    console.error('[TrackPlayer] Setup failed:', error);
    return false;
  }
}

/**
 * Restore the queue from AsyncStorage after player setup
 */
async function restorePersistedQueue(): Promise<void> {
  try {
    const saved = await restoreQueueFromStorage();
    if (saved && saved.queue.length > 0) {
      console.log('[TrackPlayer] Restoring queue with', saved.queue.length, 'tracks');
      await TrackPlayer.add(saved.queue);

      // Skip to the saved track index
      if (saved.currentIndex > 0 && saved.currentIndex < saved.queue.length) {
        await TrackPlayer.skip(saved.currentIndex);
      }

      // Restore saved position if available
      const savedPosition = await AsyncStorage.getItem('lastPlayingPosition');
      if (savedPosition) {
        const position = parseFloat(savedPosition);
        if (!isNaN(position) && position > 0) {
          console.log('[TrackPlayer] Restoring position:', position);
          await TrackPlayer.seekTo(position);
        }
      }

      console.log('[TrackPlayer] Queue restored successfully');
    }
  } catch (error) {
    console.error('[TrackPlayer] Failed to restore queue:', error);
  }
}

/**
 * Check if the player is already setup
 */
export function isPlayerSetup(): boolean {
  return isSetup;
}

// PlaybackService moved to ./playbackService.ts to avoid import issues in index.js
