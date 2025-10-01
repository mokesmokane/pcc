import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { expoAudioService, Track } from '../services/audio/expoAudioService';
import { usePodcastMetadata } from './PodcastMetadataContext';
import { useRouter } from 'expo-router';
import { mediaNotificationService } from '../services/audio/mediaNotificationService';

interface AudioContextType {
  // Playback state
  isPlaying: boolean;
  isBuffering: boolean;
  currentTrack: Track | null;
  queue: Track[];

  // Progress
  position: number;
  duration: number;
  buffered: number;

  // Controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: () => Promise<void>;
  skipBackward: () => Promise<void>;

  // Queue management
  addToQueue: (episode: any) => Promise<Track>;
  playNext: (episode: any) => Promise<void>;
  playNow: (episode: any, startPosition?: number) => Promise<void>;
  clearQueue: () => Promise<void>;

  // Settings
  playbackRate: number;
  setPlaybackRate: (rate: number) => Promise<void>;
  sleepTimer: number | null;
  setSleepTimer: (minutes: number | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const PROGRESS_SAVE_INTERVAL = 5000; // Save progress every 5 seconds

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { updateEpisodeProgress, getEpisodeProgress } = usePodcastMetadata();
  const router = useRouter();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);

  const progressSaveInterval = useRef<NodeJS.Timeout>();
  const sleepTimerRef = useRef<NodeJS.Timeout>();
  const hasShownCompletionRef = useRef(false);

  // Initialize audio service
  useEffect(() => {
    const initializeAudio = async () => {
      await expoAudioService.initialize();
      await mediaNotificationService.initialize();

      // Set up callbacks
      expoAudioService.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          setIsBuffering(status.isBuffering);
          setPosition(status.positionMillis / 1000);
          setDuration((status.durationMillis || 0) / 1000);
          setBuffered((status.playableDurationMillis || 0) / 1000);

          // Check if episode is completed (when playback reaches the end)
          const currentPos = status.positionMillis / 1000;
          const totalDuration = (status.durationMillis || 0) / 1000;

          // Trigger when we reach the very end (didJustFinish)
          if (status.didJustFinish && !hasShownCompletionRef.current) {
            hasShownCompletionRef.current = true;
            console.log('Episode completed! Showing celebration screen');
            router.push('/episode-complete');
          }

          // Reset completion flag when seeking back
          if (currentPos < totalDuration - 20) {
            hasShownCompletionRef.current = false;
          }
        }
      });

      expoAudioService.setOnTrackChange((track: Track | null) => {
        console.log('Track changed in AudioContext:', track);
        setCurrentTrack(track);
        if (track) {
          AsyncStorage.setItem('lastPlayingEpisodeId', track.id);
        }
      });

      // Try to restore last playing episode
      const lastEpisodeId = await AsyncStorage.getItem('lastPlayingEpisodeId');
      if (lastEpisodeId) {
        console.log('Last playing episode:', lastEpisodeId);
      }

      // Check if there's already a current track in the service
      const existingTrack = expoAudioService.getCurrentTrack();
      const existingQueue = expoAudioService.getQueue();

      if (existingTrack) {
        console.log('Found existing track in service:', existingTrack);
        setCurrentTrack(existingTrack);

        // Restore saved position for this track
        try {
          const savedProgress = await getEpisodeProgress(existingTrack.id);
          if (savedProgress && savedProgress.currentPosition > 0) {
            console.log('Restoring saved position on app restart:', savedProgress.currentPosition);
            // Need to load the track first before seeking
            const currentIndex = expoAudioService.getCurrentIndex();
            if (currentIndex >= 0) {
              await expoAudioService.loadTrack(currentIndex);
              await expoAudioService.seekTo(savedProgress.currentPosition);
            }
          }
        } catch (error) {
          console.error('Error restoring saved position:', error);
        }
      }

