/**
 * Zustand store for managing recent episodes from tracked podcasts
 * NOT persisted - uses the recentEpisodes.service.ts for caching
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { fetchRecentEpisodes, RecentEpisode, TrackedPodcast } from '../services/recentEpisodes.service';

interface RecentEpisodesState {
  episodes: RecentEpisode[];
  isLoading: boolean;
  lastFetchTime: number | null;
  error: string | null;
}

interface RecentEpisodesActions {
  // Load episodes from tracked podcasts
  loadEpisodes: (trackedPodcasts: TrackedPodcast[], forceRefresh?: boolean) => Promise<void>;

  // Incremental updates (for modal close optimization)
  removeEpisodesForPodcasts: (podcastIds: string[]) => void;
  mergeNewEpisodes: (newEpisodes: RecentEpisode[]) => void;

  // Clear all episodes
  clearEpisodes: () => void;

  // Set loading state
  setLoading: (loading: boolean) => void;
}

type RecentEpisodesStore = RecentEpisodesState & RecentEpisodesActions;

// Selectors
export const selectEpisodes = (state: RecentEpisodesStore) => state.episodes;
export const selectIsLoading = (state: RecentEpisodesStore) => state.isLoading;
export const selectLastFetchTime = (state: RecentEpisodesStore) => state.lastFetchTime;
export const selectError = (state: RecentEpisodesStore) => state.error;

// Re-export types for convenience
export type { RecentEpisode, TrackedPodcast } from '../services/recentEpisodes.service';

export const useRecentEpisodesStore = create<RecentEpisodesStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    episodes: [],
    isLoading: false,
    lastFetchTime: null,
    error: null,

    // Load episodes from tracked podcasts
    loadEpisodes: async (trackedPodcasts, forceRefresh = false) => {
      if (trackedPodcasts.length === 0) {
        console.log('[RecentEpisodesStore] No tracked podcasts, clearing episodes');
        set({ episodes: [], isLoading: false });
        return;
      }

      // Prevent duplicate loads
      if (get().isLoading && !forceRefresh) {
        console.log('[RecentEpisodesStore] Already loading, skipping');
        return;
      }

      console.log('[RecentEpisodesStore] Loading episodes from', trackedPodcasts.length, 'podcasts');
      set({ isLoading: true, error: null });

      try {
        const episodes = await fetchRecentEpisodes(trackedPodcasts, forceRefresh);
        console.log('[RecentEpisodesStore] Loaded', episodes.length, 'episodes');
        set({
          episodes,
          isLoading: false,
          lastFetchTime: Date.now(),
        });
      } catch (error) {
        console.error('[RecentEpisodesStore] Failed to load episodes:', error);
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load episodes',
        });
      }
    },

    // Remove episodes for specific podcasts (when user untracks them)
    removeEpisodesForPodcasts: (podcastIds) => {
      if (podcastIds.length === 0) return;

      const idsSet = new Set(podcastIds);
      console.log('[RecentEpisodesStore] Removing episodes for podcasts:', podcastIds);

      set((state) => ({
        episodes: state.episodes.filter(ep => !idsSet.has(ep.podcastId)),
      }));
    },

    // Merge new episodes with existing (for incremental updates)
    mergeNewEpisodes: (newEpisodes) => {
      if (newEpisodes.length === 0) return;

      console.log('[RecentEpisodesStore] Merging', newEpisodes.length, 'new episodes');

      set((state) => {
        // Combine and sort by publish date (newest first)
        const merged = [...state.episodes, ...newEpisodes].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        return { episodes: merged };
      });
    },

    // Clear all episodes
    clearEpisodes: () => {
      console.log('[RecentEpisodesStore] Clearing all episodes');
      set({ episodes: [], lastFetchTime: null, error: null });
    },

    // Set loading state
    setLoading: (loading) => {
      set({ isLoading: loading });
    },
  }))
);
