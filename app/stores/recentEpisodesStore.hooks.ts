/**
 * Convenience hooks for recent episodes store
 */

import { useMemo } from 'react';
import {
  useRecentEpisodesStore,
  selectEpisodes,
  selectIsLoading,
  RecentEpisode,
  TrackedPodcast,
} from './recentEpisodesStore';
import type { Track } from 'react-native-track-player';

// ============ State Selectors ============

/**
 * Get all recent episodes
 */
export function useRecentEpisodes(): RecentEpisode[] {
  return useRecentEpisodesStore(selectEpisodes);
}

/**
 * Get loading state
 */
export function useRecentEpisodesLoading(): boolean {
  return useRecentEpisodesStore(selectIsLoading);
}

/**
 * Get last fetch time
 */
export function useLastFetchTime(): number | null {
  return useRecentEpisodesStore((state) => state.lastFetchTime);
}

/**
 * Get error state
 */
export function useRecentEpisodesError(): string | null {
  return useRecentEpisodesStore((state) => state.error);
}

// ============ Computed Hooks ============

interface GroupedEpisodes {
  title: string;
  data: Track[];
}

/**
 * Get episodes grouped by time period (Today, Yesterday, This Week, Last Week, Older)
 */
export function useGroupedRecentEpisodes(): GroupedEpisodes[] {
  const episodes = useRecentEpisodesStore(selectEpisodes);

  return useMemo(() => {
    if (episodes.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay()); // Start of week (Sunday)
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const groups: GroupedEpisodes[] = [];
    const todayEpisodes: Track[] = [];
    const yesterdayEpisodes: Track[] = [];
    const thisWeekEpisodes: Track[] = [];
    const lastWeekEpisodes: Track[] = [];
    const olderEpisodes: Track[] = [];

    episodes.forEach((ep) => {
      const track: Track = {
        id: ep.id,
        title: ep.title,
        artist: ep.podcastTitle,
        artwork: ep.artwork,
        url: ep.audioUrl,
        description: ep.description,
      };

      const pubDate = new Date(ep.publishedAt);
      const pubDateDay = new Date(pubDate.getFullYear(), pubDate.getMonth(), pubDate.getDate());

      if (pubDateDay >= today) {
        todayEpisodes.push(track);
      } else if (pubDateDay >= yesterday) {
        yesterdayEpisodes.push(track);
      } else if (pubDateDay >= thisWeekStart) {
        thisWeekEpisodes.push(track);
      } else if (pubDateDay >= lastWeekStart) {
        lastWeekEpisodes.push(track);
      } else {
        olderEpisodes.push(track);
      }
    });

    if (todayEpisodes.length > 0) groups.push({ title: 'Today', data: todayEpisodes });
    if (yesterdayEpisodes.length > 0) groups.push({ title: 'Yesterday', data: yesterdayEpisodes });
    if (thisWeekEpisodes.length > 0) groups.push({ title: 'This Week', data: thisWeekEpisodes });
    if (lastWeekEpisodes.length > 0) groups.push({ title: 'Last Week', data: lastWeekEpisodes });
    if (olderEpisodes.length > 0) groups.push({ title: 'Older', data: olderEpisodes });

    return groups;
  }, [episodes]);
}

/**
 * Get episodes as Track objects (for FlatList compatibility)
 */
export function useRecentEpisodesAsTracks(): Track[] {
  const episodes = useRecentEpisodesStore(selectEpisodes);

  return useMemo(() => {
    return episodes.map((ep): Track => ({
      id: ep.id,
      title: ep.title,
      artist: ep.podcastTitle,
      artwork: ep.artwork,
      url: ep.audioUrl,
      description: ep.description,
    }));
  }, [episodes]);
}

// ============ Action Hooks ============

/**
 * Get the load episodes action
 */
export function useLoadRecentEpisodes(): (
  trackedPodcasts: TrackedPodcast[],
  forceRefresh?: boolean
) => Promise<void> {
  return useRecentEpisodesStore((state) => state.loadEpisodes);
}

/**
 * Get incremental update actions
 */
export function useRecentEpisodesActions() {
  const loadEpisodes = useRecentEpisodesStore((state) => state.loadEpisodes);
  const removeEpisodesForPodcasts = useRecentEpisodesStore((state) => state.removeEpisodesForPodcasts);
  const mergeNewEpisodes = useRecentEpisodesStore((state) => state.mergeNewEpisodes);
  const clearEpisodes = useRecentEpisodesStore((state) => state.clearEpisodes);

  return {
    loadEpisodes,
    removeEpisodesForPodcasts,
    mergeNewEpisodes,
    clearEpisodes,
  };
}
