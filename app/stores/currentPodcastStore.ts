import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CurrentPodcastState {
  // Persisted state
  currentPodcastId: string | null;

  // Actions
  setCurrentPodcastId: (id: string | null) => void;
  clearCurrentPodcast: () => void;
}

/**
 * Zustand store for managing the current podcast
 * This replaces CurrentPodcastContext - much simpler!
 *
 * All data fetching (poll progress, etc.) is handled by React Query hooks
 * This store only manages the selected podcast ID
 */
export const useCurrentPodcastStore = create<CurrentPodcastState>()(
  persist(
    (set) => ({
      currentPodcastId: null,

      setCurrentPodcastId: (id) => {
        console.log('[currentPodcastStore] Setting current podcast ID:', id);
        set({ currentPodcastId: id });
      },

      clearCurrentPodcast: () => {
        console.log('[currentPodcastStore] Clearing current podcast');
        set({ currentPodcastId: null });
      },
    }),
    {
      name: 'current-podcast-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
