import TrackPlayer, {
  Event,
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

/**
 * Background Playback Service - handles remote control events
 * This is called by TrackPlayer when the app is in the background
 */
export async function PlaybackService() {
  // Remote play (from lock screen/notification)
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[PlaybackService] Remote Play');
    TrackPlayer.play();
  });

  // Remote pause
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[PlaybackService] Remote Pause');
    TrackPlayer.pause();
  });

  // Remote stop
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[PlaybackService] Remote Stop');
    TrackPlayer.stop();
  });

  // Remote seek
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[PlaybackService] Remote Seek to:', event.position);
    TrackPlayer.seekTo(event.position);
  });

  // Remote jump forward (30s)
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const interval = event.interval || 30;
    const { position } = await TrackPlayer.getProgress();
    console.log('[PlaybackService] Remote Jump Forward:', interval);
    await TrackPlayer.seekTo(position + interval);
  });

  // Remote jump backward (15s)
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const interval = event.interval || 15;
    const { position } = await TrackPlayer.getProgress();
    console.log('[PlaybackService] Remote Jump Backward:', interval);
    await TrackPlayer.seekTo(Math.max(0, position - interval));
  });

  // Remote next track
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[PlaybackService] Remote Next');
    TrackPlayer.skipToNext();
  });

  // Remote previous track
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[PlaybackService] Remote Previous');
    TrackPlayer.skipToPrevious();
  });

  // Handle play/pause toggle (for headphone button)
  TrackPlayer.addEventListener(Event.RemotePlayPause, async () => {
    console.log('[PlaybackService] Remote Play/Pause Toggle');
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === 'playing') {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });

  // Handle audio ducking (phone calls, notifications)
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    console.log('[PlaybackService] Remote Duck:', event);
    if (event.paused || event.permanent) {
      await TrackPlayer.pause();
    } else if (event.ducking) {
      // Could reduce volume here if needed
    }
  });

  console.log('[PlaybackService] Initialized');
}
