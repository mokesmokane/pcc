/**
 * Service for fetching and caching recent episodes from tracked podcasts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseRSSEpisodes, sanitizeTitle } from '../utils/rss';

const CACHE_KEY = '@recent_episodes_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface TrackedPodcast {
  id: string;
  title: string;
  artwork: string;
  feedUrl: string;
  author?: string;
  tracked?: boolean;
}

export interface RecentEpisode {
  id: string;
  title: string;
  podcastTitle: string;
  podcastId: string;
  artwork: string;
  audioUrl: string;
  description: string;
  duration: string;
  durationSeconds: number;
  publishedAt: Date;
  pubDateFormatted: string;
}

interface CacheData {
  episodes: RecentEpisode[];
  timestamp: number;
}

/**
 * Fetch RSS feed for a single podcast
 */
const fetchPodcastEpisodes = async (
  podcast: TrackedPodcast,
  cutoffDate: Date
): Promise<RecentEpisode[]> => {
  try {
    const response = await fetch(podcast.feedUrl);
    const xmlText = await response.text();
    const episodes = parseRSSEpisodes(xmlText);

    // Log first few episode dates for debugging
    if (episodes.length > 0) {
      const sample = episodes.slice(0, 3).map(ep => ({
        title: ep.title.substring(0, 30),
        date: ep.pubDateRaw?.toISOString() || 'NO DATE',
      }));
      console.log(`${podcast.title} sample episodes:`, sample);
    }

    // Filter to recent episodes only - sanitize podcast title in case stored data wasn't clean
    const podcastTitle = sanitizeTitle(podcast.title);
    const recentEpisodes = episodes
      .filter(ep => ep.pubDateRaw && ep.pubDateRaw >= cutoffDate)
      .map(ep => ({
        id: ep.id,
        title: ep.title,
        podcastTitle,
        podcastId: podcast.id,
        artwork: podcast.artwork,
        audioUrl: ep.audioUrl,
        description: ep.description,
        duration: ep.duration,
        durationSeconds: ep.durationSeconds,
        publishedAt: ep.pubDateRaw!,
        pubDateFormatted: ep.pubDate,
      }));

    return recentEpisodes;
  } catch (error) {
    console.error(`Error fetching episodes for ${podcast.title}:`, error);
    return [];
  }
};

/**
 * Load cached recent episodes
 */
const loadCache = async (): Promise<CacheData | null> => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);
    // Convert date strings back to Date objects
    data.episodes = data.episodes.map(ep => ({
      ...ep,
      publishedAt: new Date(ep.publishedAt),
    }));

    return data;
  } catch (error) {
    console.error('Error loading recent episodes cache:', error);
    return null;
  }
};

/**
 * Save episodes to cache
 */
const saveCache = async (episodes: RecentEpisode[]): Promise<void> => {
  try {
    const data: CacheData = {
      episodes,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving recent episodes cache:', error);
  }
};

/**
 * Clear the recent episodes cache
 */
export const clearRecentEpisodesCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing recent episodes cache:', error);
  }
};

/**
 * Fetch recent episodes from all tracked podcasts
 * Uses caching to avoid excessive network requests
 */
export const fetchRecentEpisodes = async (
  trackedPodcasts: TrackedPodcast[],
  forceRefresh: boolean = false
): Promise<RecentEpisode[]> => {
  // Return empty if no tracked podcasts
  if (trackedPodcasts.length === 0) {
    return [];
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cache = await loadCache();
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      // Filter cached episodes to only include podcasts still tracked
      const trackedIds = new Set(trackedPodcasts.map(p => p.id));
      const validEpisodes = cache.episodes.filter(ep => trackedIds.has(ep.podcastId));

      // Cache is valid if it's not stale - we don't require all podcasts to have episodes
      // (some podcasts may not have released anything in the last 14 days)
      console.log(`Using cached episodes: ${validEpisodes.length} episodes`);
      // Sanitize podcast titles in case cache has old unsanitized data
      return validEpisodes
        .map(ep => ({ ...ep, podcastTitle: sanitizeTitle(ep.podcastTitle) }))
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    }
  }

  // Calculate cutoff date (14 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 14);
  console.log(`Fetching episodes newer than ${cutoffDate.toISOString()} from ${trackedPodcasts.length} podcasts`);

  // Fetch episodes from all tracked podcasts in parallel
  const episodeArrays = await Promise.all(
    trackedPodcasts.map(async podcast => {
      const episodes = await fetchPodcastEpisodes(podcast, cutoffDate);
      console.log(`${podcast.title}: found ${episodes.length} recent episodes`);
      return episodes;
    })
  );

  // Flatten and sort by publish date (newest first)
  const allEpisodes = episodeArrays
    .flat()
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  console.log(`Total recent episodes: ${allEpisodes.length}`);

  // Save to cache
  await saveCache(allEpisodes);

  return allEpisodes;
};

/**
 * Check if cache is stale
 */
export const isCacheStale = async (): Promise<boolean> => {
  const cache = await loadCache();
  if (!cache) return true;
  return Date.now() - cache.timestamp >= CACHE_TTL_MS;
};
