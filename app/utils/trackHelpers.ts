import TrackPlayer, { Track } from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACK_POSITIONS_KEY = '@track_positions';

/**
 * App-specific track interface that matches our episode data
 */
export interface AppTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  description?: string;
}

/**
 * Convert an AppTrack to RNTP Track format
 */
export function toRNTPTrack(track: AppTrack): Track {
  return {
    id: track.id,
    url: track.url,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    duration: track.duration,
    description: track.description,
  };
}

/**
 * Convert episode data to AppTrack format
 * This handles the various shapes of episode data in the app
 */
export function episodeToTrack(episode: {
  id: string;
  audio_url?: string;
  audioUrl?: string;
  url?: string;
  title: string;
  podcast_title?: string;
  podcastTitle?: string;
  artist?: string;
  artwork_url?: string;
  artworkUrl?: string;
  artwork?: string;
  image?: string;
  duration?: number;
  description?: string;
}): AppTrack {
  return {
    id: episode.id,
    url: episode.audio_url || episode.audioUrl || episode.url || '',
    title: episode.title,
    artist: episode.podcast_title || episode.podcastTitle || episode.artist || 'Podcast',
    artwork: episode.artwork_url || episode.artworkUrl || episode.artwork || episode.image,
    duration: episode.duration,
    description: episode.description,
  };
}

/**
 * Play a track immediately (moves to front if in queue, otherwise adds to front)
 */
export async function playTrackNow(track: AppTrack, startPosition?: number): Promise<void> {
  console.log('[TrackHelpers] Playing track now:', track.title, 'at position:', startPosition);

  // IMPORTANT: Save position to AsyncStorage BEFORE playing
  // The PlaybackActiveTrackChanged event handler will read this and seek to it
  // This prevents the race condition where the old saved position overrides our seek
  if (startPosition !== undefined && startPosition >= 0) {
    try {
      const stored = await AsyncStorage.getItem(TRACK_POSITIONS_KEY);
      const positions: Record<string, number> = stored ? JSON.parse(stored) : {};
      positions[track.id] = startPosition;
      await AsyncStorage.setItem(TRACK_POSITIONS_KEY, JSON.stringify(positions));
      console.log('[TrackHelpers] Saved start position to AsyncStorage:', startPosition);
    } catch (error) {
      console.error('[TrackHelpers] Failed to save position:', error);
    }
  }

  const queue = await TrackPlayer.getQueue();
  const existingIndex = queue.findIndex(t => t.id === track.id);

  if (existingIndex !== -1) {
    // Track already in queue - remove it first, then add to front
    console.log('[TrackHelpers] Moving track from index', existingIndex, 'to front');
    await TrackPlayer.remove(existingIndex);
  }

  // Add track at position 0 (front of queue)
  console.log('[TrackHelpers] Adding track to front of queue');
  await TrackPlayer.add(toRNTPTrack(track), 0);
  await TrackPlayer.skip(0);

  // Note: We don't need to seekTo here anymore - the PlaybackActiveTrackChanged
  // event handler will read the saved position and seek to it

  await TrackPlayer.play();
}

/**
 * Add a track to the end of the queue
 */
export async function addToQueue(track: AppTrack): Promise<void> {
  console.log('[TrackHelpers] Adding to queue:', track.title);
  await TrackPlayer.add(toRNTPTrack(track));
}

/**
 * Add a track to play next (after current track)
 */
export async function addToPlayNext(track: AppTrack): Promise<void> {
  console.log('[TrackHelpers] Adding to play next:', track.title);
  const currentIndex = await TrackPlayer.getActiveTrackIndex();
  if (currentIndex !== undefined) {
    await TrackPlayer.add(toRNTPTrack(track), currentIndex + 1);
  } else {
    await TrackPlayer.add(toRNTPTrack(track));
  }
}

/**
 * Get the current queue
 */
export async function getQueue(): Promise<Track[]> {
  return TrackPlayer.getQueue();
}

/**
 * Remove a track from the queue by ID
 */
export async function removeFromQueue(trackId: string): Promise<void> {
  console.log('[TrackHelpers] Removing from queue:', trackId);
  const queue = await TrackPlayer.getQueue();
  const index = queue.findIndex(t => t.id === trackId);
  if (index !== -1) {
    await TrackPlayer.remove(index);
  }
}

/**
 * Clear the entire queue
 */
export async function clearQueue(): Promise<void> {
  console.log('[TrackHelpers] Clearing queue');
  await TrackPlayer.reset();
}

/**
 * Skip to a specific track in the queue by ID
 */
export async function skipToTrack(trackId: string): Promise<void> {
  const queue = await TrackPlayer.getQueue();
  const index = queue.findIndex(t => t.id === trackId);
  if (index !== -1) {
    console.log('[TrackHelpers] Skipping to track:', trackId);
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  }
}