      if (existingQueue.length > 0) {
        console.log('Found existing queue with', existingQueue.length, 'tracks');
        setQueue(existingQueue);
      }
    };

    initializeAudio();
  }, []);

  // Save progress periodically
  useEffect(() => {
    if (isPlaying && currentTrack) {
      progressSaveInterval.current = setInterval(async () => {
        // Get the current position from the audio service directly
        const status = await expoAudioService.getStatus();
        if (status && status.isLoaded) {
          const currentPosition = status.positionMillis / 1000;
          const currentDuration = (status.durationMillis || 0) / 1000;
          await updateEpisodeProgress(currentTrack.id, currentPosition, currentDuration);
        }
      }, PROGRESS_SAVE_INTERVAL);
    } else {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    }

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [isPlaying, currentTrack?.id, updateEpisodeProgress]);

  // Sleep timer
  useEffect(() => {
    if (sleepTimer && isPlaying) {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }

      sleepTimerRef.current = setTimeout(async () => {
        await pause();
        setSleepTimerState(null);
      }, sleepTimer * 60 * 1000);
    }

    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, [sleepTimer, isPlaying]);

  // Update media notification when track or playback state changes
  useEffect(() => {
    if (currentTrack) {
      mediaNotificationService.showMediaNotification(
        {
          title: currentTrack.title,
          artist: currentTrack.artist,
          artwork: currentTrack.artwork,
        },
        isPlaying
      );
    } else {
      mediaNotificationService.hideMediaNotification();
    }
  }, [currentTrack, isPlaying]);

  const saveProgress = async (episodeId: string, currentPosition: number) => {
    try {
      // Save to local storage for quick recovery
      await AsyncStorage.setItem('lastPlayingPosition', currentPosition.toString());
      await AsyncStorage.setItem('lastPlayingEpisode', episodeId);

      // Save using PodcastMetadataContext
      await updateEpisodeProgress(episodeId, currentPosition, duration);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const play = async () => {
    await expoAudioService.play();
  };

  const pause = async () => {
    await expoAudioService.pause();
    // Save progress when pausing
    if (currentTrack) {
      await saveProgress(currentTrack.id, position);
    }
  };

  const seekTo = async (seconds: number) => {
    await expoAudioService.seekTo(seconds);
  };

  const skipForward = async () => {
    await expoAudioService.skipForward(30);
  };

  const skipBackward = async () => {
    hasShownCompletionRef.current = false; // Reset completion flag when skipping backward
    await expoAudioService.skipBackward(15);
  };

  const addToQueue = async (episode: any): Promise<Track> => {
    const track: Track = {
      id: episode.id,
      url: episode.audio_url,
      title: episode.title,
      artist: episode.podcast_title,
      artwork: episode.artwork_url || '',
      duration: episode.duration,
      description: episode.description,
    };

    console.log('Adding track to queue:', track);
    await expoAudioService.addTrack(track);
    setQueue(expoAudioService.getQueue());

    // The track should be set as current after being added
    // if it's the first/only track
    const queue = expoAudioService.getQueue();
    console.log('Queue length after adding track:', queue.length);
    if (queue.length === 1) {
      console.log('Setting current track manually as it is the first track');
      setCurrentTrack(track);
    }

    // Load saved progress if available
    try {
      const savedProgress = await getEpisodeProgress(track.id);
      if (savedProgress && savedProgress.currentPosition > 0) {
        console.log('Resuming from saved position:', savedProgress.currentPosition);
        // Wait a bit for the audio to be ready before seeking
        setTimeout(() => {
          seekTo(savedProgress.currentPosition);
        }, 500);
      }
    } catch (error) {
      console.error('Error loading saved progress:', error);
    }

    return track;
  };

  const playNext = async (episode: any) => {
    // Add track right after current one
    const currentIndex = expoAudioService.getCurrentIndex();
    const track: Track = {
      id: episode.id,
      url: episode.audio_url,
      title: episode.title,
      artist: episode.podcast_title,
      artwork: episode.artwork_url || '',
      duration: episode.duration,
      description: episode.description,
    };

    // For simplicity, just add to queue
    await expoAudioService.addTrack(track);
    setQueue(expoAudioService.getQueue());
  };

  const playNow = async (episode: any, startPosition?: number) => {
    const track: Track = {
      id: episode.id,
      url: episode.audio_url,
      title: episode.title,
      artist: episode.podcast_title,
      artwork: episode.artwork_url || '',
      duration: episode.duration,
      description: episode.description,
    };

    console.log('Playing track now:', track);

    // If startPosition is provided, use it; otherwise fetch from saved progress
    let positionToUse = startPosition;

    if (positionToUse === undefined) {
      try {
        const savedProgress = await getEpisodeProgress(track.id);
        if (savedProgress && savedProgress.currentPosition > 0) {
          positionToUse = savedProgress.currentPosition;
          console.log('Using saved position:', positionToUse);
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    } else {
      console.log('Using provided start position:', positionToUse);
    }

    await expoAudioService.playTrackNow(track, positionToUse);
    setQueue(expoAudioService.getQueue());
    setCurrentTrack(track);
  };

  const clearQueue = async () => {
    await expoAudioService.clearQueue();
    setQueue([]);
    setCurrentTrack(null);
  };

  const setPlaybackRate = async (rate: number) => {
    await expoAudioService.setRate(rate);
    setPlaybackRateState(rate);
  };

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerState(minutes);
  };

  // Set up notification action listeners (after function definitions)
  useEffect(() => {
    const subscription = mediaNotificationService.setupActionListeners({
      onPlay: async () => {
        const status = await expoAudioService.getStatus();
        if (status?.isLoaded && status.isPlaying) {
          await pause();
        } else {
          await play();
        }
      },
      onPause: async () => {
        await pause();
      },
      onSkipForward: async () => {
        await skipForward();
      },
      onSkipBackward: async () => {
        await skipBackward();
      },
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value: AudioContextType = {
    isPlaying,
    isBuffering,
    currentTrack,
    queue,
    position,
    duration,
    buffered,
    play,
    pause,
    seekTo,
    skipForward,
    skipBackward,
    addToQueue,
    playNext,
    playNow,
    clearQueue,
    playbackRate,
    setPlaybackRate,
    sleepTimer,
    setSleepTimer,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}