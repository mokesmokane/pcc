/**
 * Zustand store for managing podcast subscriptions and tracking preferences
 * Persisted to AsyncStorage at '@podcast_subscriptions'
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrackedPodcast {
  id: string;
  title: string;
  artwork: string;
  feedUrl: string;
  author?: string;
  tracked?: boolean;
}

interface SubscriptionsState {
  subscriptions: TrackedPodcast[];
  isLoading: boolean;
  preModalTrackedIds: string[] | null; // Using array for JSON serialization
}

interface SubscriptionsActions {
  // Core subscription management
  loadSubscriptions: () => Promise<void>;
  addSubscription: (podcast: TrackedPodcast) => void;
  removeSubscription: (podcastId: string) => void;
  updateSubscription: (podcastId: string, updates: Partial<TrackedPodcast>) => void;

  // Tracking management
  toggleTracking: (podcastId: string) => void;
  setTracking: (podcastId: string, tracked: boolean) => void;

  // Modal snapshot helpers (for incremental updates)
  savePreModalSnapshot: () => void;
  getPreModalSnapshot: () => Set<string> | null;
  clearPreModalSnapshot: () => void;

  // Utilities
  isSubscribed: (podcastId: string) => boolean;
  isTracked: (podcastId: string) => boolean;
  getTrackedPodcasts: () => TrackedPodcast[];
}

type SubscriptionsStore = SubscriptionsState & SubscriptionsActions;

// Selectors for fine-grained subscriptions
export const selectSubscriptions = (state: SubscriptionsStore) => state.subscriptions;
export const selectIsLoading = (state: SubscriptionsStore) => state.isLoading;
export const selectTrackedPodcasts = (state: SubscriptionsStore) =>
  state.subscriptions.filter(p => p.tracked);

export const useSubscriptionsStore = create<SubscriptionsStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        subscriptions: [],
        isLoading: false,
        preModalTrackedIds: null,

        // Load subscriptions (for initial hydration check)
        loadSubscriptions: async () => {
          console.log('[SubscriptionsStore] Loading subscriptions...');
          set({ isLoading: true });
          // persist middleware handles hydration automatically
          // This is just for explicit reload if needed
          set({ isLoading: false });
          console.log('[SubscriptionsStore] Loaded', get().subscriptions.length, 'subscriptions');
        },

        // Add a new subscription
        addSubscription: (podcast) => {
          console.log('[SubscriptionsStore] Adding subscription:', podcast.title);
          set((state) => {
            // Check if already exists
            if (state.subscriptions.some(p => p.id === podcast.id)) {
              console.log('[SubscriptionsStore] Already subscribed to:', podcast.title);
              return state;
            }
            return {
              subscriptions: [...state.subscriptions, { ...podcast, tracked: false }],
            };
          });
        },

        // Remove a subscription
        removeSubscription: (podcastId) => {
          console.log('[SubscriptionsStore] Removing subscription:', podcastId);
          set((state) => ({
            subscriptions: state.subscriptions.filter(p => p.id !== podcastId),
          }));
        },

        // Update a subscription
        updateSubscription: (podcastId, updates) => {
          console.log('[SubscriptionsStore] Updating subscription:', podcastId, updates);
          set((state) => ({
            subscriptions: state.subscriptions.map(p =>
              p.id === podcastId ? { ...p, ...updates } : p
            ),
          }));
        },

        // Toggle tracking for a podcast
        toggleTracking: (podcastId) => {
          console.log('[SubscriptionsStore] Toggling tracking for:', podcastId);
          set((state) => ({
            subscriptions: state.subscriptions.map(p =>
              p.id === podcastId ? { ...p, tracked: !p.tracked } : p
            ),
          }));
        },

        // Set tracking explicitly
        setTracking: (podcastId, tracked) => {
          console.log('[SubscriptionsStore] Setting tracking for:', podcastId, tracked);
          set((state) => ({
            subscriptions: state.subscriptions.map(p =>
              p.id === podcastId ? { ...p, tracked } : p
            ),
          }));
        },

        // Save snapshot of currently tracked IDs before opening modal
        savePreModalSnapshot: () => {
          const trackedIds = get().subscriptions
            .filter(p => p.tracked)
            .map(p => p.id);
          console.log('[SubscriptionsStore] Saving pre-modal snapshot:', trackedIds.length, 'tracked');
          set({ preModalTrackedIds: trackedIds });
        },

        // Get the saved snapshot as a Set
        getPreModalSnapshot: () => {
          const ids = get().preModalTrackedIds;
          return ids ? new Set(ids) : null;
        },

        // Clear the snapshot
        clearPreModalSnapshot: () => {
          set({ preModalTrackedIds: null });
        },

        // Check if a podcast is subscribed
        isSubscribed: (podcastId) => {
          return get().subscriptions.some(p => p.id === podcastId);
        },

        // Check if a podcast is tracked
        isTracked: (podcastId) => {
          const podcast = get().subscriptions.find(p => p.id === podcastId);
          return podcast?.tracked ?? false;
        },

        // Get all tracked podcasts
        getTrackedPodcasts: () => {
          return get().subscriptions.filter(p => p.tracked);
        },
      }),
      {
        name: 'podcast-subscriptions-storage',
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist subscriptions, not loading state or modal snapshot
        partialize: (state) => ({ subscriptions: state.subscriptions }),
      }
    )
  )
);
