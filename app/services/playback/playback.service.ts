import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { throttle } from 'lodash';
import { create } from 'zustand';

interface Track {
  id: string;
  url: string;
  title: string;
  artist?: string;
  artwork?: string;
  duration?: number;
}

interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  buffered: number;
  playbackRate: number;
  volume: number;

  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  buffered: 0,
  playbackRate: 1,
  volume: 1,

  setCurrentTrack: (currentTrack) => set({ currentTrack }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setBuffered: (buffered) => set({ buffered }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setVolume: (volume) => set({ volume }),
}));

export class PlaybackService {
  private sound: Audio.Sound | null = null;
  private progressCallback?: (position: number) => void;
  private throttledProgressUpdate: any;
  private isInitialized = false;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.throttledProgressUpdate = throttle((position: number) => {
      if (this.progressCallback) {
        this.progressCallback(position);
      }
      usePlaybackStore.getState().setPosition(position);
    }, 5000);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize playback service:', error);
      throw error;
    }
  }

  // Play a single episode
  async playEpisode(episode: {
    id: string;
    title: string;
    audioUrl: string;
    artwork?: string;
    artist?: string;
    duration?: number;
  }): Promise<void> {
    try {
      // Clean up existing sound if any
      if (this.sound) {
        await this.cleanup();
      }

      const track: Track = {
        id: episode.id,
        url: episode.audioUrl,
        title: episode.title,
        artist: episode.artist || 'Unknown',
        artwork: episode.artwork,
        duration: episode.duration,
      };

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: episode.audioUrl },
        { shouldPlay: true, progressUpdateIntervalMillis: 1000 },
        this.onPlaybackStatusUpdate
      );

      this.sound = sound;
      usePlaybackStore.getState().setCurrentTrack(track);

      // Start progress update interval
      this.startProgressTracking();
    } catch (error) {
      console.error('Failed to play episode:', error);
      throw error;
    }
  }

  // Playback status update handler
  private onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const playbackStatus = status as AVPlaybackStatusSuccess;

      usePlaybackStore.setState({
        isPlaying: playbackStatus.isPlaying,
        position: playbackStatus.positionMillis / 1000,
        duration: (playbackStatus.durationMillis || 0) / 1000,
        buffered: (playbackStatus.playableDurationMillis || 0) / 1000,
      });

      // Throttled progress callback for persistence
      if (playbackStatus.isPlaying) {
        this.throttledProgressUpdate(playbackStatus.positionMillis / 1000);
      }

      // Handle playback finished
      if (playbackStatus.didJustFinish) {
        this.handlePlaybackFinished();
      }
    } else if (status.error) {
      console.error('Playback error:', status.error);
    }
  };

  // Start tracking progress
  private startProgressTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        this.onPlaybackStatusUpdate(status);
      }
    }, 1000);
  }

  // Handle playback finished
  private handlePlaybackFinished(): void {
    usePlaybackStore.setState({
      isPlaying: false,
      position: usePlaybackStore.getState().duration,
    });
  }

  // Playback controls
  async play(): Promise<void> {
    if (!this.sound) return;
    await this.sound.playAsync();
  }

  async pause(): Promise<void> {
    if (!this.sound) return;
    await this.sound.pauseAsync();
  }

  async stop(): Promise<void> {
    if (!this.sound) return;
    await this.sound.stopAsync();
    usePlaybackStore.setState({
      isPlaying: false,
      position: 0,
    });
  }

  async seekTo(position: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setPositionAsync(position * 1000);
  }

  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setRateAsync(rate, true);
    usePlaybackStore.getState().setPlaybackRate(rate);
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setVolumeAsync(volume);
    usePlaybackStore.getState().setVolume(volume);
  }

  // Position and progress
  async getPosition(): Promise<number> {
    if (!this.sound) return 0;
    const status = await this.sound.getStatusAsync();
    if (status.isLoaded) {
      return status.positionMillis / 1000;
    }
    return 0;
  }

  async getDuration(): Promise<number> {
    if (!this.sound) return 0;
    const status = await this.sound.getStatusAsync();
    if (status.isLoaded) {
      return (status.durationMillis || 0) / 1000;
    }
    return 0;
  }

  async getProgress(): Promise<{ position: number; duration: number; buffered: number }> {
    if (!this.sound) {
      return { position: 0, duration: 0, buffered: 0 };
    }
    const status = await this.sound.getStatusAsync();
    if (status.isLoaded) {
      return {
        position: status.positionMillis / 1000,
        duration: (status.durationMillis || 0) / 1000,
        buffered: (status.playableDurationMillis || 0) / 1000,
      };
    }
    return { position: 0, duration: 0, buffered: 0 };
  }

  // Jump forward/backward
  async jumpForward(seconds: number = 30): Promise<void> {
    const position = await this.getPosition();
    const duration = await this.getDuration();
    await this.seekTo(Math.min(position + seconds, duration));
  }

  async jumpBackward(seconds: number = 10): Promise<void> {
    const position = await this.getPosition();
    await this.seekTo(Math.max(0, position - seconds));
  }

  // Get current track
  getCurrentTrack(): Track | null {
    return usePlaybackStore.getState().currentTrack;
  }

  // Set progress callback for persistence
  onProgressUpdate(callback: (position: number) => void): void {
    this.progressCallback = callback;
  }

  // Clean up current sound
  private async cleanup(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    usePlaybackStore.setState({
      currentTrack: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      buffered: 0,
    });
  }

  // Destroy service
  async destroy(): Promise<void> {
    await this.cleanup();
    this.isInitialized = false;
  }
}

// Singleton instance
export const playbackService = new PlaybackService();