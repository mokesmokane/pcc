import type { AVPlaybackStatus} from 'expo-av';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackAudioError } from '../errorTracking/errorTrackingService';

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  description?: string;
}

interface QueuedTrack extends Track {
  sound?: Audio.Sound;
}

const QUEUE_STORAGE_KEY = '@audio_queue';
const CURRENT_INDEX_STORAGE_KEY = '@audio_current_index';

class ExpoAudioService {
  private static instance: ExpoAudioService | null = null;
  private queue: QueuedTrack[] = [];
  private currentIndex: number = -1;
  private currentSound: Audio.Sound | null = null;
  private isInitialized: boolean = false;

  // Callbacks for state updates
  private onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  private onTrackChange?: (track: Track | null) => void;
  private onGetSavedPosition?: (trackId: string) => Promise<number | undefined>;

  // Private constructor for singleton
  private constructor() {
    this.loadQueueFromStorage();
  }

  // Singleton pattern to ensure only one instance
  static getInstance(): ExpoAudioService {
    if (!ExpoAudioService.instance) {
      ExpoAudioService.instance = new ExpoAudioService();
    }
    return ExpoAudioService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 2, // DuckOthers
        interruptionModeAndroid: 2, // DuckOthers
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing audio:', error);
      trackAudioError(error as Error, undefined, undefined, {
        action: 'initialize',
      });
    }
  }

  private async loadQueueFromStorage() {
    try {
      const [queueData, indexData] = await Promise.all([
        AsyncStorage.getItem(QUEUE_STORAGE_KEY),
        AsyncStorage.getItem(CURRENT_INDEX_STORAGE_KEY),
      ]);

      if (queueData) {
        const tracks: Track[] = JSON.parse(queueData);
        this.queue = tracks.map(track => ({ ...track }));
      }

      if (indexData) {
        this.currentIndex = parseInt(indexData, 10);
      }

      console.log('Loaded queue from storage:', this.queue.length, 'tracks');
    } catch (error) {
      console.error('Error loading queue from storage:', error);
      trackAudioError(error as Error, undefined, undefined, {
        action: 'loadQueueFromStorage',
      });
    }
  }

  private async saveQueueToStorage() {
    try {
      // Save only the track data (without sound objects)
      const tracksToSave = this.queue.map(({ sound, ...track }) => track);
      await Promise.all([
        AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(tracksToSave)),
        AsyncStorage.setItem(CURRENT_INDEX_STORAGE_KEY, this.currentIndex.toString()),
      ]);
    } catch (error) {
      console.error('Error saving queue to storage:', error);
    }
  }

  setOnPlaybackStatusUpdate(callback: (status: AVPlaybackStatus) => void) {
    this.onPlaybackStatusUpdate = callback;
  }

  setOnTrackChange(callback: (track: Track | null) => void) {
    this.onTrackChange = callback;
  }

  setOnGetSavedPosition(callback: (trackId: string) => Promise<number | undefined>) {
    this.onGetSavedPosition = callback;
  }

  async addTrack(track: Track): Promise<void> {
    const queuedTrack: QueuedTrack = { ...track };
    this.queue.push(queuedTrack);

    // Save queue to storage
    await this.saveQueueToStorage();

    // If this is the first track, load it
    if (this.queue.length === 1) {
      await this.loadTrack(0);
    }
  }

  async addTracks(tracks: Track[]): Promise<void> {
    for (const track of tracks) {
      await this.addTrack(track);
    }
  }

  async playTrackNow(track: Track, startPosition?: number): Promise<void> {
    try {
      // Stop current playback if any
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync();
          await this.currentSound.unloadAsync();
        } catch (error) {
          console.error('Error stopping current sound:', error);
          trackAudioError(error as Error, track.id, track.title, {
            action: 'playTrackNow_stop',
          });
        }
        this.currentSound = null;
      }

      const queuedTrack: QueuedTrack = { ...track };

      // Insert at the front of the queue
      this.queue.unshift(queuedTrack);

      // If we had a current track, increment the index since we inserted at front
      if (this.currentIndex >= 0) {
        this.currentIndex++;
      }

      // Save queue to storage
      await this.saveQueueToStorage();

      // Load the new track at index 0
      await this.loadTrack(0);

      // Seek to start position if provided
      if (startPosition !== undefined && startPosition > 0) {
        await this.seekTo(startPosition);
      }

      // Now play
      await this.play();
    } catch (error) {
      console.error('Error playing track now:', error);
      trackAudioError(error as Error, track.id, track.title, {
        action: 'playTrackNow',
        startPosition,
      });
    }
  }

  async removeTrack(trackId: string): Promise<void> {
    const trackIndex = this.queue.findIndex(track => track.id === trackId);

    if (trackIndex === -1) {
      console.log('Track not found in queue:', trackId);
      return;
    }

    const isCurrentTrack = trackIndex === this.currentIndex;
    const removedTrack = this.queue[trackIndex];

    // Clean up sound object if it exists
    if (removedTrack.sound && removedTrack.sound !== this.currentSound) {
      try {
        await removedTrack.sound.unloadAsync();
      } catch (error) {
        console.error('Error unloading removed track:', error);
      }
    }

    // If removing current track, stop playback and play next
    if (isCurrentTrack) {
      if (this.currentSound) {
        try {
          await this.currentSound.stopAsync();
          await this.currentSound.unloadAsync();
        } catch (error) {
          console.error('Error stopping current track:', error);
        }
        this.currentSound = null;
      }

      // Remove the track
      this.queue.splice(trackIndex, 1);

      // Save updated queue
      await this.saveQueueToStorage();

      // Load next track if available
      if (this.currentIndex < this.queue.length) {
        const nextTrack = this.queue[this.currentIndex];
        await this.loadTrack(this.currentIndex);

        // Try to restore saved position
        if (this.onGetSavedPosition && nextTrack) {
          try {
            const savedPosition = await this.onGetSavedPosition(nextTrack.id);
            if (savedPosition !== undefined && savedPosition > 0) {
              await this.seekTo(savedPosition);
            }
          } catch (error) {
            console.error('Error restoring saved position:', error);
          }
        }
        await this.play();
      } else if (this.currentIndex > 0) {
        // If we removed the last track, go back one
        this.currentIndex = this.queue.length - 1;
        if (this.currentIndex >= 0) {
          await this.loadTrack(this.currentIndex);
        } else {
          // Queue is empty
          if (this.onTrackChange) {
            this.onTrackChange(null);
          }
        }
      } else {
        // Queue is empty
        this.currentIndex = -1;
        if (this.onTrackChange) {
          this.onTrackChange(null);
        }
      }
    } else {
      // Removing a non-current track
      this.queue.splice(trackIndex, 1);

      // Adjust current index if needed
      if (trackIndex < this.currentIndex) {
        this.currentIndex--;
      }

      // Save updated queue
      await this.saveQueueToStorage();

      // Notify about queue change
      if (this.onTrackChange) {
        this.onTrackChange(this.getCurrentTrack());
      }
    }
  }

  async clearQueue(): Promise<void> {
    // Unload current sound
    if (this.currentSound) {
      await this.currentSound.unloadAsync();
      this.currentSound = null;
    }

    // Clear the queue
    this.queue = [];
    this.currentIndex = -1;

    // Save cleared queue to storage
    await this.saveQueueToStorage();

    if (this.onTrackChange) {
      this.onTrackChange(null);
    }
  }

  async loadTrack(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) {
      console.error('Invalid track index:', index);
      return;
    }

    const track = this.queue[index];

    // CRITICAL: Stop and unload ANY existing sound before loading new one
    if (this.currentSound) {
      try {
        // Stop playback first
        await this.currentSound.stopAsync();
        // Then unload
        await this.currentSound.unloadAsync();
      } catch (error) {
        console.error('Error stopping/unloading previous sound:', error);
        trackAudioError(error as Error, track.id, track.title, {
          action: 'loadTrack_cleanup',
          index,
        });
      }
      this.currentSound = null;
    }

    // Also check all tracks in queue and unload any loaded sounds
    for (const queuedTrack of this.queue) {
      if (queuedTrack.sound && queuedTrack.sound !== this.currentSound) {
        try {
          // Check if sound is actually loaded before trying to unload
          const status = await queuedTrack.sound.getStatusAsync();
          if (status.isLoaded) {
            await queuedTrack.sound.stopAsync();
            await queuedTrack.sound.unloadAsync();
          }
          queuedTrack.sound = undefined;
        } catch (error) {
          // Silently clear the sound reference even if unload fails
          queuedTrack.sound = undefined;
        }
      }
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: false },
        this.handlePlaybackStatusUpdate.bind(this)
      );

      this.currentSound = sound;
      track.sound = sound;
      this.currentIndex = index;

      // Save updated index to storage
      await this.saveQueueToStorage();

      console.log('LoadTrack - calling onTrackChange with track:', track);
      if (this.onTrackChange) {
        this.onTrackChange(track);
      } else {
        console.log('LoadTrack - onTrackChange callback not set!');
      }
    } catch (error) {
      console.error('Error loading track:', error);
      trackAudioError(error as Error, track.id, track.title, {
        action: 'loadTrack',
        index,
        url: track.url,
      });
    }
  }

  private handlePlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (this.onPlaybackStatusUpdate) {
      this.onPlaybackStatusUpdate(status);
    }

    // Handle track ending
    if (status.isLoaded && status.didJustFinish && !status.isLooping) {
      // Remove the finished track from queue and play next
      this.removeCurrentTrackAndPlayNext();
    }
  }

  async play(): Promise<void> {
    const track = this.getCurrentTrack();

    if (!this.currentSound) {
      // If no sound is loaded but we have tracks, load the first one
      if (this.queue.length > 0 && this.currentIndex === -1) {
        await this.loadTrack(0);
      } else if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
        await this.loadTrack(this.currentIndex);
      } else {
        return;
      }
    }

    if (this.currentSound) {
      try {
        // Check status first to avoid playing if already playing
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await this.currentSound.playAsync();
        }
      } catch (error) {
        console.error('Error playing:', error);
        trackAudioError(error as Error, track?.id, track?.title, {
          action: 'play',
        });
      }
    }
  }

  async pause(): Promise<void> {
    if (!this.currentSound) return;

    const track = this.getCurrentTrack();
    try {
      await this.currentSound.pauseAsync();
    } catch (error) {
      console.error('Error pausing:', error);
      trackAudioError(error as Error, track?.id, track?.title, {
        action: 'pause',
      });
    }
  }

  async stop(): Promise<void> {
    if (!this.currentSound) return;

    const track = this.getCurrentTrack();
    try {
      await this.currentSound.stopAsync();
    } catch (error) {
      console.error('Error stopping:', error);
      trackAudioError(error as Error, track?.id, track?.title, {
        action: 'stop',
      });
    }
  }

  async seekTo(seconds: number): Promise<void> {
    if (!this.currentSound) return;

    const track = this.getCurrentTrack();
    try {
      await this.currentSound.setPositionAsync(seconds * 1000); // Convert to milliseconds
    } catch (error) {
      console.error('Error seeking:', error);
      trackAudioError(error as Error, track?.id, track?.title, {
        action: 'seekTo',
        seconds,
      });
    }
  }

  private async removeCurrentTrackAndPlayNext(): Promise<void> {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      // Remove the current track from the queue
      const removedTrack = this.queue.splice(this.currentIndex, 1)[0];
      console.log('Removed finished track from queue:', removedTrack.title);

      // Clean up sound object if it exists
      if (removedTrack.sound) {
        try {
          await removedTrack.sound.unloadAsync();
        } catch (error) {
          console.error('Error unloading finished track:', error);
        }
      }

      this.currentSound = null;

      // Save updated queue
      await this.saveQueueToStorage();

      // Play next track if available (currentIndex now points to what was the next track)
      if (this.currentIndex < this.queue.length) {
        const nextTrack = this.queue[this.currentIndex];
        await this.loadTrack(this.currentIndex);

        // Try to restore saved position if callback is available
        if (this.onGetSavedPosition && nextTrack) {
          try {
            const savedPosition = await this.onGetSavedPosition(nextTrack.id);
            if (savedPosition !== undefined && savedPosition > 0) {
              await this.seekTo(savedPosition);
            }
          } catch (error) {
            console.error('Error restoring saved position after removing track:', error);
          }
        }

        await this.play();
      } else {
        // No more tracks in queue
        console.log('Queue is now empty');
        if (this.onTrackChange) {
          this.onTrackChange(null);
        }
      }
    }
  }

  async skipToNext(): Promise<void> {
    if (this.currentIndex < this.queue.length - 1) {
      const nextTrack = this.queue[this.currentIndex + 1];
      await this.loadTrack(this.currentIndex + 1);

      // Try to restore saved position if callback is available
      if (this.onGetSavedPosition && nextTrack) {
        try {
          const savedPosition = await this.onGetSavedPosition(nextTrack.id);
          if (savedPosition !== undefined && savedPosition > 0) {
            await this.seekTo(savedPosition);
          }
        } catch (error) {
          console.error('Error restoring saved position on skip to next:', error);
        }
      }

      await this.play();
    }
  }

  async skipToPrevious(): Promise<void> {
    if (this.currentIndex > 0) {
      const prevTrack = this.queue[this.currentIndex - 1];
      await this.loadTrack(this.currentIndex - 1);

      // Try to restore saved position if callback is available
      if (this.onGetSavedPosition && prevTrack) {
        try {
          const savedPosition = await this.onGetSavedPosition(prevTrack.id);
          if (savedPosition !== undefined && savedPosition > 0) {
            await this.seekTo(savedPosition);
          }
        } catch (error) {
          console.error('Error restoring saved position on skip to previous:', error);
        }
      }

      await this.play();
    } else if (this.currentSound) {
      // If we're at the first track, just restart it
      await this.seekTo(0);
    }
  }

  async skipForward(seconds: number = 30): Promise<void> {
    if (!this.currentSound) return;

    const status = await this.currentSound.getStatusAsync();
    if (status.isLoaded) {
      const newPosition = Math.min(
        status.positionMillis + seconds * 1000,
        status.durationMillis || 0
      );
      await this.currentSound.setPositionAsync(newPosition);
    }
  }

  async skipBackward(seconds: number = 15): Promise<void> {
    if (!this.currentSound) return;

    const status = await this.currentSound.getStatusAsync();
    if (status.isLoaded) {
      const newPosition = Math.max(0, status.positionMillis - seconds * 1000);
      await this.currentSound.setPositionAsync(newPosition);
    }
  }

  async setRate(rate: number): Promise<void> {
    if (!this.currentSound) return;

    try {
      await this.currentSound.setRateAsync(rate, true); // true = shouldCorrectPitch
    } catch (error) {
      console.error('Error setting rate:', error);
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.currentSound) return;

    try {
      await this.currentSound.setVolumeAsync(volume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }

  getCurrentTrack(): Track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  getQueue(): Track[] {
    return [...this.queue];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  async getStatus(): Promise<AVPlaybackStatus | null> {
    if (!this.currentSound) return null;

    const track = this.getCurrentTrack();
    try {
      return await this.currentSound.getStatusAsync();
    } catch (error) {
      console.error('Error getting status:', error);
      trackAudioError(error as Error, track?.id, track?.title, {
        action: 'getStatus',
      });
      return null;
    }
  }
}

// Export singleton instance
export const expoAudioService = ExpoAudioService.getInstance();